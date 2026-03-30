import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { services } from '$lib/server'; // database connection

export const POST = async ({ request }) => {
    try {
        // 1. Kicsomagolja a Frontendről érkező adatokat
        const { username, email, password } = await request.json();

        // 2. Alapvető ellenőrzés (ne küldjenek be üres adatot)
        if (!username || !email || !password) {
            return json({ error: 'Minden mezőt kötelező kitölteni!' }, { status: 400 });
        }

        const prisma = services.db;

        // 3. Megnézi, hogy létezik-e már ilyen email vagy username a DB-ben
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

        // 5. Az új felhasználó elmentése az adatbázisba
        const ujUser = await prisma.felhasznalok.create({
            data: {
                username: username,
                email: email,
                password_hash: hashedPassword,
                // A role ("user") és egyéb alapértelmezések a Prisma sémából automatikusan bekerülnek
            }
        });

        // 6. Siker esetén visszaszól a kliensnek (Frontendnek), de a jelszót VÉLETLENÜL SEM küldi vissza!
        return json({ 
            message: 'Sikeres regisztráció!', 
            userId: ujUser.id 
        }, { status: 201 });

    } catch (error) {
        console.error('Hiba a regisztráció során:', error);
        return json({ error: 'Belső szerverhiba történt a regisztrációkor.' }, { status: 500 });
    }
};