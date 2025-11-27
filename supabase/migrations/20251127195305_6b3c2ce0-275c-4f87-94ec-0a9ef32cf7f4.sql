-- Drop existing problematic policies for avatars bucket that use storage.foldername()
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Create corrected INSERT policy using string_to_array to avoid auto-qualification bug
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Create corrected UPDATE policy using string_to_array
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Create corrected DELETE policy using string_to_array
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);