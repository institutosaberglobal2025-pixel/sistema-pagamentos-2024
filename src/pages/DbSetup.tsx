import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Avatar,
  Alert,
} from '@mui/material';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';

export function DbSetup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // Criar administrador no banco
      const { error: adminError } = await supabase
        .from('administrators')
        .insert([
          {
            name,
            email,
            user_id: authData.user.id,
            is_super_admin: true,
          },
        ]);

      if (adminError) throw adminError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Erro ao configurar banco:', err);
      setError('Erro ao criar administrador. Por favor, tente novamente.');
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
          Configuração Inicial
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ color: 'text.secondary', textAlign: 'center', mb: 2 }}
        >
          Crie o administrador principal do sistema
        </Typography>

        {success && (
          <Alert severity="success" sx={{ width: '100%' }}>
            Administrador criado com sucesso! Redirecionando para o login...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        )}

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
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            required
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            required
            fullWidth
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
          >
            Criar Administrador
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}