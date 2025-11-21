/*
  # Sistema Completo de Vouchers de Garantia

  ## Nova Estrutura

  1. **Tabela vouchers**
    - `id` - Identificador único do voucher
    - `codigo` - Código único do voucher (ex: VOUCH-2024-001)
    - `garantia_id` - Referência à garantia que gerou o voucher
    - `cliente_id` - Cliente dono do voucher
    - `valor_original` - Valor do item devolvido/trocado
    - `valor_disponivel` - Saldo disponível no voucher
    - `valor_utilizado` - Total já utilizado
    - `status` - Status do voucher (ativo, utilizado, expirado, cancelado)
    - `data_validade` - Data de expiração do voucher
    - `venda_origem_id` - Venda que originou a garantia
    - `observacoes` - Observações sobre o voucher

  2. **Tabela vendas - Novos campos**
    - `voucher_id` - Referência ao voucher utilizado (se houver)
    - `valor_voucher_utilizado` - Valor do voucher aplicado na venda
    - `tipo_venda` - Normal ou garantia

  3. **Triggers Automáticos**
    - Geração automática de voucher ao aprovar garantia de devolução
    - Cálculo automático de crédito baseado no valor do item devolvido
    - Atualização de estoque ao processar garantia de troca
    - Registro automático de movimentação em vendas

  ## Lógica de Negócio

  ### Devolução:
  - Cliente recebe voucher com 100% do valor pago pelo item
  - Voucher válido por 2 anos (mesma política de garantia)
  - Item volta ao estoque com status "garantia"

  ### Troca:
  - Se item novo > item antigo: Cliente paga diferença OU usa voucher
  - Se item novo < item antigo: Cliente recebe voucher com a diferença
  - Item antigo volta ao estoque
  - Item novo sai do estoque

  ## Segurança
    - RLS habilitado em todas as tabelas
    - User isolation completo
    - Validações de saldo e disponibilidade
*/

-- Criar tabela de vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  codigo text UNIQUE NOT NULL,
  garantia_id uuid REFERENCES garantias(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  valor_original numeric(10, 2) NOT NULL DEFAULT 0,
  valor_disponivel numeric(10, 2) NOT NULL DEFAULT 0,
  valor_utilizado numeric(10, 2) NOT NULL DEFAULT 0,
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'utilizado', 'expirado', 'cancelado')),
  data_validade date NOT NULL,
  venda_origem_id uuid REFERENCES vendas(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar campos em vendas para vouchers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'voucher_id'
  ) THEN
    ALTER TABLE vendas ADD COLUMN voucher_id uuid REFERENCES vouchers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'valor_voucher_utilizado'
  ) THEN
    ALTER TABLE vendas ADD COLUMN valor_voucher_utilizado numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'tipo_venda'
  ) THEN
    ALTER TABLE vendas ADD COLUMN tipo_venda text DEFAULT 'normal' CHECK (tipo_venda IN ('normal', 'garantia', 'troca'));
  END IF;
END $$;

-- Adicionar campo codigo_voucher em garantias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'garantias' AND column_name = 'codigo_voucher'
  ) THEN
    ALTER TABLE garantias ADD COLUMN codigo_voucher text;
  END IF;
END $$;

-- Função para gerar código único de voucher
CREATE OR REPLACE FUNCTION gerar_codigo_voucher()
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

-- Função para processar garantia e gerar voucher
CREATE OR REPLACE FUNCTION processar_garantia_voucher()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id uuid;
  v_venda_origem_id uuid;
  v_valor_item numeric(10, 2);
  v_valor_voucher numeric(10, 2);
  v_codigo_voucher text;
  v_item_antigo_id uuid;
  v_item_novo_id uuid;
  v_diferenca numeric(10, 2);
BEGIN
  -- Só processa quando status muda para 'aprovada' ou 'concluida'
  IF (NEW.status = 'aprovada' OR NEW.status = 'concluida') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    
    -- Buscar informações da venda original
    SELECT v.cliente_id, v.id, iv.valor_unitario, iv.item_pano_id
    INTO v_cliente_id, v_venda_origem_id, v_valor_item, v_item_antigo_id
    FROM vendas v
    JOIN itens_venda iv ON iv.venda_id = v.id
    WHERE v.id = NEW.venda_original_id
    AND iv.id = NEW.item_original_id
    LIMIT 1;

    -- CASO 1: DEVOLUÇÃO - Gera voucher com valor total do item
    IF NEW.tipo = 'devolucao' THEN
      v_valor_voucher := v_valor_item;
      v_codigo_voucher := gerar_codigo_voucher();
      
      -- Criar voucher
      INSERT INTO vouchers (
        user_id,
        codigo,
        garantia_id,
        cliente_id,
        valor_original,
        valor_disponivel,
        valor_utilizado,
        status,
        data_validade,
        venda_origem_id,
        observacoes
      ) VALUES (
        NEW.user_id,
        v_codigo_voucher,
        NEW.id,
        v_cliente_id,
        v_valor_voucher,
        v_valor_voucher,
        0,
        'ativo',
        CURRENT_DATE + INTERVAL '2 years',
        v_venda_origem_id,
        'Voucher gerado por devolução - Garantia ID: ' || NEW.id
      );
      
      -- Atualizar garantia com código do voucher
      UPDATE garantias SET codigo_voucher = v_codigo_voucher WHERE id = NEW.id;
      
      -- Devolver item ao estoque
      UPDATE itens_pano 
      SET quantidade_disponivel = quantidade_disponivel + 1
      WHERE id = v_item_antigo_id;
    
    -- CASO 2: TROCA - Processa diferença de valores
    ELSIF NEW.tipo = 'troca' AND NEW.item_novo_id IS NOT NULL THEN
      
      -- Calcular diferença entre item novo e antigo
      SELECT ip.valor_unitario, ip.id
      INTO v_diferenca, v_item_novo_id
      FROM itens_pano ip
      WHERE ip.id = NEW.item_novo_id;
      
      v_diferenca := v_diferenca - v_valor_item;
      
      -- Se item novo for MAIS BARATO, gera voucher com a diferença
      IF v_diferenca < 0 THEN
        v_codigo_voucher := gerar_codigo_voucher();
        
        INSERT INTO vouchers (
          user_id,
          codigo,
          garantia_id,
          cliente_id,
          valor_original,
          valor_disponivel,
          valor_utilizado,
          status,
          data_validade,
          venda_origem_id,
          observacoes
        ) VALUES (
          NEW.user_id,
          v_codigo_voucher,
          NEW.id,
          v_cliente_id,
          ABS(v_diferenca),
          ABS(v_diferenca),
          0,
          'ativo',
          CURRENT_DATE + INTERVAL '2 years',
          v_venda_origem_id,
          'Voucher gerado por troca (diferença a favor) - Garantia ID: ' || NEW.id
        );
        
        UPDATE garantias SET codigo_voucher = v_codigo_voucher WHERE id = NEW.id;
      END IF;
      
      -- Atualizar estoque: item antigo volta, item novo sai
      UPDATE itens_pano 
      SET quantidade_disponivel = quantidade_disponivel + 1
      WHERE id = v_item_antigo_id;
      
      UPDATE itens_pano 
      SET quantidade_disponivel = quantidade_disponivel - 1
      WHERE id = v_item_novo_id;
      
      -- Criar nova venda para registrar a troca
      INSERT INTO vendas (
        user_id,
        cliente_id,
        data_venda,
        valor_total,
        tipo_venda,
        observacoes
      ) VALUES (
        NEW.user_id,
        v_cliente_id,
        CURRENT_DATE,
        GREATEST(v_diferenca, 0),
        'troca',
        'Venda de troca - Garantia ID: ' || NEW.id || ' - ' || NEW.motivo
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para processar garantia
DROP TRIGGER IF EXISTS trigger_processar_garantia_voucher ON garantias;
CREATE TRIGGER trigger_processar_garantia_voucher
  AFTER INSERT OR UPDATE ON garantias
  FOR EACH ROW
  EXECUTE FUNCTION processar_garantia_voucher();

-- Função para aplicar voucher em venda
CREATE OR REPLACE FUNCTION aplicar_voucher_venda()
RETURNS TRIGGER AS $$
DECLARE
  v_voucher_disponivel numeric(10, 2);
  v_valor_a_utilizar numeric(10, 2);
BEGIN
  IF NEW.voucher_id IS NOT NULL AND NEW.valor_voucher_utilizado > 0 THEN
    
    -- Verificar saldo disponível no voucher
    SELECT valor_disponivel INTO v_voucher_disponivel
    FROM vouchers
    WHERE id = NEW.voucher_id AND status = 'ativo';
    
    IF v_voucher_disponivel IS NULL THEN
      RAISE EXCEPTION 'Voucher inválido ou inativo';
    END IF;
    
    IF v_voucher_disponivel < NEW.valor_voucher_utilizado THEN
      RAISE EXCEPTION 'Saldo insuficiente no voucher. Disponível: R$ %', v_voucher_disponivel;
    END IF;
    
    -- Atualizar voucher
    UPDATE vouchers
    SET 
      valor_disponivel = valor_disponivel - NEW.valor_voucher_utilizado,
      valor_utilizado = valor_utilizado + NEW.valor_voucher_utilizado,
      status = CASE 
        WHEN (valor_disponivel - NEW.valor_voucher_utilizado) <= 0 THEN 'utilizado'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.voucher_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para aplicar voucher em vendas
DROP TRIGGER IF EXISTS trigger_aplicar_voucher_venda ON vendas;
CREATE TRIGGER trigger_aplicar_voucher_venda
  AFTER INSERT OR UPDATE ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION aplicar_voucher_venda();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_cliente_id ON vouchers(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vouchers_codigo ON vouchers(codigo);
CREATE INDEX IF NOT EXISTS idx_vendas_voucher ON vendas(voucher_id) WHERE voucher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendas_tipo ON vendas(user_id, tipo_venda);

-- RLS para vouchers
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vouchers" ON vouchers;
CREATE POLICY "Users can view own vouchers"
  ON vouchers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own vouchers" ON vouchers;
CREATE POLICY "Users can insert own vouchers"
  ON vouchers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own vouchers" ON vouchers;
CREATE POLICY "Users can update own vouchers"
  ON vouchers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own vouchers" ON vouchers;
CREATE POLICY "Users can delete own vouchers"
  ON vouchers FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- View para listar vouchers com informações completas
CREATE OR REPLACE VIEW vouchers_detalhados AS
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