/*
  # Melhorias nas Vendas - SPHERE

  1. Alterações na Tabela `vendas`
    - Adiciona `forma_pagamento` (text) - PIX, dinheiro, cartão, etc
    - Adiciona `numero_parcelas` (integer) - quantidade de parcelas
    - Adiciona `desconto_valor` (numeric) - valor do desconto aplicado
    - Adiciona `desconto_percentual` (numeric) - percentual do desconto
    - Adiciona `valor_original` (numeric) - valor antes do desconto
    - Adiciona `status_venda` (text) - ativa, cancelada, devolvida_parcial, devolvida_total
    - Adiciona `motivo_cancelamento` (text) - motivo se cancelada
    - Adiciona `data_cancelamento` (timestamp) - quando foi cancelada
    - Adiciona `cancelado_por` (uuid) - usuário que cancelou

  2. Nova Tabela `parcelas_venda`
    - `id` (uuid, PK)
    - `venda_id` (uuid, FK para vendas)
    - `numero_parcela` (integer)
    - `valor_parcela` (numeric)
    - `data_vencimento` (date)
    - `data_pagamento` (date)
    - `status` (text) - pendente, pago, atrasado
    - `forma_pagamento` (text)
    - `user_id` (uuid, FK para auth.users)
    - `created_at` (timestamp)

  3. Nova Tabela `devolucoes_venda`
    - `id` (uuid, PK)
    - `venda_id` (uuid, FK para vendas)
    - `itens_devolvidos` (jsonb) - array com itens devolvidos
    - `valor_devolvido` (numeric)
    - `motivo` (text)
    - `data_devolucao` (timestamp)
    - `user_id` (uuid, FK para auth.users)
    - `created_at` (timestamp)

  4. Security
    - RLS habilitado em todas as tabelas
    - Políticas baseadas em user_id
*/

-- Adiciona novos campos à tabela vendas
DO $$
BEGIN
  -- Forma de pagamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'forma_pagamento'
  ) THEN
    ALTER TABLE vendas ADD COLUMN forma_pagamento text DEFAULT 'dinheiro';
  END IF;

  -- Número de parcelas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'numero_parcelas'
  ) THEN
    ALTER TABLE vendas ADD COLUMN numero_parcelas integer DEFAULT 1;
  END IF;

  -- Desconto valor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'desconto_valor'
  ) THEN
    ALTER TABLE vendas ADD COLUMN desconto_valor numeric(10,2) DEFAULT 0;
  END IF;

  -- Desconto percentual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'desconto_percentual'
  ) THEN
    ALTER TABLE vendas ADD COLUMN desconto_percentual numeric(5,2) DEFAULT 0;
  END IF;

  -- Valor original
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'valor_original'
  ) THEN
    ALTER TABLE vendas ADD COLUMN valor_original numeric(10,2) DEFAULT 0;
  END IF;

  -- Status da venda
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'status_venda'
  ) THEN
    ALTER TABLE vendas ADD COLUMN status_venda text DEFAULT 'ativa';
  END IF;

  -- Motivo cancelamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'motivo_cancelamento'
  ) THEN
    ALTER TABLE vendas ADD COLUMN motivo_cancelamento text DEFAULT NULL;
  END IF;

  -- Data cancelamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'data_cancelamento'
  ) THEN
    ALTER TABLE vendas ADD COLUMN data_cancelamento timestamptz DEFAULT NULL;
  END IF;

  -- Cancelado por
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'cancelado_por'
  ) THEN
    ALTER TABLE vendas ADD COLUMN cancelado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;
END $$;

-- Cria tabela de parcelas
CREATE TABLE IF NOT EXISTS parcelas_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE NOT NULL,
  numero_parcela integer NOT NULL,
  valor_parcela numeric(10,2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date DEFAULT NULL,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  forma_pagamento text DEFAULT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Cria tabela de devoluções
CREATE TABLE IF NOT EXISTS devolucoes_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE NOT NULL,
  itens_devolvidos jsonb DEFAULT '[]'::jsonb,
  valor_devolvido numeric(10,2) NOT NULL,
  motivo text NOT NULL,
  data_devolucao timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilita RLS
ALTER TABLE parcelas_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolucoes_venda ENABLE ROW LEVEL SECURITY;

-- Políticas para parcelas_venda
CREATE POLICY "Users can view own parcelas"
  ON parcelas_venda FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parcelas"
  ON parcelas_venda FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parcelas"
  ON parcelas_venda FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own parcelas"
  ON parcelas_venda FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para devolucoes_venda
CREATE POLICY "Users can view own devolucoes"
  ON devolucoes_venda FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devolucoes"
  ON devolucoes_venda FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devolucoes"
  ON devolucoes_venda FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own devolucoes"
  ON devolucoes_venda FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_parcelas_venda_venda_id ON parcelas_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_venda_status ON parcelas_venda(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_venda_data_vencimento ON parcelas_venda(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_devolucoes_venda_venda_id ON devolucoes_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status_venda ON vendas(status_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_forma_pagamento ON vendas(forma_pagamento);

-- View para vendas com informações completas
CREATE OR REPLACE VIEW vendas_detalhadas AS
SELECT 
  v.*,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  c.email as cliente_email,
  (
    SELECT COUNT(*) 
    FROM parcelas_venda p 
    WHERE p.venda_id = v.id
  ) as total_parcelas,
  (
    SELECT COUNT(*) 
    FROM parcelas_venda p 
    WHERE p.venda_id = v.id AND p.status = 'pago'
  ) as parcelas_pagas,
  (
    SELECT COUNT(*) 
    FROM parcelas_venda p 
    WHERE p.venda_id = v.id AND p.status = 'pendente'
  ) as parcelas_pendentes,
  (
    SELECT COUNT(*) 
    FROM parcelas_venda p 
    WHERE p.venda_id = v.id AND p.status = 'atrasado'
  ) as parcelas_atrasadas,
  (
    SELECT COALESCE(SUM(d.valor_devolvido), 0)
    FROM devolucoes_venda d
    WHERE d.venda_id = v.id
  ) as valor_total_devolvido,
  (
    SELECT COUNT(*)
    FROM devolucoes_venda d
    WHERE d.venda_id = v.id
  ) as numero_devolucoes
FROM vendas v
LEFT JOIN clientes c ON v.cliente_id = c.id;

-- Função para atualizar status das parcelas atrasadas
CREATE OR REPLACE FUNCTION atualizar_status_parcelas_atrasadas()
RETURNS void AS $$
BEGIN
  UPDATE parcelas_venda
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON COLUMN vendas.forma_pagamento IS 'Forma de pagamento: pix, dinheiro, cartao_credito, cartao_debito, etc';
COMMENT ON COLUMN vendas.numero_parcelas IS 'Quantidade de parcelas da venda';
COMMENT ON COLUMN vendas.desconto_valor IS 'Valor do desconto em R$';
COMMENT ON COLUMN vendas.desconto_percentual IS 'Percentual do desconto aplicado';
COMMENT ON COLUMN vendas.valor_original IS 'Valor original antes do desconto';
COMMENT ON COLUMN vendas.status_venda IS 'Status: ativa, cancelada, devolvida_parcial, devolvida_total';
COMMENT ON TABLE parcelas_venda IS 'Parcelas de vendas parceladas';
COMMENT ON TABLE devolucoes_venda IS 'Registro de devoluções totais ou parciais';
