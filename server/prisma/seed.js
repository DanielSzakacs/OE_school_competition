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

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Players (seat 1..5 fixen)
  const players = [
    { seat: 1, name: "1" },
    { seat: 2, name: "2" },
    { seat: 3, name: "3" },
    { seat: 4, name: "4" },
    { seat: 5, name: "5" },
  ];

  for (const p of players) {
    await prisma.player.upsert({
      where: { seat: p.seat },
      update: { name: p.name },
      create: { seat: p.seat, name: p.name, score: 0 },
    });
  }

  // 2) Questions (példa pár darab)
  const sampleQuestions = [
    {
      category: "Történelem",
      point: 100,
      question: "Melyik évben volt a mohácsi csata?",
      answerA: "1241",
      answerB: "1526",
      answerC: "1848",
      answerD: "1914",
      correctAnswer: "B",
      image: null,
      isVisible: true,
    },
    {
      category: "Földrajz",
      point: 100,
      question: "Mi Magyarország fővárosa?",
      answerA: "Budapest",
      answerB: "Debrecen",
      answerC: "Szeged",
      answerD: "Pécs",
      correctAnswer: "A",
      image: null,
      isVisible: true,
    },
    {
      category: "Informatika",
      point: 200,
      question: "Mit jelent a HTTP rövidítés?",
      answerA: "High Transfer Text Protocol",
      answerB: "HyperText Transfer Protocol",
      answerC: "Host Transfer Tool Protocol",
      answerD: "Hyper Terminal Trace Protocol",
      correctAnswer: "B",
      image: null,
      isVisible: true,
    },
  ];

  // egyszerű: csak beszúrjuk (MVP)
  // ha sokszor futtatod, duplikálódhat – később okosítjuk
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
