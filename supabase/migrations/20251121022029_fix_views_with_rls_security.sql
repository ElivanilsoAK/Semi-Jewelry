/*
  # Corrige views e acesso às vendas

  1. Remove funções problemáticas
  2. Garante que políticas RLS funcionem corretamente
  3. Simplifica acesso aos dados
*/

-- Garante que as políticas RLS estão ativas e corretas
DROP POLICY IF EXISTS "Users can view own vendas" ON vendas;
CREATE POLICY "Users can view own vendas"
  ON vendas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own itens_venda" ON itens_venda;
CREATE POLICY "Users can view own itens_venda"
  ON itens_venda FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own clientes" ON clientes;
CREATE POLICY "Users can view own clientes"
  ON clientes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Recria view vendas_detalhadas como SECURITY INVOKER
DROP VIEW IF EXISTS vendas_detalhadas CASCADE;

CREATE VIEW vendas_detalhadas 
WITH (security_invoker = true)
AS
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
  v.created_at
FROM vendas v
LEFT JOIN clientes c ON v.cliente_id = c.id
LEFT JOIN itens_venda iv ON v.id = iv.venda_id
GROUP BY v.id, v.cliente_id, v.data_venda, v.valor_total, v.forma_pagamento, 
         v.status_pagamento, v.status_venda, v.observacoes, v.user_id, 
         c.nome, c.telefone, v.created_at;

GRANT SELECT ON vendas_detalhadas TO authenticated;