/*
  # Melhorias nos Panos - SPHERE

  1. Alterações na Tabela `panos`
    - Adiciona `cliente_id` (uuid, FK para clientes) - rastreamento de quem está com o pano
    - Adiciona `percentual_comissao` (numeric) - comissão definida por pano
    - Adiciona `valor_total` (numeric) - valor total dos itens no pano
    - Adiciona `data_prevista_retorno` (date) - data prevista de retorno

  2. Alterações na Tabela `itens_pano`
    - Adiciona `foto_urls` (jsonb) - múltiplas fotos do item
    - OBS: foto_url já existe

  3. Security
    - Mantém RLS existente
    - Políticas continuam as mesmas

  4. Notas Importantes
    - `valor_total` será calculado pela aplicação
    - Campos: valor_unitario, quantidade_inicial, quantidade_disponivel
*/

-- Adiciona novos campos à tabela panos
DO $$
BEGIN
  -- Cliente responsável pelo pano
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panos' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE panos ADD COLUMN cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL;
  END IF;

  -- Percentual de comissão específico deste pano (sobrescreve global)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panos' AND column_name = 'percentual_comissao'
  ) THEN
    ALTER TABLE panos ADD COLUMN percentual_comissao numeric(5,2) DEFAULT NULL;
  END IF;

  -- Valor total do pano (soma dos itens)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panos' AND column_name = 'valor_total'
  ) THEN
    ALTER TABLE panos ADD COLUMN valor_total numeric(10,2) DEFAULT 0;
  END IF;

  -- Data prevista de retorno (alerta se passar)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panos' AND column_name = 'data_prevista_retorno'
  ) THEN
    ALTER TABLE panos ADD COLUMN data_prevista_retorno date DEFAULT NULL;
  END IF;
END $$;

-- Adiciona campo de múltiplas fotos à tabela itens_pano
DO $$
BEGIN
  -- Array de URLs de fotos (múltiplas fotos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itens_pano' AND column_name = 'foto_urls'
  ) THEN
    ALTER TABLE itens_pano ADD COLUMN foto_urls jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Cria índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_panos_cliente_id ON panos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_panos_status ON panos(status);
CREATE INDEX IF NOT EXISTS idx_panos_data_retirada ON panos(data_retirada);

-- Função para calcular dias de circulação
CREATE OR REPLACE FUNCTION calcular_dias_circulacao(data_retirada date, status text, data_devolucao_efetiva date)
RETURNS integer AS $$
BEGIN
  IF status = 'ativo' THEN
    RETURN EXTRACT(DAY FROM (CURRENT_DATE - data_retirada));
  ELSIF status = 'devolvido' AND data_devolucao_efetiva IS NOT NULL THEN
    RETURN EXTRACT(DAY FROM (data_devolucao_efetiva - data_retirada));
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View para panos com informações calculadas
CREATE OR REPLACE VIEW panos_detalhados AS
SELECT 
  p.*,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  calcular_dias_circulacao(p.data_retirada::date, p.status, p.data_devolucao::date) as dias_circulacao,
  CASE 
    WHEN p.status = 'ativo' AND p.data_prevista_retorno IS NOT NULL AND p.data_prevista_retorno < CURRENT_DATE 
    THEN true 
    ELSE false 
  END as retorno_atrasado,
  (
    SELECT COUNT(*) 
    FROM itens_pano ip 
    WHERE ip.pano_id = p.id
  ) as total_itens,
  (
    SELECT COALESCE(SUM(ip.valor_unitario * ip.quantidade_inicial), 0)
    FROM itens_pano ip
    WHERE ip.pano_id = p.id
  ) as valor_calculado
FROM panos p
LEFT JOIN clientes c ON p.cliente_id = c.id;

-- Função para calcular lucratividade de um pano
CREATE OR REPLACE FUNCTION calcular_lucratividade_pano(pano_id_param uuid)
RETURNS TABLE(
  pano_id uuid,
  pano_nome text,
  valor_total_itens numeric,
  valor_vendido numeric,
  quantidade_vendida integer,
  percentual_vendido numeric,
  comissao_gerada numeric,
  lucro_liquido numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as pano_id,
    p.nome as pano_nome,
    COALESCE(SUM(ip.valor_unitario * ip.quantidade_inicial), 0) as valor_total_itens,
    COALESCE(SUM(ip.valor_unitario * (ip.quantidade_inicial - ip.quantidade_disponivel)), 0) as valor_vendido,
    COALESCE(SUM(ip.quantidade_inicial - ip.quantidade_disponivel), 0)::integer as quantidade_vendida,
    CASE 
      WHEN SUM(ip.quantidade_inicial) > 0 
      THEN (SUM(ip.quantidade_inicial - ip.quantidade_disponivel)::numeric / SUM(ip.quantidade_inicial)::numeric * 100)
      ELSE 0 
    END as percentual_vendido,
    COALESCE(SUM(
      (ip.valor_unitario * (ip.quantidade_inicial - ip.quantidade_disponivel)) * COALESCE(p.percentual_comissao, 10) / 100
    ), 0) as comissao_gerada,
    COALESCE(SUM(
      (ip.valor_unitario * (ip.quantidade_inicial - ip.quantidade_disponivel)) * (1 - COALESCE(p.percentual_comissao, 10) / 100)
    ), 0) as lucro_liquido
  FROM panos p
  LEFT JOIN itens_pano ip ON p.id = ip.pano_id
  WHERE p.id = pano_id_param
  GROUP BY p.id, p.nome, p.percentual_comissao;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentários para documentação
COMMENT ON COLUMN panos.cliente_id IS 'Cliente responsável pelo pano (quem está com ele)';
COMMENT ON COLUMN panos.percentual_comissao IS 'Comissão específica deste pano (NULL = usa global)';
COMMENT ON COLUMN panos.valor_total IS 'Valor total dos itens no pano';
COMMENT ON COLUMN panos.data_prevista_retorno IS 'Data prevista de retorno do pano';
COMMENT ON COLUMN itens_pano.foto_urls IS 'Array JSON com URLs de múltiplas fotos';
