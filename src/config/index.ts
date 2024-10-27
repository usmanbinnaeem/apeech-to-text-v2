import dotenv from "dotenv";

dotenv.config();

export const config = {
  domain: process.env.DOMAIN || "localhost",
  port: process.env.PORT || 3001,
  recognizerName: process.env.RECOGNIZER_NAME || "",
  vapiSecret: process.env.VAPI_SECRET,
  discord_webhook_url: process.env.DISCORD_WEBHOOK_URL,
};

export const credentials = {
  type: process.env.SERVICE_ACCOUNT || "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.TOKEN_URI || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url:
    process.env.AUTH_PROVIDER_X509_CERT_URL ||
    "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
};
