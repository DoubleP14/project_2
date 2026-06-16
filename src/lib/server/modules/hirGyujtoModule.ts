// src/lib/server/modules/hirGyujtoModule.ts
import Parser from 'rss-parser';
import type { Services } from '../index'; 
import { rawConfig } from '../index';
import { decrypt } from '../crypto'; 

// Chrome böngészőnek hazudja a robotot, hogy ne tiltsa le a 403-as hibával
const rssParser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
    }
});

export function createHirGyujtoModule(services: Services) {
    
    // --- 1. RSS FELDOLGOZÓ ---
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

            const cikkSzovege = (item.title + " " + (item.contentSnippet || "")).toLowerCase();
            const jelentoz = cikkSzovege.includes('válság') || cikkSzovege.includes('katasztrófa');

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
        console.log(`- ${forras.forras_nev} feldolgozva (${feldolgozottCikkek} cikk/poszt behúzva).`);
    };

    // --- 2. YOUTUBE VARÁZSLÓ (BYOK + Tisztító) ---
    const youtubeFeldolgozas = async (forras: any, userYoutubeKey: string | null) => {
        const YOUTUBE_API_KEY = userYoutubeKey || rawConfig.youtube.apiKey; 
        
        if (!YOUTUBE_API_KEY) {
            console.log(`[YouTube API] Hiba: Nincs érvényes API kulcs a rendszerben!`);
            return;
        }

        let urlForChannelApi = '';
        
        if (forras.forras_url.includes('@')) {
            const handle = forras.forras_url.split('@')[1].split('?')[0].split('/')[0];
            urlForChannelApi = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@${handle}&key=${YOUTUBE_API_KEY}`;
        } else if (forras.forras_url.includes('/channel/')) {
            const channelId = forras.forras_url.split('/channel/')[1].split('?')[0].split('/')[0];
            urlForChannelApi = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
        } else {
            console.log(`[YouTube API] Hiba: A linknek '@' jelet vagy '/channel/' részt kell tartalmaznia: ${forras.forras_url}`);
            return;
        }

        console.log(`[YouTube API] Csatorna adatainak lekérése a(z) ${forras.forras_nev} forráshoz...`);
        try {
            const channelResponse = await fetch(urlForChannelApi);
            const channelData = await channelResponse.json();

            if (channelData.error) throw new Error(channelData.error.message);
            if (!channelData.items || channelData.items.length === 0) {
                console.log(`[YouTube API] Nem található ilyen csatorna a Google szerint: ${forras.forras_url}`);
                return;
            }

            const playlistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=5&key=${YOUTUBE_API_KEY}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error.message);

            let feldolgozott = 0;
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    const videoId = item.snippet.resourceId.videoId;
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    
                    // --- TARTALOM TISZTÍTÁSA ---
                    let tisztaTartalom = item.snippet.description || "";
                    
                    // Alapértelmezett vágópontok
                    let vagasiPontok = [
                        '🟪 Közös veled', 
                        'Közös veled', 
                        'Támogasd te is', 
                        'Partizán Alapítvány', 
                        'Iratkozz fel', 
                        'Kövess minket'
                    ];
                    
                    // Ha a felhasználó megadott egyedi szűrőket ehhez a forráshoz, akkor azokat használja!
                    if (forras.szuro_kifejezesek) {
                        vagasiPontok = forras.szuro_kifejezesek.split(',').map((szo: string) => szo.trim());
                    }
                    
                    for (const pont of vagasiPontok) {
                        if (pont && tisztaTartalom.includes(pont)) {
                            tisztaTartalom = tisztaTartalom.split(pont)[0].trim();
                        }
                    }
                    
                    if (tisztaTartalom.length === 0) {
                        tisztaTartalom = "Videó riport: " + item.snippet.title;
                    }
                    
                    const cikkSzovege = (item.snippet.title + " " + tisztaTartalom).toLowerCase();
                    const jelentoz = cikkSzovege.includes('válság') || cikkSzovege.includes('katasztrófa');

                    await services.hirRepo.hirMenteseHaUj({
                        cim: item.snippet.title,
                        url: videoUrl,
                        tartalom: tisztaTartalom, 
                        datum: new Date(item.snippet.publishedAt),
                        forras_id: forras.id,
                        felhasznalo_id: forras.felhasznalo_id,
                        is_private: forras.is_global ? false : true,
                        jelentoz: jelentoz
                    });
                    feldolgozott++;
                }
            }
            console.log(`- ${forras.forras_nev} feldolgozva (${feldolgozott} videó behúzva).`);
        } catch (error) {
            console.error(`Hiba a(z) ${forras.forras_nev} frissítésekor:`, error instanceof Error ? error.message : error);
        }
    };

    return {
        osszesForrasFrissitese: async (userId: number) => {
            let forrasok = await services.hirRepo.getAktivForrasok();
            forrasok = forrasok.filter((forras: any) => forras.felhasznalo_id === userId);
            
            const userKulcsok = await services.hirRepo.getFelhasznaloKulcsok(userId);
            
            const userYoutubeKey = userKulcsok?.youtube_api_key ? decrypt(userKulcsok.youtube_api_key) : null;

            console.log(`\n${forrasok.length} saját forrás ellenőrzése a(z) ${userId}. felhasználónak...`);

            for (const forras of forrasok) {
                try {
                    if (forras.tipus === 'RSS') {
                        await rssFeldolgozas(forras);
                    } else if (forras.tipus === 'YOUTUBE') {
                        // Itt adjuk át a már megfejtett, tiszta kulcsot
                        await youtubeFeldolgozas(forras, userYoutubeKey);
                    } else {
                        console.log(`Ismeretlen forrás típus: ${forras.tipus}`);
                    }
                    
                    await services.hirRepo.updateUtolsoFrissites(forras.id);
                } catch (error) {
                    console.error(`Hiba a(z) ${forras.forras_nev} frissítésekor:`, error instanceof Error ? error.message : error);
                }
            }
        }
    };
}