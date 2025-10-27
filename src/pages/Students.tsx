import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
} from '@mui/material';
import { Edit as EditIcon, Trash as DeleteIcon } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import ImportStudents from '../components/ImportStudents';
import { canDeleteStudent, deleteWithCleanup } from '../utils/deletionControls';
import type { DeletionCheck } from '../utils/deletionControls';

interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  group_id: string;
  group_name?: string;
}

interface Group {
  id: string;
  name: string;
  group_administrators: {
    administrator_id: string;
  }[];
}

export function Students() {
  const { user, isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUserAdminId, setCurrentUserAdminId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Estados para exclusão de aluno
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Estados para o modal de dependências
  const [dependenciesModal, setDependenciesModal] = useState<{
    open: boolean;
    student: Student | null;
    dependencies: DeletionCheck | null;
  }>({
    open: false,
    student: null,
    dependencies: null
  });
  
  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  
  // Estados para seleção múltipla
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchCurrentUserAdminId();
  }, [user]);

  useEffect(() => {
    if (currentUserAdminId !== null) {
      fetchStudents();
      fetchGroups();
    }
  }, [currentUserAdminId, isAdmin]);

  // Efeito para filtrar alunos
  useEffect(() => {
    let filtered = students;

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.phone && student.phone.includes(searchTerm))
      );
    }

    // Filtrar por grupo
    if (filterGroup) {
      filtered = filtered.filter(student => student.group_id === filterGroup);
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, filterGroup]);

  async function fetchCurrentUserAdminId() {
    if (!user) return;

    const { data, error } = await supabase
      .from('administrators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setCurrentUserAdminId(data.id);
    }
  }

  async function fetchStudents() {
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        email,
        phone,
        group_id,
        groups (
          name
        )
      `);

    // Se não for super admin, filtrar apenas estudantes dos grupos associados ao administrador
    if (!isAdmin && currentUserAdminId) {
      const { data: userGroups, error: groupError } = await supabase
        .from('group_administrators')
        .select('group_id')
        .eq('administrator_id', currentUserAdminId);

      if (groupError) {
        console.error('Erro ao buscar grupos do administrador:', groupError);
        return;
      }

      const groupIds = userGroups?.map(ug => ug.group_id) || [];
      if (groupIds.length === 0) {
        setStudents([]);
        return;
      }

      query = query.in('group_id', groupIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar alunos:', error);
      return;
    }

    const formattedStudents = data?.map(student => ({
      ...student,
      group_name: (student.groups as any)?.name || 'Sem grupo'
    })) || [];

    setStudents(formattedStudents);
  }

  async function fetchGroups() {
    let query = supabase
      .from('groups')
      .select(`
        id,
        name,
        group_administrators (
          administrator_id
        )
      `);

    // Se não for super admin, filtrar apenas grupos associados ao administrador
    if (!isAdmin && currentUserAdminId) {
      query = query
        .select(`
          id,
          name,
          group_administrators!inner (
            administrator_id
          )
        `)
        .eq('group_administrators.administrator_id', currentUserAdminId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar grupos:', error);
      return;
    }

    setGroups(data || []);
  }

  const handleOpen = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setName(student.name);
      setEmail(student.email || '');
      setPhone(student.phone || '');
      setSelectedGroup(student.group_id);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setSelectedGroup('');
    setEditingStudent(null);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSubmit = async () => {
    if (!name || !selectedGroup) {
      showSnackbar('Nome e grupo são obrigatórios!', 'error');
      return;
    }

    // Validar email se foi fornecido
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showSnackbar('Por favor, insira um email válido.', 'error');
      return;
    }

    try {
      const studentData = {
        name,
        email: email || null,
        phone: phone || null,
        group_id: selectedGroup,
      };

      if (editingStudent) {
        // Atualizar aluno existente
        const { error: updateError } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);

        if (updateError) throw updateError;
        showSnackbar('Aluno atualizado com sucesso!', 'success');
      } else {
        // Inserir novo aluno
        const { error: insertError } = await supabase
          .from('students')
          .insert([studentData]);

        if (insertError) throw insertError;
        showSnackbar('Aluno cadastrado com sucesso!', 'success');
      }

      fetchStudents();
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      showSnackbar('Erro ao salvar aluno. Por favor, tente novamente.', 'error');
    }
  };

  const handleDeleteClick = async (student: Student) => {
    try {
      console.log('Iniciando verificação de exclusão para aluno:', student.id, student.name);
      // Verificar se o aluno pode ser excluído
      const deletionCheck = await canDeleteStudent(student.id);
      console.log('Resultado da verificação:', deletionCheck);
      
      if (!deletionCheck.canDelete) {
        // Abrir modal de dependências para parcelas pagas (bloqueio)
        setDependenciesModal({
          open: true,
          student: student,
          dependencies: deletionCheck,
        });
        return;
      }
      
      if (deletionCheck.warningMessage) {
        // Abrir modal de dependências para parcelas pendentes (aviso)
        setDependenciesModal({
          open: true,
          student: student,
          dependencies: deletionCheck,
        });
        return;
      }
      
      // Se não há dependências, abrir diálogo de confirmação normal
      setStudentToDelete(student);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Erro detalhado ao verificar exclusão do aluno:', error);
      console.error('Student ID:', student.id);
      console.error('Student Name:', student.name);
      showSnackbar(`Erro ao verificar se o aluno pode ser excluído: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  // Funções para seleção múltipla
  const handleSelectAll = () => {
    if (selectAll || selectedStudents.size === filteredStudents.length) {
      // Desselecionar todos
      setSelectedStudents(new Set());
      setSelectAll(false);
    } else {
      // Selecionar todos os alunos filtrados
      const allStudentIds = new Set(filteredStudents.map(student => student.id));
      setSelectedStudents(allStudentIds);
      setSelectAll(true);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    
    // Atualizar estado do selectAll
    if (newSelected.size === 0) {
      setSelectAll(false);
    } else if (newSelected.size === filteredStudents.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  };

  // Função para exclusão múltipla
  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) return;

    const selectedStudentsList = filteredStudents.filter(student => 
      selectedStudents.has(student.id)
    );

    console.log('Alunos selecionados para exclusão:', selectedStudentsList.map(s => s.name));

    try {
      // Verificar se todos os alunos selecionados podem ser excluídos
      const deletionChecks = await Promise.all(
        selectedStudentsList.map(async (student) => {
          const check = await canDeleteStudent(student.id);
          return { student, check };
        })
      );

      // Separar alunos que podem ser excluídos dos que não podem
      const cannotDelete = deletionChecks.filter(({ check }) => !check.canDelete);
      const canDelete = deletionChecks.filter(({ check }) => check.canDelete && !check.warningMessage);
      const hasWarnings = deletionChecks.filter(({ check }) => check.canDelete && check.warningMessage);

      console.log('Verificação de exclusão:', { cannotDelete: cannotDelete.length, canDelete: canDelete.length, hasWarnings: hasWarnings.length });

      if (cannotDelete.length > 0) {
        const blockedNames = cannotDelete.map(({ student }) => student.name).join(', ');
        showSnackbar(`Os seguintes alunos não podem ser excluídos pois possuem parcelas pagas: ${blockedNames}`, 'error');
        return;
      }

      if (hasWarnings.length > 0) {
        const warningNames = hasWarnings.map(({ student }) => student.name).join(', ');
        const confirmDelete = window.confirm(
          `Os seguintes alunos possuem parcelas pendentes que serão excluídas: ${warningNames}\n\nDeseja continuar com a exclusão?`
        );
        if (!confirmDelete) return;
      }

      // Confirmar exclusão
      const confirmMessage = selectedStudents.size === 1 
        ? `Tem certeza que deseja excluir o aluno selecionado?`
        : `Tem certeza que deseja excluir os ${selectedStudents.size} alunos selecionados?`;
      
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;

      // Executar exclusões
      let successCount = 0;
      let errorCount = 0;

      for (const student of selectedStudentsList) {
        try {
          console.log(`Excluindo aluno: ${student.name} (ID: ${student.id})`);
          const result = await deleteWithCleanup('student', student.id);
          console.log(`Resultado da exclusão:`, result);
          if (result.success) {
            console.log(`Aluno ${student.name} excluído com sucesso`);
            successCount++;
          } else {
            console.error(`Falha ao excluir aluno ${student.name}:`, result.message);
            errorCount++;
          }
        } catch (error) {
          console.error(`Erro ao excluir aluno ${student.name}:`, error);
          errorCount++;
        }
      }

      console.log(`Exclusão concluída: ${successCount} sucessos, ${errorCount} erros`);

      // Limpar seleções
      setSelectedStudents(new Set());
      setSelectAll(false);

      // Atualizar lista
      console.log('Atualizando lista de alunos...');
      await fetchStudents();
      console.log('Lista de alunos atualizada');

      // Mostrar resultado
      if (errorCount === 0) {
        showSnackbar(`${successCount} aluno(s) excluído(s) com sucesso!`, 'success');
      } else {
        showSnackbar(`${successCount} aluno(s) excluído(s), ${errorCount} erro(s) ocorreram.`, 'error');
      }

    } catch (error) {
      console.error('Erro na exclusão múltipla:', error);
      showSnackbar('Erro ao excluir alunos. Tente novamente.', 'error');
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 1200,
      mx: 'auto',
      width: '100%',
      pb: { xs: 4, sm: 2 } // Adiciona espaçamento inferior para mobile
    }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 2, sm: 0 },
          mb: 4
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 600,
            color: 'text.primary',
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          Alunos
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedStudents.size > 0 && (
            <Button
              variant="contained"
              color="error"
              onClick={handleBulkDelete}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                py: { xs: 1.5, sm: 1.5 },
                px: { xs: 2, sm: 4 },
                fontSize: '1rem',
                textTransform: 'none',
                fontWeight: 500,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 3
                }
              }}
            >
              Excluir Selecionados ({selectedStudents.size})
            </Button>
          )}
          <ImportStudents
            groups={groups}
            onImportComplete={fetchStudents}
          />
          <Button
            variant="contained"
            onClick={() => handleOpen()}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              py: { xs: 1.5, sm: 1.5 },
              px: { xs: 2, sm: 4 },
              fontSize: '1rem',
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 3
              }
            }}
          >
            Novo Aluno
          </Button>
        </Box>
      </Box>

      {/* Seção de Filtros e Busca */}
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
          p: 3,
          mb: 3
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: 'text.primary'
          }}
        >
          Filtros e Busca
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: 'center'
          }}
        >
          <TextField
            label="Buscar aluno"
            placeholder="Nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}
            size="small"
          />
          <FormControl sx={{ minWidth: { xs: '100%', md: '200px' } }} size="small">
            <InputLabel>Filtrar por Grupo</InputLabel>
            <Select
              value={filterGroup}
              label="Filtrar por Grupo"
              onChange={(e) => setFilterGroup(e.target.value)}
            >
              <MenuItem value="">Todos os grupos</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => {
              setSearchTerm('');
              setFilterGroup('');
            }}
            sx={{ minWidth: { xs: '100%', md: 'auto' } }}
          >
            Limpar Filtros
          </Button>
        </Box>
      </Box>

      <TableContainer
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  backgroundColor: 'background.paper',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  width: '50px',
                  padding: '8px'
                }}
              >
                <Checkbox
                  checked={selectAll}
                  indeterminate={selectedStudents.size > 0 && selectedStudents.size < filteredStudents.length}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  backgroundColor: 'background.paper',
                  borderBottom: '2px solid',
                  borderColor: 'divider'
                }}
              >
                Nome
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  backgroundColor: 'background.paper',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  display: { xs: 'none', sm: 'table-cell' }
                }}
              >
                Email
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  backgroundColor: 'background.paper',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  display: { xs: 'none', md: 'table-cell' }
                }}
              >
                Telefone
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  backgroundColor: 'background.paper',
                  borderBottom: '2px solid',
                  borderColor: 'divider'
                }}
              >
                Grupo
              </TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  backgroundColor: 'background.paper',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  width: '120px'
                }}
              >
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow 
                key={student.id}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <TableCell sx={{ padding: '8px' }}>
                  <Checkbox
                    checked={selectedStudents.has(student.id)}
                    onChange={() => handleSelectStudent(student.id)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  {student.email}
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {student.phone}
                </TableCell>
                <TableCell>
                  {student.group_name}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpen(student)}
                    sx={{ 
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.light'
                      }
                    }}
                  >
                    <EditIcon size={20} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(student)}
                    sx={{ 
                      color: 'error.main',
                      ml: 1,
                      '&:hover': {
                        backgroundColor: 'error.light'
                      }
                    }}
                  >
                    <DeleteIcon size={20} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Edição/Criação */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 2
            }}
          >
            <TextField
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Grupo</InputLabel>
              <Select
                value={selectedGroup}
                label="Grupo"
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={handleClose}
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: 1,
              '&:hover': {
                boxShadow: 2
              }
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Dependências */}
      <Dialog
        open={dependenciesModal.open}
        onClose={() => setDependenciesModal({ open: false, student: null, dependencies: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          color: dependenciesModal.dependencies?.canDelete ? 'warning.main' : 'error.main', 
          fontWeight: 'bold' 
        }}>
          {dependenciesModal.dependencies?.canDelete ? '⚠️ Aviso de Exclusão' : '🚫 Não é possível excluir o aluno'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            O aluno <strong>"{dependenciesModal.student?.name}"</strong> possui dependências:
          </Typography>
          
          {dependenciesModal.dependencies?.dependentItems && dependenciesModal.dependencies.dependentItems.length > 0 && (
            <Box>
              {dependenciesModal.dependencies.dependentItems.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ 
                    color: item.type === 'payment_plans' ? 'error.main' : 
                           item.type === 'paid_installments' ? 'error.main' : 'warning.main', 
                    mb: 1 
                  }}>
                    {item.type === 'payment_plans' ? '📋 Planos de Pagamento' :
                     item.type === 'paid_installments' ? '💰 Parcelas Pagas' : '⏰ Parcelas Vencidas'} ({item.count})
                  </Typography>
                  
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2">
                      {item.details}
                    </Typography>
                  </Paper>
                  
                  {index < dependenciesModal.dependencies.dependentItems.length - 1 && (
                    <Divider sx={{ mt: 2 }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
          
          {/* Instruções baseadas no tipo de bloqueio */}
          {!dependenciesModal.dependencies?.canDelete ? (
            // Modal de bloqueio - quando há planos de pagamento
            <Box sx={{ mt: 3, p: 3, bgcolor: 'error.light', borderRadius: 2, border: '2px solid', borderColor: 'error.main' }}>
              <Typography variant="h6" sx={{ color: 'error.contrastText', mb: 2, fontWeight: 'bold' }}>
                🚫 Exclusão Bloqueada
              </Typography>
              
              <Typography variant="body1" sx={{ color: 'error.contrastText', mb: 2 }}>
                <strong>Para excluir este aluno, siga os passos abaixo:</strong>
              </Typography>
              
              <Box component="ol" sx={{ color: 'error.contrastText', pl: 2, mb: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Primeiro:</strong> Vá em <strong>"Relatórios"</strong>, gere um relatório do aluno e faça o download para manter o histórico
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Depois:</strong> Vá para a seção <strong>"Pagamentos"</strong> e exclua o(s) plano(s) de pagamento associado(s) a este aluno
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Por último:</strong> Retorne aqui e exclua o aluno
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ color: 'error.contrastText', fontStyle: 'italic' }}>
                ⚠️ A exclusão só será habilitada após a remoção dos planos de pagamento.
              </Typography>
            </Box>
          ) : (
            // Modal de aviso - quando não há planos mas há parcelas
            <Box sx={{ mt: 3, p: 3, bgcolor: 'warning.light', borderRadius: 2, border: '2px solid', borderColor: 'warning.main' }}>
              <Typography variant="h6" sx={{ color: 'warning.contrastText', mb: 2, fontWeight: 'bold' }}>
                ⚠️ Instruções Importantes
              </Typography>
              
              <Typography variant="body1" sx={{ color: 'warning.contrastText', mb: 2 }}>
                <strong>Antes de excluir este aluno:</strong>
              </Typography>
              
              <Box component="ol" sx={{ color: 'warning.contrastText', pl: 2, mb: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Vá para a seção <strong>"Pagamentos"</strong> e exclua o plano de pagamento associado a este aluno
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Se desejar manter informações das parcelas para histórico, vá em <strong>"Relatórios"</strong>, gere um relatório do aluno e faça o download antes de excluir
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ color: 'warning.contrastText', fontStyle: 'italic' }}>
                💡 A exclusão do aluno removerá automaticamente todas as suas parcelas e dados associados.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setDependenciesModal({ open: false, student: null, dependencies: null })}
            variant="outlined"
            sx={{
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={async () => {
              if (!dependenciesModal.student) return;

              try {
                // Executar exclusão com limpeza de dependências
                // Sempre excluir todas as parcelas do aluno
                const result = await deleteWithCleanup('student', dependenciesModal.student.id, true);
                
                if (result.success) {
                  showSnackbar('Aluno e todas as suas parcelas foram excluídos com sucesso!', 'success');
                  fetchStudents();
                } else {
                  showSnackbar(result.message, 'error');
                }
              } catch (error) {
                console.error('Erro ao excluir aluno:', error);
                showSnackbar('Erro inesperado ao excluir aluno.', 'error');
              } finally {
                // Fechar modal e resetar estados
                setDependenciesModal({ open: false, student: null, dependencies: null });
              }
            }}
            variant="contained"
            color="error"
            disabled={!dependenciesModal.dependencies?.canDelete}
            sx={{
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            Excluir Aluno
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação de exclusão simples */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o aluno "{studentToDelete?.name}"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={async () => {
              if (!studentToDelete) return;
              
              try {
                const result = await deleteWithCleanup('student', studentToDelete.id, true);
                if (result.success) {
                  showSnackbar(result.message, 'success');
                  fetchStudents(); // Recarregar lista
                } else {
                  showSnackbar(result.message, 'error');
                }
              } catch (error) {
                console.error('Erro ao excluir aluno:', error);
                showSnackbar('Erro inesperado ao excluir aluno.', 'error');
              } finally {
                setDeleteDialogOpen(false);
                setStudentToDelete(null);
              }
            }}
            color="error" 
            autoFocus
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
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
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}