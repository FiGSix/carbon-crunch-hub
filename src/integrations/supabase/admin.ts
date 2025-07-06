import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uyjryuopuqgmsvayiccl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI3NTYzOCwiZXhwIjoyMDU5ODUxNjM4fQ.nZA6esf1zXBNGenufezY6V73D-40cnZuGT5JkpkE5kA";

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);
