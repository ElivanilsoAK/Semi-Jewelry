-- Add photo support to items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itens_pano' AND column_name = 'foto_url'
  ) THEN
    ALTER TABLE itens_pano ADD COLUMN foto_url text;
  END IF;
END $$;

-- Create storage bucket for item photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO NOTHING;
