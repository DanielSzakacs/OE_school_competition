import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // pontok nullázása
  await prisma.player.updateMany({ data: { score: 0 } });

  // minden kérdés újra látható
  await prisma.question.updateMany({ data: { isVisible: true } });

  // (opcionális) próbálkozások törlése
  await prisma.attempt.deleteMany();

  console.log("Reset kész ✅ (scores=0, questions visible, attempts törölve)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
