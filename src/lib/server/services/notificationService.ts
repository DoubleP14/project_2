// src/lib/server/services/notificationService.ts
import type { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
// ÚJ: Behozzuk a decrypt függvényt a visszafejtéshez
import { decrypt } from "../crypto";

export function createNotificationService(prisma: PrismaClient) {
    
    // --- SEGÉDFÜGGVÉNY: TrustScore formázása ---
    const getTrustScoreKinezet = (score?: number) => {
        const num = score || 0;
        if (num <= 30) return { emoji: '🔴', label: 'Alacsony (Clickbait)', szinHex: '#ef4444' }; // Piros
        if (num <= 70) return { emoji: '🟡', label: 'Normál', szinHex: '#eab308' };              // Sárga
        return { emoji: '🟢', label: 'Kiemelkedő (Fontos!)', szinHex: '#22c55e' };               // Zöld
    };

    // --- SEGÉDFÜGGVÉNY: Biztonságos visszafejtés (Plain Text / Ciphertext hibrid kezelés) ---
    const biztonsagosVisszafejtes = (szoveg: string | null): string => {
        if (!szoveg) return "";
        try {
            return decrypt(szoveg);
        } catch (e) {
            // Ha a decrypt hibát dob, az azt jelenti, hogy a string nem titkosított.
            // Ekkor visszaadja az eredeti szöveget, így nem áll le hibával a szerver!
            return szoveg;
        }
    };

    // --- 1. Discord Webhook Helper ---
    const sendDiscordWebhook = async (webhookUrl: string, hirAdatok: any) => {
        let szin = 8421504; 
        if (hirAdatok.hangulat === 'POZITIV') szin = 5763719; 
        if (hirAdatok.hangulat === 'NEGATIV') szin = 15548997; 

        const ts = getTrustScoreKinezet(hirAdatok.pontszam);

        const payload = {
            content: "🔔 **Új, releváns tartalom detektálva!**",
            embeds: [{
                title: hirAdatok.cim,
                description: `**Hírérték (TrustScore):** ${ts.emoji} **${hirAdatok.pontszam || 0}/100** - *${ts.label}*\n\n**Összefoglaló:**\n${hirAdatok.osszefoglalo || "Nincs elérhető összefoglaló."}`,
                url: hirAdatok.url || "https://gamer365.hu",
                color: szin,
                footer: {
                    text: `AI Hangulat: ${hirAdatok.hangulat || 'Ismeretlen'} | Hírfigyelő Rendszer`
                },
                timestamp: new Date().toISOString()
            }]
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Discord API Hiba: ${response.status} ${response.statusText}`);
        }
        return true;
    };

    // --- 2. E-mail Küldő Helper ---
    const sendEmailNotification = async (toEmail: string, hirAdatok: any) => {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, 
            auth: {
                user: process.env.SMTP_USER, 
                pass: process.env.SMTP_PASS, 
            },
        });

        const ts = getTrustScoreKinezet(hirAdatok.pontszam);

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">🔔 Új tartalom detektálva</h2>
                <h3 style="color: #1e293b; margin-top: 20px;">${hirAdatok.cim}</h3>
                
                <div style="background: #f8fafc; padding: 15px; border-left: 4px solid ${ts.szinHex}; border-radius: 4px; margin-bottom: 15px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px;">
                        <strong>Hírérték (TrustScore):</strong> 
                        <span style="color: ${ts.szinHex}; font-weight: bold; font-size: 18px;">${ts.emoji} ${hirAdatok.pontszam || 0}/100</span> 
                        <span style="color: #64748b; font-size: 14px;">(${ts.label})</span>
                    </p>
                    <p style="margin: 0;">
                        <strong>AI Hangulat:</strong> ${hirAdatok.hangulat || "SEMLEGES"}
                    </p>
                </div>

                <p>
                    <strong>AI Összefoglaló:</strong><br/>
                    ${hirAdatok.osszefoglalo || "Nincs elérhető összefoglaló."}
                </p>
                
                <div style="margin-top: 30px;">
                    <a href="${hirAdatok.url || 'https://444.hu'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Cikk megnyitása
                    </a>
                </div>
                <hr style="margin-top: 40px; border: 0; border-top: 1px solid #e2e8f0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center;">Ezt az automatikus értesítést a Hírfigyelő AI küldte.</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"Hírfigyelő AI" <${process.env.SMTP_USER}>`,
            to: toEmail, 
            subject: `Riasztás [TS: ${hirAdatok.pontszam || 0}]: ${hirAdatok.cim}`,
            html: htmlContent,
        });

        return true;
    };

    // --- 3. Telegram Bot Helper ---
    const sendTelegramMessage = async (botToken: string, chatId: string, hirAdatok: any) => {
        let hangulatEmoji = "⚪";
        if (hirAdatok.hangulat === 'POZITIV') hangulatEmoji = "🟢";
        if (hirAdatok.hangulat === 'NEGATIV') hangulatEmoji = "🔴";

        const ts = getTrustScoreKinezet(hirAdatok.pontszam);

        const text = `🔔 *Új releváns tartalom!*\n\n*${hirAdatok.cim}*\n\n*TrustScore:* ${ts.emoji} *${hirAdatok.pontszam || 0}/100*\n_${ts.label}_\n\n*AI Összefoglaló:*\n${hirAdatok.osszefoglalo || "Nincs összefoglaló."}\n\n*AI Hangulat:* ${hangulatEmoji} ${hirAdatok.hangulat || "SEMLEGES"}\n\n🔗 [Cikk megnyitása](${hirAdatok.url || 'https://444.hu'})`;

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            throw new Error(`Telegram API Hiba: ${response.status}`);
        }
        return true;
    };

    // --- 4. A fő funkció, amit a rendszer meghív ---
    return {
        ertesitesKuldese: async (felhasznaloId: number, hirId: number, hirAdatok: any) => {
            const user = await prisma.felhasznalok.findUnique({
                where: { id: felhasznaloId },
                select: { preferalt_csatorna: true, discord_webhook: true, email: true, telegram_chat_id: true }
            });

            if (!user) return false;

            let sikeres = false;
            let uzenetLog = "Értesítés elküldve";

            try {
                if (user.preferalt_csatorna === 'DISCORD' && user.discord_webhook) {
                    // JAVÍTÁS: Intelligens visszafejtés használat előtt (nyílt szövegre is felkészítve)
                    const tisztaWebhook = biztonsagosVisszafejtes(user.discord_webhook);
                    await sendDiscordWebhook(tisztaWebhook, hirAdatok);
                    sikeres = true;
                } else if (user.preferalt_csatorna === 'EMAIL' && user.email) {
                    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                        uzenetLog = "Hiba: Az SMTP_USER vagy SMTP_PASS nincs beállítva a .env-ben!";
                    } else {
                        await sendEmailNotification(user.email, hirAdatok);
                        sikeres = true;
                    }
                } else if (user.preferalt_csatorna === 'TELEGRAM' && user.telegram_chat_id) {
                    if (!process.env.TELEGRAM_BOT_TOKEN) {
                        uzenetLog = "Hiba: A TELEGRAM_BOT_TOKEN nincs beállítva a .env fájlban!";
                        console.error("[Notification Service]", uzenetLog);
                    } else {
                        // JAVÍTÁS: Intelligens visszafejtés használat előtt (nyílt szövegre is felkészítve)
                        const tisztaChatId = biztonsagosVisszafejtes(user.telegram_chat_id);
                        await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, tisztaChatId, hirAdatok);
                        sikeres = true;
                    }
                } else if (user.preferalt_csatorna === 'DISCORD' && !user.discord_webhook) {
                    uzenetLog = "Hiba: Nincs megadva Discord Webhook URL a beállításokban.";
                } else {
                    uzenetLog = `Riasztás ignorálva: A kiválasztott csatorna (${user.preferalt_csatorna}) adatai hiányoznak a profilból.`;
                }
            } catch (error) {
                sikeres = false;
                uzenetLog = `Hiba történt a küldéskor: ${error instanceof Error ? error.message : 'Ismeretlen hálózati hiba'}`;
                console.error("[Notification Service] Hiba:", error);
            }

            await prisma.ertesitesek.create({
                data: {
                    felhasznalo_id: felhasznaloId,
                    hir_id: hirId,
                    csatorna: user.preferalt_csatorna,
                    uzenet: uzenetLog,
                    sikeres: sikeres
                }
            });

            return sikeres;
        }
    };
}