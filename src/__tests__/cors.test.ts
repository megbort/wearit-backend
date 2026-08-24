import { parseAllowedOrigins } from '../utils/cors';

const STUDIO_ORIGINS = [
  'https://studio.apollographql.com',
  'https://sandbox.embed.apollographql.com',
];

describe('parseAllowedOrigins', () => {
  it('returns a single origin in production', () => {
    expect(parseAllowedOrigins('https://wearit.app', 'production')).toEqual([
      'https://wearit.app',
    ]);
  });

  it('splits a comma-separated list in production', () => {
    expect(
      parseAllowedOrigins(
        'https://wearit.app,http://localhost:3000',
        'production',
      ),
    ).toEqual(['https://wearit.app', 'http://localhost:3000']);
  });

  it('trims whitespace around each origin', () => {
    expect(
      parseAllowedOrigins(
        ' https://wearit.app , http://localhost:3000 ',
        'production',
      ),
    ).toEqual(['https://wearit.app', 'http://localhost:3000']);
  });

  it('strips a trailing slash so origins match the browser Origin header', () => {
    expect(parseAllowedOrigins('https://wearit.app/', 'production')).toEqual([
      'https://wearit.app',
    ]);
  });

  it('drops empty entries from a trailing comma', () => {
    expect(parseAllowedOrigins('https://wearit.app,', 'production')).toEqual([
      'https://wearit.app',
    ]);
  });

  it('defaults to localhost:3000 when FRONTEND_URL is unset', () => {
    expect(parseAllowedOrigins(undefined, 'production')).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('appends the Apollo Studio origins outside production', () => {
    expect(parseAllowedOrigins('http://localhost:3000', undefined)).toEqual([
      'http://localhost:3000',
      ...STUDIO_ORIGINS,
    ]);
  });

  it('does not append the Apollo Studio origins in production', () => {
    expect(parseAllowedOrigins('https://wearit.app', 'production')).not.toEqual(
      expect.arrayContaining(STUDIO_ORIGINS),
    );
  });
});
