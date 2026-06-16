// src/lib/server/services/loggerService.ts
import { services } from '$lib/server';

export const logger = {
    info: async (esemeny_tipus: string, leiras: string, felhasznalo_id?: number | null, ip_cim?: string | null) => {
        try {
            await services.db.rendszerNaplo.create({
                data: {
                    esemeny_tipus: esemeny_tipus,
                    leiras: leiras,
                    felhasznalo_id: felhasznalo_id || null,
                    ip_cim: ip_cim || null
                }
            });
        } catch (error) {
            console.error('❌ Hiba a rendszer naplózásakor:', error);
        }
    }
};