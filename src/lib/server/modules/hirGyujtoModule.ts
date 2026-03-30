// src/lib/server/modules/hirGyujtoModule.ts
import Parser from 'rss-parser';
import type { Services } from '../index'; // Services típus importálás

const rssParser = new Parser();

// Ez a függvény hozza létre a modult, megkapva az alacsony szintű szolgáltatásokat
export function createHirGyujtoModule(services: Services) {
    
    // Segédfüggvény az RSS feldolgozáshoz
    const rssFeldolgozas = async (forras: any) => {
        const feed = await rssParser.parseURL(forras.forras_url);
        let feldolgozottCikkek = 0;

        for (const item of feed.items) {
            // 1. URL MEGTISZTÍTÁSA: Levág mindent, ami a '?' után van (követőkódok eltávolítása)
            const nyersUrl = item.link || '';
            const tisztaUrl = nyersUrl.split('?')[0];

            // Üzleti logika
            const cikkSzovege = (item.title + " " + item.contentSnippet).toLowerCase();
            const jelentoz = cikkSzovege.includes('válság') || cikkSzovege.includes('katasztrófa');

            // Adat mentése 
            await services.hirRepo.hirMenteseHaUj({
                cim: item.title || 'Nincs cím',
                url: tisztaUrl,
                tartalom: item.contentSnippet || item.content || '',
                datum: item.pubDate ? new Date(item.pubDate) : new Date(),
                forras_id: forras.id,
                felhasznalo_id: forras.felhasznalo_id,
                is_private: forras.is_global ? false : true,
                jelentoz: jelentoz
            });
            feldolgozottCikkek++;
        }
        console.log(`- ${forras.forras_nev} RSS feldolgozva (${feldolgozottCikkek} cikk átnézve).`);
    };

    // A publikus API, amit visszaad
    return {
        osszesForrasFrissitese: async () => {
            // 1. Lekéri a forrásokat a repository-ból
            const forrasok = await services.hirRepo.getAktivForrasok();
            console.log(`${forrasok.length} aktív forrás ellenőrzése...`);

            for (const forras of forrasok) {
                try {
                    if (forras.tipus === 'RSS') {
                        await rssFeldolgozas(forras);
                    } else {
                        console.log(`A(z) ${forras.tipus} típusú források feldolgozása még nincs kész.`);
                    }

                    // 2. Sikeres frissítés nyugtázása
                    await services.hirRepo.updateUtolsoFrissites(forras.id);
                } catch (error) {
                    console.error(`Hiba a(z) ${forras.forras_nev} frissítésekor:`, error);
                }
            }
        }
    };
}