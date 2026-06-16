// src/lib/server/services/emailService.ts
import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } from '$env/static/private';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false, // 587-es porthoz false kell
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

export const emailService = {
    sendVerificationEmail: async (email: string, token: string, origin: string) => {
        // Legenerálja a linket, amire a felhasználónak rá kell kattintania az emailben
        const verifyUrl = `${origin}/api/auth/verify?token=${token}`;
        
        const mailOptions = {
            from: `"Hírfigyelő AI" <${SMTP_USER}>`,
            to: email,
            subject: '📧 Regisztráció megerősítése - Hírfigyelő AI',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
                    <h2 style="color: #7c3aed; text-align: center; margin-bottom: 20px;">Üdvözlünk a Hírfigyelő AI-nál!</h2>
                    <p style="color: #3f3f46; font-size: 16px; line-height: 1.5;">Köszönjük, hogy regisztráltál a rendszerünkbe! A fiókod aktiválásához és a belépéshez kérjük, kattints az alábbi gombra:</p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${verifyUrl}" style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.4);">
                            Fiók Aktiválása
                        </a>
                    </div>
                    
                    <p style="color: #71717a; font-size: 13px; text-align: center; margin-top: 30px; border-top: 1px solid #f4f4f5; pt: 20px;">
                        Ha a gomb nem működik, másold be ezt a linket a böngésződbe:<br>
                        <a href="${verifyUrl}" style="color: #7c3aed;">${verifyUrl}</a>
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
    }
};