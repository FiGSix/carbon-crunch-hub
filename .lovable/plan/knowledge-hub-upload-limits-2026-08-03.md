# Knowledge Hub upload limits

## Current state (verified)

- Uploads go to the private `knowledge-hub` storage bucket from the admin upload form.
- The bucket has no size limit and no allowed file-type list configured — both are unset.
- The upload form has no size or type validation, and the file picker accepts anything.
- The only cap in effect is the Supabase project's global upload limit (50 MB by default), which surfaces as an opaque storage error rather than a helpful message.

## What to build

### 1. Bucket limits

Set the `knowledge-hub` bucket to a 100 MB per-file limit and restrict the accepted file types to:

- Documents: PDF, Word (doc/docx), Excel (xls/xlsx), PowerPoint (ppt/pptx), CSV, plain text
- Images: JPEG, PNG, WEBP, GIF, SVG
- Video: MP4, WEBM, QuickTime (mov)

### 2. Matching validation in the upload form

Add shared constants for the limit and the allowed types, then in the admin upload form:

- Set the file picker's `accept` list so only supported types are offered.
- On file selection, reject anything over the limit with a clear toast: file name, its size, and the maximum allowed.
- Reject unsupported types with a toast naming the accepted formats.
- Show a small helper line under the file field: accepted formats and "Max 100 MB per file".
- Document files use a 50 MB guidance limit in the message copy; video is the only category needing the full 100 MB.

### 3. Better failure messaging

If storage still rejects an upload (for example because the project-level limit is lower than the bucket limit), translate the raw error into a plain-English message telling the admin the file exceeded the server upload limit.

## Action required from you

Bucket limits cannot exceed the project's **global upload limit**. That is currently at the 50 MB default, so videos between 50 MB and 100 MB will still be rejected until it is raised.

After this ships, go to the Supabase dashboard → Settings → Storage → "Upload file size limit" and set it to 100 MB. Files under 50 MB work immediately either way.

## Technical notes

- Bucket settings updated via a storage bucket configuration change (size limit + allowed MIME types).
- New shared constants file for the Knowledge Hub limits so the form and any future upload surface stay in sync.
- Validation added in `ResourceUploadForm.tsx` on file change and on submit; no changes to the resource table or its access rules.
