# 🏓 Automação de Ping Semanal - Supabase

Esta automação mantém o projeto Supabase ativo enviando um "ping" semanal, evitando que seja pausado por inatividade na versão gratuita.

## 📋 Como Funciona

### 🎯 Objetivo
- Evitar que o projeto Supabase seja pausado por inatividade
- Fazer uma requisição leve que não consome recursos desnecessários
- Executar automaticamente toda semana

### 🔧 Componentes

#### 1. Script de Ping (`scripts/supabase-ping.cjs`)
- Faz uma requisição GET simples para `students?select=id&limit=1`
- Usa apenas módulos nativos do Node.js (sem dependências externas)
- Inclui logs detalhados de sucesso/erro
- Timeout de 30 segundos para evitar travamentos

#### 2. GitHub Actions (`.github/workflows/supabase-ping.yml`)
- Executa toda **segunda-feira às 10:00 UTC** (07:00 Brasília)
- Permite execução manual quando necessário
- Notifica em caso de falha

## ⚙️ Configuração

### 🔐 Variáveis de Ambiente
O script usa as seguintes variáveis (com fallback para valores padrão):

```bash
SUPABASE_URL=https://guqwpqcthqzvxnkhlvmj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 🚀 Para usar no GitHub Actions:
1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione os secrets (opcional, pois há fallback):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 🧪 Teste Local

Para testar o script localmente:

```bash
# Executar o ping manualmente
node scripts/supabase-ping.cjs
```

Saída esperada:
```
🚀 Iniciando ping semanal do Supabase...
🎯 Endpoint: https://guqwpqcthqzvxnkhlvmj.supabase.co/rest/v1/students?select=id&limit=1
📅 Data/Hora: 20/01/2025 14:30:00
──────────────────────────────────────────────────
✅ Ping bem-sucedido!
📊 Status: 200
⏱️  Tempo de resposta: 245ms
🕐 Timestamp: 2025-01-20T17:30:00.123Z
──────────────────────────────────────────────────
🎉 Ping concluído com sucesso!
📝 O projeto Supabase permanece ativo.
```

## 📅 Cronograma

- **Frequência**: Semanal (toda segunda-feira)
- **Horário**: 10:00 UTC (07:00 Brasília no horário padrão)
- **Próxima execução**: Visível nos logs do GitHub Actions

## 🔧 Personalização

### Alterar Frequência
Edite o cron no arquivo `.github/workflows/supabase-ping.yml`:

```yaml
schedule:
  # Atual: toda segunda às 10:00 UTC
  - cron: '0 10 * * 1'
  
  # Exemplos:
  # A cada 3 dias às 10:00 UTC
  # - cron: '0 10 */3 * *'
  
  # Duas vezes por semana (segunda e quinta às 10:00 UTC)
  # - cron: '0 10 * * 1,4'
```

### Alterar Endpoint
Edite a variável `PING_ENDPOINT` no arquivo `scripts/supabase-ping.cjs`:

```javascript
// Atual
const PING_ENDPOINT = `${SUPABASE_URL}/rest/v1/students?select=id&limit=1`;

// Alternativas
const PING_ENDPOINT = `${SUPABASE_URL}/rest/v1/groups?select=id&limit=1`;
const PING_ENDPOINT = `${SUPABASE_URL}/rest/v1/payment_plans?select=id&limit=1`;
```

## 📊 Monitoramento

### GitHub Actions
- Vá em **Actions** no repositório GitHub
- Procure por "🏓 Supabase Weekly Ping"
- Veja o histórico de execuções e logs

### Logs Locais
O script gera logs detalhados com:
- ✅/❌ Status da requisição
- 📊 Código de resposta HTTP
- ⏱️ Tempo de resposta
- 🕐 Timestamp da execução

## 🚨 Solução de Problemas

### Erro 401 (Unauthorized)
- Verifique se a `SUPABASE_ANON_KEY` está correta
- Confirme se a tabela `students` existe e é acessível

### Erro 404 (Not Found)
- Verifique se a URL do Supabase está correta
- Confirme se o endpoint `/rest/v1/students` existe

### Timeout
- Pode indicar problemas de conectividade
- O script tem timeout de 30 segundos

### Execução Manual
Para forçar uma execução:
1. Vá em **Actions** → **🏓 Supabase Weekly Ping**
2. Clique em **Run workflow**
3. Adicione um motivo (opcional) e execute

## 📈 Benefícios

- ✅ **Automático**: Executa sem intervenção manual
- ✅ **Leve**: Apenas 1 requisição GET por semana
- ✅ **Seguro**: Não altera dados, apenas consulta
- ✅ **Monitorado**: Logs detalhados de cada execução
- ✅ **Flexível**: Fácil de personalizar frequência e endpoint