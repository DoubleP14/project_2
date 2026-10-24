// src/lib/server/modules/hirGyujtoModule.ts
import { csatornaLetoltese } from '../rssLetolto';
import type { Services } from '../index'; 
import { rawConfig } from '../index';
import { decrypt } from '../crypto';
import { emailService } from '../services/emailService';

// Ennyi egymás utáni sikertelen frissítés után (óránkénti futásnál kb. 1 nap) a forrás automatikusan kikapcsol
const AUTO_KIKAPCSOLASI_KUSZOB = 24;

export function createHirGyujtoModule(services: Services) {

    // --- 1. RSS FELDOLGOZÓ ---
    const rssFeldolgozas = async (forras: any) => {
        if (!forras.rss_url) {
            throw new Error('Nincs megadva RSS link – szerkeszd a forrást, és add meg a hírportál RSS címét.');
        }

        // Közös, gyorsítótárazott letöltés: ugyanazt a csatornát egy futáson belül csak egyszer kérjük le
        const feed = await csatornaLetoltese(forras.rss_url);
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
            throw new Error(`Nincs érvényes YouTube API kulcs a rendszerben!`);
        }

        let urlForChannelApi = '';
        
        if (forras.forras_url.includes('@')) {
            const handle = forras.forras_url.split('@')[1].split('?')[0].split('/')[0];
            urlForChannelApi = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@${handle}&key=${YOUTUBE_API_KEY}`;
        } else if (forras.forras_url.includes('/channel/')) {
            const channelId = forras.forras_url.split('/channel/')[1].split('?')[0].split('/')[0];
            urlForChannelApi = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
        } else {
            throw new Error(`A linknek '@' jelet vagy '/channel/' részt kell tartalmaznia.`);
        }

        console.log(`[YouTube API] Csatorna adatainak lekérése a(z) ${forras.forras_nev} forráshoz...`);
        try {
            const channelResponse = await fetch(urlForChannelApi);
            const channelData = await channelResponse.json();

            if (channelData.error) throw new Error(channelData.error.message);
            if (!channelData.items || channelData.items.length === 0) {
                throw new Error(`Nem található ilyen csatorna a Google szerint.`);
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
            throw error;
        }
    };

    return {
        osszesForrasFrissitese: async (userId: number) => {
            let forrasok = await services.hirRepo.getAktivForrasok();
            forrasok = forrasok
                .filter((forras: any) => forras.felhasznalo_id === userId)
                .sort((a: any, b: any) => a.id - b.id);

            // CSOMAGKORLÁT: Starter csomagban csak az első 3 RSS forrás frissül
            // (pl. ha a felhasználó Pro csomagról visszaváltott, de maradtak aktív forrásai)
            const csomag = await services.db.felhasznalok.findUnique({ where: { id: userId }, select: { subscription_tier: true, role: true } });
            if (csomag?.role !== 'admin' && csomag?.subscription_tier !== 'pro' && csomag?.subscription_tier !== 'enterprise') {
                forrasok = forrasok.filter((forras: any) => forras.tipus === 'RSS').slice(0, 3);
            }

            const userKulcsok = await services.hirRepo.getFelhasznaloKulcsok(userId);
            const userYoutubeKey = userKulcsok?.youtube_api_key ? decrypt(userKulcsok.youtube_api_key) : null;

            console.log(`\n${forrasok.length} saját forrás ellenőrzése a(z) ${userId}. felhasználónak...`);

            for (const forras of forrasok) {
                try {
                    if (forras.tipus === 'RSS') {
                        await rssFeldolgozas(forras);
                    } else if (forras.tipus === 'YOUTUBE') {
                        await youtubeFeldolgozas(forras, userYoutubeKey);
                    } else {
                        throw new Error(`Ismeretlen forrás típus: ${forras.tipus}`);
                    }
                    
                    // SIKERES LEFUTÁS: Nullázza a hiba számlálót és frissíti a dátumot!
                    await services.db.hirForrasok.update({
                        where: { id: forras.id },
                        data: { 
                            hiba_szamlalo: 0, 
                            utolso_hiba: null,
                            utolso_frissites: new Date()
                        }
                    });

                } catch (error) {
                    console.error(`Hiba a(z) ${forras.forras_nev} frissítésekor:`, error instanceof Error ? error.message : error);
                    
                    const hibaUzenet = error instanceof Error ? error.message : 'Ismeretlen hiba';

                    // HIBA TÖRTÉNT: Növeli a számlálót, hogy a felhasználó és az admin is lássa
                    const frissitett = await services.db.hirForrasok.update({
                        where: { id: forras.id },
                        data: {
                            hiba_szamlalo: { increment: 1 },
                            utolso_hiba: hibaUzenet
                        }
                    });

                    // AUTOMATIKUS LEÁLLÍTÁS (circuit breaker): tartósan hibás forrást nem próbálunk a végtelenségig
                    if (frissitett.hiba_szamlalo >= AUTO_KIKAPCSOLASI_KUSZOB) {
                        await services.db.hirForrasok.update({
                            where: { id: forras.id },
                            data: { aktiv: false, kikapcsolas_oka: 'AUTO' }
                        });
                        await services.db.rendszerNaplo.create({
                            data: {
                                esemeny_tipus: 'FORRAS_AUTO_KIKAPCSOLVA',
                                leiras: `A(z) ${forras.forras_nev} forrás ${AUTO_KIKAPCSOLASI_KUSZOB} egymás utáni hiba után automatikusan kikapcsolva. Utolsó hiba: ${hibaUzenet.substring(0, 150)}`,
                                felhasznalo_id: userId
                            }
                        });

                        // A tulajdonos e-mailben értesül (ha a küldés nem sikerül, a leállítás akkor is érvényes)
                        const tulajdonos = await services.db.felhasznalok.findUnique({ where: { id: userId }, select: { email: true } });
                        if (tulajdonos) {
                            await emailService.sendForrasKikapcsolvaEmail(tulajdonos.email, forras.forras_nev ?? forras.forras_url, hibaUzenet)
                                .catch((e) => console.error('Nem sikerült elküldeni a forrás kikapcsolási értesítőt:', e));
                        }
                    }

                    // Naplózza a rendszer naplóba is
                    await services.db.rendszerNaplo.create({
                        data: { 
                            esemeny_tipus: 'FORRAS_HIBA', 
                            leiras: `Hiba a(z) ${forras.forras_nev} forrásnál: ${error instanceof Error ? error.message : 'Ismeretlen'}`,
                            felhasznalo_id: userId
                        }
                    });
                }
            }
        }
    };
}