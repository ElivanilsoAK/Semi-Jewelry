/*
  # Fix Sistema de Categorias Padrão
  
  1. Alterações
    - Remove constraint NOT NULL de user_id em categorias (para permitir categorias globais)
    - Adiciona categorias padrão globais
    - Cria função para inicializar categorias de usuário
    
  2. Categorias Globais
    - Pulseira, Corrente, Pingente, Anel, Brinco, Argola, Tornozeleira, Conjunto, Infantil, Outro
    
  3. Segurança
    - Usuários podem ver categorias globais (user_id IS NULL) E suas próprias
    - Apenas podem criar/editar/deletar suas próprias categorias
*/

-- Permitir user_id NULL para categorias globais
ALTER TABLE categorias ALTER COLUMN user_id DROP NOT NULL;

-- Inserir categorias padrão globais
INSERT INTO categorias (user_id, nome, cor, ordem, ativo) VALUES
  (NULL, 'Pulseira', '#3b82f6', 1, true),
  (NULL, 'Corrente', '#10b981', 2, true),
  (NULL, 'Pingente', '#f59e0b', 3, true),
  (NULL, 'Anel', '#ef4444', 4, true),
  (NULL, 'Brinco', '#8b5cf6', 5, true),
  (NULL, 'Argola', '#ec4899', 6, true),
  (NULL, 'Tornozeleira', '#14b8a6', 7, true),
  (NULL, 'Conjunto', '#6366f1', 8, true),
  (NULL, 'Infantil', '#f97316', 9, true),
  (NULL, 'Outro', '#6b7280', 10, true)
ON CONFLICT DO NOTHING;

-- Atualizar políticas RLS para categorias
DROP POLICY IF EXISTS "Users can view own categorias" ON categorias;
DROP POLICY IF EXISTS "Users can view own categories" ON categorias;

CREATE POLICY "Users can view global and own categorias"
  ON categorias FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- Usuários só podem inserir suas próprias categorias
DROP POLICY IF EXISTS "Users can insert own categorias" ON categorias;

CREATE POLICY "Users can insert own categorias"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Usuários só podem atualizar suas próprias categorias
DROP POLICY IF EXISTS "Users can update own categorias" ON categorias;

CREATE POLICY "Users can update own categorias"
  ON categorias FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuários só podem deletar suas próprias categorias
DROP POLICY IF EXISTS "Users can delete own categorias" ON categorias;

CREATE POLICY "Users can delete own categorias"
  ON categorias FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_categorias_user_id_ativo ON categorias(user_id, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_categorias_global_ativo ON categorias(ordem) WHERE user_id IS NULL AND ativo = true;
