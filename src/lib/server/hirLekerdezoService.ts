import { prisma } from '$lib/server/prisma';
import Parser from 'rss-parser';

const rssParser = new Parser();

export class HirLekerdezoService {
    /**
     * Végig megy az összes aktív hírforráson és frissíti a híreket.
     */
    static async osszesForrasFrissitese() {
        const forrasok = await prisma.hirForrasok.findMany({
            where: { aktiv: true }
        });

        console.log(`${forrasok.length} aktív forrás ellenőrzése folyamatban...`);

        for (const forras of forrasok) {
            try {
                switch (forras.tipus) {
                    case 'RSS':
                        await this.rssFeldolgozas(forras);
                        break;
                    case 'REDDIT':
                        console.log(`Reddit forrás (${forras.forras_nev}) - Implementálás alatt...`);
                        break;
                    case 'YOUTUBE':
                        console.log(`YouTube forrás (${forras.forras_nev}) - Implementálás alatt...`);
                        break;
                    default:
                        console.warn(`Ismeretlen forrástípus: ${forras.tipus}`);
                }
                
                // Frissíti az utolsó lekérdezés időpontját
                await prisma.hirForrasok.update({
                    where: { id: forras.id },
                    data: { utolso_frissites: new Date() }
                });

            } catch (error) {
                console.error(`Hiba a(z) ${forras.forras_nev} frissítésekor:`, error);
            }
        }
    }

    /**
     * RSS feed beolvasása és mentése
     */
    private static async rssFeldolgozas(forras: any) {
        const feed = await rssParser.parseURL(forras.forras_url);
        let ujHirekSzama = 0;

        for (const item of feed.items) {
            // Duplikáció ellenőrzése az URL alapján
            
            const mentettHir = await prisma.hirek.upsert({
                where: { url: item.link || '' },
                update: {}, // Nem frissíti a meglévőt
                create: {
                    cim: item.title || 'Nincs cím',
                    url: item.link,
                    tartalom: item.contentSnippet || item.content,
                    datum: item.pubDate ? new Date(item.pubDate) : new Date(),
                    forras_id: forras.id,
                    felhasznalo_id: forras.felhasznalo_id,
                    is_private: forras.is_global ? false : true,
                    jelentoz: false // Itt jöhet majd később az AI vagy kulcsszavas elemzés
                }
            });

            
        }
        console.log(`Sikeres RSS frissítés: ${forras.forras_nev}`);
    }
}