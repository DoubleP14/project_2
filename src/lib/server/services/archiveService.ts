// src/lib/server/services/archiveService.ts
import type { PrismaClient } from "@prisma/client";

export function createArchiveService(prisma: PrismaClient) {
    return {
        // Alapértelmezésben a 7 napnál régebbi híreket "törli" (rejti el)
        regiHirekArchivalasa: async (napokKuszobe: number = 7) => {
            const hatarIdo = new Date();
            hatarIdo.setDate(hatarIdo.getDate() - napokKuszobe);

            try {
                // Frissíti azokat a híreket, amik régebbiek a küszöbnél és még nem voltak archiválva
                const eredmeny = await prisma.hirek.updateMany({
                    where: {
                        datum: { lt: hatarIdo }, 
                        archivalt: false         
                    },
                    data: {
                        archivalt: true          
                    }
                });
                
                if (eredmeny.count > 0) {
                    console.log(`[Archiválás] 🧹 ${eredmeny.count} db régi hír sikeresen archiválva (Soft Delete).`);
                }
            } catch (error) {
                console.error("[Archiválás] Hiba történt a takarítás során:", error);
            }
        }
    };
}