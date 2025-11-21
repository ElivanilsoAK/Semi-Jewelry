-- Atualiza função para buscar vendas dos últimos 2 anos com valor total
DROP FUNCTION IF EXISTS buscar_vendas_para_garantia(text, integer);

CREATE FUNCTION buscar_vendas_para_garantia(
  cliente_id_param uuid DEFAULT NULL,
  busca text DEFAULT NULL,
  limite integer DEFAULT 50
)
RETURNS TABLE(
  venda_id uuid,
  cliente_id uuid,
  cliente_nome text,
  data_venda timestamptz,
  valor_total numeric,
  forma_pagamento text,
  itens_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as venda_id,
    v.cliente_id,
    c.nome as cliente_nome,
    v.data_venda,
    v.valor_total,
    v.forma_pagamento,
    COUNT(iv.id) as itens_count
  FROM vendas v
  INNER JOIN clientes c ON v.cliente_id = c.id
  LEFT JOIN itens_venda iv ON v.id = iv.venda_id
  WHERE v.data_venda >= CURRENT_DATE - INTERVAL '2 years'
    AND (cliente_id_param IS NULL OR v.cliente_id = cliente_id_param)
    AND (
      busca IS NULL
      OR c.nome ILIKE '%' || busca || '%'
      OR v.id::text ILIKE '%' || busca || '%'
      OR v.valor_total::text ILIKE '%' || busca || '%'
    )
  GROUP BY v.id, v.cliente_id, c.nome, v.data_venda, v.valor_total, v.forma_pagamento
  ORDER BY v.data_venda DESC
  LIMIT limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar itens disponíveis no pano para troca
CREATE OR REPLACE FUNCTION buscar_itens_disponiveis_pano(pano_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  item_id uuid,
  pano_id uuid,
  descricao text,
  categoria text,
  valor_unitario numeric,
  quantidade_disponivel integer,
  foto_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id as item_id,
    ip.pano_id,
    ip.descricao,
    ip.categoria,
    ip.valor_unitario,
    ip.quantidade_disponivel,
    ip.foto_url
  FROM itens_pano ip
  INNER JOIN panos p ON ip.pano_id = p.id
  WHERE ip.quantidade_disponivel > 0
    AND p.status = 'ativo'
    AND (pano_id_param IS NULL OR ip.pano_id = pano_id_param)
  ORDER BY ip.categoria, ip.descricao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adiciona campos para diferença de valor em garantias
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'garantias' AND column_name = 'diferenca_valor') THEN
    ALTER TABLE garantias ADD COLUMN diferenca_valor numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'garantias' AND column_name = 'forma_pagamento_diferenca') THEN
    ALTER TABLE garantias ADD COLUMN forma_pagamento_diferenca text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'garantias' AND column_name = 'valor_item_antigo') THEN
    ALTER TABLE garantias ADD COLUMN valor_item_antigo numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'garantias' AND column_name = 'valor_item_novo') THEN
    ALTER TABLE garantias ADD COLUMN valor_item_novo numeric;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION buscar_vendas_para_garantia TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_itens_disponiveis_pano TO authenticated;