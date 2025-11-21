/*
  # Atualizar Categorias Padrão para Plural e Adicionar Brincos G/I/M

  1. Alterações
    - Renomear categorias existentes para PLURAL
    - Remover categoria "Brinco" (singular)
    - Adicionar "Brincos G", "Brincos I", "Brincos M" (específicos)
    - Atualizar ordem para corresponder à ordem das colunas no papel OCR
    
  2. Nova Ordem das Categorias
    1. Pulseiras
    2. Correntes
    3. Pingentes
    4. Anéis
    5. Brincos G
    6. Brincos I
    7. Brincos M
    8. Argolas
    9. Tornozeleiras (extra)
    10. Conjuntos (extra)
    11. Infantil (extra)
    12. Outro (fallback)
    
  3. Segurança
    - Mantém user_id IS NULL (categorias do sistema)
    - Mantém políticas RLS existentes
*/

-- Atualizar categorias existentes para PLURAL e reordenar
UPDATE categorias 
SET nome = 'Pulseiras', ordem = 1
WHERE user_id IS NULL AND nome IN ('Pulseira', 'Pulseiras');

UPDATE categorias 
SET nome = 'Correntes', ordem = 2
WHERE user_id IS NULL AND nome IN ('Corrente', 'Correntes');

UPDATE categorias 
SET nome = 'Pingentes', ordem = 3
WHERE user_id IS NULL AND nome IN ('Pingente', 'Pingentes');

UPDATE categorias 
SET nome = 'Anéis', ordem = 4
WHERE user_id IS NULL AND nome IN ('Anel', 'Anéis', 'Aneis');

UPDATE categorias 
SET nome = 'Argolas', ordem = 8
WHERE user_id IS NULL AND nome IN ('Argola', 'Argolas');

UPDATE categorias 
SET nome = 'Tornozeleiras', ordem = 9
WHERE user_id IS NULL AND nome IN ('Tornozeleira', 'Tornozeleiras');

UPDATE categorias 
SET nome = 'Conjuntos', ordem = 10
WHERE user_id IS NULL AND nome IN ('Conjunto', 'Conjuntos');

UPDATE categorias 
SET nome = 'Infantil', ordem = 11
WHERE user_id IS NULL AND nome = 'Infantil';

UPDATE categorias 
SET nome = 'Outro', ordem = 12
WHERE user_id IS NULL AND nome = 'Outro';

-- Remover categoria "Brinco" singular se existir
DELETE FROM categorias 
WHERE user_id IS NULL AND nome IN ('Brinco', 'Brincos');

-- Adicionar Brincos G, I, M (categorias específicas)
INSERT INTO categorias (user_id, nome, cor, ordem, ativo) VALUES
  (NULL, 'Brincos G', '#8b5cf6', 5, true),
  (NULL, 'Brincos I', '#a78bfa', 6, true),
  (NULL, 'Brincos M', '#c4b5fd', 7, true)
ON CONFLICT DO NOTHING;

-- Garantir que não há duplicatas
DELETE FROM categorias a USING categorias b
WHERE a.id < b.id 
AND a.user_id IS NULL 
AND b.user_id IS NULL
AND a.nome = b.nome;
