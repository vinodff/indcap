/**
 * Environment validation — called once at app startup.
 *
 * Validates required environment variables and returns a structured result so
 * the UI can surface actionable messages instead of cryptic API errors.
 *
 * Why a dedicated module:
 *  - Prevents the same "missing key" check from being scattered across
 *    multiple service files (currently in App.tsx, transcriptAnalyzer.ts,
 *    geminiService.ts, and apiKeySelector.ts — all slightly different).
 *  - Single place to add new required vars without hunting the codebase.
 *  - Pure function — no side effects, testable without mocks.
 */

export interface EnvValidationResult {
  valid: boolean;
  geminiApiKey: string | null;
  /** Human-readable message suitable for direct display to the developer/user. */
  message: string | null;
}

/**
 * PURE validation core — given a candidate key (or null), returns the result.
 * Extracted from validateEnv so it can be unit-tested without import.meta.env
 * or localStorage. This is the single place the "is the key valid?" rule lives.
 */
export function resolveEnvResult(candidateKey: string | null | undefined): EnvValidationResult {
  if (!candidateKey || candidateKey.trim().length === 0) {
    return {
      valid: false,
      geminiApiKey: null,
      message:
        'VITE_GEMINI_API_KEY is not set. ' +
        'Add it to your .env.local file:\n\n' +
        '  VITE_GEMINI_API_KEY=your_key_here\n\n' +
        'Get a key at https://aistudio.google.com/app/apikey',
    };
  }
  return { valid: true, geminiApiKey: candidateKey.trim(), message: null };
}

/**
 * Validates the runtime environment and returns the Gemini API key if present.
 * Checks, in priority order:
 *   1. VITE_GEMINI_API_KEY (recommended — set in .env.local)
 *   2. VITE_API_KEY        (legacy alias)
 *   3. localStorage        (user-supplied via the in-app ApiKeySelector)
 */
export function validateEnv(): EnvValidationResult {
  const key =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('createrin_api_key')
      : null);

  return resolveEnvResult(key);
}

/**
 * Convenience: returns the key or throws a descriptive Error.
 * Use this inside services that can't easily render UI (like transcriptAnalyzer).
 */
export function requireGeminiKey(): string {
  const result = validateEnv();
  if (!result.valid || !result.geminiApiKey) {
    throw new Error(result.message ?? 'VITE_GEMINI_API_KEY not configured');
  }
  return result.geminiApiKey;
}
