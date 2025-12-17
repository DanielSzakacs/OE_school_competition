// import "dotenv/config";

// import clientPkg from "@prisma/client";
// import adapterPkg from "@prisma/adapter-pg";

// const { PrismaClient } = clientPkg;
// const { PrismaPg } = adapterPkg;

// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL,
// });

// const prisma = new PrismaClient({ adapter });

import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // 1) Players (seat 1..5 fixen)
  const players = [
    { seat: 1, name: "1" },
    { seat: 2, name: "2" },
    { seat: 3, name: "3" },
    { seat: 4, name: "4" },
    { seat: 5, name: "5" },
  ];

  // 2) Questions (példa pár darab)
  const questionsPath = path.join(__dirname, "questions.json");
  const sampleQuestions = JSON.parse(
    await fs.readFile(questionsPath, { encoding: "utf-8" })
  );

  // töröljük az összes adatot, hogy elkerüljük a duplikációt
  await prisma.$transaction([
    prisma.attempt.deleteMany(),
    prisma.question.deleteMany(),
    prisma.player.deleteMany(),
  ]);

  await prisma.player.createMany({ data: players });
  await prisma.question.createMany({ data: sampleQuestions });

  console.log("Seed kész ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
