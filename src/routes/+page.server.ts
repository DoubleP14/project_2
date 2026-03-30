// src/routes/+page.server.ts
import { services } from '$lib/server';

export const load = async () => {
    // 1. Adatbázis-kapcsolat meghívása
    const prisma = services.db; 

    // 2. Adatok lekérése
    const elemzesek = await prisma.aiElemzesek.findMany({
        orderBy: { elemzes_datuma: 'desc' },
        take: 10,
        include: {
            hir: true 
        }
    });

    return {
        cikkek: elemzesek
    };
};