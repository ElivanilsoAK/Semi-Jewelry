/*
  # Corrige acesso à view vendas_detalhadas

  1. Cria função para buscar vendas detalhadas com RLS
  2. Garante que usuários vejam apenas suas vendas
  3. Adiciona todas as informações necessárias
*/

-- Função para buscar vendas detalhadas
CREATE OR REPLACE FUNCTION buscar_vendas_detalhadas()
RETURNS TABLE(
  id uuid,
  cliente_id uuid,
  data_venda timestamptz,
  valor_total numeric,
  forma_pagamento text,
  status_pagamento text,
  status_venda text,
  observacoes text,
  user_id uuid,
  cliente_nome text,
  cliente_telefone text,
  total_itens bigint,
  total_parcelas bigint,
  parcelas_pagas bigint,
  parcelas_pendentes bigint,
  parcelas_atrasadas bigint,
  valor_pago numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.cliente_id,
    v.data_venda,
    v.valor_total,
    v.forma_pagamento,
    v.status_pagamento,
    v.status_venda,
    v.observacoes,
    v.user_id,
    c.nome as cliente_nome,
    c.telefone as cliente_telefone,
    COALESCE(COUNT(DISTINCT iv.id), 0)::bigint as total_itens,
    COALESCE(COUNT(DISTINCT pv.id), 0)::bigint as total_parcelas,
    COALESCE(SUM(CASE WHEN pv.status = 'paga' THEN 1 ELSE 0 END), 0)::bigint as parcelas_pagas,
    COALESCE(SUM(CASE WHEN pv.status = 'pendente' THEN 1 ELSE 0 END), 0)::bigint as parcelas_pendentes,
    COALESCE(SUM(CASE WHEN pv.status = 'atrasada' THEN 1 ELSE 0 END), 0)::bigint as parcelas_atrasadas,
    COALESCE(SUM(pg.valor), 0) as valor_pago,
    v.created_at
  FROM vendas v
  INNER JOIN clientes c ON v.cliente_id = c.id
  LEFT JOIN itens_venda iv ON v.id = iv.venda_id
  LEFT JOIN parcelas_venda pv ON v.id = pv.venda_id
  LEFT JOIN pagamentos pg ON pv.id = pg.parcela_id
  WHERE v.user_id = auth.uid()
  GROUP BY v.id, c.nome, c.telefone
  ORDER BY v.data_venda DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_vendas_detalhadas TO authenticated;

-- Função para buscar uma venda específica com detalhes
CREATE OR REPLACE FUNCTION buscar_venda_por_id(venda_id_param uuid)
RETURNS TABLE(
  id uuid,
  cliente_id uuid,
  data_venda timestamptz,
  valor_total numeric,
  forma_pagamento text,
  status_pagamento text,
  status_venda text,
  observacoes text,
  user_id uuid,
  cliente_nome text,
  cliente_telefone text,
  total_itens bigint,
  total_parcelas bigint,
  parcelas_pagas bigint,
  valor_pago numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.cliente_id,
    v.data_venda,
    v.valor_total,
    v.forma_pagamento,
    v.status_pagamento,
    v.status_venda,
    v.observacoes,
    v.user_id,
    c.nome as cliente_nome,
    c.telefone as cliente_telefone,
    COALESCE(COUNT(DISTINCT iv.id), 0)::bigint as total_itens,
    COALESCE(COUNT(DISTINCT pv.id), 0)::bigint as total_parcelas,
    COALESCE(SUM(CASE WHEN pv.status = 'paga' THEN 1 ELSE 0 END), 0)::bigint as parcelas_pagas,
    COALESCE(SUM(pg.valor), 0) as valor_pago
  FROM vendas v
  INNER JOIN clientes c ON v.cliente_id = c.id
  LEFT JOIN itens_venda iv ON v.id = iv.venda_id
  LEFT JOIN parcelas_venda pv ON v.id = pv.venda_id
  LEFT JOIN pagamentos pg ON pv.id = pg.parcela_id
  WHERE v.id = venda_id_param
    AND v.user_id = auth.uid()
  GROUP BY v.id, c.nome, c.telefone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_venda_por_id TO authenticated;