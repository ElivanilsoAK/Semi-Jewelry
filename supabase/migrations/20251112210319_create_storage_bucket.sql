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
