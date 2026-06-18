const LEGACY_PRODUCT_NAME_REPLACEMENTS: Record<string, string> = {
  'RolePlay First Spark': 'Keepsay First Spark',
  'RolePlay Spark Credits': 'Keepsay Spark Credits',
  'RolePlay Glow Credits': 'Keepsay Glow Credits',
  'RolePlay Lite Monthly': 'Keepsay Lite Monthly',
  'RolePlay Plus Monthly': 'Keepsay Plus Monthly',
  'RolePlay Pro Monthly': 'Keepsay Pro Monthly',
  'RolePlay Lite Yearly': 'Keepsay Lite Yearly',
  'RolePlay Plus Yearly': 'Keepsay Plus Yearly',
  'RolePlay Pro Yearly': 'Keepsay Pro Yearly',
};

export function getReviewSafeProductName(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return LEGACY_PRODUCT_NAME_REPLACEMENTS[raw] || raw.replace(/^RolePlay\b/, 'Keepsay');
}
