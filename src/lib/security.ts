import crypto from 'node:crypto';

export interface SessionTokenPayload {
  userId: string;
  email: string;
  studentName: string;
  exp: number;
}

export interface RateLimitEntry {
  attempts: number;
  lockedUntilMs: number;
}

/**
 * Strips dangerous HTML/XSS vectors, script tags, inline event handlers, and null bytes.
 */
export function sanitizeInputText(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/\bon[a-z]+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes uploaded filenames to prevent directory traversal (../) and shell metacharacters.
 */
export function sanitizeSafeFilename(filename: unknown): string {
  if (typeof filename !== 'string' || !filename.trim()) {
    return 'document.txt';
  }
  const base = filename
    .replace(/\0/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .pop() || 'document.txt';

  const cleaned = base
    .replace(/\.\.+/g, '.')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+/, '')
    .slice(0, 120);

  return cleaned || 'document.txt';
}

/**
 * Validates standard email syntax.
 */
export function validateEmailAddress(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed);
}

/**
 * Evaluates password strength for Grade 7 student accounts while enforcing security minimums.
 */
export function validatePasswordStrength(password: unknown): {
  valid: boolean;
  score: number;
  feedback: string;
} {
  if (typeof password !== 'string') {
    return { valid: false, score: 0, feedback: 'Password is required.' };
  }
  if (password.length < 6) {
    return {
      valid: false,
      score: 1,
      feedback: 'Password must be at least 6 characters long.',
    };
  }

  let score = 1;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return {
    valid: true,
    score: Math.min(4, score),
    feedback:
      score >= 4
        ? 'Strong password protection'
        : score >= 3
        ? 'Good password strength'
        : 'Acceptable password',
  };
}

/**
 * Hashes a password using Node's cryptographic scrypt KDF with a unique 16-byte salt.
 */
export function hashPasswordWithSalt(
  password: string,
  existingSalt?: string
): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Verifies a password against a stored scrypt hash using constant-time comparison.
 */
export function verifyPasswordConstantTime(
  password: string,
  storedHash: string,
  storedSalt: string
): boolean {
  if (!password || !storedHash || !storedSalt) return false;
  try {
    const { hash } = hashPasswordWithSalt(password, storedSalt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically random 6-digit verification Auth Code.
 */
export function generateSixDigitAuthCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Verifies a 6-digit Auth Code using constant-time comparison to prevent timing side-channels.
 */
export function verifyAuthCodeConstantTime(
  submittedCode: string,
  expectedCode: string
): boolean {
  const cleanSubmitted = String(submittedCode || '').replace(/\s+/g, '');
  const cleanExpected = String(expectedCode || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanSubmitted) || !/^\d{6}$/.test(cleanExpected)) {
    return false;
  }
  const a = Buffer.from(cleanSubmitted, 'utf-8');
  const b = Buffer.from(cleanExpected, 'utf-8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Signs an authenticated session token with HMAC-SHA256.
 */
export function signSessionToken(
  payload: SessionTokenPayload,
  secret: string
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString(
    'base64url'
  );
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 session token and checks its expiration timestamp.
 */
export function verifySessionToken(
  token: unknown,
  secret: string,
  nowMs: number = Date.now()
): { valid: boolean; payload?: SessionTokenPayload } {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false };
  }
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [encodedPayload, submittedSig] = parts;

  try {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');

    const sigA = Buffer.from(submittedSig, 'utf-8');
    const sigB = Buffer.from(expectedSig, 'utf-8');
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return { valid: false };
    }

    const decodedJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(decodedJson) as SessionTokenPayload;
    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return { valid: false };
    }

    if (nowMs >= payload.exp) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Enforces brute-force rate limiting per identifier (IP or email).
 */
export function checkRateLimit(
  bucketMap: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts: number = 5,
  lockoutMs: number = 5 * 60 * 1000,
  nowMs: number = Date.now()
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const entry = bucketMap.get(key);
  if (entry && entry.lockedUntilMs > nowMs) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil((entry.lockedUntilMs - nowMs) / 1000),
    };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, maxAttempts - (entry?.attempts || 0)),
    retryAfterSeconds: 0,
  };
}

export function recordFailedAttempt(
  bucketMap: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts: number = 5,
  lockoutMs: number = 5 * 60 * 1000,
  nowMs: number = Date.now()
): RateLimitEntry {
  const current = bucketMap.get(key) || { attempts: 0, lockedUntilMs: 0 };
  if (current.lockedUntilMs > 0 && current.lockedUntilMs <= nowMs) {
    current.attempts = 0;
    current.lockedUntilMs = 0;
  }
  current.attempts += 1;
  if (current.attempts >= maxAttempts) {
    current.lockedUntilMs = nowMs + lockoutMs;
  }
  bucketMap.set(key, current);
  return current;
}

export function clearRateLimit(
  bucketMap: Map<string, RateLimitEntry>,
  key: string
): void {
  bucketMap.delete(key);
}
