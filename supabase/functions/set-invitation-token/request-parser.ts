
export async function parseRequest(req: Request): Promise<{ token: string; email?: string }> {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${new Date().toISOString()}] [${requestId}] 📥 Parsing request...`);
  
  // Log request details for debugging
  console.log(`[${new Date().toISOString()}] [${requestId}] 📋 Request headers:`, {
    contentType: req.headers.get('content-type'),
    contentLength: req.headers.get('content-length'),
    hasAuth: !!req.headers.get('authorization')
  });
  
  let rawBody = '';
  try {
    rawBody = await req.text();
    console.log(`[${new Date().toISOString()}] [${requestId}] 📥 Raw body length: ${rawBody.length}`);
    
    if (!rawBody || rawBody.trim() === '') {
      console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Empty request body received`);
      throw new Error("Empty request body. Please ensure you are sending a valid JSON payload with a token field.");
    }
    
    const body = JSON.parse(rawBody);
    console.log(`[${new Date().toISOString()}] [${requestId}] 📦 Parsed body:`, {
      hasToken: !!body.token,
      hasEmail: !!body.email,
      tokenLength: body.token?.length || 0
    });
    
    if (!body.token) {
      throw new Error("Missing required field 'token' in request body.");
    }
    
    if (typeof body.token !== 'string' || body.token.trim() === '') {
      throw new Error("Token must be a non-empty string.");
    }
    
    return {
      token: body.token.trim(),
      email: body.email || undefined
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [${requestId}] ❌ Parse error:`, error);
    
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON format in request body. Raw body: ${rawBody.substring(0, 100)}...`);
    }
    
    throw error;
  }
}
