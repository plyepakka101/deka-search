import { prisma } from './prisma';

export async function getLawBooksMeta() {
  return prisma.lawBook.findMany({
    select: { id: true, name: true, abbreviation: true }
  });
}
