import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LaunchIcon from '@mui/icons-material/Launch';
import { canDeletePaymentPlan, deleteWithCleanup } from '../utils/deletionControls';

dayjs.locale('pt-br');

interface PaymentPlan {
  id: string;
  name: string;
  student_id?: string; // Opcional agora
  group_id: string;    // Novo campo
  total_installments: number;
  installment_value: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

interface Group {
  id: string;
  name: string;
}

export default function Payments() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [totalInstallments, setTotalInstallments] = useState<number | ''>('');
  const [installmentValue, setInstallmentValue] = useState<number | ''>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<PaymentPlan | null>(null);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState<string>('');
  const [deletionBlocked, setDeletionBlocked] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [currentUserAdminId, setCurrentUserAdminId] = useState<string | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningModalMessage, setWarningModalMessage] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  useEffect(() => {
    fetchCurrentUserAdminId();
  }, [user]);

  useEffect(() => {
    if (currentUserAdminId !== null) {
      fetchPaymentPlans();
      fetchGroups();
    }
  }, [currentUserAdminId, isAdmin]);

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
  
  const fetchGroups = async () => {
    try {
      let query = supabase
        .from('groups')
        .select('id, name');

      // Se não for super admin, filtrar apenas grupos associados ao administrador
      if (!isAdmin && currentUserAdminId) {
        const { data: userGroups, error: groupError } = await supabase
          .from('group_administrators')
          .select('group_id')
          .eq('administrator_id', currentUserAdminId);

        if (groupError) {
          console.error('Erro ao buscar grupos do administrador:', groupError);
          showSnackbar('Erro ao carregar grupos', 'error');
          return;
        }

        const groupIds = userGroups?.map(ug => ug.group_id) || [];
        if (groupIds.length === 0) {
          setGroups([]);
          return;
        }

        query = query.in('id', groupIds);
      }

      const { data, error } = await query;
        
      if (error) {
        console.error('Erro ao buscar grupos:', error);
        showSnackbar('Erro ao carregar grupos', 'error');
        return;
      }
      
      setGroups(data || []);
      if (data && data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      showSnackbar('Erro ao carregar grupos', 'error');
    }
  };

  const fetchPaymentPlans = async () => {
    try {
      let query = supabase
        .from('payment_plans')
        .select('*')
        .order('created_at', { ascending: false });

      // Se não for super admin, filtrar apenas planos dos grupos associados ao administrador
      if (!isAdmin && currentUserAdminId) {
        const { data: userGroups, error: groupError } = await supabase
          .from('group_administrators')
          .select('group_id')
          .eq('administrator_id', currentUserAdminId);

        if (groupError) {
          console.error('Erro ao buscar grupos do administrador:', groupError);
          showSnackbar('Erro ao carregar planos de pagamento', 'error');
          return;
        }

        const groupIds = userGroups?.map(ug => ug.group_id) || [];
        if (groupIds.length === 0) {
          setPaymentPlans([]);
          return;
        }

        query = query.in('group_id', groupIds);
      }

      const { data: plans, error } = await query;

      if (error) {
        console.error('Erro ao buscar planos:', error);
        showSnackbar('Erro ao carregar planos de pagamento', 'error');
        return;
      }

      setPaymentPlans(plans || []);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      showSnackbar('Erro ao carregar planos de pagamento', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleEdit = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setStartDate(dayjs(plan.start_date));
    setTotalInstallments(plan.total_installments);
    setInstallmentValue(plan.installment_value);
    setSelectedGroupId(plan.group_id);
    setIsEditing(true);
  };

  const handleDelete = async (plan: PaymentPlan) => {
    try {
      // Verificar se o plano pode ser excluído
      const deletionCheck = await canDeletePaymentPlan(plan.id);
      
      setPlanToDelete(plan);
      setDeleteWarningMessage(deletionCheck.warningMessage || '');
      setDeletionBlocked(!deletionCheck.canDelete);
      
      if (!deletionCheck.canDelete) {
        // Se há alunos associados, mostrar modal dedicado
        if (deletionCheck.blockReason && deletionCheck.blockReason.includes('aluno')) {
          setWarningModalMessage(deletionCheck.blockReason);
          setWarningModalOpen(true);
          return;
        }
        
        // Para outros tipos de bloqueio (parcelas pagas), mostrar snackbar
        let message = deletionCheck.blockReason || 'Não é possível excluir este plano.';
        
        if (deletionCheck.dependentItems && deletionCheck.dependentItems.length > 0) {
          const paidInstallments = deletionCheck.dependentItems.find(item => item.type === 'paid_installments');
          if (paidInstallments) {
            message = `Este plano possui ${paidInstallments.count} parcela(s) paga(s) e não pode ser excluído para preservar o histórico financeiro.`;
          }
        }
        
        showSnackbar(message, 'error');
        return;
      }
      
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Erro ao verificar exclusão do plano:', error);
      showSnackbar('Erro ao verificar se o plano pode ser excluído.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;
    
    try {
      // Executar exclusão com limpeza de dependências
      const result = await deleteWithCleanup('payment_plan', planToDelete.id);
      
      if (result.success) {
        showSnackbar(result.message, 'success');
        await fetchPaymentPlans();
      } else {
        showSnackbar(result.message, 'error');
      }
    } catch (error: any) {
      console.error('Erro ao excluir plano:', error);
      showSnackbar('Erro inesperado ao excluir plano de pagamento.', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      setDeleteWarningMessage('');
      setDeletionBlocked(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingPlan(null);
    setPlanName('');
    setStartDate(null);
    setTotalInstallments('');
    setInstallmentValue('');
  };

  const handleSave = async () => {
    if (!planName || !startDate || !totalInstallments || totalInstallments < 1 || !installmentValue || installmentValue <= 0) {
      showSnackbar('Por favor, preencha todos os campos corretamente', 'error');
      return;
    }

    try {
      // Verificar se já existe um plano com o mesmo nome (apenas para novos planos ou se o nome foi alterado)
      if (!isEditing || (isEditing && editingPlan && editingPlan.name !== planName)) {
        const { data: existingPlan, error: checkError } = await supabase
          .from('payment_plans')
          .select('id, name')
          .eq('name', planName)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(`Erro ao verificar nome do plano: ${checkError.message}`);
        }

        if (existingPlan) {
          showSnackbar('Já existe um plano de pagamento com este nome. Por favor, escolha um nome diferente.', 'error');
          return;
        }
      }

      const now = new Date().toISOString();
      const startDateFormatted = startDate.format('YYYY-MM-DD');
      const endDate = startDate.clone().add(totalInstallments - 1, 'month').format('YYYY-MM-DD');
      
      if (isEditing && editingPlan) {
        // Atualizar plano existente
        const { error: updateError } = await supabase
          .from('payment_plans')
          .update({
            name: planName,
            group_id: selectedGroupId,
            total_installments: Math.floor(totalInstallments),
            installment_value: Number(installmentValue.toFixed(2)),
            start_date: startDateFormatted,
            end_date: endDate,
            updated_at: now
          })
          .eq('id', editingPlan.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar plano: ${updateError.message}`);
        }

        showSnackbar('Plano de pagamento atualizado com sucesso', 'success');
        setIsEditing(false);
        setEditingPlan(null);
      } else {
        // Criar novo plano
        const { error: insertError } = await supabase
          .from('payment_plans')
          .insert({
            name: planName,
            group_id: selectedGroupId,
            total_installments: Math.floor(totalInstallments),
            installment_value: Number(installmentValue.toFixed(2)),
            start_date: startDateFormatted,
            end_date: endDate,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Erro ao criar plano: ${insertError.message}`);
        }

        setSuccessModalMessage('Plano de pagamento criado com sucesso! Agora você pode associá-lo aos alunos na página "Pagamentos dos Alunos".');
        setSuccessModalOpen(true);
      }
      
      // Atualizar lista de planos
      await fetchPaymentPlans();
      
      // Limpar formulário
      setPlanName('');
      setStartDate(null);
      setTotalInstallments('');
      setInstallmentValue('');
    } catch (error) {
      console.error('Erro durante o salvamento:', error);
      showSnackbar(
        error instanceof Error ? error.message : 'Erro ao processar plano de pagamento',
        'error'
      );
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Planos de Pagamento
        </Typography>

      {!isEditing && (
        <Card sx={{ mb: 4, maxWidth: '100%', overflowX: 'auto' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Criar Novo Plano de Pagamento
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
              <TextField
                label="Nome do Plano"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                fullWidth
                required
              />
              <FormControl fullWidth required>
                <InputLabel id="group-select-label">Grupo</InputLabel>
                <Select
                  labelId="group-select-label"
                  value={selectedGroupId}
                  label="Grupo"
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                <DatePicker
                  label="Data Inicial"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </LocalizationProvider>
              <TextField
                label="Valor da Parcela"
                type="number"
                value={installmentValue}
                onChange={(e) => setInstallmentValue(e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                required
              />
              <TextField
                label="Número de Parcelas"
                type="number"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 1 }}
                fullWidth
                required
              />
              <Box sx={{ display: 'flex', gap: 2, alignSelf: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                >
                  Salvar Plano
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Typography variant="h5" sx={{ mb: 3 }}>
        Planos de Pagamento Cadastrados
      </Typography>

        <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome do Plano</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Grupo</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Parcelas</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Valor</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Início</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Fim</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell sx={{ minWidth: '120px' }}>{plan.name}</TableCell>
                  <TableCell sx={{ minWidth: '120px', display: { xs: 'none', sm: 'table-cell' } }}>
                    {groups.find(g => g.id === plan.group_id)?.name || 'Grupo não encontrado'}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {plan.total_installments}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(plan.installment_value)}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {dayjs(plan.start_date).format('DD/MM/YYYY')}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {dayjs(plan.end_date).format('DD/MM/YYYY')}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        color="primary" 
                        size="small" 
                        onClick={() => handleEdit(plan)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => handleDelete(plan)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {isEditing && editingPlan && (
          <Card sx={{ mt: 4, mb: 4, maxWidth: '100%', overflowX: 'auto' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Editar Plano de Pagamento
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'row', sm: 'column' }, 
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: 2, 
                width: '100%' 
              }}>
                <TextField
                  label="Nome do Plano"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  sx={{ width: { xs: '48%', sm: '100%' } }}
                  required
                />
                <FormControl sx={{ width: { xs: '48%', sm: '100%' } }} required>
                  <InputLabel id="edit-group-select-label">Grupo</InputLabel>
                  <Select
                    labelId="edit-group-select-label"
                    value={selectedGroupId}
                    label="Grupo"
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                  <DatePicker
                    label="Data Inicial"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                      },
                    }}
                  />
                </LocalizationProvider>
                <TextField
                  label="Valor da Parcela"
                  type="number"
                  value={installmentValue}
                  onChange={(e) => setInstallmentValue(e.target.value === '' ? '' : Number(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                  fullWidth
                  required
                />
                <TextField
                  label="Número de Parcelas"
                  type="number"
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value === '' ? '' : Number(e.target.value))}
                  inputProps={{ min: 1 }}
                  fullWidth
                  required
                />
                <Box sx={{ display: 'flex', gap: 2, alignSelf: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={cancelEdit}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                  >
                    Atualizar Plano
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

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

        {/* Diálogo de confirmação de exclusão */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>
            {deleteWarningMessage && deleteWarningMessage.includes('aluno') 
              ? '🚫 Exclusão Bloqueada' 
              : 'Confirmar Exclusão'
            }
          </DialogTitle>
          <DialogContent>
            {deleteWarningMessage && deleteWarningMessage.includes('aluno') ? (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    ❌ Não é possível excluir este plano de pagamento
                  </Typography>
                  <Typography variant="body2">
                    {deleteWarningMessage}
                  </Typography>
                </Alert>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    📋 <strong>Para excluir este plano, siga estes passos:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    1. Vá para a página "Pagamentos dos Alunos"
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    2. Filtre pelos alunos que possuem este plano
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    3. Remova o plano de todos os alunos associados
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      navigate('/dashboard/student-payments');
                    }}
                    sx={{ mt: 1 }}
                  >
                    Ir para Pagamentos dos Alunos
                  </Button>
                </Box>
              </>
            ) : deleteWarningMessage ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {deleteWarningMessage}
              </Alert>
            ) : (
              <DialogContentText>
                Tem certeza que deseja excluir o plano "{planToDelete?.name}"? Esta ação não pode ser desfeita.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            {!(deleteWarningMessage && deleteWarningMessage.includes('aluno')) && !deletionBlocked && (
              <Button 
                onClick={confirmDelete} 
                color="error" 
                autoFocus
              >
                Excluir
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Modal dedicado para avisos de planos com alunos associados */}
        <Dialog
          open={warningModalOpen}
          onClose={() => setWarningModalOpen(false)}
          maxWidth="md"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              margin: { xs: 1, sm: 2 },
              maxHeight: { xs: '95vh', sm: '90vh' }
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: 'error.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: { xs: 1.5, sm: 2 },
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}>
            🚫 Exclusão Bloqueada - Plano com Alunos
          </DialogTitle>
          <DialogContent sx={{ mt: { xs: 1, sm: 2 }, px: { xs: 2, sm: 3 } }}>
            <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 } }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                ❌ Não é possível excluir este plano
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {warningModalMessage}
              </Typography>
            </Alert>
            
            <Box sx={{ 
              mt: { xs: 2, sm: 3 }, 
              p: { xs: 2, sm: 3 }, 
              bgcolor: 'warning.light', 
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'warning.main'
            }}>
              <Typography variant="h6" sx={{ 
                mb: { xs: 1.5, sm: 2 }, 
                fontWeight: 'bold', 
                color: 'warning.dark',
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}>
                📋 Como proceder:
              </Typography>
              
              <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}>
                  1️⃣ Acesse "Pagamentos dos Alunos"
                </Typography>
                <Typography variant="body2" sx={{ 
                  ml: { xs: 2, sm: 3 }, 
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}>
                  Gerencie os pagamentos individuais
                </Typography>
              </Box>
              
              <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}>
                  2️⃣ Associe o plano aos alunos
                </Typography>
                <Typography variant="body2" sx={{ 
                  ml: { xs: 2, sm: 3 }, 
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}>
                  Selecione o plano para cada aluno e clique em "Salvar"
                </Typography>
              </Box>
              
              <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}>
                  3️⃣ Remova associações se necessário
                </Typography>
                <Typography variant="body2" sx={{ 
                  ml: { xs: 2, sm: 3 }, 
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}>
                  Desassocie alunos antes de excluir o plano
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                pt: { xs: 1, sm: 2 },
                borderTop: '1px solid',
                borderColor: 'warning.main'
              }}>
                <Button
                  variant="contained"
                  size={window.innerWidth < 600 ? "medium" : "large"}
                  startIcon={<LaunchIcon />}
                  onClick={() => {
                    setWarningModalOpen(false);
                    navigate('/dashboard/student-payments');
                  }}
                  sx={{ 
                    bgcolor: 'primary.main',
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    px: { xs: 2, sm: 3 },
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }}
                >
                  Ir para Pagamentos
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2 } }}>
            <Button 
              onClick={() => setWarningModalOpen(false)}
              variant="outlined"
              size={window.innerWidth < 600 ? "medium" : "large"}
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              Entendi, Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Sucesso */}
        <Dialog
          open={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ 
            textAlign: 'center', 
            color: 'success.main',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            ✅ Sucesso!
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ 
              textAlign: 'center', 
              fontSize: '1.1rem',
              color: 'text.primary'
            }}>
              {successModalMessage}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Button 
              onClick={() => setSuccessModalOpen(false)}
              variant="contained"
              color="success"
              size="large"
              sx={{ 
                minWidth: 120,
                fontSize: '1rem'
              }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}