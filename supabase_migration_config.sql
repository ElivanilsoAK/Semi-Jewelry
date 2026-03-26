-- ============================================================
-- Migração: adiciona colunas de configuração financeira e garantia
-- à tabela configuracoes_sistema (se já existir) ou cria a tabela
-- ============================================================

-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Adicionar colunas novas (sem falhar se já existirem)
ALTER TABLE configuracoes_sistema
  ADD COLUMN IF NOT EXISTS percentual_comissao           numeric(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS percentual_prestacao_contas   numeric(5,2) DEFAULT 60,
  ADD COLUMN IF NOT EXISTS prazo_garantia_meses          integer      DEFAULT 24,
  ADD COLUMN IF NOT EXISTS politica_troca                text         DEFAULT '',
  ADD COLUMN IF NOT EXISTS permitir_troca_entre_panos    boolean      DEFAULT true,
  ADD COLUMN IF NOT EXISTS exigir_motivo_troca           boolean      DEFAULT true;

-- 3. Habilitar RLS se ainda não estiver
ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- 4. Política: cada usuário lê apenas seus próprios dados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'configuracoes_sistema'
      AND policyname = 'Users can read own config'
  ) THEN
    CREATE POLICY "Users can read own config"
      ON configuracoes_sistema FOR SELECT
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- 5. Política: cada usuário insere apenas com seu user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'configuracoes_sistema'
      AND policyname = 'Users can insert own config'
  ) THEN
    CREATE POLICY "Users can insert own config"
      ON configuracoes_sistema FOR INSERT
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

-- 6. Política: cada usuário atualiza apenas seus dados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'configuracoes_sistema'
      AND policyname = 'Users can update own config'
  ) THEN
    CREATE POLICY "Users can update own config"
      ON configuracoes_sistema FOR UPDATE
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

-- 7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_configuracoes_sistema_updated_at ON configuracoes_sistema;
CREATE TRIGGER set_configuracoes_sistema_updated_at
  BEFORE UPDATE ON configuracoes_sistema
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
