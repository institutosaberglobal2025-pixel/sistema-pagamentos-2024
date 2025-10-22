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
} from '@mui/material';
import { Edit as EditIcon, Trash as DeleteIcon } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import ImportStudents from '../components/ImportStudents';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

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

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id);

      if (error) throw error;

      showSnackbar('Aluno excluído com sucesso!', 'success');
      fetchStudents();
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
      showSnackbar('Erro ao excluir aluno. Por favor, tente novamente.', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 1200,
      mx: 'auto',
      width: '100%'
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

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o aluno "{studentToDelete?.name}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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