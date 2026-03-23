import { json } from '@sveltejs/kit';
import { modules } from '$lib/server/index'; 

// Ez a függvény fut le, ha a böngészőből megnyitod ezt az URL-t
export async function GET() {
    try {
        console.log("Hírfrissítés manuálisan elindítva az API-n keresztül...");
        
        // Üzleti logika
        await modules.hirGyujto.osszesForrasFrissitese();

        // Ha lefutott, visszaküld egy sikeres választ a böngészőnek
        return json({
            sikeres: true,
            uzenet: "A hírforrások frissítése sikeresen lefutott! Nézd meg a terminált a részletekért."
        });

    } catch (error) {
        console.error("Kritikus hiba a végponton:", error);
        return json({
            sikeres: false,
            uzenet: "Hiba történt a frissítés során."
        }, { status: 500 });
    }
}