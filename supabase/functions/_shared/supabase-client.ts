
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Get environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://uyjryuopuqgmsvayiccl.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Create Supabase client with service role key
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
