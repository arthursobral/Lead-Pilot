// Run with: node prisma/seed.js
// Creates a dev TeamLead and prints its ID for use in the controller bypass.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teamLead = await prisma.teamLead.upsert({
    where: { email: 'lead@leadpilot.dev' },
    create: {
      email: 'lead@leadpilot.dev',
      name: 'Dev TeamLead',
      githubLogin: 'dev-lead',
    },
    update: {},
  });

  console.log('\nTeamLead seeded:');
  console.log('  id   :', teamLead.id);
  console.log('  email:', teamLead.email);
  console.log('\nCopy this ID into developers.controller.ts:');
  console.log("  const TEAM_LEAD_ID = '" + teamLead.id + "';");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
