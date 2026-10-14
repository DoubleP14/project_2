// src/lib/server/services/archiveService.ts
import type { PrismaClient } from "@prisma/client";

export function createArchiveService(prisma: PrismaClient) {
    return {
        // VÉGLEGES TÖRLÉS: A 7 napnál régebbi híreket fizikailag törli (Hard Delete)
        // Visszatérési érték: a törölt hírek száma
        regiHirekArchivalasa: async (napokKuszobe: number = 7): Promise<number> => {
            const hatarIdo = new Date();
            hatarIdo.setDate(hatarIdo.getDate() - napokKuszobe);

            const eredmeny = await prisma.hirek.deleteMany({
                where: {
                    datum: { lt: hatarIdo }
                }
            });

            console.log(`[Archiválás] 🧹 ${eredmeny.count} db ${napokKuszobe} napnál régebbi hír VÉGLEGESEN törölve (Hard Delete).`);
            return eredmeny.count;
        }
    };
}
