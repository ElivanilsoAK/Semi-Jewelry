-- Remove função antiga e cria nova com prestação de contas
DROP FUNCTION IF EXISTS calcular_lucratividade_pano(uuid);

CREATE FUNCTION calcular_lucratividade_pano(pano_id_param uuid)
RETURNS TABLE(
  valor_total_itens numeric,
  valor_vendido numeric,
  quantidade_vendida bigint,
  percentual_vendido numeric,
  comissao_gerada numeric,
  prestacao_contas numeric
) AS $$
DECLARE
  v_valor_total_itens numeric;
  v_valor_vendido numeric;
  v_quantidade_vendida bigint;
  v_percentual_vendido numeric;
  v_comissao_gerada numeric;
  v_prestacao_contas numeric;
  v_percentual_comissao numeric;
BEGIN
  SELECT COALESCE(percentual_comissao, 40.0)
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
  v_prestacao_contas := v_valor_vendido * 0.60;

  RETURN QUERY
  SELECT 
    v_valor_total_itens,
    v_valor_vendido,
    v_quantidade_vendida,
    v_percentual_vendido,
    v_comissao_gerada,
    v_prestacao_contas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calcular_lucratividade_pano TO authenticated;