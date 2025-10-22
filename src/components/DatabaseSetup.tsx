import { useState } from 'react';
import { Button, Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import { setupDatabase } from '../utils/dbSetup';

export function DatabaseSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Sobrescreve o console.log para capturar os logs
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    setLogs([]);

    // Intercepta os logs
    console.log = (...args) => {
      setLogs(prev => [...prev, args.join(' ')]);
      originalConsoleLog.apply(console, args);
    };

    console.error = (...args) => {
      setLogs(prev => [...prev, `Erro: ${args.join(' ')}`]);
      originalConsoleError.apply(console, args);
    };

    try {
      await setupDatabase();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao configurar o banco de dados');
    } finally {
      setLoading(false);
      // Restaura as funções originais do console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Configuração do Banco de Dados
      </Typography>
      
      <Typography paragraph>
        Este processo irá criar todas as tabelas necessárias no banco de dados.
        Certifique-se de que você tem as credenciais corretas configuradas no arquivo .env.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Banco de dados configurado com sucesso!
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleSetup}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
        sx={{ mb: 2 }}
      >
        {loading ? 'Configurando...' : 'Configurar Banco de Dados'}
      </Button>

      {logs.length > 0 && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            mt: 2, 
            maxHeight: 400, 
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            fontFamily: 'monospace'
          }}
        >
          {logs.map((log, index) => (
            <Typography 
              key={index} 
              component="div" 
              sx={{ 
                fontSize: '0.9rem',
                color: log.startsWith('Erro') ? 'error.main' : 'text.primary',
                py: 0.5
              }}
            >
              {log}
            </Typography>
          ))}
        </Paper>
      )}
    </Box>
  );
}