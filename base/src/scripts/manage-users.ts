import 'dotenv/config';
import { featureCommandNames, getFeatureFromCommandName } from '../features/user_features/user_features.service';
import { prisma } from '../prisma';

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
      featureFlags: {
        where: { enabled: true },
        select: { feature: true },
      },
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
      Features: u.featureFlags.length > 0 ? u.featureFlags.map((flag) => flag.feature).join(', ') : '-',
      'Created At': u.createdAt.toISOString().replace('T', ' ').substring(0, 19),
    }))
  );
}

async function setFeatureFlag(identifier: string, featureName: string, enabled: boolean) {
  if (!identifier || !featureName) {
    const command = enabled ? 'feature-enable' : 'feature-disable';
    console.error('Error: User ID or email and feature name are required.');
    console.log(`Usage: npm run users:${command} <id | email> <feature>`);
    console.log(`Features: ${Object.keys(featureCommandNames).join(', ')}`);
    process.exit(1);
  }

  const feature = getFeatureFromCommandName(featureName);
  if (!feature) {
    console.error(`Error: Unknown feature "${featureName}".`);
    console.log(`Features: ${Object.keys(featureCommandNames).join(', ')}`);
    process.exit(1);
  }

  const user = await findUser(identifier);
  if (!user) {
    console.error(`Error: User not found by identifier "${identifier}".`);
    process.exit(1);
  }

  await prisma.userFeatureFlag.upsert({
    where: {
      userId_feature: {
        userId: user.id,
        feature,
      },
    },
    create: {
      userId: user.id,
      feature,
      enabled,
    },
    update: { enabled },
  });

  console.log(`Feature ${featureName} is now ${enabled ? 'ENABLED' : 'DISABLED'} for user #${user.id} (${user.email}).`);
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

async function createOrUpdateAdmin(emailInput: string, nameInput?: string) {
  if (!emailInput?.trim()) {
    console.error('Error: Email is required.');
    console.log('Usage: node run-script.js manage-users create-admin <email> [name]');
    process.exit(1);
  }

  const cleanEmail = emailInput.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        isAdmin: true,
        ...(nameInput ? { name: nameInput.trim() } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
      },
    });
    console.log(`\nUser with email "${cleanEmail}" already exists (ID: #${updated.id}).`);
    console.log(`Promoted to ADMIN: ID: #${updated.id}, Email: ${updated.email}, Name: ${updated.name !== null ? updated.name : '-'}, Role: ADMIN`);
    return updated;
  }

  const created = await prisma.user.create({
    data: {
      email: cleanEmail,
      name: nameInput ? nameInput.trim() : cleanEmail.split('@')[0],
      isAdmin: true,
      state: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  console.log(`\nSuccessfully created new ADMIN user:`);
  console.log(`ID: #${created.id}, Email: ${created.email}, Name: ${created.name !== null ? created.name : '-'}, Role: ADMIN`);
  return created;
}

async function main() {
  const [,, command, ...args] = process.argv;
  const target = args[0];
  const featureName = args[1];

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
      case 'create-admin':
      case 'add-admin': {
        let emailArg: string | undefined;
        let nameArg: string | undefined;

        for (let i = 0; i < args.length; i++) {
          const a = args[i];
          if (a.startsWith('--email=')) {
            emailArg = a.split('=')[1];
          } else if (a === '--email') {
            emailArg = args[++i];
          } else if (a.startsWith('--name=')) {
            nameArg = a.split('=')[1];
          } else if (a === '--name') {
            nameArg = args[++i];
          } else if (!emailArg && !a.startsWith('--')) {
            emailArg = a;
          } else if (!nameArg && !a.startsWith('--')) {
            nameArg = a;
          }
        }

        if (!emailArg) {
          console.error('Error: Email is required.');
          console.log('Usage: node run-script.js manage-users create-admin <email> [name]');
          process.exit(1);
        }

        await createOrUpdateAdmin(emailArg, nameArg);
        break;
      }
      case 'feature-enable':
      case 'enable-feature':
        await setFeatureFlag(target, featureName, true);
        break;
      case 'feature-disable':
      case 'disable-feature':
        await setFeatureFlag(target, featureName, false);
        break;
      default:
        console.log(`
Available commands:
  list                                - List all users
  create-admin <email> [name]         - Create a new admin user (or promote existing)
  make-admin <id | email>             - Grant admin privileges to an existing user
  make-regular <id | email>           - Set user as regular (revoke admin privileges)
  feature-enable <id | email> <feature>  - Enable a user feature
  feature-disable <id | email> <feature> - Disable a user feature

Features:
  multiple-dictionaries
  card-images

Examples:
  npm run users:list
  npm run users:create-admin admin@example.com
  npm run users:create-admin admin@example.com "Super Admin"
  npm run users:make-admin admin@example.com
  npm run users:make-regular 1
  npm run users:feature-enable admin@example.com multiple-dictionaries
  npm run users:feature-disable 1 card-images
`);
        if (command) {
          process.exit(1);
        }
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
