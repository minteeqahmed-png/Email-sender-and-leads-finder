/**
 * Safe API Client Utility for robust requests, error handling, and Content-Type inspection.
 * Prevents "Unexpected token '<', '<!doctype ...' is not valid JSON" crashes.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function safeFetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  retries = 1
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  };

  const finalHeaders = {
    ...defaultHeaders,
    ...((options.headers as Record<string, string>) || {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: finalHeaders,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (isJson) {
        const data = await response.json();
        if (!response.ok) {
          const errorMessage =
            (typeof data === 'object' && data !== null && (data.error || data.message)) ||
            `HTTP ${response.status}: Request failed.`;
          throw new Error(errorMessage);
        }
        return data as T;
      } else {
        // Response is not JSON (could be HTML 502/504 gateway error or Vite fallback)
        const text = await response.text();
        
        if (!response.ok) {
          if (response.status === 502 || response.status === 503 || response.status === 504) {
            throw new Error(`Server temporarily unavailable (${response.status}). Retrying...`);
          }
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            throw new Error(`Server returned HTML response (HTTP ${response.status}). The service might be starting up.`);
          }
          throw new Error(`Server error (${response.status}): ${text.slice(0, 150)}`);
        }

        // If status is 200 but returned HTML, this is a fallback page
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error(`Unexpected HTML response received from ${url}. API route might not be reachable.`);
        }

        try {
          return JSON.parse(text) as T;
        } catch {
          throw new Error(`Invalid response format from server (expected JSON): ${text.slice(0, 100)}`);
        }
      }
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error(`Network request to ${url} failed.`);
}

export interface GenerateEmailParams {
  name: string;
  email: string;
  customContext?: string;
  campaignGoal?: string;
  senderName?: string;
  senderCompany?: string;
  tone?: string;
  placeholders?: Record<string, string>;
  unsubscribeText?: string;
  customPromptTemplate?: string;
  catalogAttachmentName?: string;
}

export interface GeneratedEmailResult {
  success: boolean;
  subject: string;
  body: string;
  personalizationReason?: string;
  recipient?: {
    name: string;
    email: string;
    customContext?: string;
  };
  error?: string;
}

export async function generatePersonalizedEmailApi(
  params: GenerateEmailParams
): Promise<GeneratedEmailResult> {
  return safeFetchJson<GeneratedEmailResult>('/api/gemini/generate-email', {
    method: 'POST',
    body: JSON.stringify(params),
  }, 1);
}

export interface SendEmailParams {
  to: string;
  recipientName: string;
  subject: string;
  body: string;
  isDryRun?: boolean;
  senderName?: string;
  senderEmail?: string;
}

export interface SendEmailResult {
  success: boolean;
  status: string;
  message: string;
  timestamp: string;
  recipient: {
    name: string;
    email: string;
  };
  subject: string;
  error?: string;
}

export async function sendEmailApi(params: SendEmailParams): Promise<SendEmailResult> {
  return safeFetchJson<SendEmailResult>('/api/smtp/send-email', {
    method: 'POST',
    body: JSON.stringify(params),
  }, 1);
}

export interface SmtpDiagnosticParams {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  useSsl?: boolean;
}

export interface SmtpDiagnosticResult {
  success: boolean;
  status: string;
  latencyMs?: number;
  diagnostics?: any;
  serverBanner?: string;
  message?: string;
  error?: string;
}

export async function testSmtpConnectionApi(
  params: SmtpDiagnosticParams
): Promise<SmtpDiagnosticResult> {
  return safeFetchJson<SmtpDiagnosticResult>('/api/smtp/test-connection', {
    method: 'POST',
    body: JSON.stringify(params),
  }, 0);
}
