/*
  # Melhorias nos Pagamentos - SPHERE (Fixed)

  1. Alterações na Tabela `pagamentos`
    - Adiciona campos para juros, multa, desconto
    - Adiciona campos para controle de pagamento

  2. Novas Tabelas
    - historico_pagamentos
    - configuracoes_sistema

  3. Views e Funções
    - pagamentos_detalhados
    - pagamentos_por_cliente
    - calcular_juros_multa
    - projecao_recebimentos
*/

-- Adiciona novos campos à tabela pagamentos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_original') THEN
    ALTER TABLE pagamentos ADD COLUMN valor_original numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_juros') THEN
    ALTER TABLE pagamentos ADD COLUMN valor_juros numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_multa') THEN
    ALTER TABLE pagamentos ADD COLUMN valor_multa numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_desconto') THEN
    ALTER TABLE pagamentos ADD COLUMN valor_desconto numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_pago') THEN
    ALTER TABLE pagamentos ADD COLUMN valor_pago numeric(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'forma_pagamento_realizado') THEN
    ALTER TABLE pagamentos ADD COLUMN forma_pagamento_realizado text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'observacoes') THEN
    ALTER TABLE pagamentos ADD COLUMN observacoes text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'comprovante_url') THEN
    ALTER TABLE pagamentos ADD COLUMN comprovante_url text DEFAULT NULL;
  END IF;
END $$;

-- Cria tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS historico_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id uuid REFERENCES pagamentos(id) ON DELETE SET NULL,
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  valor_pago numeric(10,2) NOT NULL,
  data_pagamento timestamptz DEFAULT now(),
  forma_pagamento text DEFAULT 'dinheiro',
  observacoes text DEFAULT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Cria tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taxa_juros_mensal numeric(5,2) DEFAULT 2.00,
  percentual_multa numeric(5,2) DEFAULT 2.00,
  dias_antes_alerta integer DEFAULT 3,
  whatsapp_ativo boolean DEFAULT false,
  email_ativo boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilita RLS
ALTER TABLE historico_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas para historico_pagamentos
CREATE POLICY "Users can view own historico"
  ON historico_pagamentos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own historico"
  ON historico_pagamentos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own historico"
  ON historico_pagamentos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own historico"
  ON historico_pagamentos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para configuracoes_sistema
CREATE POLICY "Users can view own config"
  ON configuracoes_sistema FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON configuracoes_sistema FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON configuracoes_sistema FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own config"
  ON configuracoes_sistema FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_cliente_id ON historico_pagamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_venda_id ON historico_pagamentos(venda_id);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_data ON historico_pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_vencimento ON pagamentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);

-- View para pagamentos com informações completas
CREATE OR REPLACE VIEW pagamentos_detalhados AS
SELECT 
  p.*,
  v.data_venda,
  v.valor_total as valor_total_venda,
  v.status_venda,
  c.id as cliente_id,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  c.email as cliente_email,
  CASE 
    WHEN p.status = 'pago' THEN 0
    WHEN p.data_vencimento::date < CURRENT_DATE THEN 
      (CURRENT_DATE - p.data_vencimento::date)
    ELSE 0
  END as dias_atraso,
  CASE 
    WHEN p.data_vencimento::date >= CURRENT_DATE THEN
      (p.data_vencimento::date - CURRENT_DATE)
    ELSE 0
  END as dias_para_vencer,
  (
    SELECT COUNT(*)
    FROM historico_pagamentos hp
    WHERE hp.pagamento_id = p.id
  ) as quantidade_pagamentos_parciais
FROM pagamentos p
INNER JOIN vendas v ON p.venda_id = v.id
INNER JOIN clientes c ON v.cliente_id = c.id;

-- View para agrupamento por cliente
CREATE OR REPLACE VIEW pagamentos_por_cliente AS
SELECT 
  c.id as cliente_id,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  c.email as cliente_email,
  COUNT(CASE WHEN p.status = 'pendente' THEN 1 END) as total_pendentes,
  COUNT(CASE WHEN p.status = 'pago' THEN 1 END) as total_pagos,
  COUNT(CASE WHEN p.status = 'atrasado' THEN 1 END) as total_atrasados,
  COALESCE(SUM(CASE WHEN p.status = 'pendente' THEN p.valor_parcela ELSE 0 END), 0) as valor_pendente,
  COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor_pago ELSE 0 END), 0) as valor_pago,
  COALESCE(SUM(CASE WHEN p.status = 'atrasado' THEN (p.valor_parcela + COALESCE(p.valor_juros, 0) + COALESCE(p.valor_multa, 0)) ELSE 0 END), 0) as valor_atrasado,
  MIN(CASE WHEN p.status IN ('pendente', 'atrasado') THEN p.data_vencimento END) as proximo_vencimento
FROM clientes c
LEFT JOIN vendas v ON v.cliente_id = c.id
LEFT JOIN pagamentos p ON p.venda_id = v.id
GROUP BY c.id, c.nome, c.telefone, c.email;

-- Função para calcular juros e multa
CREATE OR REPLACE FUNCTION calcular_juros_multa(
  pagamento_id_param uuid,
  taxa_juros_param numeric DEFAULT 2.00,
  percentual_multa_param numeric DEFAULT 2.00
)
RETURNS TABLE(
  valor_original numeric,
  dias_atraso integer,
  valor_juros numeric,
  valor_multa numeric,
  valor_total numeric
) AS $$
DECLARE
  v_valor_parcela numeric;
  v_data_vencimento date;
  v_dias_atraso integer;
  v_juros numeric;
  v_multa numeric;
BEGIN
  SELECT p.valor_parcela, p.data_vencimento::date
  INTO v_valor_parcela, v_data_vencimento
  FROM pagamentos p
  WHERE p.id = pagamento_id_param;

  v_dias_atraso := GREATEST(0, CURRENT_DATE - v_data_vencimento);

  v_juros := CASE 
    WHEN v_dias_atraso > 0 
    THEN v_valor_parcela * (taxa_juros_param / 100) * (v_dias_atraso::numeric / 30)
    ELSE 0 
  END;

  v_multa := CASE 
    WHEN v_dias_atraso > 0 
    THEN v_valor_parcela * (percentual_multa_param / 100)
    ELSE 0 
  END;

  RETURN QUERY
  SELECT 
    v_valor_parcela,
    v_dias_atraso,
    ROUND(v_juros, 2),
    ROUND(v_multa, 2),
    ROUND(v_valor_parcela + v_juros + v_multa, 2);
END;
$$ LANGUAGE plpgsql;

-- Função para projeção de recebimentos
CREATE OR REPLACE FUNCTION projecao_recebimentos(
  data_inicio date,
  data_fim date,
  user_id_param uuid
)
RETURNS TABLE(
  data date,
  valor_previsto numeric,
  quantidade_pagamentos bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.data_vencimento::date as data,
    SUM(p.valor_parcela) as valor_previsto,
    COUNT(*) as quantidade_pagamentos
  FROM pagamentos p
  INNER JOIN vendas v ON p.venda_id = v.id
  WHERE p.data_vencimento::date BETWEEN data_inicio AND data_fim
    AND p.status IN ('pendente', 'atrasado')
    AND v.user_id = user_id_param
  GROUP BY p.data_vencimento::date
  ORDER BY p.data_vencimento::date;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE historico_pagamentos IS 'Histórico completo de todos os pagamentos realizados';
COMMENT ON TABLE configuracoes_sistema IS 'Configurações globais do sistema (juros, multa, alertas)';
