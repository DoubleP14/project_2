// src/routes/api/news/sync/+server.ts
import { json } from '@sveltejs/kit';
import { modules } from '$lib/server/index';

export async function GET() {
    try {
        console.log("Hírfrissítés és AI elemzés manuálisan elindítva...");
        
        // 1. Leszedi az új híreket az RSS-ből
        await modules.hirGyujto.osszesForrasFrissitese();

        // 2. Ráküldi az AI-t a friss (még nem elemzett) hírekre
        await modules.aiElemzo.ujHirekFeldolgozasa();

        return json({
            sikeres: true,
            uzenet: "A hírek frissítése ÉS az AI elemzés is sikeresen lefutott!"
        });

    } catch (error) {
        console.error("Kritikus hiba a végponton:", error);
        return json({ sikeres: false, uzenet: "Hiba történt." }, { status: 500 });
    }
}