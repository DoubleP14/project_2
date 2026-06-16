// src/lib/server/services/szamlaService.ts
// @ts-ignore
import * as szamlazz from 'szamlazz.js';
import { SZAMLAZZ_API_KEY } from '$env/static/private';

export const szamlaService = {
    szamlaGeneralas: async (userEmail: string, username: string, csomagNev: string, ar: number) => {
        try {
            // 1. Kliens beállítása az API kulccsal
            const szamlaAgent = new szamlazz.Client({
                authToken: SZAMLAZZ_API_KEY, 
                eSzamla: true,               
                sandbox: true                
            });

            // 2. Eladó adatainak megadása
            const seller = new szamlazz.Seller({
                bank: 'Teszt Bank Zrt.',
                accountNumber: '11111111-22222222-33333333'
            });

            // 3. Vevő adatainak összeállítása
            const buyer = new szamlazz.Buyer({
                name: username,
                email: userEmail,
                sendEmail: true,             
                country: 'Magyarország',
                zip: '1000',
                city: 'Budapest',
                address: 'Online előfizető'
            });

            // 4. Számlatétel 
            const netPrice = Math.round(ar / 1.27);
            const vatAmount = ar - netPrice; // Az ÁFA pontos értéke

            const item = new szamlazz.Item({
                label: `Hírfigyelő AI - ${csomagNev}`, 
                quantity: 1,
                unit: 'db',
                vat: '27',                             
                netUnitPrice: netPrice, // Nettó darabár
                netValue: netPrice,     // Tétel nettó érték (Összesen) 
                vatValue: vatAmount,    // ÁFA összege 
                grossValue: ar          // Bruttó érték
            });

            // 5. Számla entitás létrehozása
            const invoice = new szamlazz.Invoice({
                paymentMethod: szamlazz.PaymentMethod.Bankcard, 
                currency: szamlazz.Currency.Ft,                 
                language: szamlazz.Language.Hungarian,  
                seller: seller,       
                buyer: buyer,
                items: [item]
            });

            // 6. Számla kiállítása
            const result = await szamlaAgent.issueInvoice(invoice);
            
            console.log(`✅ 🧾 Számlázz.hu: Sikeres számlagenerálás! Számlaszám: ${result.invoiceId}`);
            return result;

        } catch (error) {
            console.error('❌ Hiba történt a Számlázz.hu generálás során:', error);
            throw error; 
        }
    }
};