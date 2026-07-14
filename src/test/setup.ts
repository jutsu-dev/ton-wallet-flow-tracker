import '@testing-library/jest-dom/vitest';

// Non-secret placeholder values so getEnv() validates during tests. Real values
// (when provided by the shell/CI) take precedence. DATABASE_URL is intentionally
// left unset here — DB integration tests are gated on it being provided.
process.env.SESSION_SECRET ??= 'test-only-session-value-not-a-secret-xxxx';
process.env.AUTH_SECRET ??= 'test-only-auth-value-not-a-secret-xxxxxxx';
process.env.APP_URL ??= 'http://localhost:3000';
process.env.APP_ENV ??= 'test';
