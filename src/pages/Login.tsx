import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Avatar,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Tentando fazer login com:', { email, password: '***' });
      await signIn(email, password);
      console.log('Login bem-sucedido, redirecionando...');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Erro detalhado ao fazer login:', err);
      
      // Mostrar erro mais específico baseado no tipo de erro
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos. Verifique suas credenciais.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique sua caixa de entrada.');
      } else if (err.message?.includes('Too many requests')) {
        setError('Muitas tentativas de login. Aguarde alguns minutos.');
      } else {
        setError(`Erro ao fazer login: ${err.message || 'Erro desconhecido'}`);
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Avatar
          src="https://i.imgur.com/LhHrGi1.jpeg"
          alt="Logo"
          sx={{ width: 80, height: 80 }}
        />
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontFamily: 'Poppins', fontWeight: 600 }}
        >
          Instituto Saber Global
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ color: 'text.secondary', textAlign: 'center', mb: 2 }}
        >
          Sistema de Controle de Pagamentos
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <TextField
            required
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!error}
          />
          <TextField
            required
            fullWidth
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            helperText={error}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
          >
            Entrar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}