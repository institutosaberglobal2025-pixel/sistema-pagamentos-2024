-- Migração para reestruturar payment_plans
-- Execute cada bloco separadamente

-- BLOCO 1: Remover políticas dependentes
DROP POLICY IF EXISTS "Admins can view their payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Admins can manage their payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Admins can view their installments" ON installments;
DROP POLICY IF EXISTS "Admins can manage their installments" ON installments;

-- BLOCO 2: Modificar estrutura da tabela
ALTER TABLE payment_plans DROP CONSTRAINT IF EXISTS fk_student;
ALTER TABLE payment_plans DROP COLUMN IF EXISTS student_id;
ALTER TABLE payment_plans ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id);

-- BLOCO 3: Criar nova tabela de associação
CREATE TABLE IF NOT EXISTS student_payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  payment_plan_id uuid REFERENCES payment_plans(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, payment_plan_id)
);

-- BLOCO 4: Recriar políticas para payment_plans
CREATE POLICY "Admins can view their payment plans"
  ON payment_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their payment plans"
  ON payment_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE user_id = auth.uid()
    )
  );

-- BLOCO 5: Recriar políticas para installments
CREATE POLICY "Admins can view their installments"
  ON installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their installments"
  ON installments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE user_id = auth.uid()
    )
  );

-- BLOCO 6: Configurar nova tabela
ALTER TABLE student_payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student_payment_plans"
  ON student_payment_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE user_id = auth.uid()
    )
  );