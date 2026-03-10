import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Egyszerűen üresen hagyjuk a konstruktort, 
// a Prisma 7 a prisma.config.ts-ből fogja venni az adatokat.
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;