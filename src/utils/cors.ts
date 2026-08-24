const STUDIO_ORIGINS = [
  'https://studio.apollographql.com',
  'https://sandbox.embed.apollographql.com',
];

export const parseAllowedOrigins = (
  frontendUrl: string | undefined,
  nodeEnv: string | undefined,
): string[] => {
  const origins = (frontendUrl || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return nodeEnv === 'production' ? origins : [...origins, ...STUDIO_ORIGINS];
};
