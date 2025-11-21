/*
  # Corrigir Políticas RLS de Categorias

  ## Problema
  As categorias padrão do sistema têm user_id NULL e não estavam acessíveis
  devido às políticas RLS restritivas

  ## Solução
  Permitir acesso a categorias com user_id NULL (categorias do sistema)
  OU categorias do próprio usuário
*/

-- Recriar política de SELECT para permitir categorias globais (user_id NULL)
DROP POLICY IF EXISTS "Users can view own categorias" ON categorias;
CREATE POLICY "Users can view own categorias"
  ON categorias FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = (select auth.uid()));

-- Recriar política de INSERT
DROP POLICY IF EXISTS "Users can insert own categorias" ON categorias;
CREATE POLICY "Users can insert own categorias"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Recriar política de UPDATE - apenas para categorias do usuário (não globais)
DROP POLICY IF EXISTS "Users can update own categorias" ON categorias;
CREATE POLICY "Users can update own categorias"
  ON categorias FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Recriar política de DELETE - apenas para categorias do usuário (não globais)
DROP POLICY IF EXISTS "Users can delete own categorias" ON categorias;
CREATE POLICY "Users can delete own categorias"
  ON categorias FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));