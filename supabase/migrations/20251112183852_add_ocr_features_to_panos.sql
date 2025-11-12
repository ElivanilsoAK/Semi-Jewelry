/*
  # Add OCR Features to Panos Table

  1. New Fields
    - `ocr_processed` - boolean to track if OCR was done
    - `ocr_data` - jsonb to store extracted inventory data from paper photo
    
  2. Purpose
    - Enable automatic extraction of product data from inventory paper photos
    - Store structured data about Pulseiras, Correntes, Pingentes, Anéis, Brincos, etc.
*/

-- Add OCR fields to panos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panos' AND column_name = 'ocr_processed'
  ) THEN
    ALTER TABLE panos ADD COLUMN ocr_processed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panos' AND column_name = 'ocr_data'
  ) THEN
    ALTER TABLE panos ADD COLUMN ocr_data jsonb;
  END IF;
END $$;

-- Create index for OCR queries
CREATE INDEX IF NOT EXISTS idx_panos_ocr_processed ON panos(ocr_processed);