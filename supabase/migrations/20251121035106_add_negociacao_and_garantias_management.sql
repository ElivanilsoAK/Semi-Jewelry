/*
  # Adicionar Negociação de Pagamentos e Gestão de Garantias

  ## Alterações

  1. **Tabela pagamentos** - Novos campos de negociação
    - `valor_negociado` - Valor final negociado do pagamento
    - `data_negociacao` - Data em que a negociação foi realizada
    - `observacao_negociacao` - Detalhes sobre a negociação

  2. **Políticas RLS**
    - Adicionar políticas DELETE para garantias (permitir exclusão)
    - Adicionar políticas UPDATE para garantias (permitir edição)

  ## Segurança
    - Todas as operações requerem autenticação
    - User isolation mantido em todas as políticas
*/

-- Adicionar campos de negociação na tabela pagamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagamentos' AND column_name = 'valor_negociado'
  ) THEN
    ALTER TABLE pagamentos ADD COLUMN valor_negociado numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagamentos' AND column_name = 'data_negociacao'
  ) THEN
    ALTER TABLE pagamentos ADD COLUMN data_negociacao date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagamentos' AND column_name = 'observacao_negociacao'
  ) THEN
    ALTER TABLE pagamentos ADD COLUMN observacao_negociacao text;
  END IF;
END $$;

-- Políticas de DELETE para garantias
DROP POLICY IF EXISTS "Users can delete own garantias" ON garantias;
CREATE POLICY "Users can delete own garantias"
  ON garantias FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas de UPDATE para garantias
DROP POLICY IF EXISTS "Users can update own garantias" ON garantias;
CREATE POLICY "Users can update own garantias"
  ON garantias FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_pagamentos_negociacao ON pagamentos(data_negociacao) WHERE data_negociacao IS NOT NULL;