/*
  # Corrige função para relatórios de estoque

  1. Atualiza função para retornar todos os itens do pano
  2. Inclui itens com quantidade zero para relatórios completos
*/

-- Atualiza função para relatórios (inclui todos os itens)
CREATE OR REPLACE FUNCTION buscar_todos_itens_estoque()
RETURNS TABLE(
  item_id uuid,
  pano_id uuid,
  descricao text,
  categoria text,
  valor_unitario numeric,
  quantidade_disponivel integer,
  quantidade_inicial integer,
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
    ip.quantidade_inicial,
    ip.foto_url
  FROM itens_pano ip
  INNER JOIN panos p ON ip.pano_id = p.id
  WHERE p.user_id = auth.uid()
  ORDER BY ip.categoria, ip.descricao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_todos_itens_estoque TO authenticated;