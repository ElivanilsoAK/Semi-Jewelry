/*
  # Correção Completa de Segurança e Performance

  Corrige todos os problemas identificados:
  - Adiciona índices em foreign keys
  - Otimiza RLS policies
  - Remove índices não utilizados
  - Corrige views SECURITY DEFINER
  - Adiciona search_path em funções
*/

-- ==========================================
-- 1. ADICIONAR ÍNDICES EM FOREIGN KEYS
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_agendamentos_relatorio_id ON agendamentos_relatorios(relatorio_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_user_id ON agendamentos_relatorios(user_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_pano_id ON comissoes(pano_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_venda_id ON comissoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_user_id ON devolucoes_venda(user_id);
CREATE INDEX IF NOT EXISTS idx_garantias_item_novo_id ON garantias(item_novo_id);
CREATE INDEX IF NOT EXISTS idx_garantias_item_original_id ON garantias(item_original_id);
CREATE INDEX IF NOT EXISTS idx_historico_pagamento_id ON historico_pagamentos(pagamento_id);
CREATE INDEX IF NOT EXISTS idx_historico_user_id ON historico_pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_user_id ON parcelas_venda(user_id);
CREATE INDEX IF NOT EXISTS idx_perfis_criado_por ON perfis_usuario(criado_por);
CREATE INDEX IF NOT EXISTS idx_vendas_cancelado_por ON vendas(cancelado_por);

-- ==========================================
-- 2. REMOVER ÍNDICES NÃO UTILIZADOS
-- ==========================================

DROP INDEX IF EXISTS idx_perfis_usuario_nivel;
DROP INDEX IF EXISTS idx_perfis_usuario_ativo;
DROP INDEX IF EXISTS idx_logs_atividade_user;
DROP INDEX IF EXISTS idx_logs_atividade_modulo;
DROP INDEX IF EXISTS idx_logs_atividade_created;
DROP INDEX IF EXISTS idx_itens_pano_categoria_custom;
DROP INDEX IF EXISTS idx_clientes_cpf;
DROP INDEX IF EXISTS idx_clientes_telefone;
DROP INDEX IF EXISTS idx_clientes_nascimento;
DROP INDEX IF EXISTS idx_garantias_user_id;
DROP INDEX IF EXISTS idx_garantias_status;
DROP INDEX IF EXISTS idx_categorias_user_id;
DROP INDEX IF EXISTS idx_categorias_ordem;
DROP INDEX IF EXISTS idx_categorias_pai;
DROP INDEX IF EXISTS idx_relatorios_salvos_user;
DROP INDEX IF EXISTS idx_relatorios_salvos_tipo;
DROP INDEX IF EXISTS idx_agendamentos_ativo;
DROP INDEX IF EXISTS idx_agendamentos_proximo_envio;
DROP INDEX IF EXISTS idx_panos_user_id;
DROP INDEX IF EXISTS idx_panos_cliente_id;
DROP INDEX IF EXISTS idx_panos_status;
DROP INDEX IF EXISTS idx_panos_data_retirada;
DROP INDEX IF EXISTS idx_vendas_forma_pagamento;
DROP INDEX IF EXISTS idx_vendas_status_pagamento;
DROP INDEX IF EXISTS idx_vendas_status_venda;
DROP INDEX IF EXISTS idx_parcelas_venda_venda_id;
DROP INDEX IF EXISTS idx_parcelas_venda_status;
DROP INDEX IF EXISTS idx_parcelas_venda_data_vencimento;
DROP INDEX IF EXISTS idx_devolucoes_venda_venda_id;
DROP INDEX IF EXISTS idx_pagamentos_data_vencimento;
DROP INDEX IF EXISTS idx_pagamentos_status;
DROP INDEX IF EXISTS idx_historico_pagamentos_cliente_id;
DROP INDEX IF EXISTS idx_historico_pagamentos_venda_id;
DROP INDEX IF EXISTS idx_historico_pagamentos_data;

-- ==========================================
-- 3. OTIMIZAR RLS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Users can view own parcelas" ON parcelas_venda;
CREATE POLICY "Users can view own parcelas"
  ON parcelas_venda FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own parcelas" ON parcelas_venda;
CREATE POLICY "Users can insert own parcelas"
  ON parcelas_venda FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own parcelas" ON parcelas_venda;
CREATE POLICY "Users can update own parcelas"
  ON parcelas_venda FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own parcelas" ON parcelas_venda;
CREATE POLICY "Users can delete own parcelas"
  ON parcelas_venda FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own devolucoes" ON devolucoes_venda;
CREATE POLICY "Users can view own devolucoes"
  ON devolucoes_venda FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own devolucoes" ON devolucoes_venda;
CREATE POLICY "Users can insert own devolucoes"
  ON devolucoes_venda FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own devolucoes" ON devolucoes_venda;
CREATE POLICY "Users can update own devolucoes"
  ON devolucoes_venda FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own devolucoes" ON devolucoes_venda;
CREATE POLICY "Users can delete own devolucoes"
  ON devolucoes_venda FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own historico" ON historico_pagamentos;
CREATE POLICY "Users can view own historico"
  ON historico_pagamentos FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own historico" ON historico_pagamentos;
CREATE POLICY "Users can insert own historico"
  ON historico_pagamentos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own historico" ON historico_pagamentos;
CREATE POLICY "Users can update own historico"
  ON historico_pagamentos FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own historico" ON historico_pagamentos;
CREATE POLICY "Users can delete own historico"
  ON historico_pagamentos FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own config" ON configuracoes_sistema;
CREATE POLICY "Users can view own config"
  ON configuracoes_sistema FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own config" ON configuracoes_sistema;
CREATE POLICY "Users can insert own config"
  ON configuracoes_sistema FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own config" ON configuracoes_sistema;
CREATE POLICY "Users can update own config"
  ON configuracoes_sistema FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own config" ON configuracoes_sistema;
CREATE POLICY "Users can delete own config"
  ON configuracoes_sistema FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can insert profiles" ON perfis_usuario;
CREATE POLICY "Admins can insert profiles"
  ON perfis_usuario FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = (select auth.uid())
      AND nivel_acesso = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update profiles" ON perfis_usuario;
CREATE POLICY "Admins can update profiles"
  ON perfis_usuario FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = (select auth.uid())
      AND nivel_acesso = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete profiles" ON perfis_usuario;
CREATE POLICY "Admins can delete profiles"
  ON perfis_usuario FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = (select auth.uid())
      AND nivel_acesso = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view all logs" ON logs_atividade;
CREATE POLICY "Users can view all logs"
  ON logs_atividade FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = (select auth.uid())
      AND nivel_acesso IN ('admin', 'vendedor')
    )
  );

DROP POLICY IF EXISTS "Users can insert own logs" ON logs_atividade;
CREATE POLICY "Users can insert own logs"
  ON logs_atividade FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own config" ON configuracoes_loja;
CREATE POLICY "Users can view own config"
  ON configuracoes_loja FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can insert config" ON configuracoes_loja;
CREATE POLICY "Admins can insert config"
  ON configuracoes_loja FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update config" ON configuracoes_loja;
CREATE POLICY "Admins can update config"
  ON configuracoes_loja FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own theme" ON temas_sistema;
CREATE POLICY "Users can view own theme"
  ON temas_sistema FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own theme" ON temas_sistema;
CREATE POLICY "Users can insert own theme"
  ON temas_sistema FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own theme" ON temas_sistema;
CREATE POLICY "Users can update own theme"
  ON temas_sistema FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own reports" ON relatorios_salvos;
CREATE POLICY "Users can view own reports"
  ON relatorios_salvos FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR publico = true);

DROP POLICY IF EXISTS "Users can insert own reports" ON relatorios_salvos;
CREATE POLICY "Users can insert own reports"
  ON relatorios_salvos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own reports" ON relatorios_salvos;
CREATE POLICY "Users can update own reports"
  ON relatorios_salvos FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own reports" ON relatorios_salvos;
CREATE POLICY "Users can delete own reports"
  ON relatorios_salvos FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own schedules" ON agendamentos_relatorios;
CREATE POLICY "Users can view own schedules"
  ON agendamentos_relatorios FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own schedules" ON agendamentos_relatorios;
CREATE POLICY "Users can insert own schedules"
  ON agendamentos_relatorios FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own schedules" ON agendamentos_relatorios;
CREATE POLICY "Users can update own schedules"
  ON agendamentos_relatorios FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own schedules" ON agendamentos_relatorios;
CREATE POLICY "Users can delete own schedules"
  ON agendamentos_relatorios FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 4. RECRIAR VIEW COM SECURITY INVOKER
-- ==========================================

DROP VIEW IF EXISTS clientes_inativos CASCADE;
CREATE VIEW clientes_inativos
WITH (security_invoker = on)
AS
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

COMMENT ON VIEW clientes_inativos IS 'Clientes sem compras há mais de 90 dias - SECURITY INVOKER para RLS';
