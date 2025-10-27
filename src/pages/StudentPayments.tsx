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

interface Installment {
  id: string;
  payment_plan_id: string;
  student_id: string;
  installment_number: number;
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
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modifiedInstallments, setModifiedInstallments] = useState<Set<string>>(new Set());
  
  // Remove plan confirmation dialog states
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<string | null>(null);
  const [removeDialogMessage, setRemoveDialogMessage] = useState<string>('');
  
  // Estado para filtro por plano de pagamento
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Estados para seleção múltipla
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkActionPlan, setBulkActionPlan] = useState<string>('');

  useEffect(() => {
    fetchCurrentUserAdminId();
  }, [user]);

  useEffect(() => {
    if (currentUserAdminId) {
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

  // useEffect para filtrar alunos por plano de pagamento
  useEffect(() => {
    if (!selectedPlanFilter) {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student => 
        studentPaymentPlans[student.id] === selectedPlanFilter
      );
      setFilteredStudents(filtered);
    }
  }, [students, selectedPlanFilter, studentPaymentPlans]);

  async function fetchCurrentUserAdminId() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('administrators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar admin ID:', error);
        setError('Erro ao carregar dados do usuário');
        return;
      }

      if (data) {
        setCurrentUserAdminId(data.id);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar admin ID:', err);
      setError('Erro inesperado ao carregar dados');
    }
  }

  const fetchGroups = async () => {
    if (!currentUserAdminId) return;

    try {
      setLoading(true);
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
          setError('Erro ao carregar grupos do administrador');
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
        setError('Erro ao carregar grupos');
        return;
      }

      setGroups(data || []);
    } catch (err) {
      console.error('Erro inesperado ao buscar grupos:', err);
      setError('Erro inesperado ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsByGroup = async (groupId: string) => {
    try {
      setLoading(true);
      setError(null); // Limpar erros anteriores
      
      const { data, error } = await supabase
        .from('students')
        .select('id, name, group_id')
        .eq('group_id', groupId)
        .order('name');

      if (error) {
        console.error('Erro ao buscar alunos:', error);
        setError('Erro ao carregar alunos');
        setStudents([]); // Garantir que students seja um array vazio em caso de erro
        return;
      }

      setStudents(data || []);
    } catch (err) {
      console.error('Erro inesperado ao buscar alunos:', err);
      setError('Erro inesperado ao carregar alunos');
      setStudents([]); // Garantir que students seja um array vazio em caso de erro
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

      if (error) {
        console.error('Erro ao buscar planos de pagamento:', error);
        showSnackbar('Erro ao carregar planos de pagamento', 'error');
        setPaymentPlans([]); // Garantir que paymentPlans seja um array vazio em caso de erro
        return;
      }
      
      setPaymentPlans(data || []);
    } catch (error) {
      console.error('Erro ao buscar planos de pagamento:', error);
      showSnackbar('Erro ao carregar planos de pagamento', 'error');
      setPaymentPlans([]); // Garantir que paymentPlans seja um array vazio em caso de erro
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

      if (error) {
        console.error('Erro ao buscar associações de planos:', error);
        showSnackbar('Erro ao carregar associações de planos', 'error');
        setStudentPaymentPlans({}); // Garantir que seja um objeto vazio em caso de erro
        return;
      }
      
      const associations: Record<string, string> = {};
      data?.forEach((item) => {
        associations[item.student_id] = item.payment_plan_id;
      });
      setStudentPaymentPlans(associations);
    } catch (error) {
      console.error('Erro ao buscar associações de planos:', error);
      showSnackbar('Erro ao carregar associações de planos', 'error');
      setStudentPaymentPlans({}); // Garantir que seja um objeto vazio em caso de erro
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map(student => student.id)));
      setSelectAll(true);
    } else {
      setSelectedStudents(new Set());
      setSelectAll(false);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      
      // Update selectAll state based on current selection
      setSelectAll(newSet.size === filteredStudents.length);
      
      return newSet;
    });
  };

  const handleBulkAssignPlan = async () => {
    if (!bulkActionPlan || selectedStudents.size === 0) return;

    try {
      // Buscar dados do plano de pagamento
      const { data: planData, error: planError } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('id', bulkActionPlan)
        .single();

      if (planError) throw planError;

      // Atribuir plano para cada aluno selecionado
      const promises = Array.from(selectedStudents).map(async (studentId) => {
        // Verificar se já existe uma associação
        const { data: existingAssociation } = await supabase
          .from('student_payment_plans')
          .select('payment_plan_id')
          .eq('student_id', studentId)
          .single();

        // Se já está associado ao mesmo plano, pular
        if (existingAssociation && existingAssociation.payment_plan_id === bulkActionPlan) {
          return { success: true, skipped: true };
        }

        // Verificar se já existem parcelas para este aluno e plano
        const { data: existingInstallments } = await supabase
          .from('installments')
          .select('*')
          .eq('student_id', studentId)
          .eq('payment_plan_id', bulkActionPlan);

        let existingPaidInstallments: Installment[] = [];
        
        // Se já existe uma associação diferente, buscar parcelas pagas para preservar
        if (existingAssociation && existingAssociation.payment_plan_id !== bulkActionPlan) {
          const { data: paidInstallments } = await supabase
            .from('installments')
            .select('*')
            .eq('student_id', studentId)
            .eq('payment_plan_id', existingAssociation.payment_plan_id)
            .eq('status', 'paga');
          
          existingPaidInstallments = paidInstallments || [];

          // Remove existing association and installments for old plan
          await supabase
            .from('student_payment_plans')
            .delete()
            .eq('student_id', studentId);

          await supabase
            .from('installments')
            .delete()
            .eq('student_id', studentId)
            .eq('payment_plan_id', existingAssociation.payment_plan_id);
        }

        // Criar nova associação
        const { error: associationError } = await supabase
          .from('student_payment_plans')
          .insert({
            student_id: studentId,
            payment_plan_id: bulkActionPlan
          });

        if (associationError) throw associationError;

        // Só criar parcelas se não existirem para este aluno e plano
        if (!existingInstallments || existingInstallments.length === 0) {
          console.log(`🔄 Criando parcelas para aluno ${studentId}, plano ${bulkActionPlan}`);
          console.log('📊 Dados do plano:', planData);
          
          const installments = [];
          const startDate = new Date(planData.start_date);
          const totalInstallments = planData.total_installments;
          const installmentValue = planData.installment_value;

          console.log(`📅 Data início: ${startDate}, Total parcelas: ${totalInstallments}, Valor: ${installmentValue}`);

          for (let i = 0; i < totalInstallments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(startDate.getMonth() + i);

            // Verificar se existe uma parcela paga correspondente à mesma data
            const existingPaid = existingPaidInstallments.find(paid => {
              const paidDueDate = new Date(paid.due_date);
              return paidDueDate.getTime() === dueDate.getTime();
            });

            installments.push({
              student_id: studentId,
              payment_plan_id: bulkActionPlan,
              installment_number: i + 1,
              due_date: dueDate.toISOString().split('T')[0],
              value: installmentValue,
              status: existingPaid ? 'paga' : 'em_aberto',
              payment_date: existingPaid ? existingPaid.payment_date : null
            });
          }

          console.log(`💾 Inserindo ${installments.length} parcelas:`, installments);

          const { error: installmentsError } = await supabase
            .from('installments')
            .insert(installments);

          if (installmentsError) {
            console.error('❌ Erro ao inserir parcelas:', installmentsError);
            throw installmentsError;
          } else {
            console.log('✅ Parcelas inseridas com sucesso!');
          }
        } else {
          console.log(`⚠️ Parcelas já existem para aluno ${studentId}, pulando criação`);
        }

        return { success: true };
      });

      const results = await Promise.all(promises);
      
      // Verificar se houve erros
      const errors = results.filter(result => result.error || !result.success);
      if (errors.length > 0) {
        console.error('Erros ao atribuir planos:', errors);
        showSnackbar(`Erro ao atribuir plano para ${errors.length} aluno(s)`, 'error');
        return;
      }

      // Contar quantos foram realmente processados (não pulados)
      const processedCount = results.filter(result => result.success && !result.skipped).length;
      const skippedCount = results.filter(result => result.skipped).length;

      // Atualizar estado local
      const updatedPlans = { ...studentPaymentPlans };
      selectedStudents.forEach(studentId => {
        updatedPlans[studentId] = bulkActionPlan;
      });
      setStudentPaymentPlans(updatedPlans);

      // Não limpar seleções automaticamente - deixar o usuário decidir
      // setSelectedStudents(new Set());
      // setSelectAll(false);
      setBulkActionPlan('');

      let message = `Plano atribuído com sucesso para ${processedCount} aluno(s)!`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} já possuíam este plano)`;
      }
      showSnackbar(message, 'success');
    } catch (error) {
      console.error('Erro ao atribuir planos em lote:', error);
      showSnackbar('Erro ao atribuir planos em lote', 'error');
    }
  };

  const removeStudentPlan = async (studentId: string) => {
    try {
      // Buscar o plano atual do estudante
      const { data: currentAssociation, error: assocError } = await supabase
        .from('student_payment_plans')
        .select('payment_plan_id')
        .eq('student_id', studentId)
        .single();

      if (assocError || !currentAssociation) {
        showSnackbar('Estudante não possui plano de pagamento associado', 'error');
        return;
      }

      const planId = currentAssociation.payment_plan_id;

      // Verificar se existem parcelas pagas
      const { data: paidInstallments, error: paidError } = await supabase
        .from('installments')
        .select('id')
        .eq('payment_plan_id', planId)
        .eq('status', 'paga');

      if (paidError) throw paidError;

      if (paidInstallments && paidInstallments.length > 0) {
        showSnackbar('Não é possível remover o plano pois existem parcelas já pagas', 'error');
        return;
      }

      // Remover associação do estudante
      const { error: removeAssocError } = await supabase
        .from('student_payment_plans')
        .delete()
        .eq('student_id', studentId);

      if (removeAssocError) throw removeAssocError;

      // Remover todas as parcelas do plano
      const { error: removeInstallmentsError } = await supabase
        .from('installments')
        .delete()
        .eq('payment_plan_id', planId);

      if (removeInstallmentsError) throw removeInstallmentsError;

      // Atualizar o estado local
      setStudentPaymentPlans(prev => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });

      showSnackbar('Plano de pagamento removido com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover plano:', error);
      showSnackbar('Erro ao remover plano de pagamento', 'error');
    }
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

      // Verificar se já existe uma associação
      const { data: existingAssociation } = await supabase
        .from('student_payment_plans')
        .select('payment_plan_id')
        .eq('student_id', studentId)
        .single();

      // Se já está associado ao mesmo plano, não fazer nada
      if (existingAssociation && existingAssociation.payment_plan_id === planId) {
        showSnackbar('Estudante já está associado a este plano de pagamento', 'success');
        return;
      }

      // Verificar se já existem parcelas para este aluno e plano (criadas por generateInstallmentsForGroup)
      const { data: existingInstallments } = await supabase
        .from('installments')
        .select('*')
        .eq('student_id', studentId)
        .eq('payment_plan_id', planId);

      let existingPaidInstallments: Installment[] = [];
      
      // Se já existe uma associação diferente, buscar parcelas pagas para preservar
      if (existingAssociation && existingAssociation.payment_plan_id !== planId) {
        const { data: paidInstallments } = await supabase
          .from('installments')
          .select('*')
          .eq('student_id', studentId)
          .eq('payment_plan_id', existingAssociation.payment_plan_id)
          .eq('status', 'paga');
        
        existingPaidInstallments = paidInstallments || [];

        // Remove existing association and installments for old plan
        await supabase
          .from('student_payment_plans')
          .delete()
          .eq('student_id', studentId);

        await supabase
          .from('installments')
          .delete()
          .eq('student_id', studentId)
          .eq('payment_plan_id', existingAssociation.payment_plan_id);
      }

      // Criar nova associação (sempre, seja primeira vez ou mudança de plano)
      const { error: associationError } = await supabase
        .from('student_payment_plans')
        .insert({
          student_id: studentId,
          payment_plan_id: planId
        });

      if (associationError) throw associationError;

      // Só criar parcelas se não existirem para este aluno e plano
      if (!existingInstallments || existingInstallments.length === 0) {
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
            student_id: studentId,
            payment_plan_id: planId,
            installment_number: i + 1,
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
      }

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
        .eq('student_id', student.id)
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

  const handleInstallmentStatusChange = (installmentId: string, paid: boolean) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const updates: Partial<Installment> = {
      status: paid ? 'paga' : 'em_aberto',
      payment_date: paid ? currentDate : undefined
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

  const handleRemovePlan = async (studentId: string) => {
    try {
      // Buscar o plano atual do estudante
      const { data: currentAssociation, error: assocError } = await supabase
        .from('student_payment_plans')
        .select('payment_plan_id')
        .eq('student_id', studentId)
        .single();

      if (assocError || !currentAssociation) {
        showSnackbar('Estudante não possui plano de pagamento associado', 'error');
        return;
      }

      const planId = currentAssociation.payment_plan_id;

      // Verificar parcelas pagas e vencidas
      const { data: installmentsData, error: installmentsError } = await supabase
        .from('installments')
        .select('id, status, due_date')
        .eq('payment_plan_id', planId);

      if (installmentsError) throw installmentsError;

      const paidInstallments = installmentsData?.filter(inst => inst.status === 'paga') || [];
      const overdueInstallments = installmentsData?.filter(inst => 
        inst.status === 'atrasada' || 
        (inst.status === 'em_aberto' && new Date(inst.due_date) < new Date())
      ) || [];

      // Criar mensagem personalizada baseada no status das parcelas
      let message = 'Tem certeza que deseja remover o plano de pagamento deste aluno?\n\n';
      
      if (paidInstallments.length > 0 || overdueInstallments.length > 0) {
        message += '⚠️ ATENÇÃO:\n';
        
        if (paidInstallments.length > 0) {
          message += `• ${paidInstallments.length} parcela(s) já foi(ram) paga(s)\n`;
        }
        
        if (overdueInstallments.length > 0) {
          message += `• ${overdueInstallments.length} parcela(s) está(ão) vencida(s)\n`;
        }
        
        message += '\nEsta ação irá remover todas as parcelas geradas e não pode ser desfeita.';
      } else {
        message += 'Esta ação irá remover todas as parcelas geradas e não pode ser desfeita.\nSó é possível remover o plano se nenhuma parcela foi paga ainda.';
      }

      setRemoveDialogMessage(message);
      setStudentToRemove(studentId);
      setRemoveDialogOpen(true);
    } catch (error) {
      console.error('Erro ao verificar parcelas:', error);
      showSnackbar('Erro ao verificar status das parcelas', 'error');
    }
  };

  const confirmRemovePlan = async () => {
    if (studentToRemove) {
      await removeStudentPlan(studentToRemove);
      setRemoveDialogOpen(false);
      setStudentToRemove(null);
      setRemoveDialogMessage('');
    }
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

  const handleBulkRemovePlans = async () => {
    if (selectedStudents.size === 0) return;

    try {
      // Buscar associações existentes para os alunos selecionados
      const { data: existingAssociations, error: fetchError } = await supabase
        .from('student_payment_plans')
        .select('student_id, payment_plan_id')
        .in('student_id', Array.from(selectedStudents));

      if (fetchError) {
        console.error('Erro ao buscar associações:', fetchError);
        showSnackbar('Erro ao buscar associações de planos', 'error');
        return;
      }

      if (!existingAssociations || existingAssociations.length === 0) {
        showSnackbar('Nenhum aluno selecionado possui plano de pagamento', 'error');
        return;
      }

      // Remover associações e parcelas relacionadas
      const promises = existingAssociations.map(async (association) => {
        // Primeiro, remover as parcelas relacionadas
        const { error: installmentsError } = await supabase
          .from('installments')
          .delete()
          .eq('student_id', association.student_id)
          .eq('payment_plan_id', association.payment_plan_id);

        if (installmentsError) {
          console.error('Erro ao remover parcelas:', installmentsError);
          return { error: installmentsError, student_id: association.student_id };
        }

        // Depois, remover a associação
        const { error: associationError } = await supabase
          .from('student_payment_plans')
          .delete()
          .eq('student_id', association.student_id);

        if (associationError) {
          console.error('Erro ao remover associação:', associationError);
          return { error: associationError, student_id: association.student_id };
        }

        return { success: true, student_id: association.student_id };
      });

      const results = await Promise.all(promises);
      
      // Verificar se houve erros
      const errors = results.filter(result => result.error);
      const successes = results.filter(result => result.success);

      if (errors.length > 0) {
        console.error('Erros ao remover planos:', errors);
        showSnackbar(`Erro ao remover plano para ${errors.length} aluno(s)`, 'error');
      }

      if (successes.length > 0) {
        // Atualizar estado local
        const updatedPlans = { ...studentPaymentPlans };
        successes.forEach(result => {
          delete updatedPlans[result.student_id];
        });
        setStudentPaymentPlans(updatedPlans);

        showSnackbar(`Plano removido com sucesso para ${successes.length} aluno(s)!`, 'success');
      }

      // Não limpar seleções automaticamente - deixar o usuário decidir
      // setSelectedStudents(new Set());
      // setSelectAll(false);
      setBulkActionPlan('');

    } catch (error) {
      console.error('Erro ao remover planos em lote:', error);
      showSnackbar('Erro ao remover planos em lote', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Pagamentos dos Alunos
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel id="plan-filter-label">Filtrar por Plano de Pagamento</InputLabel>
              <Select
                labelId="plan-filter-label"
                value={selectedPlanFilter}
                label="Filtrar por Plano de Pagamento"
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos os planos</em>
                </MenuItem>
                {paymentPlans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      {selectedGroupId && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Alunos do Grupo
            </Typography>
            
            {/* Seção de Ações Coletivas */}
            {selectedStudents.size > 0 && (
              <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Ações Coletivas ({selectedStudents.size} aluno{selectedStudents.size > 1 ? 's' : ''} selecionado{selectedStudents.size > 1 ? 's' : ''})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
                      <InputLabel id="bulk-plan-select-label">Selecionar Plano</InputLabel>
                      <Select
                        labelId="bulk-plan-select-label"
                        value={bulkActionPlan}
                        label="Selecionar Plano"
                        onChange={(e) => setBulkActionPlan(e.target.value)}
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
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleBulkAssignPlan}
                      disabled={!bulkActionPlan}
                      sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                    >
                      Atribuir Plano
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleBulkRemovePlans}
                      sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'grey.300', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                      Remover Planos
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSelectedStudents(new Set());
                        setSelectAll(false);
                      }}
                      sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'grey.300', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                      Limpar Seleção
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
            
            {loading ? (
              <Typography>Carregando alunos...</Typography>
            ) : filteredStudents.length > 0 ? (
              <>
                {/* Layout Desktop - Tabela */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <Checkbox
                                checked={selectAll}
                                indeterminate={selectedStudents.size > 0 && selectedStudents.size < filteredStudents.length}
                                onChange={handleSelectAll}
                              />
                          </TableCell>
                          <TableCell><strong>Nome</strong></TableCell>
                          <TableCell><strong>Plano de Pagamento</strong></TableCell>
                          <TableCell><strong>Ações</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedStudents.has(student.id)}
                                onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                              />
                            </TableCell>
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
                                {/* Verificar se o estudante já tem um plano salvo no banco */}
                                {Object.keys(studentPaymentPlans).includes(student.id) && studentPaymentPlans[student.id] && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemovePlan(student.id)}
                                  >
                                    Remover Plano
                                  </Button>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Layout Mobile - Cards */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 2 }}>
                  {filteredStudents.map((student) => (
                    <Card key={student.id} sx={{ mb: 1.5, boxShadow: 1 }}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, fontSize: '1.1rem' }}>
                          {student.name}
                        </Typography>
                        
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                          <InputLabel id={`plan-select-${student.id}`}>Plano de Pagamento</InputLabel>
                          <Select
                            labelId={`plan-select-${student.id}`}
                            value={studentPaymentPlans[student.id] || ''}
                            label="Plano de Pagamento"
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

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{ flex: 1, py: 0.75 }}
                            onClick={() => saveStudentPlan(student.id)}
                            disabled={!studentPaymentPlans[student.id]}
                          >
                            Salvar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ flex: 1, py: 0.75 }}
                            onClick={() => openPaymentModal(student)}
                            disabled={!studentPaymentPlans[student.id]}
                          >
                            Gerir Pagamentos
                          </Button>
                        </Box>
                        
                        {/* Botão de remover plano - apenas se o estudante já tem um plano salvo */}
                        {Object.keys(studentPaymentPlans).includes(student.id) && studentPaymentPlans[student.id] && (
                          <Box sx={{ mt: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              fullWidth
                              onClick={() => handleRemovePlan(student.id)}
                            >
                              Remover Plano
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {selectedPlanFilter 
                  ? 'Nenhum aluno encontrado com o plano selecionado' 
                  : 'Nenhum aluno encontrado neste grupo'
                }
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
        sx={{
          '& .MuiDialog-paper': {
            margin: { xs: 0.5, sm: 2 },
            width: { xs: 'calc(100vw - 8px)', sm: 'auto' },
            maxWidth: { xs: 'calc(100vw - 8px)', sm: 'md' },
            maxHeight: { xs: 'calc(100vh - 8px)', sm: 'auto' },
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, px: { xs: 1.5, sm: 3 } }}>
          Gerir Pagamentos - {selectedStudent?.name}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 3 }, py: 1, overflow: 'auto' }}>
          {modalLoading ? (
            <Typography>Carregando parcelas...</Typography>
          ) : installments.length > 0 ? (
            <>
              {/* Layout Desktop - Tabela */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
                              {modifiedInstallments.has(installment.id) && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => saveInstallmentPayment(installment.id)}
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 1
                                  }}
                                >
                                  Salvar
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Layout Mobile - Cards */}
              <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 1 }}>
                {installments.map((installment, index) => (
                  <Card key={installment.id} sx={{ mb: 1, boxShadow: 1, overflow: 'hidden' }}>
                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                      {/* Cabeçalho com parcela e status */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 1,
                        flexWrap: 'nowrap',
                        overflow: 'hidden'
                      }}>
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                          mr: 1
                        }}>
                          Parcela {index + 1}
                        </Typography>
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
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            height: 20,
                            flexShrink: 0
                          }}
                          size="small"
                        />
                      </Box>
                      
                      {/* Layout vertical compacto para mobile */}
                      <Box sx={{ mb: 1 }}>
                        {/* Vencimento e Valor em linha */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          mb: 0.5,
                          gap: 1
                        }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ 
                              fontSize: '0.65rem',
                              display: 'block',
                              lineHeight: 1
                            }}>
                              Vencimento
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 500, 
                              fontSize: '0.8rem',
                              lineHeight: 1.1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {new Date(installment.due_date).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ 
                              fontSize: '0.65rem',
                              display: 'block',
                              lineHeight: 1
                            }}>
                              Valor
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 600, 
                              fontSize: '0.8rem',
                              lineHeight: 1.1,
                              color: '#1976d2'
                            }}>
                              R$ {installment.value.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Data de pagamento se existir */}
                        {installment.payment_date && (
                          <Box sx={{ mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ 
                              fontSize: '0.65rem',
                              display: 'block',
                              lineHeight: 1
                            }}>
                              Data do Pagamento
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 500, 
                              fontSize: '0.8rem',
                              lineHeight: 1.1,
                              color: '#4caf50'
                            }}>
                              {new Date(installment.payment_date).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Checkbox e botão em layout responsivo */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 0.5,
                        alignItems: { xs: 'stretch', sm: 'center' }
                      }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={installment.status === 'paga'}
                              onChange={(e) => 
                                handleInstallmentStatusChange(installment.id, e.target.checked)
                              }
                              size="small"
                              sx={{ p: 0.5 }}
                            />
                          }
                          label="Marcar como pago"
                          sx={{ 
                            margin: 0,
                            flex: 1,
                            '& .MuiFormControlLabel-label': {
                              fontSize: '0.75rem',
                              lineHeight: 1.2
                            }
                          }}
                        />
                        
                        {modifiedInstallments.has(installment.id) && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => saveInstallmentPayment(installment.id)}
                            sx={{ 
                              minWidth: { xs: 'auto', sm: 60 },
                              px: 1.5,
                              py: 0.25,
                              fontSize: '0.7rem',
                              height: 28,
                              alignSelf: { xs: 'flex-end', sm: 'center' },
                              width: { xs: 'fit-content', sm: 'auto' }
                            }}
                          >
                            Salvar
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </>
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

      {/* Diálogo de Confirmação de Remoção */}
      <Dialog
        open={removeDialogOpen}
        onClose={() => setRemoveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirmar Remoção do Plano
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-line' }}>
            {removeDialogMessage || 'Tem certeza que deseja remover o plano de pagamento deste aluno?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRemoveDialogOpen(false);
            setRemoveDialogMessage('');
          }}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmRemovePlan} 
            color="error" 
            variant="contained"
          >
            Confirmar Remoção
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