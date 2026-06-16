import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { services } from '$lib/server'; // Database connection
import crypto from 'crypto'; // Titkos aktiváló kód generálása
import { emailService } from '$lib/server/services/emailService'; // Email küldő szolgáltatás

export const POST = async ({ request, url }) => {
    try {
        // 1. Kicsomagolja a Frontendről érkező adatokat
        const { username, email, password } = await request.json();

        // 2. Alapvető ellenőrzés
        if (!username || !email || !password) {
            return json({ error: 'Minden mezőt kötelező kitölteni!' }, { status: 400 });
        }

        const prisma = services.db;

        // 3. Megnézi, hogy létezik-e már ilyen email vagy username
        const letezoUser = await prisma.felhasznalok.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (letezoUser) {
            return json({ error: 'Ez az email cím vagy felhasználónév már foglalt!' }, { status: 409 });
        }

        // 4. Jelszó titkosítása
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 5. Generál egy egyedi, lehetetlenül nehéz kódot a megerősítéshez
        const token = crypto.randomUUID();

        // 6. Az új felhasználó elmentése az adatbázisba (de még inaktívként!)
        const ujUser = await prisma.felhasznalok.create({
            data: {
                username: username,
                email: email,
                password_hash: hashedPassword,
                email_verified: false,      // ÚJ: Alapból blokkolva van
                verification_token: token   // ÚJ: Itt tároljuk a titkos kódot
            }
        });

        // 7. Kiküldi az e-mailt a háttérben
        try {
            await emailService.sendVerificationEmail(email, token, url.origin);
        } catch (emailError) {
            console.error('Nem sikerült elküldeni a megerősítő e-mailt:', emailError);
            // Ha élesben nem megy el az email, érdemes lehet tudni róla
        }

        // 8. Siker esetén visszaszól a kliensnek
        return json({ 
            message: 'Sikeres regisztráció! Kérlek, erősítsd meg az e-mail címedet a beérkező levelek között a belépéshez.', 
            userId: ujUser.id 
        }, { status: 201 });

    } catch (error) {
        console.error('Hiba a regisztráció során:', error);
        return json({ error: 'Belső szerverhiba történt a regisztrációkor.' }, { status: 500 });
    }
};