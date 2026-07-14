// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';
import { authenticateUser, changePassword, createUser } from './service';
import { createSession, findSessionUser, destroySession } from './session';
import { resetRateLimits } from '@/server/rate-limit';

// Gated on DATABASE_URL: runs locally and in CI (with a Postgres service),
// skipped in the plain unit-test run.
const hasDb = Boolean(process.env.DATABASE_URL);
const rid = () => randomBytes(6).toString('hex');

describe.skipIf(!hasDb)('auth integration (database)', () => {
  const createdUserIds: string[] = [];

  beforeEach(() => resetRateLimits());

  afterAll(async () => {
    for (const id of createdUserIds) {
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  async function newMember(password: string) {
    const user = await createUser({
      username: `test_${rid()}`,
      password,
      role: 'MEMBER',
      mustChangePassword: false,
    });
    createdUserIds.push(user.id);
    return user;
  }

  it('authenticates with a correct password', async () => {
    const user = await newMember('Correct-Horse-1');
    const result = await authenticateUser(user.username, 'Correct-Horse-1', { ip: `ip-${rid()}` });
    expect(result.status).toBe('ok');
    expect(result.user?.id).toBe(user.id);
  });

  it('rejects a wrong password and unknown users', async () => {
    const user = await newMember('Correct-Horse-1');
    expect((await authenticateUser(user.username, 'wrong', { ip: `ip-${rid()}` })).status).toBe('invalid');
    expect((await authenticateUser(`nobody_${rid()}`, 'x', { ip: `ip-${rid()}` })).status).toBe('invalid');
  });

  it('locks the account after repeated failures', async () => {
    const user = await newMember('Correct-Horse-1');
    const ip = `ip-${rid()}`;
    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await authenticateUser(user.username, 'wrong', { ip });
    }
    expect(last?.status).toBe('locked');
    // A correct password is still rejected while locked.
    expect((await authenticateUser(user.username, 'Correct-Horse-1', { ip })).status).toBe('locked');
  });

  it('rejects a disabled account', async () => {
    const user = await newMember('Correct-Horse-1');
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const result = await authenticateUser(user.username, 'Correct-Horse-1', { ip: `ip-${rid()}` });
    expect(result.status).toBe('disabled');
  });

  it('creates, validates, and destroys a session', async () => {
    const user = await newMember('Correct-Horse-1');
    const { token } = await createSession(user.id);
    expect((await findSessionUser(token))?.id).toBe(user.id);
    await destroySession(token);
    expect(await findSessionUser(token)).toBeNull();
  });

  it('changePassword updates the hash, clears the flag, and revokes sessions', async () => {
    const user = await createUser({
      username: `test_${rid()}`,
      password: 'Old-Password-1',
      role: 'MEMBER',
      mustChangePassword: true,
    });
    createdUserIds.push(user.id);
    const { token } = await createSession(user.id);
    await changePassword(user.id, 'New-Password-2');

    expect(await findSessionUser(token)).toBeNull();
    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    expect(refreshed?.mustChangePassword).toBe(false);
    expect((await authenticateUser(user.username, 'Old-Password-1', { ip: `ip-${rid()}` })).status).toBe('invalid');
    expect((await authenticateUser(user.username, 'New-Password-2', { ip: `ip-${rid()}` })).status).toBe('ok');
  });
});
