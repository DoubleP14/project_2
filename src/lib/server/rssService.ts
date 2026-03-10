import Parser from 'rss-parser';
import { prisma } from './prisma'; // Így a helyes

const parser = new Parser();

export async function feldolgozRssCikkeket(feedUrl: string, felhasznaloId: number | null) {
    try {
        // 1. RSS feedet
        const feed = await parser.parseURL(feedUrl);
        let ujHirekSzama = 0;

        // 2. feedben lévő cikkek
        for (const item of feed.items) {
            
            // 3. Ellenőrzés
            const letezoHir = await prisma.hirek.findFirst({
                where: { url: item.link }
            });

            // 4. Ha még nincs benne
            if (!letezoHir && item.title) {
                await prisma.hirek.create({
                    data: {
                        cim: item.title,
                        forras: feed.title || 'Ismeretlen forrás',
                        url: item.link || '',
                        tartalom: item.contentSnippet || item.content || '', // Ide jön a szöveg, amit az AI fog elemezni!
                        felhasznalo_id: felhasznaloId,
                        datum: item.pubDate ? new Date(item.pubDate) : new Date()
                    }
                });
                ujHirekSzama++;
            }
        }

        return { 
            success: true, 
            uzenet: `Sikeres feldolgozás: ${ujHirekSzama} új hír került az adatbázisba!` 
        };

    } catch (error) {
        console.error("Hiba az RSS letöltésekor:", error);
        return { 
            success: false, 
            uzenet: "Hiba történt a feed beolvasása közben. Ellenőrizd az URL-t!" 
        };
    }
}