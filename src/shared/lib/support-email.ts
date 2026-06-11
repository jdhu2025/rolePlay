export const DEFAULT_SUPPORT_EMAIL = 'support@keepsay.dpdns.org';

export function getSupportEmail(configs?: Record<string, string>) {
  const configured =
    configs?.support_email ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    DEFAULT_SUPPORT_EMAIL;

  return String(configured || DEFAULT_SUPPORT_EMAIL).trim();
}

export function getSupportMailto(configs?: Record<string, string>) {
  return `mailto:${getSupportEmail(configs)}`;
}
