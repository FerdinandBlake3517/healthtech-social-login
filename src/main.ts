import { prepareSocialLogin } from "./social_login_service.js";

const result = await prepareSocialLogin({ provider: "google", return_to: "https://clinic.example/app", redirect_uri: "https://clinic.example/oauth/callback", captcha_widget_record_id: "demo-widget-record", captcha_token: "demo-token", patient_id: "patient-42", appointment_id: "appt-100" });
console.log(JSON.stringify(result, null, 2));
