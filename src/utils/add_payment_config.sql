DO $$
BEGIN
  -- Adicionar coluna payment_config se não existir
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'groups'
    AND column_name = 'payment_config'
  ) THEN
    ALTER TABLE groups ADD COLUMN payment_config jsonb;
  END IF;

  -- Remover colunas antigas se existirem
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'groups'
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE groups DROP COLUMN start_date;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'groups'
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE groups DROP COLUMN end_date;
  END IF;
END $$;