
import { RequestBody } from "./types.ts";

export async function parseRequest(req: Request, requestId: string): Promise<RequestBody> {
  const timestamp = new Date().toISOString();
  
  const contentType = req.headers.get('content-type');
  const contentLength = req.headers.get('content-length');
  
  console.log(`[${timestamp}] [${requestId}] 📋 Request headers:`, {
    contentType,
    contentLength,
    hasAuth: !!req.headers.get('Authorization')
  });

  const rawBody = await req.text();
  console.log(`[${timestamp}] [${requestId}] 📥 Raw body length: ${rawBody.length}`);
  
  if (!rawBody || rawBody.trim() === '') {
    throw new Error('Empty request body. Please ensure you are sending a valid JSON payload with a token field.');
  }
  
  console.log(`[${timestamp}] [${requestId}] 📥 Body preview: ${rawBody.substring(0, 50)}${rawBody.length > 50 ? '...' : ''}`);
  
  try {
    const requestBody = JSON.parse(rawBody) as RequestBody;
    console.log(`[${timestamp}] [${requestId}] ✅ Body parsed:`, {
      hasToken: !!requestBody.token,
      tokenLength: requestBody.token?.length,
      tokenPrefix: requestBody.token?.substring(0, 8) + '...',
      hasEmail: !!requestBody.email,
      email: requestBody.email ? requestBody.email.substring(0, 3) + '***' : 'none'
    });
    
    return requestBody;
  } catch (parseError) {
    throw new Error(`Invalid request body format: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
  }
}

export function validateToken(token: string): void {
  if (!token || token.trim() === '') {
    throw new Error('No token provided in request body');
  }
}
