// src/routes/admin/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { services } from '$lib/server/index';
import { jobs } from '$lib/server/jobs';
import { logger } from '$lib/server/services/loggerService';

export async function load({ locals }) {
    const user = locals.user;

    // 1. Biztonsági ellenőrzés
    if (!user || user.role !== 'admin') {
        throw redirect(303, '/'); 
    }

    // 2. Felhasználók lekérése
    const felhasznalok = await services.db.felhasznalok.findMany({
        orderBy: { regisztracio_datuma: 'desc' },
        include: {
            _count: { select: { hir_forrasok: true, hirek: true, ertesitesek: true } }
        }
    });

    const tisztaFelhasznalok = felhasznalok.map((f: typeof felhasznalok[number]) => {
        // Titkok, tokenek és titkosított adatok nem kerülnek a böngészőbe (az adminéba sem)
        const {
            password_hash, api_key, youtube_api_key, discord_webhook, telegram_chat_id,
            verification_token, jelszo_reset_token, jelszo_reset_lejarat, google_id, token_verzio,
            ...biztonsagosAdatok
        } = f;
        return { ...biztonsagosAdatok, googleOsszekapcsolva: !!google_id };
    });

    // --- 3. Globális Rendszer Statisztikák ---
    const statisztikak = {
        osszesForras: await services.db.hirForrasok.count(),
        osszesHir: await services.db.hirek.count(),
        aiElemzesek: await services.db.aiElemzesek.count(),
    };

    // Figyelmet igénylő források: hibásak, vagy a rendszer/admin által kikapcsoltak
    const hibasForrasok = await services.db.hirForrasok.findMany({
        where: { OR: [{ hiba_szamlalo: { gt: 0 } }, { kikapcsolas_oka: { not: null } }] },
        orderBy: { hiba_szamlalo: 'desc' },
        include: { felhasznalo: { select: { username: true, email: true } } }
    });

    // A legutóbbi 15 rendszerüzenet lekérése
    const naplok = await services.db.rendszerNaplo.findMany({
        take: 15,
        orderBy: { letrehozva: 'desc' }, // <-- A TE MEZŐD!
        include: { felhasznalo: { select: { username: true } } }
    });

    return {
        adminFelhasznalok: tisztaFelhasznalok,
        statisztikak: statisztikak,
        naplok: naplok, 
        hibasForrasok: hibasForrasok,
        frissitesFolyamatban: jobs.isFrissitesFolyamatban()
    };
}

export const actions = {
    // Ez a függvény fut le, amikor az Admin átkattintja a Toggle-t
    toggleUserStatus: async ({ request, locals }) => {
        // Biztonsági ellenőrzés ismét! (Hátha valaki API-n keresztül próbálkozik)
        if (!locals.user || locals.user.role !== 'admin') {
            return { success: false, message: 'Nincs jogosultságod ehhez a művelethez!' };
        }

        const data = await request.formData();
        const userId = parseInt(data.get('userId') as string);

        if (!userId) return { success: false, message: 'Hibás felhasználó ID' };

        // 1. Lekéri a jelenlegi állapotot
        const currentUser = await services.db.felhasznalok.findUnique({
            where: { id: userId },
            select: { aktiv: true, role: true }
        });

        if (!currentUser) return { success: false, message: 'Felhasználó nem található!' };
        
        // Extra védelem: Az Admin ne tudja letiltani saját magát véletlenül!
        if (currentUser.role === 'admin' && locals.user.id === userId) {
            return { success: false, message: 'Saját magadat nem tilthatod le!' };
        }

        // 2. Megfordítja (Toggle) és elmentjük az adatbázisba
        await services.db.felhasznalok.update({
            where: { id: userId },
            data: { aktiv: !currentUser.aktiv }
        });

        // Felfüggesztés / visszaállítás naplózása (ki, kit) – az érintett felhasználóhoz kötve
        await logger.info(
            currentUser.aktiv ? 'ADMIN_USER_SUSPEND' : 'ADMIN_USER_REACTIVATE',
            `Fiók ${currentUser.aktiv ? 'felfüggesztve' : 'visszaállítva'} adminisztrátor által (admin: #${locals.user.id})`,
            userId
        );

        return { success: true, message: currentUser.aktiv ? 'Felhasználó felfüggesztve.' : 'Felhasználó visszaállítva.' };
    },

    // --- HÍRFORRÁS KI/BEKAPCSOLÁSA ADMINISZTRÁTORKÉNT (szerkesztés és törlés nélkül, naplózva) ---
    toggleSourceAdmin: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { message: 'Nincs jogosultságod ehhez a művelethez!' });
        }

        const id = Number((await request.formData()).get('id'));
        const forras = await services.db.hirForrasok.findUnique({ where: { id } });
        if (!forras) return fail(404, { message: 'A forrás nem található.' });

        // Ha aktív (vagy más okból inaktív) -> admin kikapcsolás; ha admin kapcsolta ki -> visszakapcsolás tiszta lappal
        const visszakapcsolas = forras.kikapcsolas_oka === 'ADMIN';
        await services.db.hirForrasok.update({
            where: { id },
            data: visszakapcsolas
                ? { aktiv: true, kikapcsolas_oka: null, hiba_szamlalo: 0, utolso_hiba: null }
                : { aktiv: false, kikapcsolas_oka: 'ADMIN' }
        });

        await logger.info(
            visszakapcsolas ? 'ADMIN_FORRAS_BEKAPCSOLAS' : 'ADMIN_FORRAS_KIKAPCSOLAS',
            `A(z) ${forras.forras_nev ?? forras.forras_url} forrás ${visszakapcsolas ? 'visszakapcsolva' : 'kikapcsolva'} adminisztrátor által (admin: #${locals.user.id})`,
            forras.felhasznalo_id
        );

        return { success: true, message: visszakapcsolas ? 'Forrás visszakapcsolva.' : 'Forrás kikapcsolva. A tulajdonos a forráslistájában látja, hogy adminisztrátor kapcsolta ki.' };
    },

    // --- KÉZI TELJES FRISSÍTÉS (minden aktív felhasználó hírei + AI elemzés) ---
    runSync: async ({ locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { message: 'Nincs jogosultságod ehhez a művelethez!' });
        }
        if (jobs.isFrissitesFolyamatban()) {
            return fail(423, { message: 'A frissítés már folyamatban van a háttérben...' });
        }

        await logger.info('ADMIN_SYNC', 'Kézi teljes frissítés indítva az Admin felületről', locals.user.id);

        // Nem várjuk meg: felhasználónként több perc is lehet (AI kvóta szünetek),
        // az eredmény a Rendszernaplóban jelenik meg
        jobs.teljesFrissites('ADMIN').catch((error) => console.error('[ADMIN] Frissítési hiba:', error));

        return { success: true, message: 'A teljes frissítés elindult a háttérben. Az eredmény a Rendszernaplóban jelenik meg.' };
    },

    // --- RÉGI HÍREK VÉGLEGES TÖRLÉSE (azonnal, az éjszakai takarítással azonos logika) ---
    runCleanup: async ({ locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { message: 'Nincs jogosultságod ehhez a művelethez!' });
        }

        try {
            const torolt = await jobs.regiHirekTorlese('ADMIN');
            return { success: true, message: `Takarítás kész: ${torolt} db 7 napnál régebbi hír véglegesen törölve.` };
        } catch (error) {
            console.error('[ADMIN] Hiba a takarítás során:', error);
            return fail(500, { message: 'Hiba történt a régi hírek törlése során.' });
        }
    }
};