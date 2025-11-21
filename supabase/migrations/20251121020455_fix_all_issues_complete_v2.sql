-- Recria view pagamentos_detalhados com cálculo correto
DROP VIEW IF EXISTS pagamentos_detalhados CASCADE;
CREATE VIEW pagamentos_detalhados
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.venda_id,
  p.numero_parcela,
  p.valor_parcela,
  p.data_vencimento,
  p.data_pagamento,
  p.status,
  p.valor_original,
  p.valor_pago,
  p.valor_juros,
  p.valor_multa,
  p.forma_pagamento_realizado,
  p.observacoes,
  p.user_id,
  v.data_venda,
  v.valor_total as valor_total_venda,
  v.forma_pagamento,
  v.cliente_id,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  c.email as cliente_email,
  CASE
    WHEN p.status = 'pago' THEN 0
    WHEN p.data_vencimento < CURRENT_DATE THEN (CURRENT_DATE - p.data_vencimento)
    ELSE 0
  END as dias_atraso,
  CASE
    WHEN p.status = 'pago' THEN 0
    WHEN p.data_vencimento >= CURRENT_DATE THEN (p.data_vencimento - CURRENT_DATE)
    ELSE 0
  END as dias_para_vencer
FROM pagamentos p
INNER JOIN vendas v ON p.venda_id = v.id
INNER JOIN clientes c ON v.cliente_id = c.id;

DROP VIEW IF EXISTS pagamentos_por_cliente CASCADE;
CREATE VIEW pagamentos_por_cliente
WITH (security_invoker = on)
AS
SELECT
  c.id as cliente_id,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  c.email as cliente_email,
  COUNT(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN 1 END) as total_pendentes,
  COUNT(CASE WHEN p.status = 'pago' THEN 1 END) as total_pagos,
  COUNT(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN 1 END) as total_atrasados,
  COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor_parcela ELSE 0 END), 0) as valor_pendente,
  COALESCE(SUM(CASE WHEN p.status = 'pago' THEN COALESCE(p.valor_pago, p.valor_parcela) ELSE 0 END), 0) as valor_pago,
  COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN p.valor_parcela + COALESCE(p.valor_juros, 0) + COALESCE(p.valor_multa, 0) ELSE 0 END), 0) as valor_atrasado,
  MIN(CASE WHEN p.status = 'pendente' THEN p.data_vencimento END) as proximo_vencimento
FROM clientes c
LEFT JOIN vendas v ON c.id = v.cliente_id
LEFT JOIN pagamentos p ON v.id = p.venda_id
GROUP BY c.id, c.nome, c.telefone, c.email;

CREATE INDEX IF NOT EXISTS idx_pagamentos_data_status ON pagamentos(data_vencimento, status);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_data ON vendas(cliente_id, data_venda);

UPDATE garantias SET tipo = 'troca' WHERE tipo = 'reparo';
ALTER TABLE garantias DROP CONSTRAINT IF EXISTS garantias_tipo_check;
ALTER TABLE garantias ADD CONSTRAINT garantias_tipo_check CHECK (tipo IN ('troca', 'devolucao'));

CREATE OR REPLACE FUNCTION buscar_vendas_para_garantia(busca text DEFAULT NULL, limite integer DEFAULT 50)
RETURNS TABLE(venda_id uuid, cliente_id uuid, cliente_nome text, data_venda timestamptz, valor_total numeric, forma_pagamento text, itens_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.cliente_id, c.nome, v.data_venda, v.valor_total, v.forma_pagamento, COUNT(iv.id)
  FROM vendas v
  INNER JOIN clientes c ON v.cliente_id = c.id
  LEFT JOIN itens_venda iv ON v.id = iv.venda_id
  WHERE v.data_venda >= CURRENT_DATE - INTERVAL '90 days'
    AND (busca IS NULL OR c.nome ILIKE '%' || busca || '%' OR v.id::text ILIKE '%' || busca || '%')
  GROUP BY v.id, v.cliente_id, c.nome, v.data_venda, v.valor_total, v.forma_pagamento
  ORDER BY v.data_venda DESC LIMIT limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION buscar_itens_venda_troca(venda_id_param uuid)
RETURNS TABLE(item_venda_id uuid, item_pano_id uuid, descricao text, categoria text, quantidade integer, valor_unitario numeric, valor_total numeric, foto_url text) AS $$
BEGIN
  RETURN QUERY
  SELECT iv.id, iv.item_pano_id, iv.descricao, ip.categoria, iv.quantidade, iv.valor_unitario, iv.valor_total, ip.foto_url
  FROM itens_venda iv
  INNER JOIN itens_pano ip ON iv.item_pano_id = ip.id
  WHERE iv.venda_id = venda_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT SELECT ON pagamentos_detalhados TO authenticated;
GRANT SELECT ON pagamentos_por_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_vendas_para_garantia TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_itens_venda_troca TO authenticated;