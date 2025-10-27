// Script para investigar dados do plano 'benny'
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (usando as mesmas do projeto)
const supabaseUrl = 'https://guqwpqcthqzvxnkhlvmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdwcWN0aHF6dnhua2hsdm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzM2NjEsImV4cCI6MjA3NjQ0OTY2MX0.iiQr3dHaH2dPNSreufukL5i82oiox_nbkdoq8BJktQ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateBennyPlan() {
  console.log('🔍 Investigando dados do plano "benny"...\n');

  try {
    // 1. Buscar o plano 'benny'
    console.log('1. Buscando plano "benny":');
    const { data: bennyPlan, error: planError } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('name', 'benny');
    
    if (planError) {
      console.error('Erro ao buscar plano:', planError);
      return;
    }
    
    console.log('Plano encontrado:', bennyPlan);
    
    if (!bennyPlan || bennyPlan.length === 0) {
      console.log('❌ Plano "benny" não encontrado!');
      return;
    }
    
    const planId = bennyPlan[0].id;
    console.log(`📋 ID do plano: ${planId}\n`);

    // 2. Verificar student_payment_plans
    console.log('2. Verificando student_payment_plans:');
    const { data: studentPlans, error: studentPlansError } = await supabase
      .from('student_payment_plans')
      .select('*')
      .eq('payment_plan_id', planId);
    
    if (studentPlansError) {
      console.error('Erro ao buscar student_payment_plans:', studentPlansError);
    } else {
      console.log(`Registros em student_payment_plans: ${studentPlans.length}`);
      if (studentPlans.length > 0) {
        console.log('Dados:', studentPlans);
      }
    }

    // 3. Verificar installments
    console.log('\n3. Verificando installments:');
    const { data: installments, error: installmentsError } = await supabase
      .from('installments')
      .select('*')
      .eq('payment_plan_id', planId);
    
    if (installmentsError) {
      console.error('Erro ao buscar installments:', installmentsError);
    } else {
      console.log(`Registros em installments: ${installments.length}`);
      if (installments.length > 0) {
        console.log('Dados das parcelas:');
        installments.forEach((inst, index) => {
          console.log(`  Parcela ${index + 1}: ID=${inst.id}, Status=${inst.status}, Valor=${inst.amount}, Vencimento=${inst.due_date}`);
        });
        
        // Verificar parcelas pagas
        const paidInstallments = installments.filter(inst => inst.status === 'paid');
        console.log(`\n💰 Parcelas pagas: ${paidInstallments.length}`);
        if (paidInstallments.length > 0) {
          console.log('⚠️  PROBLEMA IDENTIFICADO: Existem parcelas pagas que impedem a exclusão!');
        }
      }
    }

    // 4. Verificar students associados
    console.log('\n4. Verificando students associados:');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .in('id', studentPlans.map(sp => sp.student_id));
    
    if (studentsError) {
      console.error('Erro ao buscar students:', studentsError);
    } else {
      console.log(`Students associados: ${students.length}`);
      if (students.length > 0) {
        console.log('Dados dos estudantes:', students);
      }
    }

    // 5. Resumo
    console.log('\n📊 RESUMO:');
    console.log(`- Plano "benny" existe: ${bennyPlan.length > 0 ? 'SIM' : 'NÃO'}`);
    console.log(`- Registros em student_payment_plans: ${studentPlans?.length || 0}`);
    console.log(`- Registros em installments: ${installments?.length || 0}`);
    console.log(`- Parcelas pagas: ${installments?.filter(i => i.status === 'paid').length || 0}`);
    console.log(`- Students associados: ${students?.length || 0}`);

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

investigateBennyPlan();