// src/lib/server/services/mailer.ts
// Központi levélküldő: minden e-mail (regisztráció, jelszó visszaállítás, riasztás) ezen keresztül megy ki.
//
// Két szállítási mód:
//  1. RESEND_API_KEY megadva  -> HTTPS API (Resend). Felhős szervereken (pl. DigitalOcean) a kimenő
//     SMTP portok (25/465/587) le vannak tiltva, ezért élesben ez az ajánlott mód.
//  2. Egyébként               -> klasszikus SMTP (nodemailer), pl. helyi fejlesztéshez Gmaillel.
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '$env/dynamic/private';

export type Level = { to: string; subject: string; html: string };

// Feladó: MAIL_FROM (pl. "News Trends <ertesites@newstrends.hu>"), ennek hiányában az SMTP felhasználó
const felado = () => env.MAIL_FROM || `"News Trends" <${env.SMTP_USER}>`;

export const levelkuldesBeallitva = () => !!env.RESEND_API_KEY || (!!env.SMTP_USER && !!env.SMTP_PASS);

// --- 1. HTTPS API (Resend) ---
const resendKuldes = async (level: Level) => {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: felado(), to: [level.to], subject: level.subject, html: level.html })
    });

    if (!response.ok) {
        throw new Error(`Resend API hiba (${response.status}): ${await response.text()}`);
    }
};

// --- 2. SMTP (nodemailer) – lustán létrehozott kapcsolat ---
let smtpTransporter: Transporter | null = null;
const smtpKuldes = async (level: Level) => {
    if (!smtpTransporter) {
        const port = Number(env.SMTP_PORT) || 587;
        smtpTransporter = nodemailer.createTransport({
            host: env.SMTP_HOST || 'smtp.gmail.com',
            port,
            secure: port === 465, // 465: SSL, 587: STARTTLS
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
        });
    }
    await smtpTransporter.sendMail({ from: felado(), ...level });
};

export async function levelKuldese(level: Level) {
    if (env.RESEND_API_KEY) {
        await resendKuldes(level);
    } else {
        await smtpKuldes(level);
    }
}
