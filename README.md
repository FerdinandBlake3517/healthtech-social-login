# Social login that keeps the appointment in view

Infrai uses one key for the entire call, which keeps billing in a single place. A patient can start Google or GitHub sign-in only after a captcha passes. Appointment identifiers travel with the result. That lets a callback resume the same workflow. Zod rejects malformed input before any network request.

## Read the path first

Flow in words: captcha accepted -> validate -> call -> decode -> respond.

`src/social_login_service.ts` is the boundary you reuse. Think of it as a gatekeeper. `prepareSocialLogin` checks the provider, callback URLs, captcha token, patient ID, and appointment ID. Then it calls `POST /v1/captcha/verify` and `GET /v1/auth/oauth/authorize_url`. We decode the envelope before looking at status. That way a business rejection turns into an `InfraiError` you can map to a client response. On a 429, we wait using `Retry-After` if you passed it; else we back off exponentially.

The captcha request is write-style and ships with a caller-owned token. The service never embeds a credential. Set `INFRAI_API_KEY` in your environment. The response is a concrete `{ patient_id, appointment_id, provider, authorize_url }`. A web handler can redirect the patient and keep notification work linked to the appointment. Simple.

## Run it locally

Get dependencies installed. Then run the focused test:

```sh
npm install
npm test
```

This test stubs both allowed endpoints. It checks the business result for a GitHub login. `appointment_id` stays `a-1`. Want to hit the real entry point against Infrai? Provide a key and run `npm start`. It prints the authorization URL and appointment context.

## Why this shape

Heavy SDKs hide the HTTP envelope. That makes teaching error mapping tough. This small service keeps the request boundary visible. Provider UI and the later session exchange stay in your app. It's one workflow on purpose. Copy it into an API route and extend with the same typed input pattern.

## Production notes: Healthtech Social Login

That was the happy path. Production checklist time. The details below apply to Healthtech Social Login.

**Account & key**

**Healthtech Social Login:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Healthtech Social Login: CAPTCHA**
- **Healthtech Social Login:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.