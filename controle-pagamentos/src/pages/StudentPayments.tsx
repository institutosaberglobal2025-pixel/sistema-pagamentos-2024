import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  TextField,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Group {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  group_id: string;
}

interface PaymentPlan {
  id: string;
  name: string;
  total_installments: number;
  installment_value: number;
  start_date: string;
  end_date: string;
}

interface StudentPaymentPlan {
  student_id: string;
  payment_plan_id: string;
}

interface Installment {
  id: string;
  payment_plan_id: string;
  due_date: string;
  value: number;
  status: 'paga' | 'em_aberto' | 'atrasada';
  payment_date?: string;
}

export default function StudentPayments() {
  const { user, isAdmin } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [studentPaymentPlans, setStudentPaymentPlans] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [currentUserAdminId, setCurrentUserAdminId] = useState<string | null>(null);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modifiedInstallments, setModifiedInstallments] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCurrentUserAdminId();
  }, [user]);

  useEffect(() => {
    if (currentUserAdminId !== null) {
      fetchGroups();
    }
  }, [currentUserAdminId, isAdmin]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchStudentsByGroup(selectedGroupId);
      fetchPaymentPlansByGroup(selectedGroupId);
      fetchStudentPaymentPlans(selectedGroupId);
    } else {
      setStudents([]);
      setPaymentPlans([]);
      setStudentPaymentPlans({});
    }
  }, [selectedGroupId]);

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
        .select('id, name')
        .order('name');

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

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      showSnackbar('Erro ao carregar grupos', 'error');
    }
  };

  const fetchStudentsByGroup = async (groupId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, group_id')
        .eq('group_id', groupId)
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      showSnackbar('Erro ao carregar alunos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentPlansByGroup = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_plans')
        .select('id, name, total_installments, installment_value, start_date, end_date')
        .eq('group_id', groupId)
        .order('name');

      if (error) throw error;
      setPaymentPlans(data || []);
    } catch (error) {
      console.error('Erro ao buscar planos de pagamento:', error);
      showSnackbar('Erro ao carregar planos de pagamento', 'error');
    }
  };

  const fetchStudentPaymentPlans = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_payment_plans')
        .select(`
          student_id,
          payment_plan_id,
          students!inner(group_id)
        `)
        .eq('students.group_id', groupId);

      if (error) throw error;
      
      const associations: Record<string, string> = {};
      data?.forEach((item) => {
        associations[item.student_id] = item.payment_plan_id;
      });
      setStudentPaymentPlans(associations);
    } catch (error) {
      console.error('Erro ao buscar associações de planos:', error);
      showSnackbar('Erro ao carregar associações de planos', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handlePlanChange = (studentId: string, planId: string) => {
    setStudentPaymentPlans(prev => ({
      ...prev,
      [studentId]: planId
    }));
  };

  const saveStudentPlan = async (studentId: string) => {
    const planId = studentPaymentPlans[studentId];
    if (!planId) {
      showSnackbar('Selecione um plano de pagamento', 'error');
      return;
    }

    try {
      // Get payment plan details
      const { data: planData, error: planError } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Verificar se já existe uma associação para preservar pagamentos já feitos
      const { data: existingAssociation } = await supabase
        .from('student_payment_plans')
        .select('payment_plan_id')
        .eq('student_id', studentId)
        .single();

      let existingPaidInstallments: Installment[] = [];
      
      // Se já existe uma associação, buscar parcelas pagas
      if (existingAssociation) {
        const { data: paidInstallments } = await supabase
          .from('installments')
          .select('*')
          .eq('payment_plan_id', existingAssociation.payment_plan_id)
          .eq('status', 'paga');
        
        existingPaidInstallments = paidInstallments || [];
      }

      // Remove existing association and installments if any
      await supabase
        .from('student_payment_plans')
        .delete()
        .eq('student_id', studentId);

      // Remove existing installments for this student's old plan
      if (existingAssociation) {
        await supabase
          .from('installments')
          .delete()
          .eq('payment_plan_id', existingAssociation.payment_plan_id);
      }

      // Add new association
      const { error: associationError } = await supabase
        .from('student_payment_plans')
        .insert({
          student_id: studentId,
          payment_plan_id: planId
        });

      if (associationError) throw associationError;

      // Create installments for the payment plan
      const installments = [];
      const startDate = new Date(planData.start_date);
      const totalInstallments = planData.total_installments;
      const installmentValue = planData.installment_value;

      for (let i = 0; i < totalInstallments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        // Verificar se existe uma parcela paga correspondente à mesma data
        const existingPaid = existingPaidInstallments.find(paid => {
          const paidDueDate = new Date(paid.due_date);
          return paidDueDate.getTime() === dueDate.getTime();
        });

        installments.push({
          payment_plan_id: planId,
          due_date: dueDate.toISOString().split('T')[0],
          value: installmentValue,
          status: existingPaid ? 'paga' : 'em_aberto',
          payment_date: existingPaid ? existingPaid.payment_date : null
        });
      }

      const { error: installmentsError } = await supabase
        .from('installments')
        .insert(installments);

      if (installmentsError) throw installmentsError;

      showSnackbar('Plano de pagamento salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      showSnackbar('Erro ao salvar plano de pagamento', 'error');
    }
  };

  const openPaymentModal = async (student: Student) => {
    setSelectedStudent(student);
    setModalOpen(true);
    setModalLoading(true);
    setModifiedInstallments(new Set()); // Clear modified installments when opening modal

    try {
      const planId = studentPaymentPlans[student.id];
      if (!planId) {
        showSnackbar('Aluno não possui plano de pagamento associado', 'error');
        setModalOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('payment_plan_id', planId)
        .order('due_date');

      if (error) throw error;
      
      // Update status based on due date for unpaid installments
      const currentDate = new Date();
      const updatedInstallments = (data || []).map(installment => {
        if (installment.status !== 'paga') {
          const dueDate = new Date(installment.due_date);
          if (dueDate < currentDate) {
            return { ...installment, status: 'atrasada' };
          } else {
            return { ...installment, status: 'em_aberto' };
          }
        }
        return installment;
      });
      
      // Update database with new status for overdue installments
      const installmentsToUpdate = updatedInstallments.filter(installment => {
        const originalInstallment = data?.find(orig => orig.id === installment.id);
        return originalInstallment && originalInstallment.status !== installment.status;
      });
      
      if (installmentsToUpdate.length > 0) {
        for (const installment of installmentsToUpdate) {
          await supabase
            .from('installments')
            .update({ status: installment.status })
            .eq('id', installment.id);
        }
      }
      
      setInstallments(updatedInstallments);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      showSnackbar('Erro ao carregar parcelas', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const updateInstallment = async (installmentId: string, updates: Partial<Installment>) => {
    try {
      const { error } = await supabase
        .from('installments')
        .update(updates)
        .eq('id', installmentId);

      if (error) throw error;

      setInstallments(prev => 
        prev.map(inst => 
          inst.id === installmentId ? { ...inst, ...updates } : inst
        )
      );
      
      showSnackbar('Parcela atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      showSnackbar('Erro ao atualizar parcela', 'error');
    }
  };

  const handleInstallmentStatusChange = (installmentId: string, paid: boolean) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const updates: Partial<Installment> = {
      status: paid ? 'paga' : 'em_aberto',
      payment_date: paid ? currentDate : null
    };
    
    // Update local state only (not database yet)
    setInstallments(prev => 
      prev.map(inst => 
        inst.id === installmentId ? { ...inst, ...updates } : inst
      )
    );
    
    // Mark this installment as modified
    setModifiedInstallments(prev => new Set(prev).add(installmentId));
  };

  const saveInstallmentPayment = async (installmentId: string) => {
    const installment = installments.find(inst => inst.id === installmentId);
    if (!installment) return;

    try {
      const { error } = await supabase
        .from('installments')
        .update({
          status: installment.status,
          payment_date: installment.payment_date
        })
        .eq('id', installmentId);

      if (error) throw error;
      
      // Remove from modified list after successful save
      setModifiedInstallments(prev => {
        const newSet = new Set(prev);
        newSet.delete(installmentId);
        return newSet;
      });
      
      showSnackbar('Pagamento salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      showSnackbar('Erro ao salvar pagamento', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Pagamentos dos Alunos
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <FormControl fullWidth>
            <InputLabel id="group-select-label">Selecione um Grupo</InputLabel>
            <Select
              labelId="group-select-label"
              value={selectedGroupId}
              label="Selecione um Grupo"
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <MenuItem value="">
                <em>Selecione um grupo</em>
              </MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {selectedGroupId && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Alunos do Grupo
            </Typography>
            
            {loading ? (
              <Typography>Carregando alunos...</Typography>
            ) : students.length > 0 ? (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Nome</strong></TableCell>
                      <TableCell><strong>Plano de Pagamento</strong></TableCell>
                      <TableCell><strong>Ações</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <Select
                              value={studentPaymentPlans[student.id] || ''}
                              onChange={(e) => handlePlanChange(student.id, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>Selecione um plano</em>
                              </MenuItem>
                              {paymentPlans.map((plan) => (
                                <MenuItem key={plan.id} value={plan.id}>
                                  {plan.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => saveStudentPlan(student.id)}
                              disabled={!studentPaymentPlans[student.id]}
                            >
                              Salvar
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => openPaymentModal(student)}
                              disabled={!studentPaymentPlans[student.id]}
                            >
                              Gerir Pagamentos
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Nenhum aluno encontrado neste grupo
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Gestão de Pagamentos */}
      <Dialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModifiedInstallments(new Set()); // Clear modified installments when closing modal
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Gerir Pagamentos - {selectedStudent?.name}
        </DialogTitle>
        <DialogContent>
          {modalLoading ? (
            <Typography>Carregando parcelas...</Typography>
          ) : installments.length > 0 ? (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Parcela</strong></TableCell>
                    <TableCell><strong>Vencimento</strong></TableCell>
                    <TableCell><strong>Valor</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Pago</strong></TableCell>
                    <TableCell><strong>Data do Pagamento</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {installments.map((installment, index) => (
                    <TableRow key={installment.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {new Date(installment.due_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        R$ {installment.value.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            installment.status === 'paga' ? 'Paga' :
                            installment.status === 'atrasada' ? 'Vencida' : 'A Vencer'
                          }
                          sx={{
                            backgroundColor: 
                              installment.status === 'paga' ? '#4caf50' :
                              installment.status === 'atrasada' ? '#f44336' : '#ff9800',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={installment.status === 'paga'}
                              onChange={(e) => 
                                handleInstallmentStatusChange(installment.id, e.target.checked)
                              }
                            />
                          }
                          label=""
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="body2">
                            {installment.payment_date 
                              ? new Date(installment.payment_date).toLocaleDateString('pt-BR')
                              : '-'
                            }
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => saveInstallmentPayment(installment.id)}
                            sx={{ 
                              minWidth: 'auto', 
                              px: 1,
                              display: modifiedInstallments.has(installment.id) ? 'block' : 'none'
                            }}
                          >
                            Salvar
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Nenhuma parcela encontrada para este aluno
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setModalOpen(false);
            setModifiedInstallments(new Set()); // Clear modified installments when closing modal
          }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}