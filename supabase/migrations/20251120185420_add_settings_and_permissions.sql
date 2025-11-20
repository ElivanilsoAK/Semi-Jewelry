-- CATEGORIAS TABLE
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  cor text DEFAULT '#10b981',
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_ativo ON categorias(user_id, ativo);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categorias"
  ON categorias FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own categorias"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own categorias"
  ON categorias FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own categorias"
  ON categorias FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- USER ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'viewer')),
  permissions jsonb DEFAULT '{"vendas": true, "panos": true, "clientes": true, "relatorios": true, "configuracoes": true}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own role"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own role"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- GARANTIAS TABLE
CREATE TABLE IF NOT EXISTS garantias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  venda_original_id uuid REFERENCES vendas(id) ON DELETE CASCADE NOT NULL,
  item_original_id uuid REFERENCES itens_venda(id) ON DELETE CASCADE NOT NULL,
  item_novo_id uuid REFERENCES itens_pano(id) ON DELETE SET NULL,
  tipo text DEFAULT 'troca' CHECK (tipo IN ('troca', 'reparo', 'devolucao')),
  motivo text NOT NULL,
  data_solicitacao date DEFAULT CURRENT_DATE,
  data_resolucao date,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'concluida')),
  observacoes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garantias_user_id ON garantias(user_id);
CREATE INDEX IF NOT EXISTS idx_garantias_venda ON garantias(venda_original_id);
CREATE INDEX IF NOT EXISTS idx_garantias_status ON garantias(user_id, status);

ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own garantias"
  ON garantias FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own garantias"
  ON garantias FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own garantias"
  ON garantias FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own garantias"
  ON garantias FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ADD CUSTOM CATEGORY TO ITENS_PANO
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itens_pano' AND column_name = 'categoria_custom'
  ) THEN
    ALTER TABLE itens_pano ADD COLUMN categoria_custom text;
    CREATE INDEX IF NOT EXISTS idx_itens_pano_categoria_custom ON itens_pano(categoria_custom);
  END IF;
END $$;
