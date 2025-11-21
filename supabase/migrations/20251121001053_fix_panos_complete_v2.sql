/*
  # Correção Completa da Estrutura de Panos v2

  Corrige toda a estrutura e lógica de panos
*/

-- 1. TORNAR DATA_DEVOLUCAO OPCIONAL
ALTER TABLE panos ALTER COLUMN data_devolucao DROP NOT NULL;

-- 2. ATUALIZAR DEFAULTS
ALTER TABLE panos ALTER COLUMN percentual_comissao SET DEFAULT 10.0;
ALTER TABLE panos ALTER COLUMN valor_total SET DEFAULT 0;
ALTER TABLE panos ALTER COLUMN fornecedor SET DEFAULT 'Magold';

-- 3. RECRIAR VIEW PANOS_DETALHADOS
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
  p.observacoes,
  p.user_id,
  p.fornecedor,
  p.cliente_responsavel,
  p.percentual_comissao,
  p.valor_total,
  p.created_at,
  p.foto_url,
  p.ocr_processed,
  p.cliente_id,
  p.data_prevista_retorno,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  COUNT(DISTINCT ip.id) as total_itens,
  COALESCE(SUM(ip.quantidade_inicial), 0) as quantidade_total,
  COALESCE(SUM(ip.quantidade_disponivel), 0) as quantidade_disponivel,
  COALESCE(SUM(ip.quantidade_inicial - ip.quantidade_disponivel), 0) as quantidade_vendida,
  COALESCE(SUM(ip.valor_unitario * ip.quantidade_inicial), 0) as valor_total_itens,
  COALESCE(SUM(ip.valor_unitario * (ip.quantidade_inicial - ip.quantidade_disponivel)), 0) as valor_vendido,
  CASE
    WHEN p.data_devolucao IS NOT NULL THEN (p.data_devolucao - p.data_retirada)
    ELSE (CURRENT_DATE - p.data_retirada)
  END as dias_circulacao,
  CASE
    WHEN p.data_prevista_retorno IS NOT NULL AND p.status = 'ativo' AND CURRENT_DATE > p.data_prevista_retorno
    THEN true
    ELSE false
  END as retorno_atrasado
FROM panos p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN itens_pano ip ON ip.pano_id = p.id
GROUP BY 
  p.id, p.nome, p.data_retirada, p.data_devolucao, p.status, 
  p.observacoes, p.user_id, p.fornecedor, p.cliente_responsavel,
  p.percentual_comissao, p.valor_total, p.created_at, p.foto_url,
  p.ocr_processed, p.cliente_id, p.data_prevista_retorno, c.nome, c.telefone;

-- 4. RECRIAR FUNÇÃO DE LUCRATIVIDADE
DROP FUNCTION IF EXISTS calcular_lucratividade_pano(uuid);
CREATE FUNCTION calcular_lucratividade_pano(pano_id_param uuid)
RETURNS TABLE(
  valor_total_itens numeric,
  valor_vendido numeric,
  quantidade_vendida bigint,
  percentual_vendido numeric,
  comissao_gerada numeric,
  lucro_liquido numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor_total_itens numeric;
  v_valor_vendido numeric;
  v_quantidade_vendida bigint;
  v_percentual_vendido numeric;
  v_comissao_gerada numeric;
  v_lucro_liquido numeric;
  v_percentual_comissao numeric;
BEGIN
  SELECT COALESCE(percentual_comissao, 10.0)
  INTO v_percentual_comissao
  FROM panos
  WHERE id = pano_id_param;

  SELECT 
    COALESCE(SUM(valor_unitario * quantidade_inicial), 0),
    COALESCE(SUM(valor_unitario * (quantidade_inicial - quantidade_disponivel)), 0),
    COALESCE(SUM(quantidade_inicial - quantidade_disponivel), 0)
  INTO v_valor_total_itens, v_valor_vendido, v_quantidade_vendida
  FROM itens_pano
  WHERE pano_id = pano_id_param;

  IF v_valor_total_itens > 0 THEN
    v_percentual_vendido := (v_valor_vendido / v_valor_total_itens) * 100;
  ELSE
    v_percentual_vendido := 0;
  END IF;

  v_comissao_gerada := v_valor_vendido * (v_percentual_comissao / 100);
  v_lucro_liquido := v_valor_vendido - v_comissao_gerada;

  RETURN QUERY
  SELECT 
    v_valor_total_itens,
    v_valor_vendido,
    v_quantidade_vendida,
    v_percentual_vendido,
    v_comissao_gerada,
    v_lucro_liquido;
END;
$$;

-- 5. FUNÇÃO PARA ESTATÍSTICAS
CREATE OR REPLACE FUNCTION estatisticas_pano(pano_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_itens', COALESCE(COUNT(*)::integer, 0),
    'itens_disponiveis', COALESCE(SUM(quantidade_disponivel)::integer, 0),
    'itens_vendidos', COALESCE(SUM(quantidade_inicial - quantidade_disponivel)::integer, 0),
    'valor_total', COALESCE(SUM(valor_unitario * quantidade_inicial), 0),
    'valor_vendido', COALESCE(SUM(valor_unitario * (quantidade_inicial - quantidade_disponivel)), 0),
    'percentual_vendido', CASE 
      WHEN SUM(valor_unitario * quantidade_inicial) > 0 
      THEN ROUND((SUM(valor_unitario * (quantidade_inicial - quantidade_disponivel)) / SUM(valor_unitario * quantidade_inicial)) * 100, 2)
      ELSE 0
    END
  )
  INTO resultado
  FROM itens_pano
  WHERE pano_id = pano_id_param;

  RETURN COALESCE(resultado, jsonb_build_object(
    'total_itens', 0,
    'itens_disponiveis', 0,
    'itens_vendidos', 0,
    'valor_total', 0,
    'valor_vendido', 0,
    'percentual_vendido', 0
  ));
END;
$$;

-- 6. TRIGGER ATUALIZAR VALOR_TOTAL
CREATE OR REPLACE FUNCTION atualizar_valor_total_pano()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_valor_total numeric;
BEGIN
  SELECT COALESCE(SUM(valor_unitario * quantidade_inicial), 0)
  INTO novo_valor_total
  FROM itens_pano
  WHERE pano_id = COALESCE(NEW.pano_id, OLD.pano_id);

  UPDATE panos
  SET valor_total = novo_valor_total
  WHERE id = COALESCE(NEW.pano_id, OLD.pano_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_atualizar_valor_pano ON itens_pano;
CREATE TRIGGER trigger_atualizar_valor_pano
  AFTER INSERT OR UPDATE OR DELETE ON itens_pano
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_total_pano();
