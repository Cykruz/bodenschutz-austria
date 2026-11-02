import Constants from 'expo-constants';

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Basis-URL der API, z. B. http://192.168.1.20:4000 (ohne /api). */
export const API_URL = trimSlash(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000');

/** Öffentliche Website (für Datenschutz-Link). */
export const WEB_URL = trimSlash(process.env.EXPO_PUBLIC_WEB_URL ?? 'https://bodenschutz-austria.at');

export const PRIVACY_URL = `${WEB_URL}/datenschutz`;

/** true: Beispieldaten aus lib/mock.ts statt echter API. */
export const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === 'true';

export const REQUEST_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 45_000;

export const APP_VERSION: string = Constants.expoConfig?.version ?? '1.0.0';

export const COMPANY_NAME = 'Bodenschutz Austria';
