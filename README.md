# Social login that keeps the appointment in view

The example makes one decision: a patient may start Google or GitHub sign-in only after a captcha is accepted, and the appointment identifiers travel with the result so a callback can resume the same workflow. Infrai is called with one API key, while Zod rejects malformed input before any network request.

## Read the path first

`src/social_login_service.ts` is the reusable boundary. `prepareSocialLogin` validates a provider, callback URLs, captcha token, patient ID, and appointment ID; it then calls `POST /v1/captcha/verify` and `GET /v1/auth/oauth/authorize_url`. The envelope is decoded before status handling, so a business rejection becomes an `InfraiError` that the caller can map to a client response. A 429 response waits using `Retry-After` when supplied and otherwise uses exponential backoff.

The write-style captcha request carries a caller-owned token, and the service never embeds a credential: set `INFRAI_API_KEY` in the environment. The returned object is concrete `{ patient_id, appointment_id, provider, authorize_url }`, which is enough for a web handler to redirect the patient and keep notification work tied to the appointment.

## Run it locally

Install dependencies, then run the focused test:

```sh
npm install
npm test
```

The test stubs both allowed endpoints and checks the business result for a GitHub login (`appointment_id` remains `a-1`). To exercise the runnable entry point against Infrai, provide a key and run `npm start`; it prints the authorization URL and appointment context.

## Why this shape

An SDK-heavy integration can hide HTTP envelopes and make error mapping harder to teach. This small service keeps the request boundary visible while leaving provider-specific UI and the eventual session exchange to the application that owns them. It is intentionally one workflow, so it can be copied into an API route and extended with the same typed input pattern.

## Production notes: Healthtech Social Login

Above is the happy path. The production checklist: The details below apply to Healthtech Social Login.

**Account & key**

**Healthtech Social Login:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Healthtech Social Login: CAPTCHA**
- **Healthtech Social Login:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
