type EnvConfig = Record<string, string | undefined>;

function isProduction(config: EnvConfig) {
  return (config.NODE_ENV ?? 'development').toLowerCase() === 'production';
}

function isBlank(value: string | undefined) {
  return !value || value.trim().length === 0;
}

function isLocalUrl(value: string) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function validateEnvironment(config: EnvConfig) {
  const requiredKeys = ['DATABASE_URL', 'SUPABASE_URL'];
  const smtpKeys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM_EMAIL',
    'SMTP_FROM_NAME',
  ] as const;

  if (isProduction(config)) {
    requiredKeys.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  const missingKeys = requiredKeys.filter((key) => isBlank(config[key]));

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(', ')}`,
    );
  }

  const configuredSmtpKeys = smtpKeys.filter((key) => !isBlank(config[key]));
  if (configuredSmtpKeys.length > 0 && configuredSmtpKeys.length < smtpKeys.length) {
    const missingSmtpKeys = smtpKeys.filter((key) => isBlank(config[key]));
    throw new Error(
      `SMTP configuration is incomplete. Missing: ${missingSmtpKeys.join(', ')}`,
    );
  }

  if (isProduction(config)) {
    const frontendSiteUrl = config.FRONTEND_SITE_URL?.trim();

    if (frontendSiteUrl && isLocalUrl(frontendSiteUrl)) {
      throw new Error(
        'FRONTEND_SITE_URL must point to a real public frontend in production.',
      );
    }

    if (config.CORS_ALLOW_ALL === 'true') {
      throw new Error('CORS_ALLOW_ALL must not be enabled in production.');
    }
  }

  return config;
}
