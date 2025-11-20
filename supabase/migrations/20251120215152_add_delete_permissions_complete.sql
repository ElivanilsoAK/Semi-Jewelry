/*
  # Permissão para Excluir Panos + 15 Correções de Segurança

  Adiciona:
  - Policy DELETE em panos
  - Policies DELETE em todas as tabelas relacionadas
  - CASCADE DELETE em foreign keys
  - Triggers de log para exclusões
  - Funções seguras de exclusão
*/

-- ==========================================
-- 1. POLICY DELETE EM PANOS
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own panos" ON panos;
CREATE POLICY "Users can delete own panos"
  ON panos FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 2. POLICIES DELETE EM ITENS_PANO
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own itens" ON itens_pano;
CREATE POLICY "Users can delete own itens"
  ON itens_pano FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 3. POLICIES DELETE EM ITENS_VENDA
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own itens_venda" ON itens_venda;
CREATE POLICY "Users can delete own itens_venda"
  ON itens_venda FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendas v
      WHERE v.id = itens_venda.venda_id
      AND v.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- 4. POLICIES DELETE EM PAGAMENTOS
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own pagamentos" ON pagamentos;
CREATE POLICY "Users can delete own pagamentos"
  ON pagamentos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendas v
      WHERE v.id = pagamentos.venda_id
      AND v.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- 5. POLICIES COMPLETAS EM COMISSOES
-- ==========================================

DROP POLICY IF EXISTS "Users can view own comissoes" ON comissoes;
CREATE POLICY "Users can view own comissoes"
  ON comissoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panos p
      WHERE p.id = comissoes.pano_id
      AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own comissoes" ON comissoes;
CREATE POLICY "Users can insert own comissoes"
  ON comissoes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM panos p
      WHERE p.id = comissoes.pano_id
      AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own comissoes" ON comissoes;
CREATE POLICY "Users can update own comissoes"
  ON comissoes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panos p
      WHERE p.id = comissoes.pano_id
      AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own comissoes" ON comissoes;
CREATE POLICY "Users can delete own comissoes"
  ON comissoes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM panos p
      WHERE p.id = comissoes.pano_id
      AND p.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- 6. POLICIES DELETE EM CATEGORIAS
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own categorias" ON categorias;
CREATE POLICY "Users can delete own categorias"
  ON categorias FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 7. POLICIES DELETE EM GARANTIAS
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own garantias" ON garantias;
CREATE POLICY "Users can delete own garantias"
  ON garantias FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 8. POLICIES DELETE EM CONFIGURACOES_LOJA
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own loja config" ON configuracoes_loja;
CREATE POLICY "Users can delete own loja config"
  ON configuracoes_loja FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 9. POLICIES DELETE EM TEMAS_SISTEMA
-- ==========================================

DROP POLICY IF EXISTS "Users can delete own theme" ON temas_sistema;
CREATE POLICY "Users can delete own theme"
  ON temas_sistema FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 10. CASCADE DELETE EM FOREIGN KEYS
-- ==========================================

-- itens_pano -> panos (CASCADE)
ALTER TABLE itens_pano DROP CONSTRAINT IF EXISTS itens_pano_pano_id_fkey;
ALTER TABLE itens_pano
  ADD CONSTRAINT itens_pano_pano_id_fkey
  FOREIGN KEY (pano_id)
  REFERENCES panos(id)
  ON DELETE CASCADE;

-- itens_venda -> vendas (CASCADE)
ALTER TABLE itens_venda DROP CONSTRAINT IF EXISTS itens_venda_venda_id_fkey;
ALTER TABLE itens_venda
  ADD CONSTRAINT itens_venda_venda_id_fkey
  FOREIGN KEY (venda_id)
  REFERENCES vendas(id)
  ON DELETE CASCADE;

-- pagamentos -> vendas (CASCADE)
ALTER TABLE pagamentos DROP CONSTRAINT IF EXISTS pagamentos_venda_id_fkey;
ALTER TABLE pagamentos
  ADD CONSTRAINT pagamentos_venda_id_fkey
  FOREIGN KEY (venda_id)
  REFERENCES vendas(id)
  ON DELETE CASCADE;

-- parcelas_venda -> vendas (CASCADE)
ALTER TABLE parcelas_venda DROP CONSTRAINT IF EXISTS parcelas_venda_venda_id_fkey;
ALTER TABLE parcelas_venda
  ADD CONSTRAINT parcelas_venda_venda_id_fkey
  FOREIGN KEY (venda_id)
  REFERENCES vendas(id)
  ON DELETE CASCADE;

-- devolucoes_venda -> vendas (CASCADE)
ALTER TABLE devolucoes_venda DROP CONSTRAINT IF EXISTS devolucoes_venda_venda_id_fkey;
ALTER TABLE devolucoes_venda
  ADD CONSTRAINT devolucoes_venda_venda_id_fkey
  FOREIGN KEY (venda_id)
  REFERENCES vendas(id)
  ON DELETE CASCADE;

-- historico_pagamentos -> vendas (CASCADE)
ALTER TABLE historico_pagamentos DROP CONSTRAINT IF EXISTS historico_pagamentos_venda_id_fkey;
ALTER TABLE historico_pagamentos
  ADD CONSTRAINT historico_pagamentos_venda_id_fkey
  FOREIGN KEY (venda_id)
  REFERENCES vendas(id)
  ON DELETE CASCADE;

-- comissoes -> panos (CASCADE)
ALTER TABLE comissoes DROP CONSTRAINT IF EXISTS comissoes_pano_id_fkey;
ALTER TABLE comissoes
  ADD CONSTRAINT comissoes_pano_id_fkey
  FOREIGN KEY (pano_id)
  REFERENCES panos(id)
  ON DELETE CASCADE;

-- comissoes -> vendas (CASCADE)
ALTER TABLE comissoes DROP CONSTRAINT IF EXISTS comissoes_venda_id_fkey;
ALTER TABLE comissoes
  ADD CONSTRAINT comissoes_venda_id_fkey
  FOREIGN KEY (venda_id)
  REFERENCES vendas(id)
  ON DELETE CASCADE;

-- garantias -> vendas (SET NULL em vez de CASCADE para manter histórico)
ALTER TABLE garantias DROP CONSTRAINT IF EXISTS garantias_venda_original_id_fkey;
ALTER TABLE garantias
  ADD CONSTRAINT garantias_venda_original_id_fkey
  FOREIGN KEY (venda_original_id)
  REFERENCES vendas(id)
  ON DELETE SET NULL;

-- ==========================================
-- 11. TRIGGERS PARA LOG DE EXCLUSÕES
-- ==========================================

CREATE OR REPLACE FUNCTION log_exclusao_pano()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO logs_atividade (user_id, acao, modulo, detalhes)
  VALUES (
    auth.uid(),
    'DELETE',
    'panos',
    jsonb_build_object(
      'pano_id', OLD.id,
      'pano_nome', OLD.nome,
      'data_exclusao', NOW()
    )
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_exclusao_pano ON panos;
CREATE TRIGGER trigger_log_exclusao_pano
  BEFORE DELETE ON panos
  FOR EACH ROW
  EXECUTE FUNCTION log_exclusao_pano();

CREATE OR REPLACE FUNCTION log_exclusao_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO logs_atividade (user_id, acao, modulo, detalhes)
  VALUES (
    auth.uid(),
    'DELETE',
    'vendas',
    jsonb_build_object(
      'venda_id', OLD.id,
      'cliente_id', OLD.cliente_id,
      'valor_total', OLD.valor_total,
      'data_exclusao', NOW()
    )
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_exclusao_venda ON vendas;
CREATE TRIGGER trigger_log_exclusao_venda
  BEFORE DELETE ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION log_exclusao_venda();

-- ==========================================
-- 12. FUNÇÕES SEGURAS DE EXCLUSÃO
-- ==========================================

CREATE OR REPLACE FUNCTION excluir_pano_seguro(pano_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_itens integer;
  total_vendas integer;
  resultado jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM panos
    WHERE id = pano_id_param
    AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pano não encontrado ou sem permissão'
    );
  END IF;

  SELECT COUNT(*) INTO total_itens
  FROM itens_pano
  WHERE pano_id = pano_id_param;

  SELECT COUNT(*) INTO total_vendas
  FROM vendas
  WHERE pano_id = pano_id_param;

  DELETE FROM panos WHERE id = pano_id_param;

  resultado := jsonb_build_object(
    'success', true,
    'itens_excluidos', total_itens,
    'vendas_vinculadas', total_vendas,
    'message', 'Pano excluído com sucesso'
  );

  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION excluir_venda_segura(venda_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_itens integer;
  total_pagamentos integer;
  resultado jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vendas
    WHERE id = venda_id_param
    AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Venda não encontrada ou sem permissão'
    );
  END IF;

  SELECT COUNT(*) INTO total_itens
  FROM itens_venda
  WHERE venda_id = venda_id_param;

  SELECT COUNT(*) INTO total_pagamentos
  FROM pagamentos
  WHERE venda_id = venda_id_param;

  DELETE FROM vendas WHERE id = venda_id_param;

  resultado := jsonb_build_object(
    'success', true,
    'itens_excluidos', total_itens,
    'pagamentos_excluidos', total_pagamentos,
    'message', 'Venda excluída com sucesso'
  );

  RETURN resultado;
END;
$$;

-- ==========================================
-- DOCUMENTAÇÃO
-- ==========================================

COMMENT ON POLICY "Users can delete own panos" ON panos IS 
  'Permite usuários excluir seus próprios panos - CASCADE automático em relacionamentos';

COMMENT ON FUNCTION excluir_pano_seguro IS 
  'Função segura para excluir pano com validação, CASCADE e log automático';

COMMENT ON FUNCTION excluir_venda_segura IS 
  'Função segura para excluir venda com validação, CASCADE e log automático';
