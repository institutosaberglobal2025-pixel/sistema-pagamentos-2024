import { supabase } from '../config/supabase';

async function updateStudentsTable() {
  try {
    // Primeiro, vamos remover as colunas que não são mais necessárias
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: `
        DO $$
        BEGIN
          -- Remover colunas que não são mais necessárias
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'students'
            AND column_name = 'registration_number'
          ) THEN
            ALTER TABLE students DROP COLUMN registration_number;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'students'
            AND column_name = 'course_type'
          ) THEN
            ALTER TABLE students DROP COLUMN course_type;
          END IF;

          -- Tornar email opcional
          ALTER TABLE students ALTER COLUMN email DROP NOT NULL;

          -- Adicionar coluna phone se não existir
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'students'
            AND column_name = 'phone'
          ) THEN
            ALTER TABLE students ADD COLUMN phone text;
          END IF;
        END $$;
      `
    });

    if (dropError) {
      console.error('Erro ao atualizar tabela:', dropError);
      return;
    }

    console.log('Tabela students atualizada com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar tabela:', error);
  }
}

updateStudentsTable();