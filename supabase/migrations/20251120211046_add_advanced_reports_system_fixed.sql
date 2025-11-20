/*
  # Sistema Avançado de Relatórios - SPHERE (Fixed)

  1. Tabelas para relatórios salvos e agendamentos
  2. Funções SQL para análises avançadas
  3. Views para relatórios
*/

-- Tabela de relatórios salvos
CREATE TABLE IF NOT EXISTS relatorios_salvos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  filtros jsonb DEFAULT '{}'::jsonb,
  configuracoes jsonb DEFAULT '{}'::jsonb,
  publico boolean DEFAULT false,
  favorito boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos_relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relatorio_id uuid REFERENCES relatorios_salvos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo_relatorio text NOT NULL,
  frequencia text NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'mensal')),
  dia_semana integer DEFAULT NULL,
  dia_mes integer DEFAULT NULL,
  hora text DEFAULT '08:00',
  emails text[] DEFAULT ARRAY[]::text[],
  formato text DEFAULT 'pdf' CHECK (formato IN ('pdf', 'excel', 'ambos')),
  ativo boolean DEFAULT true,
  ultimo_envio timestamptz DEFAULT NULL,
  proximo_envio timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilita RLS
ALTER TABLE relatorios_salvos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos_relatorios ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own reports"
  ON relatorios_salvos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR publico = true);

CREATE POLICY "Users can insert own reports"
  ON relatorios_salvos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON relatorios_salvos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON relatorios_salvos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own schedules"
  ON agendamentos_relatorios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON agendamentos_relatorios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON agendamentos_relatorios FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON agendamentos_relatorios FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- View: Clientes inativos
CREATE OR REPLACE VIEW clientes_inativos AS
SELECT 
  c.id,
  c.nome,
  c.telefone,
  c.email,
  MAX(v.data_venda) as ultima_compra,
  CASE 
    WHEN MAX(v.data_venda) IS NOT NULL 
    THEN (CURRENT_DATE - MAX(v.data_venda)::date)
    ELSE NULL 
  END as dias_sem_comprar,
  COUNT(v.id) as total_compras,
  COALESCE(SUM(v.valor_total), 0) as valor_total_historico,
  c.user_id
FROM clientes c
LEFT JOIN vendas v ON v.cliente_id = c.id
GROUP BY c.id, c.nome, c.telefone, c.email, c.user_id
HAVING MAX(v.data_venda) < CURRENT_DATE - INTERVAL '90 days' OR MAX(v.data_venda) IS NULL;

-- Função: Relatório de clientes mais lucrativos
CREATE OR REPLACE FUNCTION relatorio_clientes_lucrativos(
  data_inicio date DEFAULT NULL,
  data_fim date DEFAULT NULL,
  limite integer DEFAULT 10,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE(
  cliente_id uuid,
  cliente_nome text,
  total_compras bigint,
  valor_total numeric,
  ticket_medio numeric,
  ultima_compra date,
  dias_desde_ultima integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cliente_id,
    c.nome as cliente_nome,
    COUNT(v.id) as total_compras,
    COALESCE(SUM(v.valor_total), 0) as valor_total,
    COALESCE(AVG(v.valor_total), 0) as ticket_medio,
    MAX(v.data_venda)::date as ultima_compra,
    (CURRENT_DATE - MAX(v.data_venda)::date)::integer as dias_desde_ultima
  FROM clientes c
  INNER JOIN vendas v ON v.cliente_id = c.id
  WHERE 
    v.status_venda != 'cancelada'
    AND (data_inicio IS NULL OR v.data_venda >= data_inicio)
    AND (data_fim IS NULL OR v.data_venda <= data_fim)
    AND (user_id_param IS NULL OR v.user_id = user_id_param)
  GROUP BY c.id, c.nome
  ORDER BY valor_total DESC
  LIMIT limite;
END;
$$ LANGUAGE plpgsql;

-- Função: Análise de inadimplência
CREATE OR REPLACE FUNCTION relatorio_inadimplencia(
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE(
  total_clientes_inadimplentes bigint,
  valor_total_atrasado numeric,
  ticket_medio_atrasado numeric,
  dias_medio_atraso numeric,
  maior_valor_atrasado numeric,
  maior_dias_atraso integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pd.cliente_id) as total_clientes_inadimplentes,
    COALESCE(SUM(p.valor_parcela + COALESCE(p.valor_juros, 0) + COALESCE(p.valor_multa, 0)), 0) as valor_total_atrasado,
    COALESCE(AVG(p.valor_parcela), 0) as ticket_medio_atrasado,
    AVG(pd.dias_atraso) as dias_medio_atraso,
    MAX(p.valor_parcela + COALESCE(p.valor_juros, 0) + COALESCE(p.valor_multa, 0)) as maior_valor_atrasado,
    MAX(pd.dias_atraso)::integer as maior_dias_atraso
  FROM pagamentos p
  INNER JOIN pagamentos_detalhados pd ON p.id = pd.id
  INNER JOIN vendas v ON p.venda_id = v.id
  WHERE 
    p.status != 'pago'
    AND pd.dias_atraso > 0
    AND (user_id_param IS NULL OR v.user_id = user_id_param);
END;
$$ LANGUAGE plpgsql;

-- Função: Fluxo de caixa
CREATE OR REPLACE FUNCTION relatorio_fluxo_caixa(
  data_inicio date,
  data_fim date,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE(
  data date,
  entradas numeric,
  saidas numeric,
  saldo numeric,
  saldo_acumulado numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH todas_datas AS (
    SELECT generate_series(data_inicio, data_fim, '1 day'::interval)::date as data
  ),
  entradas_diarias AS (
    SELECT 
      p.data_pagamento::date as data,
      COALESCE(SUM(p.valor_pago), 0) as valor
    FROM pagamentos p
    INNER JOIN vendas v ON p.venda_id = v.id
    WHERE 
      p.status = 'pago'
      AND p.data_pagamento::date BETWEEN data_inicio AND data_fim
      AND (user_id_param IS NULL OR v.user_id = user_id_param)
    GROUP BY p.data_pagamento::date
  ),
  saidas_diarias AS (
    SELECT 
      v.data_venda::date as data,
      COALESCE(SUM(iv.valor_unitario), 0) as valor
    FROM vendas v
    INNER JOIN itens_venda iv ON iv.venda_id = v.id
    WHERE 
      v.data_venda::date BETWEEN data_inicio AND data_fim
      AND (user_id_param IS NULL OR v.user_id = user_id_param)
    GROUP BY v.data_venda::date
  )
  SELECT 
    td.data,
    COALESCE(e.valor, 0) as entradas,
    COALESCE(s.valor, 0) as saidas,
    COALESCE(e.valor, 0) - COALESCE(s.valor, 0) as saldo,
    SUM(COALESCE(e.valor, 0) - COALESCE(s.valor, 0)) OVER (ORDER BY td.data) as saldo_acumulado
  FROM todas_datas td
  LEFT JOIN entradas_diarias e ON e.data = td.data
  LEFT JOIN saidas_diarias s ON s.data = td.data
  ORDER BY td.data;
END;
$$ LANGUAGE plpgsql;

-- Função: Projeção de faturamento
CREATE OR REPLACE FUNCTION relatorio_projecao_faturamento(
  meses_futuro integer DEFAULT 3,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE(
  mes text,
  vendas_projetadas numeric,
  pagamentos_esperados numeric,
  crescimento_percentual numeric
) AS $$
DECLARE
  media_mensal numeric;
  taxa_crescimento numeric;
BEGIN
  SELECT 
    COALESCE(AVG(valor_mensal), 0),
    CASE 
      WHEN COUNT(*) > 1 AND MIN(valor_mensal) > 0
      THEN ((MAX(valor_mensal) - MIN(valor_mensal)) / MIN(valor_mensal)) * 100 / COUNT(*)
      ELSE 5.0
    END
  INTO media_mensal, taxa_crescimento
  FROM (
    SELECT 
      EXTRACT(YEAR FROM v.data_venda) as ano,
      EXTRACT(MONTH FROM v.data_venda) as mes,
      SUM(v.valor_total) as valor_mensal
    FROM vendas v
    WHERE 
      v.data_venda >= CURRENT_DATE - INTERVAL '6 months'
      AND v.status_venda != 'cancelada'
      AND (user_id_param IS NULL OR v.user_id = user_id_param)
    GROUP BY EXTRACT(YEAR FROM v.data_venda), EXTRACT(MONTH FROM v.data_venda)
  ) historico;

  IF media_mensal = 0 THEN
    media_mensal := 1000;
  END IF;

  RETURN QUERY
  WITH meses AS (
    SELECT generate_series(1, meses_futuro) as mes_num
  )
  SELECT 
    TO_CHAR(CURRENT_DATE + (m.mes_num || ' months')::interval, 'Mon/YYYY') as mes,
    ROUND(media_mensal * (1 + (taxa_crescimento / 100) * m.mes_num), 2) as vendas_projetadas,
    (
      SELECT COALESCE(SUM(p.valor_parcela), 0)
      FROM pagamentos p
      INNER JOIN vendas v ON p.venda_id = v.id
      WHERE 
        EXTRACT(MONTH FROM p.data_vencimento) = EXTRACT(MONTH FROM CURRENT_DATE + (m.mes_num || ' months')::interval)
        AND EXTRACT(YEAR FROM p.data_vencimento) = EXTRACT(YEAR FROM CURRENT_DATE + (m.mes_num || ' months')::interval)
        AND p.status != 'pago'
        AND (user_id_param IS NULL OR v.user_id = user_id_param)
    ) as pagamentos_esperados,
    ROUND(taxa_crescimento * m.mes_num, 2) as crescimento_percentual
  FROM meses m;
END;
$$ LANGUAGE plpgsql;

-- Função: Estatísticas gerais
CREATE OR REPLACE FUNCTION relatorio_estatisticas_gerais(
  data_inicio date DEFAULT NULL,
  data_fim date DEFAULT NULL,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE(
  total_vendas bigint,
  valor_total_vendas numeric,
  ticket_medio numeric,
  total_clientes bigint,
  clientes_ativos bigint,
  clientes_inativos bigint,
  taxa_conversao numeric,
  total_panos bigint,
  panos_ativos bigint,
  valor_comissoes numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM vendas v 
     WHERE v.status_venda != 'cancelada'
     AND (data_inicio IS NULL OR v.data_venda >= data_inicio)
     AND (data_fim IS NULL OR v.data_venda <= data_fim)
     AND (user_id_param IS NULL OR v.user_id = user_id_param)) as total_vendas,
    
    (SELECT COALESCE(SUM(v.valor_total), 0) FROM vendas v 
     WHERE v.status_venda != 'cancelada'
     AND (data_inicio IS NULL OR v.data_venda >= data_inicio)
     AND (data_fim IS NULL OR v.data_venda <= data_fim)
     AND (user_id_param IS NULL OR v.user_id = user_id_param)) as valor_total_vendas,
    
    (SELECT COALESCE(AVG(v.valor_total), 0) FROM vendas v 
     WHERE v.status_venda != 'cancelada'
     AND (data_inicio IS NULL OR v.data_venda >= data_inicio)
     AND (data_fim IS NULL OR v.data_venda <= data_fim)
     AND (user_id_param IS NULL OR v.user_id = user_id_param)) as ticket_medio,
    
    (SELECT COUNT(*) FROM clientes c
     WHERE (user_id_param IS NULL OR c.user_id = user_id_param)) as total_clientes,
    
    (SELECT COUNT(DISTINCT v.cliente_id) FROM vendas v
     WHERE v.data_venda >= CURRENT_DATE - INTERVAL '90 days'
     AND v.status_venda != 'cancelada'
     AND (user_id_param IS NULL OR v.user_id = user_id_param)) as clientes_ativos,
    
    (SELECT COUNT(*) FROM clientes_inativos ci
     WHERE (user_id_param IS NULL OR ci.user_id = user_id_param)) as clientes_inativos,
    
    CASE 
      WHEN (SELECT COUNT(*) FROM clientes WHERE (user_id_param IS NULL OR user_id = user_id_param)) > 0
      THEN ROUND(((SELECT COUNT(DISTINCT cliente_id) FROM vendas WHERE status_venda != 'cancelada' AND (user_id_param IS NULL OR user_id = user_id_param))::numeric / 
            (SELECT COUNT(*) FROM clientes WHERE (user_id_param IS NULL OR user_id = user_id_param))::numeric) * 100, 2)
      ELSE 0
    END as taxa_conversao,
    
    (SELECT COUNT(*) FROM panos p
     WHERE (user_id_param IS NULL OR p.user_id = user_id_param)) as total_panos,
    
    (SELECT COUNT(*) FROM panos p
     WHERE p.status = 'ativo'
     AND (user_id_param IS NULL OR p.user_id = user_id_param)) as panos_ativos,
    
    (SELECT COALESCE(SUM(c.valor_comissao), 0) FROM comissoes c
     INNER JOIN panos p ON c.pano_id = p.id
     WHERE (data_inicio IS NULL OR c.data_venda >= data_inicio)
     AND (data_fim IS NULL OR c.data_venda <= data_fim)
     AND (user_id_param IS NULL OR p.user_id = user_id_param)) as valor_comissoes;
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX IF NOT EXISTS idx_relatorios_salvos_user ON relatorios_salvos(user_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_salvos_tipo ON relatorios_salvos(tipo);
CREATE INDEX IF NOT EXISTS idx_agendamentos_ativo ON agendamentos_relatorios(ativo);
CREATE INDEX IF NOT EXISTS idx_agendamentos_proximo_envio ON agendamentos_relatorios(proximo_envio);

-- Comentários
COMMENT ON TABLE relatorios_salvos IS 'Relatórios customizados salvos pelos usuários';
COMMENT ON TABLE agendamentos_relatorios IS 'Agendamentos automáticos de relatórios';
COMMENT ON FUNCTION relatorio_clientes_lucrativos IS 'Ranking dos clientes mais lucrativos';
COMMENT ON FUNCTION relatorio_inadimplencia IS 'Análise completa de inadimplência';
COMMENT ON FUNCTION relatorio_fluxo_caixa IS 'Fluxo de caixa diário com saldo acumulado';
COMMENT ON FUNCTION relatorio_projecao_faturamento IS 'Projeção de faturamento futuro';
COMMENT ON FUNCTION relatorio_estatisticas_gerais IS 'Estatísticas gerais do sistema';
