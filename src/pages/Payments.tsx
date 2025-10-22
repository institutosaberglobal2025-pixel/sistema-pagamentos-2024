import { useState, useEffect } from 'react';
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
  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [totalInstallments, setTotalInstallments] = useState<number>(1);
  const [installmentValue, setInstallmentValue] = useState<number>(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<PaymentPlan | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [currentUserAdminId, setCurrentUserAdminId] = useState<string | null>(null);

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

  const handleDelete = (plan: PaymentPlan) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;
    
    try {
      const { error } = await supabase
        .from('payment_plans')
        .delete()
        .eq('id', planToDelete.id);
        
      if (error) throw error;
      
      showSnackbar('Plano de pagamento excluído com sucesso', 'success');
      await fetchPaymentPlans();
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      showSnackbar('Erro ao excluir plano de pagamento', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingPlan(null);
    setPlanName('');
    setStartDate(null);
    setTotalInstallments(1);
    setInstallmentValue(0);
  };

  const handleSave = async () => {
    if (!planName || !startDate || totalInstallments < 1 || installmentValue <= 0) {
      showSnackbar('Por favor, preencha todos os campos corretamente', 'error');
      return;
    }

    try {
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
          });

        if (insertError) {
          throw new Error(`Erro ao criar plano: ${insertError.message}`);
        }

        showSnackbar('Plano de pagamento criado com sucesso', 'success');
      }
      
      // Atualizar lista de planos
      await fetchPaymentPlans();
      
      // Limpar formulário
      setPlanName('');
      setStartDate(null);
      setTotalInstallments(1);
      setInstallmentValue(0);
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
                onChange={(e) => setInstallmentValue(Number(e.target.value))}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                required
              />
              <TextField
                label="Número de Parcelas"
                type="number"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(Number(e.target.value))}
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
                  onChange={(e) => setInstallmentValue(Number(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                  fullWidth
                  required
                />
                <TextField
                  label="Número de Parcelas"
                  type="number"
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(Number(e.target.value))}
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

        {/* Diálogo de confirmação de exclusão */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja excluir o plano "{planToDelete?.name}"? Esta ação não pode ser desfeita.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDelete} color="error" autoFocus>
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}