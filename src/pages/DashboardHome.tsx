import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  UsersRound,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  totalGroups: number;
  totalStudents: number;
  studentsPerGroup: { groupName: string; count: number }[];
  paymentsStats: {
    totalPaid: number;
    totalPending: number;
    monthlyReceivable: number;
    totalAmount: number;
    paidAmount: number;
    paymentPercentage: number;
  };
}

export function DashboardHome() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserAdminId, setCurrentUserAdminId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUserAdminId();
  }, [user]);

  useEffect(() => {
    if (currentUserAdminId !== null) {
      fetchDashboardStats();
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

  async function fetchDashboardStats() {
    try {
      setLoading(true);

      // Buscar grupos
      let groupsQuery = supabase
        .from('groups')
        .select(`
          id,
          name,
          group_administrators (
            administrator_id
          )
        `);

      if (!isAdmin && currentUserAdminId) {
        groupsQuery = groupsQuery
          .select(`
            id,
            name,
            group_administrators!inner (
              administrator_id
            )
          `)
          .eq('group_administrators.administrator_id', currentUserAdminId);
      }

      const { data: groups, error: groupsError } = await groupsQuery;
      if (groupsError) throw groupsError;

      const groupIds = groups?.map(g => g.id) || [];

      // Buscar alunos por grupo
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          name,
          group_id,
          groups (
            name
          )
        `);

      if (groupIds.length > 0) {
        studentsQuery = studentsQuery.in('group_id', groupIds);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Calcular alunos por grupo
      const studentsPerGroup = groups?.map(group => ({
        groupName: group.name,
        count: students?.filter(s => s.group_id === group.id).length || 0,
      })) || [];

      // Buscar estatísticas de pagamentos
      const studentIds = students?.map(s => s.id) || [];
      let paymentsStats = {
        totalPaid: 0,
        totalPending: 0,
        monthlyReceivable: 0, // Novo campo para valores a receber no mês
        totalAmount: 0,
        paidAmount: 0,
        paymentPercentage: 0,
      };

      if (studentIds.length > 0) {
        // Buscar planos de pagamento dos estudantes
        const { data: studentPlans, error: plansError } = await supabase
          .from('student_payment_plans')
          .select('payment_plan_id')
          .in('student_id', studentIds);

        if (plansError) {
          console.error('Plans Error:', plansError);
          throw plansError;
        }

        const planIds = studentPlans?.map(p => p.payment_plan_id) || [];

        if (planIds.length > 0) {
          // Obter data atual para filtrar por mês
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth() + 1; // getMonth() retorna 0-11
          const startOfMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
          const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

          const { data: installments, error: installmentsError } = await supabase
            .from('installments')
            .select(`
              id,
              value,
              status,
              payment_date,
              due_date
            `)
            .in('payment_plan_id', planIds);

          if (installmentsError) {
            console.error('Installments Error:', installmentsError);
          } else if (installments) {
            const totalInstallments = installments.length;
            const paidInstallments = installments.filter(i => i.status === 'paga').length;
            const totalAmount = installments.reduce((sum, i) => sum + (i.value || 0), 0);
            const paidAmount = installments
              .filter(i => i.status === 'paga')
              .reduce((sum, i) => sum + (i.value || 0), 0);

            // Calcular valores a receber no mês corrente (parcelas em aberto com vencimento no mês)
            const monthlyReceivableInstallments = installments.filter(i => {
              if (i.status !== 'em_aberto' && i.status !== 'atrasada') return false;
              const dueDate = new Date(i.due_date);
              return dueDate >= new Date(startOfMonth) && dueDate <= new Date(endOfMonth);
            });
            
            const monthlyReceivable = monthlyReceivableInstallments.reduce((sum, i) => sum + (i.value || 0), 0);

            paymentsStats = {
              totalPaid: paidInstallments,
              totalPending: totalInstallments - paidInstallments,
              monthlyReceivable,
              totalAmount,
              paidAmount,
              paymentPercentage: totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0,
            };
          }
        }
      }

      setStats({
        totalGroups: groups?.length || 0,
        totalStudents: students?.length || 0,
        studentsPerGroup,
        paymentsStats,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Erro ao carregar estatísticas do dashboard
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{
          fontFamily: 'Poppins',
          fontWeight: 600,
          color: 'text.primary',
          mb: 4,
        }}
      >
        Dashboard - Resumo Geral
      </Typography>

      <Grid container spacing={3}>
        {/* Card de Grupos */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <UsersRound size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Grupos
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {stats.totalGroups}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total de grupos cadastrados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Alunos */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              boxShadow: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Users size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Alunos
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {stats.totalStudents}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total de alunos cadastrados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Pagamentos Efetuados */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              boxShadow: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Pagos
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {stats.paymentsStats.totalPaid}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Pagamentos efetuados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de A Receber Mensal */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              boxShadow: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Calendar size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  A Receber Mensal
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                R$ {stats.paymentsStats.monthlyReceivable.toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Previsto para este mês
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Percentual de Pagamentos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <DollarSign size={28} color="#1976d2" />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Percentual de Pagamentos
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {stats.paymentsStats.paymentPercentage.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  dos pagamentos foram efetuados
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.paymentsStats.paymentPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  mb: 2,
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  R$ {stats.paymentsStats.paidAmount.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })} recebido
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  R$ {stats.paymentsStats.totalAmount.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })} total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Alunos por Grupo */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Alunos por Grupo
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {stats.studentsPerGroup.map((group, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < stats.studentsPerGroup.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {group.groupName}
                    </Typography>
                    <Chip
                      label={`${group.count} alunos`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                ))}
                {stats.studentsPerGroup.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    Nenhum grupo encontrado
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}