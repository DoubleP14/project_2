// src/lib/server/services/emailService.ts
import { levelKuldese } from './mailer';

// Közös, egygombos e-mail sablon (regisztráció megerősítés, jelszó visszaállítás)
const gombosEmailSablon = (cim: string, bevezeto: string, gombSzoveg: string, url: string, megjegyzes: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
        <p style="text-align: center; font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 24px 0;">News <span style="color: #2563eb;">Trends</span></p>
        <h2 style="color: #0f172a; text-align: center; margin-bottom: 20px;">${cim}</h2>
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5;">${bevezeto}</p>

        <div style="text-align: center; margin: 35px 0;">
            <a href="${url}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
                ${gombSzoveg}
            </a>
        </div>

        <p style="color: #71717a; font-size: 13px; line-height: 1.5;">${megjegyzes}</p>
        <p style="color: #71717a; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f4f4f5;">
            Ha a gomb nem működik, másold be ezt a linket a böngésződbe:<br>
            <a href="${url}" style="color: #2563eb; word-break: break-all;">${url}</a>
        </p>
    </div>
`;

export const emailService = {
    sendVerificationEmail: async (email: string, token: string, origin: string) => {
        // Legenerálja a linket, amire a felhasználónak rá kell kattintania az emailben
        const verifyUrl = `${origin}/api/auth/verify?token=${token}`;

        await levelKuldese({
            to: email,
            subject: '📧 Regisztráció megerősítése - News Trends',
            html: gombosEmailSablon(
                'Üdvözlünk a News Trends rendszerében!',
                'Köszönjük, hogy regisztráltál! A fiókod aktiválásához és a belépéshez kérjük, kattints az alábbi gombra:',
                'Fiók aktiválása',
                verifyUrl,
                'Ha nem te regisztráltál, nyugodtan hagyd figyelmen kívül ezt a levelet.'
            )
        });
    },

    sendPasswordResetEmail: async (email: string, token: string, origin: string, ervenyessegPerc: number) => {
        const resetUrl = `${origin}/reset-password?token=${token}`;

        await levelKuldese({
            to: email,
            subject: '🔑 Jelszó visszaállítása - News Trends',
            html: gombosEmailSablon(
                'Jelszó visszaállítása',
                'Jelszó-visszaállítást kértek a fiókodhoz. Új jelszót az alábbi gombra kattintva állíthatsz be:',
                'Új jelszó beállítása',
                resetUrl,
                `A link ${ervenyessegPerc} percig érvényes, és csak egyszer használható fel. Ha nem te kérted, hagyd figyelmen kívül ezt a levelet – a jelszavad nem változik.`
            )
        });
    }
};
