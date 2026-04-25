// src/lib/server/modules/hirGyujtoModule.ts
import Parser from 'rss-parser';
import type { Services } from '../index'; 

const rssParser = new Parser();

export function createHirGyujtoModule(services: Services) {
    
    const rssFeldolgozas = async (forras: any) => {
        if (!forras.rss_url) {
            console.log(`Kihagyva: ${forras.forras_nev} (Nincs megadva RSS link az adatbázisban)`);
            return;
        }

        const feed = await rssParser.parseURL(forras.rss_url);
        let feldolgozottCikkek = 0;

        for (const item of feed.items) {
            const nyersUrl = item.link || '';
            const tisztaUrl = nyersUrl.split('?')[0];

            const cikkSzovege = (item.title + " " + item.contentSnippet).toLowerCase();
            const jelentoz = cikkSzovege.includes('válság') || cikkSzovege.includes('katasztrófa');

            // Megmenti az új cikket a Repository-n keresztül
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
        console.log(`- ${forras.forras_nev} RSS feldolgozva (${feldolgozottCikkek} cikk behúzva).`);
    };

    return {
        osszesForrasFrissitese: async () => {
            const forrasok = await services.hirRepo.getAktivForrasok();
            console.log(`\n${forrasok.length} aktív forrás ellenőrzése...`);

            for (const forras of forrasok) {
                try {
                    if (forras.tipus === 'RSS') {
                        await rssFeldolgozas(forras);
                    } else {
                        console.log(`A(z) ${forras.tipus} típusú források feldolgozása még nincs kész.`);
                    }
                    await services.hirRepo.updateUtolsoFrissites(forras.id);
                } catch (error) {
                    console.error(`Hiba a(z) ${forras.forras_nev} frissítésekor:`, error);
                }
            }
        }
    };
}