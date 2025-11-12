/*
  # Create Storage Bucket for Photos

  ## Summary
  Creates a public storage bucket for storing pano photos with proper RLS policies.

  ## Changes

  1. **Storage Bucket**
     - Create 'fotos' bucket for pano document images
     - Public bucket (anyone can read, only authenticated users can upload)

  2. **Storage Policies**
     - Authenticated users can upload files
     - Everyone can view/download files (for displaying photos)
     - Users can only delete their own files

  ## Security
  - Files are accessible publicly for display
  - Only authenticated users can upload
  - User isolation on delete operations
*/

-- Create the storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fotos');

-- Policy: Allow public access to view photos
CREATE POLICY "Public can view photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'fotos');

-- Policy: Users can update their own photos
CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fotos' AND auth.uid() = owner::uuid)
  WITH CHECK (bucket_id = 'fotos' AND auth.uid() = owner::uuid);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fotos' AND auth.uid() = owner::uuid);
