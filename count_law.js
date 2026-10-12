
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  console.log('LawBooks:', await prisma.lawBook.count());
}
run();

