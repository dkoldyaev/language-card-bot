import 'dotenv/config';
import { prisma } from '../prisma';

async function main() {
  const args = process.argv.slice(2);
  let email: string | undefined;
  let name: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--email=')) {
      email = a.split('=')[1];
    } else if (a === '--email' || a === '-e') {
      email = args[++i];
    } else if (a.startsWith('--name=')) {
      name = a.split('=')[1];
    } else if (a === '--name' || a === '-n') {
      name = args[++i];
    } else if (!email && !a.startsWith('--')) {
      email = a;
    } else if (!name && !a.startsWith('--')) {
      name = a;
    }
  }

  if (!email || !email.trim()) {
    console.error('Error: Email is required.');
    console.log(`
Usage:
  node run-script.js admin-create <email> [name]
  node run-script.js admin-create --email <email> [--name <name>]
`);
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (existingUser) {
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          isAdmin: true,
          ...(name ? { name: name.trim() } : {}),
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
    } else {
      const created = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: name ? name.trim() : cleanEmail.split('@')[0],
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
    }
  } catch (error) {
    console.error('Failed to create/update admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
