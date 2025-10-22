DO $$
BEGIN
  -- Adicionar coluna start_date se não existir
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'groups'
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE groups ADD COLUMN start_date date;
  END IF;

  -- Adicionar coluna end_date se não existir
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'groups'
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE groups ADD COLUMN end_date date;
  END IF;
END $$;