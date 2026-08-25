const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  await prisma.adminUser.upsert({
    where: { email: "admin@spa.local" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@spa.local",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("Seeded super admin: admin@spa.local / changeme123 (change this immediately)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
