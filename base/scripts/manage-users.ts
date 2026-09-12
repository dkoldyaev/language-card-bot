import 'dotenv/config';
import { prisma } from '../src/prisma';

async function findUser(identifier: string) {
  const numericId = Number(identifier);
  if (!Number.isNaN(numericId)) {
    const user = await prisma.user.findUnique({ where: { id: numericId } });
    if (user) return user;
  }
  return prisma.user.findUnique({ where: { email: identifier.trim() } });
}

async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  if (users.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log(`\nFound ${users.length} user(s):`);
  console.table(
    users.map((u) => ({
      ID: u.id,
      Email: u.email,
      Name: u.name || '-',
      Role: u.isAdmin ? 'ADMIN' : 'USER',
      'Created At': u.createdAt.toISOString().replace('T', ' ').substring(0, 19),
    }))
  );
}

async function setAdminRole(identifier: string, isAdmin: boolean) {
  if (!identifier) {
    console.error(`Error: User ID or email is required.`);
    console.log(`Usage: npm run users:${isAdmin ? 'make-admin' : 'make-regular'} <id | email>`);
    process.exit(1);
  }

  const user = await findUser(identifier);
  if (!user) {
    console.error(`Error: User not found by identifier "${identifier}".`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
    },
  });

  const roleText = updated.isAdmin ? 'ADMIN' : 'REGULAR USER';
  console.log(`\nSuccessfully updated user #${updated.id} (${updated.email}):`);
  console.log(`Role is now: ${roleText}`);
}

async function main() {
  const [,, command, ...args] = process.argv;
  const target = args[0];

  try {
    switch (command) {
      case 'list':
        await listUsers();
        break;
      case 'make-admin':
      case 'admin':
        await setAdminRole(target, true);
        break;
      case 'make-regular':
      case 'revoke-admin':
      case 'regular':
        await setAdminRole(target, false);
        break;
      default:
        console.log(`
Available commands:
  list                        - List all users
  make-admin <id | email>     - Grant admin privileges to a user
  make-regular <id | email>   - Set user as regular (revoke admin privileges)

Examples:
  npm run users:list
  npm run users:make-admin admin@example.com
  npm run users:make-regular 1
`);
        break;
    }
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
