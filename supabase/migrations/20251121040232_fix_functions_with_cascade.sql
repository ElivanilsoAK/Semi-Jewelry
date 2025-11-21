/*
  # Corrigir Search Path das Funções Restantes (com CASCADE)
*/

DROP FUNCTION IF EXISTS buscar_vendas_para_garantia(uuid, text, integer) CASCADE;
CREATE FUNCTION buscar_vendas_para_garantia(
  cliente_id_param uuid,
  busca text DEFAULT NULL,
  limite integer DEFAULT 50
)
RETURNS TABLE (
  venda_id uuid,
  data_venda date,
  valor_total numeric,
  itens_count bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as venda_id,
    v.data_venda,
    v.valor_total,
    COUNT(iv.id) as itens_count
  FROM vendas v
  LEFT JOIN itens_venda iv ON iv.venda_id = v.id
  WHERE v.cliente_id = cliente_id_param
    AND v.data_venda >= CURRENT_DATE - INTERVAL '2 years'
    AND v.user_id = auth.uid()
  GROUP BY v.id, v.data_venda, v.valor_total
  ORDER BY v.data_venda DESC
  LIMIT limite;
END;
$$;

DROP FUNCTION IF EXISTS calcular_juros_multa(uuid) CASCADE;
CREATE FUNCTION calcular_juros_multa(pagamento_id_param uuid)
RETURNS TABLE (
  valor_juros numeric,
  valor_multa numeric,
  dias_atraso integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dias_atraso integer;
  v_valor_parcela numeric;
  v_taxa_juros numeric := 0.033;
  v_taxa_multa numeric := 0.02;
BEGIN
  SELECT 
    GREATEST(0, CURRENT_DATE - p.data_vencimento),
    p.valor_parcela
  INTO v_dias_atraso, v_valor_parcela
  FROM pagamentos p
  WHERE p.id = pagamento_id_param;
  
  IF v_dias_atraso > 0 THEN
    RETURN QUERY SELECT
      ROUND(v_valor_parcela * v_taxa_juros * v_dias_atraso / 30, 2) as valor_juros,
      ROUND(v_valor_parcela * v_taxa_multa, 2) as valor_multa,
      v_dias_atraso;
  ELSE
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS projecao_recebimentos(date, date, uuid) CASCADE;
CREATE FUNCTION projecao_recebimentos(
  data_inicio date,
  data_fim date,
  user_id_param uuid
)
RETURNS TABLE (
  data date,
  valor_previsto numeric,
  quantidade_pagamentos bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.data_vencimento as data,
    SUM(p.valor_parcela) as valor_previsto,
    COUNT(*)::bigint as quantidade_pagamentos
  FROM pagamentos p
  JOIN vendas v ON v.id = p.venda_id
  WHERE p.data_vencimento BETWEEN data_inicio AND data_fim
    AND p.status = 'pendente'
    AND v.user_id = user_id_param
  GROUP BY p.data_vencimento
  ORDER BY p.data_vencimento;
END;
$$;

DROP FUNCTION IF EXISTS buscar_vendas_detalhadas(text, integer, uuid) CASCADE;
CREATE FUNCTION buscar_vendas_detalhadas(
  busca_param text DEFAULT NULL,
  limite_param integer DEFAULT 100,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  cliente_id uuid,
  cliente_nome text,
  data_venda date,
  valor_total numeric,
  forma_pagamento text,
  numero_parcelas integer,
  status_pagamento text,
  observacoes text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.cliente_id,
    c.nome as cliente_nome,
    v.data_venda,
    v.valor_total,
    v.forma_pagamento,
    v.numero_parcelas,
    v.status_pagamento,
    v.observacoes
  FROM vendas v
  JOIN clientes c ON c.id = v.cliente_id
  WHERE (user_id_param IS NULL OR v.user_id = user_id_param)
    AND (busca_param IS NULL OR c.nome ILIKE '%' || busca_param || '%')
  ORDER BY v.data_venda DESC
  LIMIT limite_param;
END;
$$;

DROP FUNCTION IF EXISTS verificar_acesso(text) CASCADE;
CREATE FUNCTION verificar_acesso(permissao_requerida text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  tem_acesso boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM perfis_usuario pu
    JOIN permissoes_perfil pp ON pp.perfil_id = pu.perfil_id
    WHERE pu.user_id = auth.uid()
    AND pp.permissao = permissao_requerida
  ) INTO tem_acesso;
  
  RETURN COALESCE(tem_acesso, false);
END;
$$;

DROP FUNCTION IF EXISTS calcular_status_pagamento_venda(uuid) CASCADE;
CREATE FUNCTION calcular_status_pagamento_venda(venda_id_param uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  total_parcelas integer;
  parcelas_pagas integer;
  tem_atrasada boolean;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pago'),
    EXISTS(SELECT 1 FROM pagamentos WHERE venda_id = venda_id_param AND status = 'pendente' AND data_vencimento < CURRENT_DATE)
  INTO total_parcelas, parcelas_pagas, tem_atrasada
  FROM pagamentos
  WHERE venda_id = venda_id_param;
  
  IF tem_atrasada THEN
    RETURN 'atrasado';
  ELSIF parcelas_pagas = total_parcelas THEN
    RETURN 'pago';
  ELSIF parcelas_pagas > 0 THEN
    RETURN 'parcial';
  ELSE
    RETURN 'pendente';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS atualizar_status_pagamento_venda() CASCADE;
CREATE FUNCTION atualizar_status_pagamento_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE vendas
  SET status_pagamento = calcular_status_pagamento_venda(NEW.venda_id)
  WHERE id = NEW.venda_id;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER trigger_atualizar_status_pagamento
  AFTER INSERT OR UPDATE OR DELETE ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_status_pagamento_venda();

DROP FUNCTION IF EXISTS relatorio_clientes_lucrativos(date, date, uuid) CASCADE;
CREATE FUNCTION relatorio_clientes_lucrativos(
  data_inicio date,
  data_fim date,
  user_id_param uuid
)
RETURNS TABLE (
  cliente_id uuid,
  cliente_nome text,
  total_vendas bigint,
  valor_total numeric,
  valor_medio numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cliente_id,
    c.nome as cliente_nome,
    COUNT(v.id) as total_vendas,
    SUM(v.valor_total) as valor_total,
    AVG(v.valor_total) as valor_medio
  FROM clientes c
  JOIN vendas v ON v.cliente_id = c.id
  WHERE v.data_venda BETWEEN data_inicio AND data_fim
    AND v.user_id = user_id_param
  GROUP BY c.id, c.nome
  ORDER BY valor_total DESC;
END;
$$;

DROP FUNCTION IF EXISTS relatorio_inadimplencia(uuid) CASCADE;
CREATE FUNCTION relatorio_inadimplencia(user_id_param uuid)
RETURNS TABLE (
  cliente_id uuid,
  cliente_nome text,
  parcelas_atrasadas bigint,
  valor_total_atrasado numeric,
  dias_atraso_maximo integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cliente_id,
    c.nome as cliente_nome,
    COUNT(p.id) as parcelas_atrasadas,
    SUM(p.valor_parcela) as valor_total_atrasado,
    MAX(CURRENT_DATE - p.data_vencimento) as dias_atraso_maximo
  FROM clientes c
  JOIN vendas v ON v.cliente_id = c.id
  JOIN pagamentos p ON p.venda_id = v.id
  WHERE p.status = 'pendente'
    AND p.data_vencimento < CURRENT_DATE
    AND v.user_id = user_id_param
  GROUP BY c.id, c.nome
  ORDER BY valor_total_atrasado DESC;
END;
$$;

DROP FUNCTION IF EXISTS relatorio_fluxo_caixa(date, date, uuid) CASCADE;
CREATE FUNCTION relatorio_fluxo_caixa(
  data_inicio date,
  data_fim date,
  user_id_param uuid
)
RETURNS TABLE (
  data date,
  entradas numeric,
  saidas numeric,
  saldo_dia numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.data,
    COALESCE(SUM(p.valor_pago), 0) as entradas,
    0::numeric as saidas,
    COALESCE(SUM(p.valor_pago), 0) as saldo_dia
  FROM generate_series(data_inicio, data_fim, '1 day'::interval) d(data)
  LEFT JOIN pagamentos p ON p.data_pagamento::date = d.data
  LEFT JOIN vendas v ON v.id = p.venda_id
  WHERE v.user_id = user_id_param OR v.user_id IS NULL
  GROUP BY d.data
  ORDER BY d.data;
END;
$$;

DROP FUNCTION IF EXISTS relatorio_projecao_faturamento(integer, uuid) CASCADE;
CREATE FUNCTION relatorio_projecao_faturamento(
  meses integer,
  user_id_param uuid
)
RETURNS TABLE (
  mes text,
  valor_previsto numeric,
  quantidade_parcelas bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(p.data_vencimento, 'YYYY-MM') as mes,
    SUM(p.valor_parcela) as valor_previsto,
    COUNT(*) as quantidade_parcelas
  FROM pagamentos p
  JOIN vendas v ON v.id = p.venda_id
  WHERE p.data_vencimento >= CURRENT_DATE
    AND p.data_vencimento <= CURRENT_DATE + (meses || ' months')::interval
    AND p.status = 'pendente'
    AND v.user_id = user_id_param
  GROUP BY TO_CHAR(p.data_vencimento, 'YYYY-MM')
  ORDER BY mes;
END;
$$;

DROP FUNCTION IF EXISTS relatorio_estatisticas_gerais(date, date, uuid) CASCADE;
CREATE FUNCTION relatorio_estatisticas_gerais(
  data_inicio date,
  data_fim date,
  user_id_param uuid
)
RETURNS TABLE (
  total_vendas bigint,
  valor_total_vendas numeric,
  total_clientes bigint,
  ticket_medio numeric,
  taxa_inadimplencia numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT v.id) as total_vendas,
    COALESCE(SUM(v.valor_total), 0) as valor_total_vendas,
    COUNT(DISTINCT v.cliente_id) as total_clientes,
    COALESCE(AVG(v.valor_total), 0) as ticket_medio,
    COALESCE(
      (COUNT(*) FILTER (WHERE p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE)::numeric / 
       NULLIF(COUNT(p.id), 0) * 100), 0
    ) as taxa_inadimplencia
  FROM vendas v
  LEFT JOIN pagamentos p ON p.venda_id = v.id
  WHERE v.data_venda BETWEEN data_inicio AND data_fim
    AND v.user_id = user_id_param;
END;
$$;