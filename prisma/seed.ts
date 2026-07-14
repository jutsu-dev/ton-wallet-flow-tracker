import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import { hash } from '@node-rs/argon2';

// Idempotent seed. Creates the initial OWNER with a random temporary password
// written only to secrets/initial-owner-password. The password is never printed.

const prisma = new PrismaClient();
const OWNER_USERNAME = 'jutsu-dev';

async function main(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { username: OWNER_USERNAME } });
  if (existing) {
    console.log(`Owner '${OWNER_USERNAME}' already exists; skipping.`);
    return;
  }

  const tempPassword = randomBytes(18).toString('base64url');
  // @node-rs/argon2 defaults to Argon2id.
  const passwordHash = await hash(tempPassword, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.user.create({
    data: {
      username: OWNER_USERNAME,
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      mustChangePassword: true,
    },
  });

  const dir = join(process.cwd(), 'secrets');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'initial-owner-password'), `${tempPassword}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  console.log(
    `Created OWNER '${OWNER_USERNAME}'. Temporary password written to secrets/initial-owner-password.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error('seed failed:', err instanceof Error ? err.message : String(err));
    await prisma.$disconnect();
    process.exit(1);
  });
