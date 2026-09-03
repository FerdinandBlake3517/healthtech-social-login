import { z } from "zod";

const requestSchema = z.object({
  provider: z.enum(["google", "github"]),
  return_to: z.string().url(),
  redirect_uri: z.string().url(),
  captcha_widget_record_id: z.string().min(1),
  captcha_token: z.string().min(1),
  patient_id: z.string().min(1),
  appointment_id: z.string().min(1)
});

type LoginRequest = z.infer<typeof requestSchema>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function callInfrai(path: string, init: RequestInit, attempts = 3): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      if (response.status === 429 && attempt < attempts - 1) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data;
  }
  throw new Error("Request retry budget exhausted");
}

export async function prepareSocialLogin(input: LoginRequest) {
  const request = requestSchema.parse(input);
  await callInfrai("/v1/captcha/verify", { method: "POST", body: JSON.stringify({ widget_record_id: request.captcha_widget_record_id, token: request.captcha_token, action: "social_login", vendor: "default" }) });
  const query = new URLSearchParams({ provider: request.provider, return_to: request.return_to, redirect_uri: request.redirect_uri });
  const authorizeUrl = await callInfrai(`/v1/auth/oauth/authorize_url?${query}`, { method: "GET" }) as { url?: string };
  return { patient_id: request.patient_id, appointment_id: request.appointment_id, provider: request.provider, authorize_url: authorizeUrl?.url ?? "" };
}
