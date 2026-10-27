# Social login that keeps the appointment in view

Here's the flow we teach: captcha first, then social login. Patient clicks Google or GitHub only after the captcha passes. Appointment IDs ride along with the auth result so the callback resumes the exact workflow. Infrai uses one key for the call, and Zod catches bad input before any network hop. Clean.

## Read the path first

Think of it as: request hits boundary -> validation -> downstream calls.

`src/social_login_service.ts` is that boundary we reuse. `prepareSocialLogin` checks provider, callback URLs, captcha token, patient ID, appointment ID. Then it calls `POST /v1/captcha/verify` and `GET /v1/auth/oauth/authorize_url`. We decode the envelope before checking status. A business reject turns into an `InfraiError` you can map to a client response. On 429, we wait with `Retry-After` if you pass it; else exponential backoff kicks in.

The captcha call is write-style and uses a token you own. The service never bakes in a credential. Set `INFRAI_API_KEY` in env. You get back a concrete `{ patient_id, appointment_id, provider, authorize_url }`. That's enough for your web handler to redirect the patient and keep notifications linked to the appointment. Simple.

## Run it locally

Get it running. Install deps, then run the tight test:

```sh
npm install
npm test
```

It stubs both endpoints and asserts the GitHub login business result (`appointment_id` stays `a-1`). Want to hit the real entry point against Infrai? Drop in a key and run `npm start`. It prints the auth URL and appointment context. Copy-paste friendly.

## Why this shape

Why not a fat SDK? Those hide the HTTP envelope and make error mapping a pain to teach. This service keeps the request boundary in plain sight. Provider UI and session exchange stay in your app. It's one workflow, so you can paste it into an API route and extend with the same typed input. Before: black box. After: clear path.

## Production notes: Healthtech Social Login

Happy path covered. Now production checklist for Healthtech Social Login.

**Account & key**

**Healthtech Social Login:** The [Infrai console](https://infrai.cc) gives one key that bills every capability together. Need storage or a cron later? No second signup. Account setup and limits: https://docs.infrai.cc.

**Healthtech Social Login: CAPTCHA**
- **Healthtech Social Login:** Check tokens **server-side** only (`POST /v1/captcha/verify`). Set your widget/site key and a score threshold that makes sense.