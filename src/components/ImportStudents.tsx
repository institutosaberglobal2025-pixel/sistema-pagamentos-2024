import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../config/supabase';

interface ImportStudentsProps {
  groups: {
    id: string;
    name: string;
  }[];
  onImportComplete: () => void;
}

interface Student {
  name: string;
  email?: string;
  phone?: string;
}

export default function ImportStudents({ groups, onImportComplete }: ImportStudentsProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedGroup('');
    setParsedStudents([]);
  };

  const downloadTemplate = () => {
    const csvContent = 'Nome,Email,Telefone\n' +
      'João Silva,joao.silva@email.com,(11) 98765-4321\n' +
      'Maria Santos,maria.santos@email.com,(21) 99876-5432\n' +
      'Pedro Oliveira,pedro.oliveira@email.com,(31) 97654-3210\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_alunos.csv';
    link.click();
  };

  const validateStudentData = (student: Student, index: number) => {
    if (!student.name || student.name.trim() === '') {
      return `Nome é obrigatório (linha ${index + 2})`;
    }

    if (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
      return `Email inválido para o aluno "${student.name}" (linha ${index + 2})`;
    }

    return null;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reseta o estado antes de processar novo arquivo
    setParsedStudents([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      complete: (results) => {
        // Verifica se as colunas necessárias existem
        if (!results.meta.fields?.includes('Nome')) {
          setSnackbarMessage('Arquivo CSV inválido. A coluna "Nome" é obrigatória.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        const students = results.data
          .map((row: any) => ({
            name: (row['Nome'] || '').trim(),
            email: (row['Email'] || '').trim(),
            phone: (row['Telefone'] || '').trim(),
          }))
          .filter(student => student.name || student.email || student.phone); // Remove linhas totalmente vazias

        if (students.length === 0) {
          setSnackbarMessage('Nenhum aluno encontrado no arquivo CSV.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        setParsedStudents(students);
        setSnackbarMessage(`${students.length} alunos encontrados no arquivo.`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      },
      error: (error) => {
        console.error('Erro ao processar arquivo:', error);
        setSnackbarMessage('Erro ao processar arquivo CSV. Verifique se o formato está correto.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      },
    });
  };

  const handleImport = async () => {
    if (!selectedGroup) {
      setSnackbarMessage('Selecione um grupo');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (parsedStudents.length === 0) {
      setSnackbarMessage('Nenhum aluno para importar');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    // Validar dados dos alunos
    for (let i = 0; i < parsedStudents.length; i++) {
      const validationError = validateStudentData(parsedStudents[i], i);
      if (validationError) {
        setSnackbarMessage(`Erro de validação: ${validationError}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
    }

    try {
      // Preparar dados para inserção
      const studentsToInsert = parsedStudents.map(student => ({
        name: student.name.trim(),
        email: student.email ? student.email.trim() : null,
        phone: student.phone ? student.phone.trim() : null,
        group_id: selectedGroup,
      }));

      // Inserir alunos
      const { error: insertError } = await supabase
        .from('students')
        .insert(studentsToInsert);

      if (insertError) {
        throw insertError;
      }

      setSnackbarMessage(`${parsedStudents.length} alunos importados com sucesso!`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('Erro ao importar alunos:', error);
      setSnackbarMessage('Erro ao importar alunos. Verifique se não há dados duplicados.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpen}
        startIcon={<Upload size={20} />}
        sx={{
          width: { xs: '100%', sm: 'auto' },
          py: { xs: 1.5, sm: 1.5 },
          px: { xs: 2, sm: 4 },
          fontSize: '1rem',
          textTransform: 'none',
          fontWeight: 500,
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2
          }
        }}
      >
        Importar Alunos
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <DialogTitle>Importar Alunos</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              Para importar alunos, siga os passos:
            </Typography>
            <Typography component="ol" sx={{ pl: 2 }}>
              <li>Baixe o template do arquivo CSV</li>
              <li>Preencha os dados dos alunos (Nome é obrigatório)</li>
              <li>Selecione o grupo</li>
              <li>Faça upload do arquivo preenchido</li>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={downloadTemplate}
              sx={{ alignSelf: 'flex-start' }}
            >
              Baixar Template CSV
            </Button>

            <FormControl fullWidth required>
              <InputLabel>Grupo</InputLabel>
              <Select
                value={selectedGroup}
                label="Grupo"
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              component="label"
              sx={{ alignSelf: 'flex-start' }}
            >
              Upload CSV
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleFileUpload}
              />
            </Button>

            {parsedStudents.length > 0 && (
              <Typography>
                {parsedStudents.length} alunos encontrados no arquivo
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!selectedGroup || parsedStudents.length === 0}
          >
            Importar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}