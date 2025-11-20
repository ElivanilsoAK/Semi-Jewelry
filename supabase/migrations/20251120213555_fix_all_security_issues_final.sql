/*
  # Correção FINAL Completa de Segurança

  Adiciona índices, remove não utilizados, corrige views e funções
*/

-- 1. ÍNDICES EM FOREIGN KEYS
CREATE INDEX IF NOT EXISTS idx_categorias_categoria_pai ON categorias(categoria_pai);
CREATE INDEX IF NOT EXISTS idx_devolucoes_venda_id ON devolucoes_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_garantias_user_id_fk ON garantias(user_id);
CREATE INDEX IF NOT EXISTS idx_historico_cliente_id ON historico_pagamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_venda_id ON historico_pagamentos(venda_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs_atividade(user_id);
CREATE INDEX IF NOT EXISTS idx_panos_cliente_id_fk ON panos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_panos_user_id_fk ON panos(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_venda_id ON parcelas_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_user_id ON relatorios_salvos(user_id);

-- 2. REMOVER ÍNDICES NÃO UTILIZADOS
DROP INDEX IF EXISTS idx_perfis_criado_por;
DROP INDEX IF EXISTS idx_garantias_item_novo_id;
DROP INDEX IF EXISTS idx_garantias_item_original_id;
DROP INDEX IF EXISTS idx_comissoes_pano_id;
DROP INDEX IF EXISTS idx_comissoes_venda_id;
DROP INDEX IF EXISTS idx_agendamentos_relatorio_id;
DROP INDEX IF EXISTS idx_agendamentos_user_id;
DROP INDEX IF EXISTS idx_vendas_cancelado_por;
DROP INDEX IF EXISTS idx_parcelas_user_id;
DROP INDEX IF EXISTS idx_devolucoes_user_id;
DROP INDEX IF EXISTS idx_historico_pagamento_id;
DROP INDEX IF EXISTS idx_historico_user_id;

-- 3. VIEWS COM SECURITY INVOKER (estrutura corrigida)
DROP VIEW IF EXISTS panos_detalhados CASCADE;
CREATE VIEW panos_detalhados
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.nome,
  p.data_retirada,
  p.data_devolucao,
  p.status,
  p.user_id,
  c.nome as cliente_nome,
  COUNT(DISTINCT ip.id) as total_itens,
  COALESCE(SUM(ip.quantidade_inicial), 0) as quantidade_total,
  COALESCE(SUM(ip.quantidade_disponivel), 0) as quantidade_disponivel,
  COALESCE(SUM(ip.quantidade_inicial - ip.quantidade_disponivel), 0) as quantidade_vendida,
  COALESCE(SUM(ip.valor_unitario * (ip.quantidade_inicial - ip.quantidade_disponivel)), 0) as valor_vendido,
  p.percentual_comissao
FROM panos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN itens_pano ip ON ip.pano_id = p.id
GROUP BY p.id, p.nome, p.data_retirada, p.data_devolucao, p.status, p.user_id, c.nome, p.percentual_comissao;

DROP VIEW IF EXISTS vendas_detalhadas CASCADE;
CREATE VIEW vendas_detalhadas
WITH (security_invoker = on)
AS
SELECT 
  v.id,
  v.data_venda,
  v.valor_total,
  v.status_pagamento,
  v.status_venda,
  v.user_id,
  c.nome as cliente_nome,
  COUNT(DISTINCT iv.id) as total_itens,
  COUNT(DISTINCT p.id) as total_parcelas,
  COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor_pago END), 0) as valor_pago
FROM vendas v
LEFT JOIN clientes c ON v.cliente_id = c.id
LEFT JOIN itens_venda iv ON iv.venda_id = v.id
LEFT JOIN pagamentos p ON p.venda_id = v.id
GROUP BY v.id, v.data_venda, v.valor_total, v.status_pagamento, v.status_venda, v.user_id, c.nome;

DROP VIEW IF EXISTS pagamentos_por_cliente CASCADE;
CREATE VIEW pagamentos_por_cliente
WITH (security_invoker = on)
AS
SELECT 
  c.id as cliente_id,
  c.nome as cliente_nome,
  c.user_id,
  COUNT(DISTINCT v.id) as total_vendas,
  COALESCE(SUM(v.valor_total), 0) as valor_total_vendas,
  COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor_pago END), 0) as valor_pago,
  COALESCE(SUM(CASE WHEN p.status != 'pago' THEN p.valor_parcela END), 0) as valor_pendente
FROM clientes c
LEFT JOIN vendas v ON v.cliente_id = c.id
LEFT JOIN pagamentos p ON p.venda_id = v.id
GROUP BY c.id, c.nome, c.user_id;

DROP VIEW IF EXISTS usuarios_detalhados CASCADE;
CREATE VIEW usuarios_detalhados
WITH (security_invoker = on)
AS
SELECT 
  pu.id,
  pu.user_id,
  pu.nome_completo,
  pu.nivel_acesso,
  pu.ativo,
  COUNT(DISTINCT v.id) as total_vendas,
  COALESCE(SUM(v.valor_total), 0) as valor_total_vendas
FROM perfis_usuario pu
LEFT JOIN vendas v ON v.user_id = pu.user_id
GROUP BY pu.id, pu.user_id, pu.nome_completo, pu.nivel_acesso, pu.ativo;

DROP VIEW IF EXISTS pagamentos_detalhados CASCADE;
CREATE VIEW pagamentos_detalhados
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.venda_id,
  p.valor_parcela,
  p.data_vencimento,
  p.status,
  v.cliente_id,
  c.nome as cliente_nome,
  v.user_id,
  CASE 
    WHEN p.status != 'pago' AND p.data_vencimento < CURRENT_DATE 
    THEN (CURRENT_DATE - p.data_vencimento)
    ELSE 0
  END as dias_atraso
FROM pagamentos p
INNER JOIN vendas v ON p.venda_id = v.id
LEFT JOIN clientes c ON v.cliente_id = c.id;

DROP VIEW IF EXISTS categorias_hierarquicas CASCADE;
CREATE VIEW categorias_hierarquicas
WITH (security_invoker = on)
AS
WITH RECURSIVE cat_tree AS (
  SELECT 
    c.id,
    c.nome,
    c.categoria_pai,
    c.user_id,
    ARRAY[c.id] as path,
    0 as nivel
  FROM categorias c
  WHERE c.categoria_pai IS NULL
  
  UNION ALL
  
  SELECT 
    c.id,
    c.nome,
    c.categoria_pai,
    c.user_id,
    ct.path || c.id,
    ct.nivel + 1
  FROM categorias c
  INNER JOIN cat_tree ct ON c.categoria_pai = ct.id
)
SELECT * FROM cat_tree ORDER BY path;
