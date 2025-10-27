// Script temporário para verificar dados de João Silva
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugJoaoSilva() {
  console.log('🔍 Verificando dados de João Silva...');
  
  // 1. Buscar João Silva na tabela students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .ilike('name', '%João Silva%');
    
  console.log('👤 Estudantes encontrados:', students);
  
  if (students && students.length > 0) {
    const joao = students[0];
    console.log('📋 Dados de João Silva:', joao);
    
    // 2. Verificar se tem plano de pagamento associado
    const { data: studentPlan, error: planError } = await supabase
      .from('student_payment_plans')
      .select('*')
      .eq('student_id', joao.id);
      
    console.log('💳 Plano de pagamento de João:', studentPlan);
    
    if (studentPlan && studentPlan.length > 0) {
      // 3. Verificar as parcelas
      const { data: installments, error: installmentsError } = await supabase
        .from('installments')
        .select('*')
        .eq('payment_plan_id', studentPlan[0].payment_plan_id);
        
      console.log('💰 Parcelas de João:', installments);
    }
  }
}

debugJoaoSilva().catch(console.error);