// src/lib/server/crypto.ts
import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// Algoritmus és a titkosító kulcs generálása a .env fájlból
const algorithm = 'aes-256-cbc';
const secretKey = crypto.scryptSync(env.ENCRYPTION_KEY || 'default_fallback_secret', 'salty_string', 32);

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16); // Random inicializáló vektor (IV)
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Eltárolja az IV-t és a titkosított szöveget is, kettősponttal elválasztva
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(hash: string): string {
    try {
        const parts = hash.split(':');
        const iv = Buffer.from(parts.shift() as string, 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
        let decrypted = decipher.update(encryptedText, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Hiba a dekódolás során (Lehet, hogy változott az ENCRYPTION_KEY?)");
        return "";
    }
}