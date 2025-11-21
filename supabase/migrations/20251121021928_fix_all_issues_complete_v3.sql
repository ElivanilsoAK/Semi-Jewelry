/*
  # Correção completa de todos os problemas

  1. Corrige função buscar_vendas_detalhadas para retornar dados
  2. Corrige função buscar_itens_venda_troca
  3. Garante que todas as funções tenham permissões corretas
*/

-- Recria função buscar_vendas_detalhadas com LEFT JOIN
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
    COUNT(DISTINCT iv.id)::bigint as total_itens,
    COUNT(DISTINCT pv.id)::bigint as total_parcelas,
    COALESCE(SUM(CASE WHEN pv.status = 'paga' THEN 1 ELSE 0 END), 0)::bigint as parcelas_pagas,
    COALESCE(SUM(CASE WHEN pv.status = 'pendente' THEN 1 ELSE 0 END), 0)::bigint as parcelas_pendentes,
    COALESCE(SUM(CASE WHEN pv.status = 'atrasada' THEN 1 ELSE 0 END), 0)::bigint as parcelas_atrasadas,
    COALESCE(SUM(pg.valor), 0) as valor_pago,
    v.created_at
  FROM vendas v
  LEFT JOIN clientes c ON v.cliente_id = c.id
  LEFT JOIN itens_venda iv ON v.id = iv.venda_id
  LEFT JOIN parcelas_venda pv ON v.id = pv.venda_id
  LEFT JOIN pagamentos pg ON pv.id = pg.parcela_id
  WHERE v.user_id = auth.uid()
  GROUP BY v.id, v.cliente_id, v.data_venda, v.valor_total, v.forma_pagamento, 
           v.status_pagamento, v.status_venda, v.observacoes, v.user_id, 
           c.nome, c.telefone, v.created_at
  ORDER BY v.data_venda DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria função buscar_itens_venda_troca
CREATE OR REPLACE FUNCTION buscar_itens_venda_troca(venda_id_param uuid)
RETURNS TABLE(
  item_venda_id uuid,
  item_pano_id uuid,
  descricao text,
  categoria text,
  quantidade integer,
  valor_unitario numeric,
  valor_total numeric,
  foto_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    iv.id as item_venda_id,
    iv.item_pano_id,
    ip.descricao,
    ip.categoria,
    iv.quantidade,
    iv.valor_unitario,
    iv.valor_total,
    ip.foto_url
  FROM itens_venda iv
  LEFT JOIN itens_pano ip ON iv.item_pano_id = ip.id
  LEFT JOIN vendas v ON iv.venda_id = v.id
  WHERE iv.venda_id = venda_id_param
    AND v.user_id = auth.uid()
  ORDER BY ip.categoria, ip.descricao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante permissões
GRANT EXECUTE ON FUNCTION buscar_vendas_detalhadas TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_itens_venda_troca TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_venda_por_id TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_vendas_para_garantia TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_itens_disponiveis_pano TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_todos_itens_estoque TO authenticated;