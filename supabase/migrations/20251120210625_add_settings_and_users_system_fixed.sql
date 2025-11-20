/*
  # Sistema de Configurações e Usuários - SPHERE (Fixed)

  1. Nova Tabela `perfis_usuario`
  2. Nova Tabela `logs_atividade`
  3. Nova Tabela `configuracoes_loja`
  4. Nova Tabela `temas_sistema`
  5. Alterações em `categorias`
*/

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS perfis_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_completo text NOT NULL,
  email text NOT NULL,
  nivel_acesso text DEFAULT 'visualizador' CHECK (nivel_acesso IN ('admin', 'vendedor', 'visualizador')),
  ativo boolean DEFAULT true,
  ultimo_acesso timestamptz DEFAULT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de logs de atividade
CREATE TABLE IF NOT EXISTS logs_atividade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  acao text NOT NULL,
  modulo text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT NULL,
  user_agent text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela de configurações da loja
CREATE TABLE IF NOT EXISTS configuracoes_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_loja text DEFAULT 'Minha Loja',
  logo_url text DEFAULT NULL,
  cnpj text DEFAULT NULL,
  endereco text DEFAULT NULL,
  cidade text DEFAULT NULL,
  estado text DEFAULT NULL,
  cep text DEFAULT NULL,
  telefone text DEFAULT NULL,
  email_contato text DEFAULT NULL,
  whatsapp_numero text DEFAULT NULL,
  whatsapp_ativo boolean DEFAULT false,
  taxa_juros_padrao numeric(5,2) DEFAULT 2.00,
  prazo_garantia_dias integer DEFAULT 90,
  margem_lucro_sugerida numeric(5,2) DEFAULT 100.00,
  moeda text DEFAULT 'BRL',
  fuso_horario text DEFAULT 'America/Sao_Paulo',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de temas
CREATE TABLE IF NOT EXISTS temas_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  modo_escuro boolean DEFAULT false,
  cor_primaria text DEFAULT '#D4AF37',
  cor_secundaria text DEFAULT '#F59E0B',
  cor_sucesso text DEFAULT '#10B981',
  cor_erro text DEFAULT '#EF4444',
  cor_alerta text DEFAULT '#F59E0B',
  fonte_principal text DEFAULT 'Inter',
  tamanho_fonte text DEFAULT 'medium' CHECK (tamanho_fonte IN ('small', 'medium', 'large')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Adiciona campos em categorias
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'ordem_exibicao') THEN
    ALTER TABLE categorias ADD COLUMN ordem_exibicao integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'categoria_pai') THEN
    ALTER TABLE categorias ADD COLUMN categoria_pai uuid REFERENCES categorias(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'margem_lucro_padrao') THEN
    ALTER TABLE categorias ADD COLUMN margem_lucro_padrao numeric(5,2) DEFAULT 100.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'icone') THEN
    ALTER TABLE categorias ADD COLUMN icone text DEFAULT NULL;
  END IF;
END $$;

-- Habilita RLS
ALTER TABLE perfis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE temas_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas para perfis_usuario
CREATE POLICY "Users can view all profiles"
  ON perfis_usuario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert profiles"
  ON perfis_usuario FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = auth.uid()
      AND nivel_acesso = 'admin'
    ) OR NOT EXISTS (
      SELECT 1 FROM perfis_usuario WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update profiles"
  ON perfis_usuario FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = auth.uid()
      AND nivel_acesso = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON perfis_usuario FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = auth.uid()
      AND nivel_acesso = 'admin'
    )
  );

-- Políticas para logs_atividade
CREATE POLICY "Users can view all logs"
  ON logs_atividade FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis_usuario
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'vendedor')
    )
  );

CREATE POLICY "Users can insert own logs"
  ON logs_atividade FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para configuracoes_loja
CREATE POLICY "Users can view own config"
  ON configuracoes_loja FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert config"
  ON configuracoes_loja FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update config"
  ON configuracoes_loja FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para temas_sistema
CREATE POLICY "Users can view own theme"
  ON temas_sistema FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own theme"
  ON temas_sistema FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own theme"
  ON temas_sistema FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_nivel ON perfis_usuario(nivel_acesso);
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_ativo ON perfis_usuario(ativo);
CREATE INDEX IF NOT EXISTS idx_logs_atividade_user ON logs_atividade(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_atividade_modulo ON logs_atividade(modulo);
CREATE INDEX IF NOT EXISTS idx_logs_atividade_created ON logs_atividade(created_at);
CREATE INDEX IF NOT EXISTS idx_categorias_ordem ON categorias(ordem_exibicao);
CREATE INDEX IF NOT EXISTS idx_categorias_pai ON categorias(categoria_pai);

-- Função para registrar log
CREATE OR REPLACE FUNCTION registrar_log_atividade(
  acao_param text,
  modulo_param text,
  detalhes_param jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO logs_atividade (user_id, acao, modulo, detalhes)
  VALUES (auth.uid(), acao_param, modulo_param, detalhes_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar acesso
CREATE OR REPLACE FUNCTION verificar_acesso(nivel_minimo text)
RETURNS boolean AS $$
DECLARE
  nivel_usuario text;
BEGIN
  SELECT nivel_acesso INTO nivel_usuario
  FROM perfis_usuario
  WHERE user_id = auth.uid();
  
  IF nivel_usuario = 'admin' THEN
    RETURN true;
  ELSIF nivel_usuario = 'vendedor' AND nivel_minimo IN ('vendedor', 'visualizador') THEN
    RETURN true;
  ELSIF nivel_usuario = 'visualizador' AND nivel_minimo = 'visualizador' THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para usuários com detalhes
CREATE OR REPLACE VIEW usuarios_detalhados AS
SELECT 
  p.id,
  p.user_id,
  p.nome_completo,
  p.email,
  p.nivel_acesso,
  p.ativo,
  p.ultimo_acesso,
  p.created_at,
  (SELECT COUNT(*) FROM logs_atividade l WHERE l.user_id = p.user_id) as total_atividades,
  (SELECT COUNT(*) FROM vendas v WHERE v.user_id = p.user_id) as total_vendas,
  (SELECT COALESCE(SUM(v.valor_total), 0) FROM vendas v WHERE v.user_id = p.user_id) as valor_total_vendas
FROM perfis_usuario p;

-- View para categorias hierárquicas
CREATE OR REPLACE VIEW categorias_hierarquicas AS
SELECT 
  c.id,
  c.nome,
  c.cor,
  c.ordem_exibicao,
  c.categoria_pai,
  c.margem_lucro_padrao,
  c.icone,
  c.user_id,
  cp.nome as nome_categoria_pai,
  (SELECT COUNT(*) FROM categorias cc WHERE cc.categoria_pai = c.id) as total_subcategorias
FROM categorias c
LEFT JOIN categorias cp ON c.categoria_pai = cp.id
ORDER BY c.ordem_exibicao, c.nome;

-- Comentários
COMMENT ON TABLE perfis_usuario IS 'Perfis e permissões dos usuários';
COMMENT ON TABLE logs_atividade IS 'Log de todas as atividades do sistema';
COMMENT ON TABLE configuracoes_loja IS 'Configurações gerais da loja';
COMMENT ON TABLE temas_sistema IS 'Configurações de tema e aparência';
