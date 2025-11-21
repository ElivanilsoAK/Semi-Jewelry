/*
  # Corrigir Políticas de Storage para Fotos de Itens

  ## Problema
  - Bucket 'item-photos' existe mas não tem políticas RLS
  - Upload falha com erro de permissão
  
  ## Solução
  1. Criar políticas RLS para bucket 'item-photos'
  2. Permitir upload autenticado
  3. Permitir leitura pública
  4. Permitir delete/update pelo owner
*/

-- Política para UPLOAD (INSERT)
CREATE POLICY "Authenticated users can upload item photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-photos');

-- Política para VISUALIZAR (SELECT) - Público
CREATE POLICY "Public can view item photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'item-photos');

-- Política para DELETAR (DELETE)
CREATE POLICY "Users can delete own item photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'item-photos' 
  AND auth.uid() = owner
);

-- Política para ATUALIZAR (UPDATE)
CREATE POLICY "Users can update own item photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'item-photos' 
  AND auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'item-photos' 
  AND auth.uid() = owner
);
