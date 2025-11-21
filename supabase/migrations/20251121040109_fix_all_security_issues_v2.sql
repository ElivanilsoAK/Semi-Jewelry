/*
  # Correção Completa de Segurança e Performance v2

  Corrige todos os problemas identificados pelo scanner de segurança
*/

-- ==========================================
-- 1. ADICIONAR ÍNDICES PARA FOREIGN KEYS
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_agendamentos_relatorio_id ON agendamentos_relatorios(relatorio_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_user_id ON agendamentos_relatorios(user_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_pano_id ON comissoes(pano_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_venda_id ON comissoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_user_id ON devolucoes_venda(user_id);
CREATE INDEX IF NOT EXISTS idx_garantias_item_novo_id ON garantias(item_novo_id) WHERE item_novo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_garantias_item_original_id ON garantias(item_original_id);
CREATE INDEX IF NOT EXISTS idx_historico_pagamento_id ON historico_pagamentos(pagamento_id);
CREATE INDEX IF NOT EXISTS idx_historico_user_id ON historico_pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_user_id ON parcelas_venda(user_id);
CREATE INDEX IF NOT EXISTS idx_perfis_criado_por ON perfis_usuario(criado_por) WHERE criado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendas_cancelado_por ON vendas(cancelado_por) WHERE cancelado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_garantia_id ON vouchers(garantia_id) WHERE garantia_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_venda_origem_id ON vouchers(venda_origem_id) WHERE venda_origem_id IS NOT NULL;

-- ==========================================
-- 2. OTIMIZAR POLÍTICAS RLS
-- ==========================================

DROP POLICY IF EXISTS "Users can view own clientes" ON clientes;
CREATE POLICY "Users can view own clientes"
  ON clientes FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own itens_venda" ON itens_venda;
CREATE POLICY "Users can view own itens_venda"
  ON itens_venda FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own garantias" ON garantias;
CREATE POLICY "Users can delete own garantias"
  ON garantias FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own garantias" ON garantias;
CREATE POLICY "Users can update own garantias"
  ON garantias FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own categorias" ON categorias;
CREATE POLICY "Users can delete own categorias"
  ON categorias FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own categorias" ON categorias;
CREATE POLICY "Users can insert own categorias"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own categorias" ON categorias;
CREATE POLICY "Users can update own categorias"
  ON categorias FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view global and own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can view own categorias" ON categorias;
CREATE POLICY "Users can view own categorias"
  ON categorias FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own vendas" ON vendas;
CREATE POLICY "Users can view own vendas"
  ON vendas FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own vouchers" ON vouchers;
CREATE POLICY "Users can view own vouchers"
  ON vouchers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own vouchers" ON vouchers;
CREATE POLICY "Users can insert own vouchers"
  ON vouchers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own vouchers" ON vouchers;
CREATE POLICY "Users can update own vouchers"
  ON vouchers FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own vouchers" ON vouchers;
CREATE POLICY "Users can delete own vouchers"
  ON vouchers FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ==========================================
-- 3. REMOVER POLÍTICAS DUPLICADAS
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can manage commissions" ON comissoes;
DROP POLICY IF EXISTS "Users can delete own itens" ON itens_pano;

-- ==========================================
-- 4. REMOVER ÍNDICES NÃO UTILIZADOS
-- ==========================================

DROP INDEX IF EXISTS idx_categorias_categoria_pai;
DROP INDEX IF EXISTS idx_logs_user_id;
DROP INDEX IF EXISTS idx_panos_cliente_id_fk;
DROP INDEX IF EXISTS idx_panos_user_id_fk;
DROP INDEX IF EXISTS idx_categorias_user_id_ativo;
DROP INDEX IF EXISTS idx_categorias_global_ativo;
DROP INDEX IF EXISTS idx_vendas_cliente_data;
DROP INDEX IF EXISTS idx_pagamentos_negociacao;
DROP INDEX IF EXISTS idx_pagamentos_data_status;
DROP INDEX IF EXISTS idx_vouchers_user_id;
DROP INDEX IF EXISTS idx_vouchers_cliente_id;
DROP INDEX IF EXISTS idx_vouchers_status;
DROP INDEX IF EXISTS idx_vouchers_codigo;
DROP INDEX IF EXISTS idx_vendas_voucher;
DROP INDEX IF EXISTS idx_vendas_tipo;

-- ==========================================
-- 5. CORRIGIR SEARCH PATH DAS FUNÇÕES
-- ==========================================

DROP FUNCTION IF EXISTS increment_stock(uuid, integer);
CREATE FUNCTION increment_stock(item_id uuid, quantidade integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE itens_pano
  SET quantidade_disponivel = quantidade_disponivel + quantidade
  WHERE id = item_id;
END;
$$;

DROP FUNCTION IF EXISTS decrement_stock(uuid, integer);
CREATE FUNCTION decrement_stock(item_id uuid, quantidade integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE itens_pano
  SET quantidade_disponivel = quantidade_disponivel - quantidade
  WHERE id = item_id
  AND quantidade_disponivel >= quantidade;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS gerar_codigo_voucher();
CREATE FUNCTION gerar_codigo_voucher()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  novo_codigo text;
  codigo_existe boolean;
  ano text;
  sequencia integer;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YYYY');
  sequencia := 1;
  
  LOOP
    novo_codigo := 'VOUCH-' || ano || '-' || LPAD(sequencia::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM vouchers WHERE codigo = novo_codigo) INTO codigo_existe;
    EXIT WHEN NOT codigo_existe;
    sequencia := sequencia + 1;
  END LOOP;
  
  RETURN novo_codigo;
END;
$$;

DROP FUNCTION IF EXISTS calcular_dias_circulacao(date, date);
CREATE FUNCTION calcular_dias_circulacao(data_inicial date, data_final date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN COALESCE(data_final, CURRENT_DATE) - data_inicial;
END;
$$;

DROP FUNCTION IF EXISTS atualizar_status_parcelas_atrasadas();
CREATE FUNCTION atualizar_status_parcelas_atrasadas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE pagamentos
  SET status = 'atrasado'
  WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;
END;
$$;

DROP FUNCTION IF EXISTS registrar_log_atividade(text, text, text, uuid);
CREATE FUNCTION registrar_log_atividade(
  tipo_log text,
  descricao_log text,
  entidade_tipo text DEFAULT NULL,
  entidade_id_log uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO logs_atividade (user_id, tipo, descricao, entidade_tipo, entidade_id)
  VALUES (auth.uid(), tipo_log, descricao_log, entidade_tipo, entidade_id_log);
END;
$$;

-- Recriar view sem SECURITY DEFINER
DROP VIEW IF EXISTS vouchers_detalhados;
CREATE VIEW vouchers_detalhados
WITH (security_invoker=true)
AS
SELECT 
  v.id,
  v.codigo,
  v.user_id,
  v.garantia_id,
  v.cliente_id,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  v.valor_original,
  v.valor_disponivel,
  v.valor_utilizado,
  v.status,
  v.data_validade,
  v.venda_origem_id,
  v.observacoes,
  v.created_at,
  g.tipo as tipo_garantia,
  g.motivo as motivo_garantia,
  CASE
    WHEN v.status = 'utilizado' THEN 'Totalmente Utilizado'
    WHEN v.status = 'cancelado' THEN 'Cancelado'
    WHEN v.status = 'expirado' THEN 'Expirado'
    WHEN v.data_validade < CURRENT_DATE THEN 'Vencido'
    WHEN v.valor_disponivel > 0 THEN 'Disponível'
    ELSE 'Indisponível'
  END as status_descricao,
  CASE
    WHEN v.data_validade < CURRENT_DATE THEN true
    ELSE false
  END as esta_vencido
FROM vouchers v
LEFT JOIN clientes c ON c.id = v.cliente_id
LEFT JOIN garantias g ON g.id = v.garantia_id;