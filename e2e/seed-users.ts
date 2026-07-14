// Seed deterministic E2E users into the target database. Run before Playwright:
//   DATABASE_URL=... npx tsx e2e/seed-users.ts
import { PrismaClient, Role } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();
const options = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

async function upsert(username: string, password: string, role: Role, mustChange: boolean): Promise<void> {
  const passwordHash = await hash(password, options);
  await prisma.user.upsert({
    where: { username },
    create: {
      username,
      passwordHash,
      role,
      isActive: true,
      mustChangePassword: mustChange,
    },
    update: {
      passwordHash,
      role,
      isActive: true,
      mustChangePassword: mustChange,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}

async function main(): Promise<void> {
  await upsert('e2e-owner', 'E2e-Owner-Pass-1', Role.OWNER, false);
  await upsert('e2e-member', 'E2e-Member-Pass-1', Role.MEMBER, false);
  await upsert('e2e-firstlogin', 'E2e-First-Pass-1', Role.MEMBER, true);
  console.log('e2e users seeded');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    await prisma.$disconnect();
    process.exit(1);
  });
