import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteGroup, deleteWithCleanup } from '../utils/deletionControls';
import type { DeletionCheck } from '../utils/deletionControls';

interface Group {
  id: string;
  name: string;
  description: string;
  administrators: {
    id: string;
    name: string;
    is_super_admin: boolean;
  }[];
}



export default function Groups() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const { user, isAdmin } = useAuth();
  const [currentUserAdminId, setCurrentUserAdminId] = useState<string | null>(null);
  
  // Estados para o modal de dependências
  const [dependenciesModal, setDependenciesModal] = useState<{
    open: boolean;
    group: Group | null;
    dependencies: DeletionCheck | null;
  }>({
    open: false,
    group: null,
    dependencies: null,
  });

  // Estado para o modal de confirmação de exclusão
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    open: boolean;
    group: Group | null;
  }>({
    open: false,
    group: null,
  });
  useEffect(() => {
    const fetchCurrentUserAdminId = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('administrators')
        .select('id, is_super_admin')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar informações do administrador:', error);
        return;
      }

      if (data) {
        setCurrentUserAdminId(data.id);
      }
    };

    fetchCurrentUserAdminId();
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [currentUserAdminId]);

  const fetchGroups = async () => {
    try {
      let query = supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          group_administrators (
            administrator_id,
            administrators (
              id,
              name,
              is_super_admin
            )
          )
        `);

      // Se não for admin geral, filtra apenas os grupos do administrador atual
      if (!isAdmin && currentUserAdminId) {
        query = query.eq('group_administrators.administrator_id', currentUserAdminId);
      }

      const { data: groupsData, error: groupsError } = await query;

      if (groupsError) throw groupsError;

      const formattedGroups = groupsData.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description || '',
        administrators: group.group_administrators.map((ga: any) => ({
          id: ga.administrators.id,
          name: ga.administrators.name,
          is_super_admin: ga.administrators.is_super_admin
        }))
      }));

      setGroups(formattedGroups);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar grupos',
        severity: 'error',
      });
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
    setGroupName('');
    setEditingGroup(null);
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      setSnackbar({
        open: true,
        message: 'Nome do grupo não pode estar vazio',
        severity: 'error',
      });
      return;
    }

    if (!currentUserAdminId) {
      setSnackbar({
        open: true,
        message: 'Erro ao identificar o administrador',
        severity: 'error',
      });
      return;
    }

    try {
      const groupData = {
        name: groupName.trim(),
        description: ''
      };

      let groupId;
      let error;

      if (editingGroup) {
        // Verificar se o usuário tem permissão para editar o grupo
        const hasPermission = isAdmin || editingGroup.administrators.some(admin => admin.id === currentUserAdminId);
        if (!hasPermission) {
          setSnackbar({
            open: true,
            message: 'Você não tem permissão para editar este grupo',
            severity: 'error',
          });
          return;
        }

        const result = await supabase
          .from('groups')
          .update(groupData)
          .eq('id', editingGroup.id)
          .select()
          .single();

        error = result.error;
        if (result.data) {
          groupId = result.data.id;
        }
      } else {
        const result = await supabase
          .from('groups')
          .insert(groupData)
          .select()
          .single();

        error = result.error;
        if (result.data) {
          groupId = result.data.id;

          // Criar relação na tabela group_administrators com o administrador atual
          const { error: gaError } = await supabase
            .from('group_administrators')
            .insert({
              group_id: groupId,
              administrator_id: currentUserAdminId
            });

          if (gaError) {
            console.error('Erro ao adicionar administrador ao grupo:', gaError);
            // Se falhar ao adicionar o administrador, remover o grupo criado
            await supabase
              .from('groups')
              .delete()
              .eq('id', groupId);
            error = gaError;
          }
        }
      }

      if (error) {
        console.error('Erro detalhado do Supabase:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      if (!groupId) {
        throw new Error('Nenhum dado retornado do Supabase');
      }

      setSnackbar({
        open: true,
        message: `Grupo ${editingGroup ? 'atualizado' : 'criado'} com sucesso!`,
        severity: 'success',
      });

      handleClose();
      await fetchGroups();
    } catch (error) {
      console.error('Erro detalhado ao salvar grupo:', error);
      setSnackbar({
        open: true,
        message: `Erro ao ${editingGroup ? 'atualizar' : 'criar'} grupo`,
        severity: 'error',
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setGroupName('');
    setEditingGroup(null);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setOpen(true);
  };

  const handleDelete = async (group: Group) => {
    // Verificar permissão
    const hasPermission = isAdmin || group.administrators.some(admin => admin.id === currentUserAdminId);
    if (!hasPermission) {
      setSnackbar({
        open: true,
        message: 'Você não tem permissão para excluir este grupo',
        severity: 'error',
      });
      return;
    }

    try {
      // Verificar se o grupo pode ser excluído
      const deletionCheck = await canDeleteGroup(group.id);
      
      if (!deletionCheck.canDelete) {
        // Abrir modal de dependências
        setDependenciesModal({
          open: true,
          group: group,
          dependencies: deletionCheck,
        });
        return;
      }

      // Abrir modal de confirmação
      setConfirmDeleteModal({
        open: true,
        group: group,
      });
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao excluir grupo',
        severity: 'error',
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Grupos
        </Typography>
        <Button
          variant="contained"
          onClick={handleClickOpen}
          sx={{
            borderRadius: 2,
            textTransform: 'none'
          }}
        >
          Novo Grupo
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => handleEdit(group)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(group)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <DialogTitle>
          {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nome do Grupo"
              type="text"
              fullWidth
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            {editingGroup ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Dependências */}
      <Dialog
        open={dependenciesModal.open}
        onClose={() => setDependenciesModal({ open: false, group: null, dependencies: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          ⚠️ Não é possível excluir o grupo
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            O grupo <strong>"{dependenciesModal.group?.name}"</strong> possui dependências que impedem sua exclusão.
            Você deve excluir primeiro os itens listados abaixo:
          </Typography>
          
          {dependenciesModal.dependencies?.dependentItems && dependenciesModal.dependencies.dependentItems.length > 0 && (
            <Box>
              {dependenciesModal.dependencies.dependentItems.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'error.main', mb: 1 }}>
                    {item.type === 'students' ? '👥 Estudantes' : '💰 Planos de Pagamento'} ({item.count})
                  </Typography>
                  
                  {item.details && (
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {item.details}
                      </Typography>
                    </Paper>
                  )}
                  
                  {index < (dependenciesModal.dependencies?.dependentItems?.length || 0) - 1 && (
                    <Divider sx={{ mt: 2 }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: 'info.contrastText' }}>
              💡 <strong>Dica:</strong> Para excluir este grupo, primeiro vá até as páginas de Estudantes e Planos de Pagamento 
              para remover os itens listados acima.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setDependenciesModal({ open: false, group: null, dependencies: null })}
            variant="contained"
            sx={{
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            Entendi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog
        open={confirmDeleteModal.open}
        onClose={() => setConfirmDeleteModal({ open: false, group: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold', pb: 1 }}>
          ⚠️ Confirmar Exclusão
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Tem certeza que deseja excluir o grupo <strong>"{confirmDeleteModal.group?.name}"</strong>?
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setConfirmDeleteModal({ open: false, group: null })}
            color="inherit"
            sx={{
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (confirmDeleteModal.group) {
                // Salvar referência do grupo antes de fechar o modal
                const groupToDelete = confirmDeleteModal.group;
                console.log('Tentando excluir grupo:', groupToDelete);
                
                // Fechar o modal
                setConfirmDeleteModal({ open: false, group: null });
                
                // Executar exclusão
                try {
                  console.log('Chamando deleteWithCleanup para grupo:', groupToDelete.id);
                  const result = await deleteWithCleanup('group', groupToDelete.id);
                  console.log('Resultado da exclusão:', result);
                  
                  if (result.success) {
                    setSnackbar({
                      open: true,
                      message: result.message,
                      severity: 'success',
                    });
                    console.log('Recarregando lista de grupos...');
                    fetchGroups(); // Recarregar a lista
                  } else {
                    console.error('Falha na exclusão:', result);
                    setSnackbar({
                      open: true,
                      message: result.message,
                      severity: 'error',
                    });
                  }
                } catch (error) {
                  console.error('Erro ao excluir grupo:', error);
                  setSnackbar({
                    open: true,
                    message: 'Erro ao excluir grupo',
                    severity: 'error',
                  });
                }
              }
            }}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            minWidth: '400px',
            maxWidth: '600px'
          }
        }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}