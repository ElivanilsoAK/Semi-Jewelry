-- ============================================================================
-- Part 1: Drop and recreate RLS policies with optimized auth.uid() calls
-- ============================================================================

-- CLIENTES policies
DROP POLICY IF EXISTS "Users can view own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can insert own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can update own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can delete own clientes" ON clientes;

CREATE POLICY "Users can view own clientes"
  ON clientes FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own clientes"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own clientes"
  ON clientes FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own clientes"
  ON clientes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- PANOS policies
DROP POLICY IF EXISTS "Users can view own panos" ON panos;
DROP POLICY IF EXISTS "Users can insert own panos" ON panos;
DROP POLICY IF EXISTS "Users can update own panos" ON panos;
DROP POLICY IF EXISTS "Users can delete own panos" ON panos;

CREATE POLICY "Users can view own panos"
  ON panos FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own panos"
  ON panos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own panos"
  ON panos FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own panos"
  ON panos FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ITENS_PANO policies
DROP POLICY IF EXISTS "Users can view own itens_pano" ON itens_pano;
DROP POLICY IF EXISTS "Users can insert own itens_pano" ON itens_pano;
DROP POLICY IF EXISTS "Users can update own itens_pano" ON itens_pano;
DROP POLICY IF EXISTS "Users can delete own itens_pano" ON itens_pano;

CREATE POLICY "Users can view own itens_pano"
  ON itens_pano FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own itens_pano"
  ON itens_pano FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own itens_pano"
  ON itens_pano FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own itens_pano"
  ON itens_pano FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- VENDAS policies
DROP POLICY IF EXISTS "Users can view own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can insert own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can update own vendas" ON vendas;
DROP POLICY IF EXISTS "Users can delete own vendas" ON vendas;

CREATE POLICY "Users can view own vendas"
  ON vendas FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own vendas"
  ON vendas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own vendas"
  ON vendas FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own vendas"
  ON vendas FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ITENS_VENDA policies
DROP POLICY IF EXISTS "Users can view own itens_venda" ON itens_venda;
DROP POLICY IF EXISTS "Users can insert own itens_venda" ON itens_venda;
DROP POLICY IF EXISTS "Users can update own itens_venda" ON itens_venda;
DROP POLICY IF EXISTS "Users can delete own itens_venda" ON itens_venda;

CREATE POLICY "Users can view own itens_venda"
  ON itens_venda FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own itens_venda"
  ON itens_venda FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own itens_venda"
  ON itens_venda FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own itens_venda"
  ON itens_venda FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- PAGAMENTOS policies
DROP POLICY IF EXISTS "Users can view own pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Users can insert own pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Users can update own pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Users can delete own pagamentos" ON pagamentos;

CREATE POLICY "Users can view own pagamentos"
  ON pagamentos FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own pagamentos"
  ON pagamentos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own pagamentos"
  ON pagamentos FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own pagamentos"
  ON pagamentos FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- Part 2: Add missing foreign key index
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_itens_venda_item_pano_id ON itens_venda(item_pano_id);

-- ============================================================================
-- Part 3: Drop unused indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_comissoes_status;
DROP INDEX IF EXISTS idx_comissoes_pano_id;
DROP INDEX IF EXISTS idx_comissoes_venda_id;
DROP INDEX IF EXISTS idx_cliente_categorias_cliente_id;
DROP INDEX IF EXISTS idx_panos_ocr_processed;
