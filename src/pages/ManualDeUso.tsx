import { Box, Container, Typography, Divider, List, ListItem, ListItemText, Link, Paper, ListItemIcon, Button, Stack, Chip, Fab } from '@mui/material';
import { useEffect, useState } from 'react';
import { BookOpen, ListOrdered, ShieldCheck, Trash2, BarChart3, Info, Lightbulb, Shuffle, ArrowUp, PlayCircle } from 'lucide-react';

export default function ManualDeUso() {
  const [showTopFab, setShowTopFab] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTopFab(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box id="topo" />
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <BookOpen size={28} color="#1976d2" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Manual de Uso
          </Typography>
        </Stack>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Guia rápido para o administrador principal operar o sistema com segurança.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <ListOrdered size={20} />
          <Typography variant="h6">Índice</Typography>
        </Stack>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <PlayCircle size={18} />
            </ListItemIcon>
            <Link href="#primeiros-passos">Primeiros passos</Link>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ListOrdered size={18} />
            </ListItemIcon>
            <Link href="#inclusao">Inclusão de dados (ordem recomendada)</Link>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ShieldCheck size={18} />
            </ListItemIcon>
            <Link href="#exclusao-historico">Exclusão preservando histórico (recomendada)</Link>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Trash2 size={18} />
            </ListItemIcon>
            <Link href="#exclusao-total">Exclusão total (apagar tudo)</Link>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <BarChart3 size={18} />
            </ListItemIcon>
            <Link href="#relatorios">Relatórios e conferências</Link>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Info size={18} />
            </ListItemIcon>
            <Link href="#mensagens">Mensagens e bloqueios</Link>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Lightbulb size={18} />
            </ListItemIcon>
            <Link href="#dicas">Dicas e erros comuns</Link>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Shuffle size={18} />
            </ListItemIcon>
            <Link href="#fluxos-rapidos">Fluxos rápidos</Link>
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Box id="primeiros-passos" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PlayCircle size={22} />
            <Typography variant="h5" gutterBottom>
              Primeiros passos
            </Typography>
            <Chip label="Início" color="primary" size="small" sx={{ ml: 1 }} />
          </Stack>
          <List>
            <ListItem>
              <ListItemText primary="Acesse o Dashboard e confirme que está logado como administrador." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Verifique se os menus principais estão visíveis: Grupos, Alunos, Planos, Pagamentos, Relatórios." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Se necessário, ajuste configurações gerais em Configurações (moeda, datas, notificações)." />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box id="inclusao" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ListOrdered size={22} />
            <Typography variant="h5" gutterBottom>
              Inclusão de dados (ordem recomendada)
            </Typography>
            <Chip label="Cadastro" color="success" size="small" sx={{ ml: 1 }} />
          </Stack>
          <List>
            <ListItem>
              <ListItemText
                primary="Criar Grupos"
                secondary="Menu: Grupos → Novo Grupo. Defina nome, responsável e período."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Cadastrar Alunos no Grupo"
                secondary="Menu: Alunos → Novo Aluno. Escolha o grupo e salve."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Criar Planos de Pagamento do Grupo"
                secondary="Menu: Planos → Novo Plano. Informe valores, número de parcelas, vencimentos e regras."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Vincular Alunos ao Plano"
                secondary="Menu: Planos → Vincular Alunos. Ao confirmar, o sistema gera parcelas para cada aluno."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Registrar Pagamentos"
                secondary="Menu: Pagamentos → Registrar. Selecione aluno/parcelas, informe data/valor e confirme."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Conferir em Relatórios"
                secondary="Menu: Relatórios. Verifique recebimentos, parcelas em aberto e pendências por grupo."
              />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box id="exclusao-historico" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ShieldCheck size={22} />
            <Typography variant="h5" gutterBottom>
              Exclusão preservando histórico (recomendada)
            </Typography>
            <Chip label="Seguro" color="info" size="small" sx={{ ml: 1 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Use quando deseja manter pagamentos já registrados. Itens pagos bloqueiam exclusões diretas de planos.
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Cancelar/Excluir parcelas em aberto"
                secondary="Menu: Alunos → Detalhes → Parcelas. Exclua apenas as pendentes/atrasadas conforme necessidade."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Remover vínculo do aluno com o plano"
                secondary="Menu: Planos → Vincular Alunos → Remover vínculo."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Excluir Aluno (opcional)"
                secondary="Menu: Alunos → Excluir. Se existirem parcelas pagas, o sistema oferece manter histórico."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Excluir Plano (se possível)"
                secondary="Menu: Planos → Excluir. Só é permitido quando não há parcelas pagas vinculadas."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Excluir Grupo por último"
                secondary="Menu: Grupos → Excluir. Disponível apenas quando não há alunos nem planos associados."
              />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box id="exclusao-total" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Trash2 size={22} />
            <Typography variant="h5" gutterBottom>
              Exclusão total (apagar tudo)
            </Typography>
            <Chip label="Irreversível" color="error" size="small" sx={{ ml: 1 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Use somente quando for necessário remover todo o histórico de um grupo.
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Apagar todas as parcelas (inclui pagas)" secondary="Menu: Alunos → Detalhes → Parcelas → Excluir todas." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Remover vínculo de alunos com planos" secondary="Menu: Planos → Vincular Alunos → Remover vínculo." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Excluir alunos" secondary="Menu: Alunos → Excluir." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Excluir planos restantes" secondary="Menu: Planos → Excluir." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Excluir grupo" secondary="Menu: Grupos → Excluir." />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box id="relatorios" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BarChart3 size={22} />
            <Typography variant="h5" gutterBottom>
              Relatórios e conferências
            </Typography>
            <Chip label="Análise" color="primary" size="small" sx={{ ml: 1 }} />
          </Stack>
          <List>
            <ListItem>
              <ListItemText primary="Recebimentos" secondary="Menu: Relatórios → Financeiro. Filtre por período e grupo." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Pendências" secondary="Menu: Relatórios → Parcelas em aberto. Acompanhe atrasos e próximos vencimentos." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Resumo por grupo" secondary="Menu: Relatórios → Grupos. Veja alunos, planos ativos e status." />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box id="mensagens" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Info size={22} />
            <Typography variant="h5" gutterBottom>
              Mensagens e bloqueios
            </Typography>
          </Stack>
          <List>
            <ListItem>
              <ListItemText primary="Bloqueio ao excluir plano com parcelas pagas" secondary="O sistema impede a exclusão para proteger o histórico financeiro." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Opções ao excluir aluno" secondary="Você pode manter histórico (parcelas pagas) ou apagar tudo (inclui pagas)." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Confirmações" secondary="Ações críticas exibem diálogos de confirmação antes de concluir." />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box id="dicas" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Lightbulb size={22} />
            <Typography variant="h5" gutterBottom>
              Dicas e erros comuns
            </Typography>
          </Stack>
          <List>
            <ListItem>
              <ListItemText primary="Cadastre primeiro o grupo" secondary="Sem grupo não é possível adicionar alunos ou planos." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Vincule alunos a planos" secondary="Somente após o vínculo as parcelas são geradas." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Revise datas de vencimento" secondary="Evita geração de parcelas com datas incorretas." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Use relatórios para conferência" secondary="Verifique recebimentos antes de excluir itens." />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box id="fluxos-rapidos" sx={{ scrollMarginTop: 96 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Shuffle size={22} />
            <Typography variant="h5" gutterBottom>
              Fluxos rápidos
            </Typography>
          </Stack>
          <List>
            <ListItem>
              <ListItemText primary="Criar grupo → Alunos → Plano → Vincular → Registrar pagamentos → Conferir relatórios" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Excluir grupo mantendo histórico: remova pendentes, desvincule alunos, exclua plano (se possível), e por fim o grupo" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Excluir grupo apagando tudo: exclua parcelas (inclui pagas), alunos, planos e depois o grupo" />
            </ListItem>
          </List>
          <Button href="#topo" variant="outlined" size="small" startIcon={<ArrowUp size={16} />}>Voltar ao topo</Button>
        </Box>

        {showTopFab && (
          <Fab href="#topo" color="primary" size="small" sx={{ position: 'fixed', bottom: 24, right: 24 }}>
            <ArrowUp size={18} />
          </Fab>
        )}
      </Paper>
    </Container>
  );
}