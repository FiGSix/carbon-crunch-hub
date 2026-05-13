# Fix: "PDF Generation Failed" on Cession Download

## Root cause
The source code for `generate-cession-agreement-pdf` already has the fix (returns `signed_url`), but the **deployed** version is stale — edge logs still show the old `Generated successfully: <publicUrl>` log line. The frontend hook now expects `data.signed_url`, which the old deployed function does not return, so it throws "PDF Generation Failed".

No code bugs were found in the fix itself; this is purely a deployment-sync issue.

## Steps

1. **Redeploy** `generate-cession-agreement-pdf` so the new code (signed URL response) goes live.
2. **Verify via curl** against Frans-Johan's proposal that the function returns:
   - `success: true`
   - `signed_url` (a `/object/sign/` URL, not `/object/public/`)
   - `file_name: cession-agreement-<id>.pdf`
3. **Confirm in edge logs** the new log line `Generated successfully for proposal <id>` appears.
4. **Ask user to retry** the Download Agreement button and confirm the downloaded file is the cession agreement (title page "Carbon Right Cessionary Agreement"), not the proposal PDF.

## Out of scope
No source changes — fix is already in code. Only redeploy + verification.
