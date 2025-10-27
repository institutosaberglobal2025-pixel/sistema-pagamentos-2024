-- Adicionar campos faltantes na tabela installments
ALTER TABLE installments 
ADD COLUMN student_id uuid REFERENCES students(id),
ADD COLUMN installment_number integer;

-- Criar índices para melhor performance
CREATE INDEX idx_installments_student_id ON installments(student_id);
CREATE INDEX idx_installments_student_payment ON installments(student_id, payment_plan_id);

-- Comentários para documentação
COMMENT ON COLUMN installments.student_id IS 'ID do estudante associado à parcela';
COMMENT ON COLUMN installments.installment_number IS 'Número sequencial da parcela (1, 2, 3, etc.)';