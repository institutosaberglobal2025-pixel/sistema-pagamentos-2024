import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface PaymentData {
  id: string;
  student_name: string;
  group_name: string;
  value: number;
  due_date: string;
  payment_date?: string;
  status: 'paga' | 'em_aberto' | 'atrasada';
}

interface ReportsStats {
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  overduePayments: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

interface MonthlyStats {
  paidThisMonth: number;
  paidThisMonthAmount: number;
  overdueThisMonth: number;
  overdueThisMonthAmount: number;
  expectedThisMonth: number;
  expectedThisMonthAmount: number;
}

interface GeneralStats {
  totalExpectedAmount: number;
  totalPaidAmount: number;
  totalStudents: number;
}

type FilterType = 'all' | 'paid_this_month' | 'overdue_this_month' | 'expected_this_month';

export function Reports() {
  const { user, isAdmin } = useAuth();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
  const [stats, setStats] = useState<ReportsStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentUserAdminId, setCurrentUserAdminId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [reportTitle, setReportTitle] = useState<string>('Detalhes dos Pagamentos');

  useEffect(() => {
    fetchCurrentUserAdminId();
  }, [user]);

  useEffect(() => {
    if (currentUserAdminId !== null) {
      fetchData();
    }
  }, [currentUserAdminId, isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [payments, selectedGroup, selectedStatus]);

  const fetchCurrentUserAdminId = async () => {
    if (!user?.id) return;

    try {
      const { data: administrator, error } = await supabase
        .from('administrators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar administrator:', error);
        setCurrentUserAdminId(null);
      } else {
        setCurrentUserAdminId(administrator?.id || null);
      }
    } catch (error) {
      console.error('Erro ao buscar administrator:', error);
      setCurrentUserAdminId(null);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('🔄 Iniciando busca de dados para relatórios...');
      console.log('👤 User ID:', user.id);
      console.log('🔑 Is Admin:', isAdmin);
      console.log('👤 Administrator ID:', currentUserAdminId);

      // USAR EXATAMENTE A MESMA LÓGICA DO DASHBOARD
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
      
      if (groupsError) {
        console.error('❌ Erro ao buscar grupos:', groupsError);
        throw groupsError;
      }

      console.log('✅ Grupos encontrados:', groups);
      setGroups(groups || []);

      const groupIds = groups?.map(g => g.id) || [];

      if (groupIds.length === 0) {
        console.log('⚠️ Nenhum grupo encontrado');
        setPayments([]);
        setStats({
          totalPayments: 0,
          paidPayments: 0,
          pendingPayments: 0,
          overduePayments: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
        });
        setMonthlyStats({
          paidThisMonth: 0,
          paidThisMonthAmount: 0,
          overdueThisMonth: 0,
          overdueThisMonthAmount: 0,
          expectedThisMonth: 0,
          expectedThisMonthAmount: 0,
        });
        setGeneralStats({
          totalExpectedAmount: 0,
          totalPaidAmount: 0,
          totalStudents: 0,
        });
        setLoading(false);
        return;
      }

      // Buscar estudantes dos grupos (igual ao Dashboard)
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

      if (studentsError) {
        console.error('❌ Erro ao buscar estudantes:', studentsError);
        throw studentsError;
      }

      console.log('👥 Estudantes encontrados:', students);

      const studentIds = students?.map(s => s.id) || [];

      if (studentIds.length === 0) {
        console.log('⚠️ Nenhum estudante encontrado nos grupos');
        setPayments([]);
        setStats({
          totalPayments: 0,
          paidPayments: 0,
          pendingPayments: 0,
          overduePayments: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
        });
        setMonthlyStats({
          paidThisMonth: 0,
          paidThisMonthAmount: 0,
          overdueThisMonth: 0,
          overdueThisMonthAmount: 0,
          expectedThisMonth: 0,
          expectedThisMonthAmount: 0,
        });
        setGeneralStats({
          totalExpectedAmount: 0,
          totalPaidAmount: 0,
          totalStudents: students?.length || 0,
        });
        setLoading(false);
        return;
      }

      // Buscar planos de pagamento dos estudantes (igual ao Dashboard)
      const { data: studentPlans, error: plansError } = await supabase
        .from('student_payment_plans')
        .select('payment_plan_id, student_id')
        .in('student_id', studentIds);

      if (plansError) {
        console.error('❌ Erro ao buscar planos:', plansError);
        throw plansError;
      }

      console.log('📋 Planos de pagamento encontrados:', studentPlans);

      const planIds = studentPlans?.map(p => p.payment_plan_id) || [];

      if (planIds.length === 0) {
        console.log('⚠️ Nenhum plano de pagamento encontrado');
        setPayments([]);
        setStats({
          totalPayments: 0,
          paidPayments: 0,
          pendingPayments: 0,
          overduePayments: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
        });
        setMonthlyStats({
          paidThisMonth: 0,
          paidThisMonthAmount: 0,
          overdueThisMonth: 0,
          overdueThisMonthAmount: 0,
          expectedThisMonth: 0,
          expectedThisMonthAmount: 0,
        });
        setGeneralStats({
          totalExpectedAmount: 0,
          totalPaidAmount: 0,
          totalStudents: students?.length || 0,
        });
        setLoading(false);
        return;
      }

      // Buscar parcelas (igual ao Dashboard)
      const { data: installments, error: installmentsError } = await supabase
        .from('installments')
        .select(`
          id,
          value,
          due_date,
          payment_date,
          status,
          payment_plan_id
        `)
        .in('payment_plan_id', planIds);

      if (installmentsError) {
        console.error('❌ Erro ao buscar parcelas:', installmentsError);
        throw installmentsError;
      }

      console.log('💰 Parcelas encontradas:', installments);

      // Processar dados para o relatório
      const paymentsData: PaymentData[] = [];
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      for (const installment of installments || []) {
        const studentPlan = studentPlans?.find(sp => sp.payment_plan_id === installment.payment_plan_id);
        const student = students?.find(s => s.id === studentPlan?.student_id);
        const group = groups?.find(g => g.id === student?.group_id);

        if (student && group) {
          const dueDate = new Date(installment.due_date);
          let status = installment.status;

          // Verificar se está atrasada
          if (status === 'em_aberto' && dueDate < today) {
            status = 'atrasada';
          }

          paymentsData.push({
            id: installment.id,
            student_name: student.name,
            group_name: group.name,
            value: installment.value || 0,
            due_date: installment.due_date,
            payment_date: installment.payment_date,
            status: status as 'paga' | 'em_aberto' | 'atrasada',
          });
        }
      }

      console.log('📊 Dados processados para relatório:', paymentsData);
      setPayments(paymentsData);

      // Calcular estatísticas gerais
      const totalPayments = paymentsData.length;
      const paidPayments = paymentsData.filter(p => p.status === 'paga').length;
      const pendingPayments = paymentsData.filter(p => p.status === 'em_aberto').length;
      const overduePayments = paymentsData.filter(p => p.status === 'atrasada').length;

      const totalAmount = paymentsData.reduce((sum, p) => sum + p.value, 0);
      const paidAmount = paymentsData.filter(p => p.status === 'paga').reduce((sum, p) => sum + p.value, 0);
      const pendingAmount = paymentsData.filter(p => p.status === 'em_aberto').reduce((sum, p) => sum + p.value, 0);
      const overdueAmount = paymentsData.filter(p => p.status === 'atrasada').reduce((sum, p) => sum + p.value, 0);

      const statsData = {
        totalPayments,
        paidPayments,
        pendingPayments,
        overduePayments,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
      };

      console.log('📈 Estatísticas calculadas:', statsData);
      setStats(statsData);

      // Calcular estatísticas mensais
      const currentMonthPayments = paymentsData.filter(p => {
        const dueDate = new Date(p.due_date);
        const paymentDate = p.payment_date ? new Date(p.payment_date) : null;
        
        // Para pagamentos feitos no mês corrente
        if (p.status === 'paga' && paymentDate) {
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        }
        
        // Para pagamentos atrasados e previstos no mês corrente
        return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      });

      const paidThisMonth = currentMonthPayments.filter(p => {
        if (p.status !== 'paga' || !p.payment_date) return false;
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      });

      const overdueThisMonth = currentMonthPayments.filter(p => {
        if (p.status !== 'atrasada') return false;
        const dueDate = new Date(p.due_date);
        return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      });

      const expectedThisMonth = paymentsData.filter(p => {
        const dueDate = new Date(p.due_date);
        return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      });

      const monthlyStatsData = {
        paidThisMonth: paidThisMonth.length,
        paidThisMonthAmount: paidThisMonth.reduce((sum, p) => sum + p.value, 0),
        overdueThisMonth: overdueThisMonth.length,
        overdueThisMonthAmount: overdueThisMonth.reduce((sum, p) => sum + p.value, 0),
        expectedThisMonth: expectedThisMonth.length,
        expectedThisMonthAmount: expectedThisMonth.reduce((sum, p) => sum + p.value, 0),
      };

      console.log('📅 Estatísticas mensais:', monthlyStatsData);
      setMonthlyStats(monthlyStatsData);

      // Calcular estatísticas gerais
      const generalStatsData = {
        totalExpectedAmount: totalAmount,
        totalPaidAmount: paidAmount,
        totalStudents: students?.length || 0,
      };

      console.log('🌍 Estatísticas gerais:', generalStatsData);
      setGeneralStats(generalStatsData);

    } catch (error) {
      console.error('❌ Erro geral ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (filterType: FilterType) => {
    setActiveFilter(filterType);
    
    let filtered = [...payments];
    let title = 'Detalhes dos Pagamentos';
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    switch (filterType) {
      case 'paid_this_month':
        filtered = payments.filter(p => {
          if (p.status !== 'paga' || !p.payment_date) return false;
          const paymentDate = new Date(p.payment_date);
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        });
        title = 'Pagamentos Realizados no Mês Corrente';
        break;
        
      case 'overdue_this_month':
        filtered = payments.filter(p => {
          if (p.status !== 'atrasada') return false;
          const dueDate = new Date(p.due_date);
          return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
        });
        title = 'Pagamentos Atrasados no Mês Corrente';
        break;
        
      case 'expected_this_month':
        filtered = payments.filter(p => {
          const dueDate = new Date(p.due_date);
          return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
        });
        title = 'Pagamentos Previstos no Mês Corrente';
        break;
        
      default:
        filtered = [...payments];
        title = 'Detalhes dos Pagamentos';
        break;
    }
    
    setReportTitle(title);
    setFilteredPayments(filtered);
    
    // Reset other filters when using card filters
    setSelectedGroup('all');
    setSelectedStatus('all');
  };

  const applyFilters = () => {
    let filtered = [...payments];

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(p => p.group_name === selectedGroup);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(p => p.status === selectedStatus);
    }

    setFilteredPayments(filtered);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paga':
        return 'success';
      case 'em_aberto':
        return 'warning';
      case 'atrasada':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paga':
        return 'Paga';
      case 'em_aberto':
        return 'A Vencer';
      case 'atrasada':
        return 'Vencido';
      default:
        return status;
    }
  };

  const exportToExcel = () => {
    // Preparar dados para o Excel
    const excelData = filteredPayments.map(payment => ({
      'Aluno': payment.student_name,
      'Grupo': payment.group_name,
      'Valor': payment.value,
      'Vencimento': formatDate(payment.due_date),
      'Pagamento': payment.payment_date ? formatDate(payment.payment_date) : '',
      'Status': getStatusLabel(payment.status),
    }));

    // Criar workbook e worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Definir largura das colunas
    const columnWidths = [
      { wch: 25 }, // Aluno
      { wch: 20 }, // Grupo
      { wch: 15 }, // Valor
      { wch: 15 }, // Vencimento
      { wch: 15 }, // Pagamento
      { wch: 12 }, // Status
    ];
    worksheet['!cols'] = columnWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório de Pagamentos');

    // Gerar nome do arquivo com data atual
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const fileName = `relatorio_pagamentos_${dateString}.xlsx`;

    // Fazer download do arquivo
    XLSX.writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
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
        Relatórios de Pagamentos
      </Typography>

      {/* Cards Gerais - Movidos para o topo */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
        Estatísticas Gerais
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DollarSign size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Total Previsto
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(generalStats?.totalExpectedAmount || 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                A Receber Geral
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
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
                  Total Recebido
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {formatCurrency(generalStats?.totalPaidAmount || 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Recebido Geral
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
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
                  Total de Alunos
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {generalStats?.totalStudents || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Todos os grupos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cards Mensais - Clicáveis */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
        Estatísticas do Mês Corrente
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card
            onClick={() => handleCardClick('paid_this_month')}
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'transform 0.2s, boxShadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
              border: activeFilter === 'paid_this_month' ? '3px solid #fff' : 'none',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Pagos
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {monthlyStats?.paidThisMonth || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {formatCurrency(monthlyStats?.paidThisMonthAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            onClick={() => handleCardClick('overdue_this_month')}
            sx={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              color: 'white',
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'transform 0.2s, boxShadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
              border: activeFilter === 'overdue_this_month' ? '3px solid #fff' : 'none',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Clock size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Atrasados
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {monthlyStats?.overdueThisMonth || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {formatCurrency(monthlyStats?.overdueThisMonthAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            onClick={() => handleCardClick('expected_this_month')}
            sx={{
              background: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
              color: 'white',
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'transform 0.2s, boxShadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
              border: activeFilter === 'expected_this_month' ? '3px solid #fff' : 'none',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Calendar size={32} />
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                  Previstos
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {monthlyStats?.expectedThisMonth || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {formatCurrency(monthlyStats?.expectedThisMonthAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros e Exportação */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Grupo</InputLabel>
                <Select
                  value={selectedGroup}
                  label="Filtrar por Grupo"
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <MenuItem value="all">Todos os Grupos</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.name}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="Filtrar por Status"
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <MenuItem value="all">Todos os Status</MenuItem>
                  <MenuItem value="paga">Paga</MenuItem>
                  <MenuItem value="em_aberto">A Vencer</MenuItem>
                  <MenuItem value="atrasada">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={exportToExcel}
                fullWidth
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                }}
              >
                Exportar Excel
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de Pagamentos */}
       <Card>
         <CardContent>
           <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
             {reportTitle} ({filteredPayments.length} registros)
           </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Aluno</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Grupo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vencimento</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Pagamento</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Nenhum pagamento encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>{payment.student_name}</TableCell>
                      <TableCell>{payment.group_name}</TableCell>
                      <TableCell>{formatCurrency(payment.value)}</TableCell>
                      <TableCell>{formatDate(payment.due_date)}</TableCell>
                      <TableCell>
                        {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(payment.status)}
                          color={getStatusColor(payment.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}