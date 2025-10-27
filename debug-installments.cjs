const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://guqwpqcthqzvxnkhlvmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdwcWN0aHF6dnhua2hsdm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzM2NjEsImV4cCI6MjA3NjQ0OTY2MX0.iiQr3dHaH2dPNSreufukL5i82oiox_nbkdoq8BJktQ4'
);

async function checkData() {
  console.log('🔍 Verificando dados após atribuição em lote...\n');
  
  // 1. Verificar student_payment_plans
  console.log('1. Verificando student_payment_plans:');
  const { data: studentPlans, error: plansError } = await supabase
    .from('student_payment_plans')
    .select('student_id, payment_plan_id, students(name), payment_plans(name)')
    .order('student_id');
  
  if (plansError) {
    console.error('Erro:', plansError);
  } else {
    console.log(`Total de associações: ${studentPlans.length}`);
    studentPlans.forEach(sp => {
      console.log(`  - ${sp.students?.name}: ${sp.payment_plan_id} (${sp.payment_plans?.name})`);
    });
  }
  
  // 2. Verificar installments
  console.log('\n2. Verificando installments:');
  const { data: installments, error: instError } = await supabase
    .from('installments')
    .select('student_id, payment_plan_id, installment_number, value, due_date, status, students(name)')
    .order('student_id, installment_number');
  
  if (instError) {
    console.error('Erro:', instError);
  } else {
    console.log(`Total de parcelas: ${installments.length}`);
    
    // Agrupar por aluno
    const byStudent = {};
    installments.forEach(inst => {
      const studentName = inst.students?.name || 'Desconhecido';
      if (!byStudent[studentName]) {
        byStudent[studentName] = [];
      }
      byStudent[studentName].push(inst);
    });
    
    Object.keys(byStudent).forEach(studentName => {
      const studentInstallments = byStudent[studentName];
      console.log(`  - ${studentName}: ${studentInstallments.length} parcelas`);
      studentInstallments.slice(0, 2).forEach(inst => {
        console.log(`    Parcela ${inst.installment_number}: R$ ${inst.value} - ${inst.due_date} (${inst.status})`);
      });
      if (studentInstallments.length > 2) {
        console.log(`    ... e mais ${studentInstallments.length - 2} parcelas`);
      }
    });
  }
  
  // 3. Verificar especificamente João Silva
  console.log('\n3. Verificando João Silva especificamente:');
  const { data: joaoData, error: joaoError } = await supabase
    .from('students')
    .select('id, name')
    .eq('name', 'João Silva')
    .single();
  
  if (joaoError) {
    console.error('Erro ao buscar João Silva:', joaoError);
  } else {
    console.log(`João Silva ID: ${joaoData.id}`);
    
    // Buscar plano do João
    const { data: joaoPlans, error: joaoPlanError } = await supabase
      .from('student_payment_plans')
      .select('payment_plan_id')
      .eq('student_id', joaoData.id);
    
    if (joaoPlanError) {
      console.error('Erro ao buscar plano do João:', joaoPlanError);
    } else {
      console.log(`Planos do João: ${joaoPlans.length}`);
      joaoPlans.forEach(plan => console.log(`  - Plano ID: ${plan.payment_plan_id}`));
      
      if (joaoPlans.length > 0) {
        // Buscar parcelas do João
        const { data: joaoInstallments, error: joaoInstError } = await supabase
          .from('installments')
          .select('*')
          .eq('student_id', joaoData.id)
          .eq('payment_plan_id', joaoPlans[0].payment_plan_id);
        
        if (joaoInstError) {
          console.error('Erro ao buscar parcelas do João:', joaoInstError);
        } else {
          console.log(`Parcelas do João: ${joaoInstallments.length}`);
          joaoInstallments.forEach(inst => {
            console.log(`  - Parcela ${inst.installment_number}: R$ ${inst.value} - ${inst.due_date} (${inst.status})`);
          });
        }
      }
    }
  }
}

checkData().catch(console.error);