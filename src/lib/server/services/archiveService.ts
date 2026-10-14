// src/lib/server/services/archiveService.ts
import type { PrismaClient } from "@prisma/client";

export function createArchiveService(prisma: PrismaClient) {
    return {
        // VÉGLEGES TÖRLÉS: A 7 napnál régebbi híreket fizikailag törli (Hard Delete)
        regiHirekArchivalasa: async (napokKuszobe: number = 7) => {
            const hatarIdo = new Date();
            hatarIdo.setDate(hatarIdo.getDate() - napokKuszobe);

            try {
                // UPDATE helyett DELETE történik!
                const eredmeny = await prisma.hirek.deleteMany({
                    where: {
                        datum: { lt: hatarIdo } 
                    }
                });
                
                if (eredmeny.count > 0) {
                    console.log(`[Archiválás] 🧹 ${eredmeny.count} db ${napokKuszobe} napnál régebbi hír VÉGLEGESEN törölve (Hard Delete).`);
                }
            } catch (error) {
                console.error("[Archiválás] Hiba történt a fizikai törlés során:", error);
            }
        }
    };
}