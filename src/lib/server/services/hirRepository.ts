// src/lib/server/services/hirRepository.ts
import type { PrismaClient } from "@prisma/client";


// Megkapja a Prisma klienst, és visszaad egy objektumot a lehetséges műveletekkel.
export function createHirRepository(prisma: PrismaClient) {
    return {
        // 1. Lekéri az összes aktív forrást
        getAktivForrasok: async () => {
            return await prisma.hirForrasok.findMany({
                where: { aktiv: true }
            });
        },

        // 2. Frissíti a forrás utolsó lekérdezési idejét
        updateUtolsoFrissites: async (id: number) => {
            return await prisma.hirForrasok.update({
                where: { id: id },
                data: { utolso_frissites: new Date() }
            });
        },

        // 3. Lementi a hírt, ha az még nem létezik az adatbázisban
        hirMenteseHaUj: async (hirAdat: any) => {
            return await prisma.hirek.upsert({
                where: { url: hirAdat.url },
                update: {}, 
                create: {
                    cim: hirAdat.cim,
                    url: hirAdat.url,
                    tartalom: hirAdat.tartalom,
                    datum: hirAdat.datum,
                    forras_id: hirAdat.forras_id,
                    felhasznalo_id: hirAdat.felhasznalo_id,
                    is_private: hirAdat.is_private,
                    jelentoz: hirAdat.jelentoz
                }
            });
        }
    };
}