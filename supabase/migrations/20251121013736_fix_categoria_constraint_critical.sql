/*
  # FIX CRÍTICO: Constraint de Categoria

  ## Problema
  A constraint `itens_pano_categoria_check` está bloqueando inserções porque:
  - Aceita apenas singular: 'pulseira', 'brinco', etc
  - Sistema envia plural: 'Pulseiras', 'Brincos', etc
  
  ## Solução
  1. Remover constraint antiga
  2. Criar nova constraint com categorias corretas (plural)
  3. Adicionar todas as variações de brincos
  
  ## Categorias Aceitas
  - Pulseiras
  - Correntes  
  - Pingentes
  - Anéis
  - Brincos G
  - Brincos I
  - Brincos M
  - Argolas
  - Tornozeleiras (opcional)
  - Conjuntos (opcional)
  - Infantil (opcional)
  - Outro (opcional)
*/

-- Remover constraint antiga
ALTER TABLE itens_pano 
DROP CONSTRAINT IF EXISTS itens_pano_categoria_check;

-- Criar nova constraint com categorias CORRETAS (plural e maiúsculas)
ALTER TABLE itens_pano 
ADD CONSTRAINT itens_pano_categoria_check 
CHECK (
  categoria IN (
    'Pulseiras',
    'Correntes',
    'Pingentes',
    'Anéis',
    'Brincos G',
    'Brincos I',
    'Brincos M',
    'Argolas',
    'Tornozeleiras',
    'Conjuntos',
    'Infantil',
    'Outro',
    -- Manter compatibilidade com dados antigos (singular minúsculo)
    'pulseira',
    'corrente',
    'pingente',
    'anel',
    'brinco',
    'argola',
    'tornozeleira',
    'conjunto',
    'infantil',
    'outro',
    'colar'
  )
);

-- Atualizar dados existentes para o novo padrão (plural)
UPDATE itens_pano SET categoria = 'Pulseiras' WHERE categoria IN ('pulseira', 'Pulseira');
UPDATE itens_pano SET categoria = 'Correntes' WHERE categoria IN ('corrente', 'Corrente', 'colar', 'Colar');
UPDATE itens_pano SET categoria = 'Pingentes' WHERE categoria IN ('pingente', 'Pingente');
UPDATE itens_pano SET categoria = 'Anéis' WHERE categoria IN ('anel', 'Anel');
UPDATE itens_pano SET categoria = 'Brincos G' WHERE categoria IN ('brinco', 'Brinco') AND descricao ILIKE '%grande%';
UPDATE itens_pano SET categoria = 'Brincos M' WHERE categoria IN ('brinco', 'Brinco') AND descricao ILIKE '%médio%';
UPDATE itens_pano SET categoria = 'Brincos I' WHERE categoria IN ('brinco', 'Brinco') AND descricao ILIKE '%pequeno%';
UPDATE itens_pano SET categoria = 'Brincos G' WHERE categoria IN ('brinco', 'Brinco') AND categoria NOT IN ('Brincos G', 'Brincos M', 'Brincos I');
UPDATE itens_pano SET categoria = 'Argolas' WHERE categoria IN ('argola', 'Argola');
UPDATE itens_pano SET categoria = 'Tornozeleiras' WHERE categoria IN ('tornozeleira', 'Tornozeleira');
UPDATE itens_pano SET categoria = 'Conjuntos' WHERE categoria IN ('conjunto', 'Conjunto');
UPDATE itens_pano SET categoria = 'Outro' WHERE categoria IN ('outro', 'Outro');
