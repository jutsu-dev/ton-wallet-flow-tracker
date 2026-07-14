import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 defaults to Argon2id. Parameters follow the OWASP baseline
// (m=19 MiB, t=2, p=1). The encoded hash carries its own parameters, so verify
// does not need them repeated.
const HASH_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
