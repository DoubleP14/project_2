import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { services } from '$lib/server';
import { JWT_SECRET } from '$env/static/private'; // Behozza a titkos kulcsot a .env-ből

export const POST = async ({ request, cookies }) => {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return json({ error: 'Email és jelszó megadása kötelező!' }, { status: 400 });
        }

        const prisma = services.db;

        // 1. Megkeresi a felhasználót az adatbázisban email alapján
        const user = await prisma.felhasznalok.findUnique({
            where: { email: email }
        });

        if (!user || !user.password_hash) {
            // Fontos: Direkt nem mondja meg, hogy az email vagy a jelszó rossz-e (biztonsági okokból)
            return json({ error: 'Hibás email cím vagy jelszó!' }, { status: 401 });
        }

        // 2. Összehasonlítja a beírt jelszót az adatbázisban lévő hash-sel
        const jelszoHelyes = await bcrypt.compare(password, user.password_hash);

        if (!jelszoHelyes) {
            return json({ error: 'Hibás email cím vagy jelszó!' }, { status: 401 });
        }

        // 3. JWT Token gyártás
        const token = jwt.sign(
            { userId: user.id, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // 4. A tokent beleteszi egy szigorúan védett Sütibe
        cookies.set('session_token', token, {
            path: '/', 
            httpOnly: true, 
            sameSite: 'strict', 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 60 * 60 * 24 
        });

        // 5. Visszaszól a a Frontendnek, hogy jöhet befelé!
        return json({ 
            message: 'Sikeres bejelentkezés!',
            user: { username: user.username, email: user.email }
        }, { status: 200 });

    } catch (error) {
        console.error('Hiba bejelentkezéskor:', error);
        return json({ error: 'Belső szerverhiba történt.' }, { status: 500 });
    }
};