// src/lib/server/modules/hirGyujtoModule.ts
import Parser from 'rss-parser';
import type { Services } from '../index'; 
import { rawConfig } from '../index';

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

    // --- 2. TWITTER (X) VARÁZSLÓ ---
    const twitterFeldolgozas = async (forras: any) => {
        const usernameMatch = forras.forras_url.match(/twitter\.com\/([a-zA-Z0-9_]+)|x\.com\/([a-zA-Z0-9_]+)/);
        const username = usernameMatch ? (usernameMatch[1] || usernameMatch[2]) : null;

        if (!username) {
            console.log(`Hibás Twitter URL: ${forras.forras_url}`);
            return;
        }

        console.log(`[Twitter Híd] Tweetek lekérése innen: @${username}...`);

        const szerverek = [
            `https://nitter.poast.org/${username}/rss`,
            `https://nitter.privacydev.net/${username}/rss`,
            `https://rsshub.app/twitter/user/${username}`
        ];

        let sikeres = false;

        for (const url of szerverek) {
            if (sikeres) break;
            
            try {
                const ideiglenesForras = { ...forras, rss_url: url };
                await rssFeldolgozas(ideiglenesForras);
                
                sikeres = true; 
            } catch (error) {
                console.log(`  -> A ${url} kapu zárva, próbálkozás a következővel...`);
            }
        }

        if (!sikeres) {
            console.log(`[Twitter Híd] Sajnos jelenleg az összes ingyenes kapu blokkolva van @${username} számára.`);
        }
    };

    // --- 3. YOUTUBE VARÁZSLÓ (BYOK + Tisztító) ---
    // Kér egy második paramétert is, a felhasználó saját kulcsát!
    const youtubeFeldolgozas = async (forras: any, userYoutubeKey: string | null) => {
        //KULCSVÁLASZTÓ:
        // Ha van sajátja, azt használja (userYoutubeKey), ha nincs, akkor a rendszerét (.env)!
        const YOUTUBE_API_KEY = userYoutubeKey || rawConfig.youtube.apiKey; 
        
        if (!YOUTUBE_API_KEY) {
            console.log(`[YouTube API] Hiba: Nincs érvényes API kulcs a rendszerben!`);
            return;
        }

        let urlForChannelApi = '';
        
        // 1. Megnézi, milyen formátumú a link (modern @handle vagy régi /channel/ID)
        if (forras.forras_url.includes('@')) {
            const handle = forras.forras_url.split('@')[1].split('?')[0].split('/')[0];
            // Lekéri a csatornát a @név alapján:
            urlForChannelApi = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@${handle}&key=${YOUTUBE_API_KEY}`;
        } else if (forras.forras_url.includes('/channel/')) {
            const channelId = forras.forras_url.split('/channel/')[1].split('?')[0].split('/')[0];
            // Lekéri a csatornát az ID alapján:
            urlForChannelApi = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
        } else {
            console.log(`[YouTube API] Hiba: A linknek '@' jelet vagy '/channel/' részt kell tartalmaznia: ${forras.forras_url}`);
            return;
        }

        console.log(`[YouTube API] Csatorna adatainak lekérése a(z) ${forras.forras_nev} forráshoz...`);
        try {
            // 1: Megkérdezi a Google-t, hogy mi a hivatalos "Feltöltések" lista
            const channelResponse = await fetch(urlForChannelApi);
            const channelData = await channelResponse.json();

            if (channelData.error) throw new Error(channelData.error.message);
            if (!channelData.items || channelData.items.length === 0) {
                console.log(`[YouTube API] Nem található ilyen csatorna a Google szerint: ${forras.forras_url}`);
                return;
            }

            // Kinyeri a hivatalos Feltöltések listát 
            const playlistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

            // 2: Videók letöltése a listából
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
                    
                    const vagasiPontok = [
                        '🟪 Közös veled', 
                        'Közös veled', 
                        'Támogasd te is', 
                        'Partizán Alapítvány', 
                        'Iratkozz fel', 
                        'Kövess minket'
                    ];
                    
                    for (const pont of vagasiPontok) {
                        if (tisztaTartalom.includes(pont)) {
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
            
            // --- BYOK: KULCSOK LEKÉRÉSE AZ ADATBÁZISBÓL ---
            const userKulcsok = await services.hirRepo.getFelhasznaloKulcsok(userId);
            const userYoutubeKey = userKulcsok?.youtube_api_key || null;

            console.log(`\n${forrasok.length} saját forrás ellenőrzése a(z) ${userId}. felhasználónak...`);

            for (const forras of forrasok) {
                try {
                    // AZ OKOS ELÁGAZÁS (ROBOTPILÓTA)
                    if (forras.tipus === 'RSS') {
                        await rssFeldolgozas(forras);
                    } else if (forras.tipus === 'TWITTER') {
                        await twitterFeldolgozas(forras);
                    } else if (forras.tipus === 'YOUTUBE') {
                        // ITT ADJA ÁT A PRIVÁT KULCSOT 
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