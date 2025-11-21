/*
  # Remover Categorias Extras do Sistema

  1. Remoção
    - Remove Tornozeleiras
    - Remove Conjuntos
    - Remove Infantil
    - Remove Outro
    
  2. Categorias Finais (8 apenas)
    1. Pulseiras
    2. Correntes
    3. Pingentes
    4. Anéis
    5. Brincos G
    6. Brincos I
    7. Brincos M
    8. Argolas
    
  3. Segurança
    - Remove apenas categorias do sistema (user_id IS NULL)
    - Mantém categorias personalizadas dos usuários
*/

-- Remover categorias extras do sistema
DELETE FROM categorias 
WHERE user_id IS NULL 
AND nome IN ('Tornozeleiras', 'Tornozeleira', 'Conjuntos', 'Conjunto', 'Infantil', 'Outro');
