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
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
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

interface DuplicateInfo {
  totalStudents: number;
  uniqueStudents: number;
  duplicateCount: number;
  duplicateStudents: Student[];
}

export default function ImportStudents({ groups, onImportComplete }: ImportStudentsProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
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
    setDuplicateInfo(null);
  };

  const downloadTemplate = () => {
    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    
    // Dados do template
    const templateData = [
      ['Nome', 'Email', 'Telefone'],
      ['João Silva', 'joao.silva@email.com', '(11) 98765-4321'],
      ['Maria Santos', 'maria.santos@email.com', '(21) 99876-5432'],
      ['Pedro Oliveira', 'pedro.oliveira@email.com', '(31) 97654-3210']
    ];
    
    // Criar worksheet
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Definir larguras das colunas
    ws['!cols'] = [
      { wch: 20 }, // Nome
      { wch: 30 }, // Email
      { wch: 18 }  // Telefone
    ];
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
    
    // Fazer download
    XLSX.writeFile(wb, 'template_alunos.xlsx');
  };

  const detectDuplicates = (students: Student[]): DuplicateInfo => {
    const seen = new Set<string>();
    const duplicates: Student[] = [];
    const unique: Student[] = [];

    students.forEach(student => {
      // Criar uma chave única baseada no nome (case-insensitive) e email
      const key = `${student.name.toLowerCase().trim()}|${(student.email || '').toLowerCase().trim()}`;
      
      if (seen.has(key)) {
        duplicates.push(student);
      } else {
        seen.add(key);
        unique.push(student);
      }
    });

    return {
      totalStudents: students.length,
      uniqueStudents: unique.length,
      duplicateCount: duplicates.length,
      duplicateStudents: duplicates
    };
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
    setDuplicateInfo(null);

    // Verificar se é arquivo Excel
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setSnackbarMessage('Por favor, selecione um arquivo Excel (.xlsx ou .xls).');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pegar a primeira planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          setSnackbarMessage('Planilha vazia ou sem dados.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        // Primeira linha deve ser o cabeçalho
        const headers = jsonData[0] as string[];
        const nomeIndex = headers.findIndex(h => h && h.toLowerCase().includes('nome'));
        const emailIndex = headers.findIndex(h => h && h.toLowerCase().includes('email'));
        const telefoneIndex = headers.findIndex(h => h && (h.toLowerCase().includes('telefone') || h.toLowerCase().includes('phone')));

        if (nomeIndex === -1) {
          setSnackbarMessage('Planilha inválida. A coluna "Nome" é obrigatória.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        // Processar dados (pular cabeçalho)
        const students = jsonData
          .slice(1)
          .map((row: any) => ({
            name: row[nomeIndex] ? String(row[nomeIndex]).trim() : '',
            email: emailIndex !== -1 && row[emailIndex] ? String(row[emailIndex]).trim() : '',
            phone: telefoneIndex !== -1 && row[telefoneIndex] ? String(row[telefoneIndex]).trim() : '',
          }))
          .filter(student => student.name || student.email || student.phone); // Remove linhas totalmente vazias

        if (students.length === 0) {
          setSnackbarMessage('Nenhum aluno encontrado na planilha.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        // Detectar duplicados
        const duplicateAnalysis = detectDuplicates(students);
        setDuplicateInfo(duplicateAnalysis);

        // Usar apenas os alunos únicos
        const uniqueStudents = students.filter((student, index) => {
          const key = `${student.name.toLowerCase().trim()}|${(student.email || '').toLowerCase().trim()}`;
          return students.findIndex(s => 
            `${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}` === key
          ) === index;
        });

        setParsedStudents(uniqueStudents);

        // Mensagem informativa sobre duplicados
        if (duplicateAnalysis.duplicateCount > 0) {
          setSnackbarMessage(
            `${duplicateAnalysis.uniqueStudents} alunos únicos encontrados. ${duplicateAnalysis.duplicateCount} registros duplicados foram ignorados.`
          );
        } else {
          setSnackbarMessage(`${students.length} alunos encontrados na planilha.`);
        }
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        setSnackbarMessage('Erro ao processar arquivo Excel. Verifique se o formato está correto.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };

    reader.readAsArrayBuffer(file);
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
              <li>Baixe o template da planilha Excel</li>
              <li>Preencha os dados dos alunos (Nome é obrigatório)</li>
              <li>Selecione o grupo</li>
              <li>Faça upload da planilha preenchida</li>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={downloadTemplate}
              sx={{ alignSelf: 'flex-start' }}
            >
              Baixar Template Excel
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
              Upload Excel
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
            </Button>

            {parsedStudents.length > 0 && (
              <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CheckCircle size={20} color="#4caf50" />
                    <Typography variant="h6" color="success.main">
                      Análise da Planilha
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip 
                      label={`${parsedStudents.length} alunos serão importados`}
                      color="success"
                      variant="outlined"
                    />
                    {duplicateInfo && duplicateInfo.duplicateCount > 0 && (
                      <Chip 
                        label={`${duplicateInfo.duplicateCount} duplicados ignorados`}
                        color="warning"
                        variant="outlined"
                        icon={<AlertTriangle size={16} />}
                      />
                    )}
                  </Box>

                  {duplicateInfo && duplicateInfo.duplicateCount > 0 && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>Registros duplicados encontrados:</strong> {duplicateInfo.duplicateCount} alunos com mesmo nome e email foram ignorados para evitar duplicação no banco de dados.
                      </Typography>
                    </Alert>
                  )}

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total de registros na planilha: {duplicateInfo?.totalStudents || parsedStudents.length}
                  </Typography>
                </CardContent>
              </Card>
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