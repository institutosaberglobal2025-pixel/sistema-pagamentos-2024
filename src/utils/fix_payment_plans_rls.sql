-- Correção das políticas RLS para payment_plans
-- Execute este script no Supabase SQL Editor

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admins can view their payment plans" ON payment_plans;
DROP POLICY IF EXISTS "Admins can manage their payment plans" ON payment_plans;

-- Criar políticas mais permissivas para administradores autenticados
CREATE POLICY "Authenticated users can view payment plans"
  ON payment_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payment plans"
  ON payment_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payment plans"
  ON payment_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payment plans"
  ON payment_plans FOR DELETE
  TO authenticated
  USING (true);

-- Também corrigir as políticas para installments
DROP POLICY IF EXISTS "Admins can view their installments" ON installments;
DROP POLICY IF EXISTS "Admins can manage their installments" ON installments;

CREATE POLICY "Authenticated users can view installments"
  ON installments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert installments"
  ON installments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update installments"
  ON installments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete installments"
  ON installments FOR DELETE
  TO authenticated
  USING (true);

-- Corrigir políticas para student_payment_plans
DROP POLICY IF EXISTS "Admins can manage student_payment_plans" ON student_payment_plans;

CREATE POLICY "Authenticated users can view student_payment_plans"
  ON student_payment_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert student_payment_plans"
  ON student_payment_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update student_payment_plans"
  ON student_payment_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete student_payment_plans"
  ON student_payment_plans FOR DELETE
  TO authenticated
  USING (true);