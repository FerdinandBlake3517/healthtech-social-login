import assert from "node:assert/strict";
import { prepareSocialLogin } from "./social_login_service.js";

const originalFetch = globalThis.fetch;
process.env.INFRAI_API_KEY = "test-key";
globalThis.fetch = async (input, init) => {
  const url = String(input);
  assert.equal(init?.method, url.includes("captcha") ? "POST" : "GET");
  if (url.includes("captcha")) {
    assert.deepEqual(JSON.parse(String(init?.body)), { widget_record_id: "widget-1", token: "token", action: "social_login", vendor: "default" });
  }
  return new Response(JSON.stringify(url.includes("captcha") ? { ok: true, data: { accepted: true } } : { ok: true, data: { url: "https://accounts.example/continue" } }), { status: 200, headers: { "content-type": "application/json" } });
};
const result = await prepareSocialLogin({ provider: "github", return_to: "https://clinic.example/app", redirect_uri: "https://clinic.example/oauth/callback", captcha_widget_record_id: "widget-1", captcha_token: "token", patient_id: "p-1", appointment_id: "a-1" });
assert.equal(result.authorize_url, "https://accounts.example/continue");
assert.equal(result.appointment_id, "a-1");
globalThis.fetch = originalFetch;
console.log("social login decision verified");
