/*
  # Sistema de Gerenciamento de Semi-Joias
  
  1. Novas Tabelas
    - `clientes`
      - `id` (uuid, primary key)
      - `nome` (text, nome do cliente)
      - `telefone` (text, telefone para contato)
      - `email` (text, opcional)
      - `endereco` (text, opcional)
      - `created_at` (timestamp)
    
    - `panos`
      - `id` (uuid, primary key)
      - `nome` (text, nome/identificação do pano)
      - `data_retirada` (date, quando pegou o pano)
      - `data_devolucao` (date, quando deve devolver)
      - `foto_url` (text, URL da foto do papel)
      - `observacoes` (text, opcional)
      - `status` (text, ativo/devolvido)
      - `created_at` (timestamp)
    
    - `itens_pano`
      - `id` (uuid, primary key)
      - `pano_id` (uuid, foreign key -> panos)
      - `categoria` (text, argola/infantil/pulseira/colar/brinco/etc)
      - `descricao` (text, descrição do item)
      - `quantidade_inicial` (integer, quantidade inicial)
      - `quantidade_disponivel` (integer, quantidade disponível)
      - `valor_unitario` (numeric, valor de cada peça)
      - `created_at` (timestamp)
    
    - `vendas`
      - `id` (uuid, primary key)
      - `cliente_id` (uuid, foreign key -> clientes)
      - `data_venda` (timestamp, data da venda)
      - `valor_total` (numeric, valor total da venda)
      - `status_pagamento` (text, pendente/parcial/pago)
      - `observacoes` (text, opcional)
      - `created_at` (timestamp)
    
    - `itens_venda`
      - `id` (uuid, primary key)
      - `venda_id` (uuid, foreign key -> vendas)
      - `item_pano_id` (uuid, foreign key -> itens_pano)
      - `quantidade` (integer, quantidade vendida)
      - `valor_unitario` (numeric, valor unitário no momento da venda)
      - `valor_total` (numeric, valor total do item)
      - `created_at` (timestamp)
    
    - `pagamentos`
      - `id` (uuid, primary key)
      - `venda_id` (uuid, foreign key -> vendas)
      - `numero_parcela` (integer, número da parcela)
      - `valor_parcela` (numeric, valor da parcela)
      - `data_vencimento` (date, data de vencimento)
      - `data_pagamento` (date, data do pagamento efetivo)
      - `status` (text, pendente/pago)
      - `created_at` (timestamp)
  
  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados lerem e modificarem todos os dados
*/

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  email text,
  endereco text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS panos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data_retirada date NOT NULL,
  data_devolucao date NOT NULL,
  foto_url text,
  observacoes text,
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'devolvido')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_pano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pano_id uuid NOT NULL REFERENCES panos(id) ON DELETE CASCADE,
  categoria text NOT NULL CHECK (categoria IN ('argola', 'infantil', 'pulseira', 'colar', 'brinco', 'anel', 'tornozeleira', 'pingente', 'conjunto', 'outro')),
  descricao text NOT NULL,
  quantidade_inicial integer NOT NULL DEFAULT 0,
  quantidade_disponivel integer NOT NULL DEFAULT 0,
  valor_unitario numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  data_venda timestamptz DEFAULT now(),
  valor_total numeric(10, 2) NOT NULL DEFAULT 0,
  status_pagamento text DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'parcial', 'pago')),
  observacoes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  item_pano_id uuid NOT NULL REFERENCES itens_pano(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric(10, 2) NOT NULL,
  valor_total numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  numero_parcela integer NOT NULL DEFAULT 1,
  valor_parcela numeric(10, 2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE panos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pano ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage clientes"
  ON clientes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage panos"
  ON panos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage itens_pano"
  ON itens_pano FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage vendas"
  ON vendas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage itens_venda"
  ON itens_venda FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage pagamentos"
  ON pagamentos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_itens_pano_pano_id ON itens_pano(pano_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_id ON pagamentos(venda_id);