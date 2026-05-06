// src/routes/api/news/sync/+server.ts
import { json } from '@sveltejs/kit';
import { modules } from '$lib/server/index';

let isSyncing = false;     
let lastSyncTime = 0;      

export async function GET({ locals }) {
    
    // 1. Kideríti, ki nyomta meg a gombot
    const user = (locals as any).user;
    const userId = user ? user.id : 1; // Ha nincs user (pl. hiba), biztonsági okból 1-es.

    // --- 1. VÉDELEM: COOLDOWN (5 perc) ---
    const now = Date.now();
    const cooldownMs = 5 * 60 * 1000; 
    
    if (now - lastSyncTime < cooldownMs) {
        const hatralevoPerc = Math.ceil((cooldownMs - (now - lastSyncTime)) / 60000);
        return json({ 
            sikeres: false, 
            uzenet: `A hírek már frissek! Próbáld újra ${hatralevoPerc} perc múlva.` 
        }, { status: 429 });
    }

    // --- 2. VÉDELEM: LAKAT ---
    if (isSyncing) {
        return json({ 
            sikeres: false, 
            uzenet: 'A frissítés már folyamatban van a háttérben...' 
        }, { status: 423 });
    }

    // --- MUNKAFOLYAMAT INDÍTÁSA ---
    isSyncing = true;

    try {
        console.log(`\n[KÉZI SYNC] Frissítés indítva a(z) ${userId}. felhasználó által...`);
        
        await modules.hirGyujto.osszesForrasFrissitese(userId);

        await modules.aiElemzo.ujHirekFeldolgozasa(userId);

        lastSyncTime = Date.now();
        console.log("[KÉZI SYNC] A folyamat hibátlanul lefutott!\n");

        return json({
            sikeres: true,
            uzenet: "A hírek frissítése ÉS az AI elemzés is sikeresen lefutott!"
        });

    } catch (error) {
        console.error("Kritikus hiba a végponton:", error);
        return json({ sikeres: false, uzenet: "Hiba történt a szerveren." }, { status: 500 });
    } finally {
        isSyncing = false;
    }
}