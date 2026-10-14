import { PrismaClient } from '@prisma/client';

// Singleton minta: megelőzi, hogy fejlesztés közben beteljen az adatbázis-kapcsolat
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Megtartjuk az eredeti paramétereket (config, client), hogy az index.ts ne dobjon hibát,
// de a hibás adapter helyett egyszerűen a stabil, natív Prisma klienst adjuk vissza!
export function createPrisma(config?: any, client?: any): any {
    return prisma;
}