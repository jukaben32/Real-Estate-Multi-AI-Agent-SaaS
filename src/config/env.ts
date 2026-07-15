import * as dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientDashboardUrl: process.env.CLIENT_DASHBOARD_URL ?? "http://localhost:3000",

  databaseUrl: required("DATABASE_URL"),

  jwtAgentSecret: required("JWT_AGENT_SECRET", "dev_agent_secret"),
  jwtClientSecret: required("JWT_CLIENT_SECRET", "dev_client_secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripeWebsitePriceId: process.env.STRIPE_WEBSITE_PRICE_ID ?? "",

  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "EstateCall <no-reply@estatecall.com>",
};
