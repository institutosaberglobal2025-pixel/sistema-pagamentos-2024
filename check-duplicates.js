import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase usando as credenciais reais do projeto
const supabaseUrl = 'https://guqwpqcthqzvxnkhlvmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdwcWN0aHF6dnhua2hsdm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NzM2NjEsImV4cCI6MjA3NjQ0OTY2MX0.iiQr3dHaH2dPNSreufukL5i82oiox_nbkdoq8BJktQ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateInstallments() {
  try {
    console.log('Verificando parcelas duplicadas...\n');

    // Buscar todas as parcelas
    const { data: installments, error } = await supabase
      .from('installments')
      .select('*')
      .order('payment_plan_id, due_date');

    if (error) {
      console.error('Erro ao buscar parcelas:', error);
      return;
    }

    console.log(`Total de parcelas encontradas: ${installments.length}\n`);

    // Agrupar por payment_plan_id
    const groupedByPlan = {};
    installments.forEach(installment => {
      if (!groupedByPlan[installment.payment_plan_id]) {
        groupedByPlan[installment.payment_plan_id] = [];
      }
      groupedByPlan[installment.payment_plan_id].push(installment);
    });

    console.log(`Planos de pagamento encontrados: ${Object.keys(groupedByPlan).length}\n`);

    // Verificar duplicatas
    let duplicatesFound = false;
    for (const [planId, planInstallments] of Object.entries(groupedByPlan)) {
      console.log(`Plano ${planId}: ${planInstallments.length} parcelas`);
      
      const dueDateCounts = {};
      
      planInstallments.forEach(installment => {
        const dueDate = installment.due_date;
        if (!dueDateCounts[dueDate]) {
          dueDateCounts[dueDate] = [];
        }
        dueDateCounts[dueDate].push(installment);
      });

      // Verificar se há duplicatas para este plano
      const duplicatedDates = Object.entries(dueDateCounts).filter(([date, installments]) => installments.length > 1);
      
      if (duplicatedDates.length > 0) {
        duplicatesFound = true;
        console.log(`\n🔴 DUPLICATAS ENCONTRADAS para o plano ${planId}:`);
        
        duplicatedDates.forEach(([date, duplicateInstallments]) => {
          console.log(`  Data de vencimento: ${date} (${duplicateInstallments.length} parcelas)`);
          duplicateInstallments.forEach((inst, index) => {
            console.log(`    ${index + 1}. ID: ${inst.id}, Valor: R$ ${inst.value}, Status: ${inst.status}`);
          });
        });
      }
    }

    if (!duplicatesFound) {
      console.log('\n✅ Nenhuma parcela duplicada encontrada!');
    }

    // Verificar especificamente para João Silva
    console.log('\n--- Verificação específica para João Silva ---');
    
    const { data: joaoStudent, error: joaoError } = await supabase
      .from('students')
      .select('id')
      .eq('name', 'João Silva')
      .single();

    if (joaoError) {
      console.log('João Silva não encontrado na base de dados');
      return;
    }

    const { data: joaoAssociation, error: assocError } = await supabase
      .from('student_payment_plans')
      .select('payment_plan_id')
      .eq('student_id', joaoStudent.id)
      .single();

    if (assocError) {
      console.log('João Silva não possui plano de pagamento associado');
      return;
    }

    const joaoInstallments = groupedByPlan[joaoAssociation.payment_plan_id] || [];
    console.log(`João Silva possui ${joaoInstallments.length} parcelas no plano ${joaoAssociation.payment_plan_id}`);
    
    joaoInstallments.forEach((inst, index) => {
      console.log(`  ${index + 1}. Vencimento: ${inst.due_date}, Valor: R$ ${inst.value}, Status: ${inst.status}`);
    });

  } catch (error) {
    console.error('Erro durante a verificação:', error);
  }
}

checkDuplicateInstallments();