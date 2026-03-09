

# Clarification: Production Domain (crunchcarbon.com)

## Current Situation

The published URL from Lovable is `crunch-carbon-hub.lovable.app`. The fix (replacing `sw.js` with a self-destructing version) will apply to that domain when you publish.

However, **crunchcarbon.com** is a custom domain. If it points to the same Lovable deployment (which it likely does), then yes — publishing will fix both domains simultaneously, since they serve the same built files including `sw.js`.

## What Happens When You Publish

1. The new `sw.js` deploys to the Lovable hosting
2. Both `crunch-carbon-hub.lovable.app` AND `crunchcarbon.com` serve the updated files
3. When Connor, Jordan, or any user visits either domain, the browser fetches the new `sw.js`, which clears all caches and unregisters itself
4. The app loads fresh from the server

## Plan (unchanged)

1. Replace `public/sw.js` with the self-destructing version that clears caches and unregisters
2. Publish
3. Ask affected users to hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) on crunchcarbon.com

Both domains will be fixed by a single publish.

