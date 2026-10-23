// src/lib/server/jelszoReset.ts
// Jelszó-visszaállító / jelszóbeállító link kiküldése – az "Elfelejtett jelszó" oldal és a Beállítások
// ("Jelszó beállítása" Google-lel regisztrált fiókhoz) is ezt használja.
import crypto from 'crypto';
import { services } from '$lib/server';
import { emailService } from '$lib/server/services/emailService';
import { logger } from '$lib/server/services/loggerService';

export const RESET_ERVENYESSEG_PERC = 60;
// Ugyanarra a fiókra legfeljebb ennyi időnként küldünk új levelet (spam védelem)
const UJRAKULDES_VARAKOZAS_MS = 2 * 60 * 1000;

export type ResetEredmeny = 'ELKULDVE' | 'NEMREG_KULDVE';

export async function jelszoResetLinkKuldese(
    user: { id: number; email: string; jelszo_reset_lejarat: Date | null },
    origin: string
): Promise<ResetEredmeny> {
    // Ha nemrég már küldtünk linket, nem küldünk újat
    const korabbiKeresIdeje = user.jelszo_reset_lejarat
        ? user.jelszo_reset_lejarat.getTime() - RESET_ERVENYESSEG_PERC * 60 * 1000
        : 0;
    if (Date.now() - korabbiKeresIdeje < UJRAKULDES_VARAKOZAS_MS) return 'NEMREG_KULDVE';

    // A nyers token csak az e-mailbe kerül, az adatbázisba a SHA-256 hash-e
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await services.db.felhasznalok.update({
        where: { id: user.id },
        data: {
            jelszo_reset_token: tokenHash,
            jelszo_reset_lejarat: new Date(Date.now() + RESET_ERVENYESSEG_PERC * 60 * 1000)
        }
    });

    await emailService.sendPasswordResetEmail(user.email, token, origin, RESET_ERVENYESSEG_PERC);
    await logger.info('PASSWORD_RESET_REQUEST', 'Jelszó-visszaállító / beállító link kiküldve', user.id);
    return 'ELKULDVE';
}
