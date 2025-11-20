/*
  # Add Client and Sales Enhancements
  
  1. Clientes - Novos Campos
    - cpf_cnpj (documento de identificação)
    - telefone (WhatsApp/contato)
    - data_nascimento (para aniversários)
    - observacoes (notas importantes)
    - foto_url (foto do cliente - opcional)
  
  2. Vendas - Novos Campos
    - forma_pagamento (PIX, Dinheiro, Cartão, etc)
    - desconto (valor de desconto aplicado)
    - motivo_cancelamento (se cancelada)
    - status_pagamento (pago, pendente, atrasado)
  
  3. Panos - Novos Campos
    - percentual_comissao (comissão do pano)
    - cliente_responsavel (quem está com o pano)
    - data_prevista_retorno (controle de retorno)
*/

-- Adicionar campos aos clientes
ALTER TABLE clientes 
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS foto_url text;

-- Adicionar campos às vendas
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS forma_pagamento text DEFAULT 'dinheiro',
  ADD COLUMN IF NOT EXISTS desconto numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT 'pendente';

-- Adicionar campos aos panos
ALTER TABLE panos
  ADD COLUMN IF NOT EXISTS percentual_comissao numeric(5,2) DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS cliente_responsavel text,
  ADD COLUMN IF NOT EXISTS data_prevista_retorno date;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_nascimento ON clientes(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_vendas_forma_pagamento ON vendas(forma_pagamento);
CREATE INDEX IF NOT EXISTS idx_vendas_status_pagamento ON vendas(status_pagamento);
