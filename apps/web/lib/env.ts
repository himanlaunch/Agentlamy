import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_URL: z.string().optional(),
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.string().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  AEO_PROVIDER_TYPE: z.enum(["openai", "anthropic", "openai-compatible", "azure-openai"]).optional(),
  AEO_PROVIDER_API_KEY: z.string().optional(),
  AEO_PROVIDER_BASE_URL: z.string().optional(),
  AEO_PROVIDER_ENDPOINT: z.string().optional(),
  AEO_PROVIDER_API_VERSION: z.string().optional(),
  AEO_PROVIDER_DEPLOYMENT: z.string().optional(),
  AEO_ANALYSIS_MODEL: z.string().optional(),
  AEO_REMEDIATION_MODEL: z.string().optional(),
  AEO_SEARCH_PROVIDER: z.enum(["serpapi", "duckduckgo"]).optional(),
  AEO_SEARCH_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = parsed;

export function hasDatabaseConfig() {
  return Boolean(env.DATABASE_URL);
}

export function hasEmailConfig() {
  return Boolean(
    env.EMAIL_SERVER_HOST &&
      env.EMAIL_SERVER_PORT &&
      env.EMAIL_SERVER_USER &&
      env.EMAIL_SERVER_PASSWORD &&
      env.EMAIL_FROM
  );
}

export function getProviderConfig(options?: {
  purpose?: "analysis" | "remediation";
  model?: string | null;
}) {
  if (!env.AEO_PROVIDER_TYPE || !env.AEO_PROVIDER_API_KEY) {
    return null;
  }

  const resolvedModel = options?.model ?? (
    options?.purpose === "remediation"
      ? env.AEO_REMEDIATION_MODEL || env.AEO_ANALYSIS_MODEL
      : env.AEO_ANALYSIS_MODEL
  );

  return {
    type: env.AEO_PROVIDER_TYPE,
    apiKey: env.AEO_PROVIDER_API_KEY,
    baseUrl: env.AEO_PROVIDER_BASE_URL,
    endpoint: env.AEO_PROVIDER_ENDPOINT,
    apiVersion: env.AEO_PROVIDER_API_VERSION,
    deployment: env.AEO_PROVIDER_DEPLOYMENT,
    model: resolvedModel || undefined,
  };
}

export function getSearchConfig() {
  const provider = env.AEO_SEARCH_PROVIDER || (env.AEO_SEARCH_API_KEY || env.SERPAPI_API_KEY ? "serpapi" : "duckduckgo");

  return {
    provider,
    apiKey: env.AEO_SEARCH_API_KEY || env.SERPAPI_API_KEY,
  };
}
