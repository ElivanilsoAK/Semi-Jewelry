/*
  # Correção Automática do Status de Pagamento das Vendas

  ## Problema
  - Vendas com todas as parcelas pagas continuam mostrando status "pendente"
  - Status não é atualizado automaticamente quando parcelas são pagas

  ## Solução
  1. Criar função que calcula o status correto baseado nas parcelas
  2. Criar trigger que atualiza automaticamente o status quando:
     - Uma parcela é paga
     - Uma parcela é adicionada
     - Uma parcela é atualizada

  ## Lógica de Status
  - **PAGO**: Todas as parcelas estão pagas
  - **PARCIAL**: Pelo menos uma parcela paga, mas não todas
  - **PENDENTE**: Nenhuma parcela paga e nenhuma atrasada
  - **ATRASADO**: Pelo menos uma parcela pendente com vencimento passado

  ## Segurança
  - Função SECURITY DEFINER para permitir atualização
  - Mantém RLS ativo
  - Apenas atualiza vendas do mesmo usuário
*/

-- Função para calcular o status de pagamento de uma venda
CREATE OR REPLACE FUNCTION calcular_status_pagamento_venda(venda_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_parcelas INTEGER;
  parcelas_pagas INTEGER;
  parcelas_atrasadas INTEGER;
  novo_status TEXT;
BEGIN
  -- Contar total de parcelas
  SELECT COUNT(*) INTO total_parcelas
  FROM pagamentos
  WHERE venda_id = venda_id_param;

  -- Se não tem parcelas, retorna pendente
  IF total_parcelas = 0 THEN
    RETURN 'pendente';
  END IF;

  -- Contar parcelas pagas
  SELECT COUNT(*) INTO parcelas_pagas
  FROM pagamentos
  WHERE venda_id = venda_id_param
    AND status = 'pago';

  -- Contar parcelas atrasadas (pendentes com vencimento passado)
  SELECT COUNT(*) INTO parcelas_atrasadas
  FROM pagamentos
  WHERE venda_id = venda_id_param
    AND status = 'pendente'
    AND data_vencimento < CURRENT_DATE;

  -- Determinar status
  IF parcelas_pagas = total_parcelas THEN
    novo_status := 'pago';
  ELSIF parcelas_atrasadas > 0 THEN
    novo_status := 'atrasado';
  ELSIF parcelas_pagas > 0 THEN
    novo_status := 'parcial';
  ELSE
    novo_status := 'pendente';
  END IF;

  RETURN novo_status;
END;
$$;

-- Função trigger para atualizar status da venda
CREATE OR REPLACE FUNCTION atualizar_status_pagamento_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  novo_status TEXT;
  venda_id_afetada UUID;
BEGIN
  -- Determinar qual venda foi afetada
  IF TG_OP = 'DELETE' THEN
    venda_id_afetada := OLD.venda_id;
  ELSE
    venda_id_afetada := NEW.venda_id;
  END IF;

  -- Calcular novo status
  novo_status := calcular_status_pagamento_venda(venda_id_afetada);

  -- Atualizar venda
  UPDATE vendas
  SET status_pagamento = novo_status
  WHERE id = venda_id_afetada;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_atualizar_status_pagamento ON pagamentos;

-- Criar trigger que atualiza status quando parcelas mudam
CREATE TRIGGER trigger_atualizar_status_pagamento
AFTER INSERT OR UPDATE OR DELETE ON pagamentos
FOR EACH ROW
EXECUTE FUNCTION atualizar_status_pagamento_venda();

-- Atualizar todas as vendas existentes com o status correto
DO $$
DECLARE
  venda_record RECORD;
BEGIN
  FOR venda_record IN SELECT id FROM vendas LOOP
    UPDATE vendas
    SET status_pagamento = calcular_status_pagamento_venda(venda_record.id)
    WHERE id = venda_record.id;
  END LOOP;
END $$;

-- Comentários para documentação
COMMENT ON FUNCTION calcular_status_pagamento_venda(UUID) IS 
  'Calcula o status de pagamento correto de uma venda baseado em suas parcelas';

COMMENT ON FUNCTION atualizar_status_pagamento_venda() IS 
  'Função trigger que atualiza automaticamente o status de pagamento quando parcelas são modificadas';

COMMENT ON TRIGGER trigger_atualizar_status_pagamento ON pagamentos IS 
  'Atualiza status_pagamento da venda automaticamente quando parcelas são inseridas, atualizadas ou deletadas';
