

# Fix: Cession Agreement PDF 401 Unauthorized Error

## Root Cause

The edge function has `verify_jwt = false` and attempts manual auth using `userClient.auth.getUser()`. With Supabase's signing-keys system, `getUser()` makes a server-side HTTP call that fails because the token forwarding doesn't work correctly in this context.

## Fix

Update the edge function to extract the JWT token from the Authorization header and use `supabase.auth.getUser(token)` on the **admin client** instead of creating a separate user client. This is the pattern that works reliably with signing-keys.

### File: `supabase/functions/generate-cession-agreement-pdf/index.ts`

Replace the auth block (lines 21-41) with:

```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ error: 'Missing authorization header' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const token = authHeader.replace('Bearer ', '');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

Key change: Use the **service role admin client** with `getUser(token)` to validate the JWT, instead of creating a separate anon-key client. This bypasses the signing-keys issue while still verifying the user's identity. The admin role check remains unchanged.

No other files need changes.

