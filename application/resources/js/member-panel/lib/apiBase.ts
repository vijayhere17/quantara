/**
 * Resolve the Laravel application base URL for API + page requests.
 *
 * Priority:
 * 1. Explicit override
 * 2. window.__QUANTARA_BOOT__.baseUrl (set by Blade from APP_URL / URL::to)
 * 3. #basePath hidden input (legacy layouts)
 * 4. import.meta.env.VITE_APP_URL (optional Vite env)
 *
 * Never hardcodes subdirectory names like "/btc".
 * Works for root installs (production) and subdirectory installs (local /btc).
 */

type BootWithBase = {
  baseUrl?: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function readBootBaseUrl(): string | null {
  try {
    const boot = (window as unknown as { __QUANTARA_BOOT__?: BootWithBase }).__QUANTARA_BOOT__;
    if (boot?.baseUrl && typeof boot.baseUrl === 'string') {
      return trimTrailingSlash(boot.baseUrl);
    }
  } catch {
    // ignore
  }
  return null;
}

function readDomBasePath(): string | null {
  try {
    const el = document.getElementById('basePath') as HTMLInputElement | null;
    if (el?.value) {
      return trimTrailingSlash(el.value);
    }
  } catch {
    // ignore
  }
  return null;
}

function readViteAppUrl(): string | null {
  try {
    const value = import.meta.env.VITE_APP_URL as string | undefined;
    if (value && typeof value === 'string') {
      return trimTrailingSlash(value);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Application origin + path prefix (no trailing slash).
 * Example local:  http://localhost/btc
 * Example prod:   https://app.example.com
 */
export function getApiBaseUrl(override?: string | null): string {
  if (override && override.trim() !== '') {
    return trimTrailingSlash(override.trim());
  }

  return (
    readBootBaseUrl() ||
    readDomBasePath() ||
    readViteAppUrl() ||
    ''
  );
}

/**
 * Build an absolute application URL for a path.
 * apiUrl('/api/blockchain/config') → http://localhost/btc/api/blockchain/config
 */
export function apiUrl(path: string, baseOverride?: string | null): string {
  const base = getApiBaseUrl(baseOverride);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    // Relative to current origin root — only used if boot/env are missing
    return normalizedPath;
  }
  return `${base}${normalizedPath}`;
}
