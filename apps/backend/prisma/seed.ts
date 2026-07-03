import { PrismaClient } from '@prisma/client';

/**
 * Dev seed -- creates the minimum data needed for Day 4 manual validation.
 *
 * Creates one TeamLead row if none exists, then prints its ID.
 * This ID must be used as TEAM_LEAD_ID in the DevelopersController bypass.
 *
 * Run: npx ts-node prisma/seed.ts
 *
 * Safe to run multiple times -- uses upsert on email.
 */
async function main() {
  const prisma = new PrismaClient();

  try {
    const teamLead = await prisma.teamLead.upsert({
      where: { email: 'lead@leadpilot.dev' },
      create: {
        email: 'lead@leadpilot.dev',
        name: 'Dev TeamLead',
        githubLogin: 'dev-lead',
      },
      update: {},
    });

    console.log('TeamLead seeded:');
    console.log('  id:', teamLead.id);
    console.log('  email:', teamLead.email);
    console.log('');
    console.log('Copy this ID into TEAM_LEAD_ID in developers.controller.ts');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
