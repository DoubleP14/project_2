// src/lib/server/fiokTorles.ts
// Fiók végleges törlése e-mailes megerősítéssel (GDPR 17. cikk).
// A törlés gombja csak egy megerősítő linket küld; a fiók akkor törlődik, ha a tulajdonos az e-mailben kapott
// linkkel megerősíti. Így egy eltérített munkamenettel (pl. ellopott süti, nyitva hagyott gép) nem törölhető a fiók.
import crypto from 'crypto';
import { services } from '$lib/server';
import { emailService } from '$lib/server/services/emailService';
import { logger } from '$lib/server/services/loggerService';

export const TORLES_ERVENYESSEG_PERC = 60;
// Ugyanarra a fiókra legfeljebb ennyi időnként küldünk új levelet (spam védelem)
const UJRAKULDES_VARAKOZAS_MS = 2 * 60 * 1000;

// Az adatbázisba csak a token SHA-256 hash-e kerül, így egy adatbázis-szivárgásból sem lehet törlést indítani
export const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// A megerősítő oldalon a cím csak részben látszik (pl. pi•••@gmail.com), hogy a link továbbítása se fedje fel teljesen
export const reszlegesEmail = (email: string) => {
    const [nev, domain] = email.split('@');
    return `${nev.slice(0, 2)}•••@${domain}`;
};

export type TorlesKeresEredmeny = 'ELKULDVE' | 'NEMREG_KULDVE';

export async function torlesLinkKuldese(
    user: { id: number; email: string; fiok_torles_lejarat: Date | null },
    origin: string
): Promise<TorlesKeresEredmeny> {
    const korabbiKeresIdeje = user.fiok_torles_lejarat
        ? user.fiok_torles_lejarat.getTime() - TORLES_ERVENYESSEG_PERC * 60 * 1000
        : 0;
    if (Date.now() - korabbiKeresIdeje < UJRAKULDES_VARAKOZAS_MS) return 'NEMREG_KULDVE';

    const token = crypto.randomBytes(32).toString('hex');
    await services.db.felhasznalok.update({
        where: { id: user.id },
        data: {
            fiok_torles_token: tokenHash(token),
            fiok_torles_lejarat: new Date(Date.now() + TORLES_ERVENYESSEG_PERC * 60 * 1000)
        }
    });

    await emailService.sendAccountDeletionConfirmEmail(user.email, token, origin, TORLES_ERVENYESSEG_PERC);
    await logger.info('ACCOUNT_DELETE_REQUEST', 'Fióktörlés megerősítő link kiküldve', user.id);
    return 'ELKULDVE';
}

// Érvényes (nem lejárt) törlési tokenhez tartozó felhasználó
export async function felhasznaloTorlesTokennel(token: string | null | undefined) {
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
    return services.db.felhasznalok.findFirst({
        where: { fiok_torles_token: tokenHash(token), fiok_torles_lejarat: { gt: new Date() } },
        select: { id: true, email: true, username: true }
    });
}

// Egy tranzakcióban törlünk MINDEN személyes adatot (vagy semmit):
// - a felhasználó hírei (az AI elemzések kaszkádolva törlődnek)
// - a rendszernapló bejegyzései (pl. e-mail címet tartalmazó belépési naplók)
// - maga a fiók (források, kulcsszavak, értesítések kaszkádolva törlődnek)
// A Számlázz.hu-nál kiállított számlák a számviteli törvény miatt 8 évig megmaradnak (lásd adatkezelési tájékoztató).
export async function fiokVeglegesTorlese(userId: number) {
    await services.db.$transaction([
        services.db.hirek.deleteMany({ where: { felhasznalo_id: userId } }),
        services.db.rendszerNaplo.deleteMany({ where: { felhasznalo_id: userId } }),
        services.db.felhasznalok.delete({ where: { id: userId } }),
        // Anonim audit bejegyzés, személyes adat nélkül
        services.db.rendszerNaplo.create({
            data: { esemeny_tipus: 'ACCOUNT_DELETED', leiras: 'Egy felhasználói fiók és a hozzá tartozó adatok véglegesen törölve (GDPR), e-mailes megerősítés után.' }
        })
    ]);
}
