import { supabase } from '../config/supabase';

export interface DeletionCheck {
  canDelete: boolean;
  blockReason?: string;
  warningMessage?: string;
  dependentItems?: {
    type: string;
    count: number;
    details?: string;
  }[];
}

export interface DeletionResult {
  success: boolean;
  message: string;
  error?: string;
}

// Verificar se um grupo pode ser excluído
export async function canDeleteGroup(groupId: string): Promise<DeletionCheck> {
  try {
    // Verificar alunos no grupo
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .eq('group_id', groupId);

    if (studentsError) throw studentsError;

    // Verificar planos de pagamento do grupo
    const { data: paymentPlans, error: plansError } = await supabase
      .from('payment_plans')
      .select('id, name')
      .eq('group_id', groupId);

    if (plansError) throw plansError;

    const dependentItems = [];

    if (students && students.length > 0) {
      dependentItems.push({
        type: 'students',
        count: students.length,
        details: `Alunos: ${students.map(s => s.name).join(', ')}`
      });
    }

    if (paymentPlans && paymentPlans.length > 0) {
      dependentItems.push({
        type: 'payment_plans',
        count: paymentPlans.length,
        details: `Planos: ${paymentPlans.map(p => p.name).join(', ')}`
      });
    }

    if (dependentItems.length > 0) {
      return {
        canDelete: false,
        blockReason: 'Este grupo possui dependências que impedem sua exclusão.',
        dependentItems
      };
    }

    return { canDelete: true };
  } catch (error) {
    return {
      canDelete: false,
      blockReason: 'Erro ao verificar dependências do grupo.',
      dependentItems: []
    };
  }
}

// Verificar se um aluno pode ser excluído
export async function canDeleteStudent(studentId: string): Promise<DeletionCheck> {
  try {

    // Verificar parcelas pagas do aluno
    const { data: paidInstallments, error: paidError } = await supabase
      .from('installments')
      .select('id, payment_plan_id')
      .eq('student_id', studentId)
      .eq('status', 'paga');

    if (paidError) throw paidError;

    // Verificar parcelas vencidas (atrasadas)
    const { data: overdueInstallments, error: overdueError } = await supabase
      .from('installments')
      .select('id, payment_plan_id')
      .eq('student_id', studentId)
      .eq('status', 'atrasada');

    if (overdueError) throw overdueError;

    const dependentItems = [];
    const totalRelevantInstallments = (paidInstallments?.length || 0) + (overdueInstallments?.length || 0);

    // Mostrar modal apenas se há parcelas pagas ou vencidas
    if (totalRelevantInstallments > 0) {
      // Adicionar parcelas pagas se existirem
      if (paidInstallments && paidInstallments.length > 0) {
        dependentItems.push({
          type: 'paid_installments',
          count: paidInstallments.length,
          details: 'Parcelas pagas'
        });
      }

      // Adicionar parcelas vencidas se existirem
      if (overdueInstallments && overdueInstallments.length > 0) {
        dependentItems.push({
          type: 'overdue_installments',
          count: overdueInstallments.length,
          details: 'Parcelas vencidas'
        });
      }

      return {
        canDelete: true,
        warningMessage: `Este aluno possui ${totalRelevantInstallments} parcela(s) paga(s) ou vencida(s). Escolha como proceder com a exclusão.`,
        dependentItems
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error('Erro detalhado em canDeleteStudent:', error);
    console.error('Student ID:', studentId);
    return {
      canDelete: false,
      blockReason: `Erro ao verificar dependências do aluno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      dependentItems: []
    };
  }
}

// Verificar se um plano de pagamento pode ser excluído
export async function canDeletePaymentPlan(planId: string): Promise<DeletionCheck> {
  try {
    // Verificar parcelas pagas do plano
    const { data: paidInstallments, error: paidError } = await supabase
      .from('installments')
      .select('id, student_id, students(name)')
      .eq('payment_plan_id', planId)
      .eq('status', 'paga');

    if (paidError) throw paidError;

    // Verificar alunos associados ao plano
    const { data: associatedStudents, error: studentsError } = await supabase
      .from('student_payment_plans')
      .select('student_id, students(name)')
      .eq('payment_plan_id', planId);

    if (studentsError) throw studentsError;

    const dependentItems = [];

    // Parcelas pagas BLOQUEIAM a exclusão
    if (paidInstallments && paidInstallments.length > 0) {
      dependentItems.push({
        type: 'paid_installments',
        count: paidInstallments.length,
        details: 'Parcelas pagas (histórico financeiro protegido)'
      });

      return {
        canDelete: false,
        blockReason: 'Este plano possui parcelas pagas e não pode ser excluído para preservar o histórico financeiro.',
        dependentItems
      };
    }

    // Alunos associados BLOQUEIAM a exclusão
    if (associatedStudents && associatedStudents.length > 0) {
      const studentNames = associatedStudents
        .map(s => s.students?.name)
        .filter(name => name)
        .join(', ');

      dependentItems.push({
        type: 'associated_students',
        count: associatedStudents.length,
        details: `Alunos: ${studentNames}`
      });

      return {
        canDelete: false,
        blockReason: `Este plano está associado a ${associatedStudents.length} aluno(s). Para excluir este plano, primeiro remova-o de todos os alunos associados na página de Pagamentos dos Alunos.`,
        warningMessage: `Este plano está associado a ${associatedStudents.length} aluno(s). Ao excluir o plano, todas as parcelas pendentes desses alunos também serão removidas. Deseja continuar?`,
        dependentItems
      };
    }

    return { canDelete: true };
  } catch (error) {
    return {
      canDelete: false,
      blockReason: 'Erro ao verificar dependências do plano de pagamento.',
      dependentItems: []
    };
  }
}

// Verificar se uma parcela pode ser excluída
export async function canDeleteInstallment(installmentId: string): Promise<DeletionCheck> {
  try {
    const { data: installment, error } = await supabase
      .from('installments')
      .select('status')
      .eq('id', installmentId)
      .single();

    if (error) throw error;

    if (installment.status === 'paga') {
      return {
        canDelete: false,
        blockReason: 'Parcelas pagas não podem ser excluídas para preservar o histórico financeiro.',
        dependentItems: []
      };
    }

    return { canDelete: true };
  } catch (error) {
    return {
      canDelete: false,
      blockReason: 'Erro ao verificar status da parcela.',
      dependentItems: []
    };
  }
}

// Função para executar exclusão com limpeza de dependências
export async function deleteWithCleanup(
  entityType: 'group' | 'student' | 'payment_plan' | 'installment',
  entityId: string,
  deleteInstallments?: boolean
): Promise<DeletionResult> {
  try {
    switch (entityType) {
      case 'group':
        // Grupos só podem ser excluídos se estiverem vazios
        console.log('Tentando excluir grupo com ID:', entityId);
        
        // Primeiro, remover todos os administradores do grupo
        console.log('Removendo administradores do grupo...');
        const { error: adminError } = await supabase
          .from('group_administrators')
          .delete()
          .eq('group_id', entityId);
        
        if (adminError) {
          console.error('Erro ao remover administradores:', adminError);
          throw adminError;
        }
        console.log('Administradores removidos com sucesso');
        
        // Agora excluir o grupo
        const { error: groupError } = await supabase
          .from('groups')
          .delete()
          .eq('id', entityId);
        
        console.log('Erro do Supabase ao excluir grupo:', groupError);
        if (groupError) throw groupError;
        console.log('Grupo excluído com sucesso no banco');
        return { success: true, message: 'Grupo excluído com sucesso!' };

      case 'student':
        // Se deleteInstallments for true, excluir TODAS as parcelas (incluindo pagas)
        // Se for false ou undefined, excluir apenas pendentes/atrasadas (comportamento padrão)
        if (deleteInstallments) {
          // Excluir TODAS as parcelas do aluno
          await supabase
            .from('installments')
            .delete()
            .eq('student_id', entityId);
        } else {
          // Excluir apenas parcelas pendentes/atrasadas (comportamento padrão)
          await supabase
            .from('installments')
            .delete()
            .eq('student_id', entityId)
            .in('status', ['em_aberto', 'atrasada']);
        }

        // Remover associações com planos
        await supabase
          .from('student_payment_plans')
          .delete()
          .eq('student_id', entityId);

        // Excluir o aluno
        const { error: studentError } = await supabase
          .from('students')
          .delete()
          .eq('id', entityId);
        
        if (studentError) throw studentError;
        
        const studentMessage = deleteInstallments 
          ? 'Aluno e todas as suas parcelas pagas/vencidas foram excluídos com sucesso!'
          : 'Aluno excluído com sucesso! Parcelas pagas/vencidas foram mantidas para histórico.';
        
        return { success: true, message: studentMessage };

      case 'payment_plan':
        // Excluir parcelas pendentes do plano primeiro
        await supabase
          .from('installments')
          .delete()
          .eq('payment_plan_id', entityId)
          .in('status', ['em_aberto', 'atrasada']);

        // Remover associações com alunos
        await supabase
          .from('student_payment_plans')
          .delete()
          .eq('payment_plan_id', entityId);

        // Excluir o plano
        const { error: planError } = await supabase
          .from('payment_plans')
          .delete()
          .eq('id', entityId);
        
        if (planError) throw planError;
        return { success: true, message: 'Plano de pagamento e suas parcelas pendentes foram excluídos com sucesso!' };

      case 'installment':
        const { error: installmentError } = await supabase
          .from('installments')
          .delete()
          .eq('id', entityId);
        
        if (installmentError) throw installmentError;
        return { success: true, message: 'Parcela excluída com sucesso!' };

      default:
        return { success: false, message: 'Tipo de entidade não reconhecido.', error: 'Invalid entity type' };
    }
  } catch (error: any) {
    console.error('Erro capturado em deleteWithCleanup:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return {
      success: false,
      message: `Erro ao excluir item: ${error.message || 'Erro desconhecido'}`,
      error: error.message || 'Erro desconhecido'
    };
  }
}