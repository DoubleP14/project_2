<script lang="ts">
    // ─── ADATKEZELŐ ADATAI ───
    const ADATKEZELO = {
        nev: 'Pintér Patrik',
        email: 'pinter.patrik04@gmail.com'
    };
    const HATALYOS = '2026. október 14.';

    const tartalom = [
        { id: 'adatkezelo', cim: '1. Az adatkezelő' },
        { id: 'adatok', cim: '2. Kezelt adatok, célok és jogalapok' },
        { id: 'ai', cim: '3. AI feldolgozás (BYOK)' },
        { id: 'feldolgozok', cim: '4. Adatfeldolgozók és címzettek' },
        { id: 'megorzes', cim: '5. Megőrzési idők' },
        { id: 'biztonsag', cim: '6. Adatbiztonság' },
        { id: 'sutik', cim: '7. Sütik (cookie-k)' },
        { id: 'jogok', cim: '8. Az Ön jogai' },
        { id: 'jogorvoslat', cim: '9. Jogorvoslat' }
    ];

    const adatkezelesek = [
        {
            adat: 'Felhasználónév, e-mail cím, jelszó (bcrypt hash formában)',
            cel: 'Fiók létrehozása, bejelentkezés, e-mail cím megerősítése',
            jogalap: 'Szerződés teljesítése – GDPR 6. cikk (1) b)'
        },
        {
            adat: 'Hírforrások, riasztási kulcsszavak, témakör-feliratkozások',
            cel: 'A szolgáltatás nyújtása: hírgyűjtés, elemzés, riasztások',
            jogalap: 'Szerződés teljesítése – GDPR 6. cikk (1) b)'
        },
        {
            adat: 'AI és YouTube API kulcsok, Discord webhook, Telegram chat ID (titkosítva)',
            cel: 'A választott AI szolgáltató és értesítési csatorna használata',
            jogalap: 'Szerződés teljesítése – GDPR 6. cikk (1) b)'
        },
        {
            adat: 'Kiküldött értesítések naplója, rendszernapló (belépés, csomagváltás)',
            cel: 'Működés ellenőrzése, hibakeresés, visszaélések megelőzése',
            jogalap: 'Jogos érdek – GDPR 6. cikk (1) f)'
        },
        {
            adat: 'Számlázási adatok (név, e-mail cím, csomag, összeg)',
            cel: 'Előfizetés díjának elszámolása, számla kiállítása',
            jogalap: 'Jogi kötelezettség – GDPR 6. cikk (1) c), Számviteli tv.'
        }
    ];

    const feldolgozok = [
        { nev: 'Stripe Payments Europe Ltd.', szerep: 'Bankkártyás fizetés lebonyolítása. A kártyaadatok kizárólag a Stripe rendszerébe kerülnek, mi nem látjuk és nem tároljuk őket.' },
        { nev: 'KBOSS.hu Kft. (Számlázz.hu)', szerep: 'Elektronikus számla kiállítása és kézbesítése e-mailben.' },
        { nev: 'A felhasználó által választott AI szolgáltató (OpenAI, Anthropic, Google, Groq)', szerep: 'A hírcikkek szövegének elemzése a felhasználó saját API kulcsával. Személyes adatot nem továbbítunk.' },
        { nev: 'E-mail szolgáltató (SMTP)', szerep: 'Regisztráció-megerősítő és riasztási e-mailek kézbesítése.' },
        { nev: 'Discord / Telegram', szerep: 'Riasztások kézbesítése, kizárólag ha a felhasználó ezt a csatornát választja.' }
    ];

    const jogok = [
        { cim: 'Hozzáférés', leiras: 'Tájékoztatást kérhet a kezelt adatairól; adatai nagy része a Beállítások oldalon közvetlenül is megtekinthető.' },
        { cim: 'Helyesbítés', leiras: 'Beállításait, forrásait és kulcsszavait bármikor módosíthatja.' },
        { cim: 'Törlés („elfeledtetés”)', leiras: 'A Beállítások › Fiók törlése funkcióval fiókját és minden kapcsolódó adatát azonnal, véglegesen törölheti.' },
        { cim: 'Korlátozás és tiltakozás', leiras: 'Kérheti adatai kezelésének korlátozását, illetve tiltakozhat a jogos érdeken alapuló adatkezelés ellen.' },
        { cim: 'Adathordozhatóság', leiras: 'Kérésére adatait tagolt, géppel olvasható formátumban átadjuk.' }
    ];
</script>

<svelte:head>
    <title>Adatkezelési tájékoztató – News Trends</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <header class="mb-10">
        <p class="text-sm font-semibold text-blue-600">Jogi információk</p>
        <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Adatkezelési tájékoztató</h1>
        <p class="mt-3 text-gray-600 dark:text-gray-400">
            Hatályos: {HATALYOS}. Ez a tájékoztató bemutatja, milyen személyes adatokat kezel a News Trends, milyen célból, és milyen jogok illetik meg Önt az Európai Unió általános adatvédelmi rendelete (GDPR) alapján.
        </p>
        <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
            A News Trends szakdolgozati, demonstrációs célú projekt. A fizetés Stripe teszt módban, a számlázás Számlázz.hu sandbox környezetben működik.
        </div>
    </header>

    <div class="grid gap-10 lg:grid-cols-[14rem_1fr]">
        <!-- TARTALOMJEGYZÉK -->
        <nav class="hidden lg:block" aria-label="Tartalomjegyzék">
            <ul class="sticky top-24 space-y-2 text-sm">
                {#each tartalom as t}
                    <li><a href="#{t.id}" class="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">{t.cim}</a></li>
                {/each}
            </ul>
        </nav>

        <article class="min-w-0 space-y-10 text-gray-700 dark:text-gray-300 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_p]:leading-7">

            <section>
                <h2 id="adatkezelo">1. Az adatkezelő</h2>
                <p class="mt-3">Név: <strong>{ADATKEZELO.nev}</strong><br />Adatvédelmi kapcsolattartás: <strong>{ADATKEZELO.email}</strong></p>
            </section>

            <section>
                <h2 id="adatok">2. Kezelt adatok, célok és jogalapok</h2>
                <div class="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th class="px-4 py-3">Adat</th>
                                <th class="px-4 py-3">Cél</th>
                                <th class="px-4 py-3">Jogalap</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            {#each adatkezelesek as a}
                                <tr class="bg-white dark:bg-gray-900">
                                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.adat}</td>
                                    <td class="px-4 py-3">{a.cel}</td>
                                    <td class="px-4 py-3">{a.jogalap}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
                <p class="mt-3 text-sm">Nem kezelünk különleges kategóriájú személyes adatot, IP-címet nem tárolunk, és a felhasználókról nem végzünk profilalkotást vagy automatizált döntéshozatalt.</p>
            </section>

            <section>
                <h2 id="ai">3. AI feldolgozás (BYOK)</h2>
                <p class="mt-3">
                    A hírek elemzése a <strong>felhasználó saját API kulcsával</strong> („Bring Your Own Key”), az általa kiválasztott AI szolgáltatónál történik. A szolgáltatónak kizárólag a nyilvános hírcikkek címét és szövegét továbbítjuk – a felhasználó nevét, e-mail címét vagy egyéb személyes adatát nem. Az AI szolgáltatóval fennálló jogviszonyra annak saját adatkezelési feltételei irányadók.
                </p>
            </section>

            <section>
                <h2 id="feldolgozok">4. Adatfeldolgozók és címzettek</h2>
                <ul class="mt-4 space-y-3">
                    {#each feldolgozok as f}
                        <li class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <p class="font-semibold text-gray-900 dark:text-white">{f.nev}</p>
                            <p class="mt-1 text-sm">{f.szerep}</p>
                        </li>
                    {/each}
                </ul>
                <p class="mt-3 text-sm">Személyes adatot harmadik félnek nem adunk el, és marketing célra nem használunk.</p>
            </section>

            <section>
                <h2 id="megorzes">5. Megőrzési idők</h2>
                <ul class="mt-3 list-disc space-y-2 pl-5">
                    <li><strong>Fiókadatok, beállítások, naplók:</strong> a fiók törléséig.</li>
                    <li><strong>Begyűjtött hírek és AI elemzések:</strong> 7 nap, utána automatikusan, véglegesen törlődnek.</li>
                    <li><strong>Munkamenet süti:</strong> 24 óra, illetve kijelentkezésig.</li>
                    <li><strong>Számlák:</strong> a számviteli törvény alapján 8 évig, a Számlázz.hu rendszerében.</li>
                </ul>
            </section>

            <section>
                <h2 id="biztonsag">6. Adatbiztonság</h2>
                <ul class="mt-3 list-disc space-y-2 pl-5">
                    <li>A jelszavakat kizárólag egyirányú, sózott <strong>bcrypt</strong> hash formában tároljuk.</li>
                    <li>Az API kulcsokat és értesítési azonosítókat <strong>AES-256</strong> titkosítással tároljuk, a felületen sosem jelennek meg nyíltan.</li>
                    <li>A munkamenetet <strong>HttpOnly, SameSite=Strict</strong> sütiben tárolt, aláírt JWT token azonosítja; jelszócsere után vagy kérésre minden munkamenet azonnal érvénytelenné válik.</li>
                    <li>Minden felhasználó kizárólag a saját adataihoz fér hozzá; a rendszerszintű műveletek adminisztrátori jogosultsághoz kötöttek.</li>
                </ul>
            </section>

            <section>
                <h2 id="sutik">7. Sütik (cookie-k)</h2>
                <p class="mt-3">
                    Kizárólag egyetlen, a működéshez feltétlenül szükséges sütit használunk (<code class="rounded bg-gray-100 px-1.5 py-0.5 text-sm dark:bg-gray-800">session_token</code>), amely a bejelentkezett állapotot tartja fenn. Analitikai, marketing vagy harmadik féltől származó követő sütit nem alkalmazunk, ezért süti-hozzájárulás kérése nem szükséges.
                </p>
            </section>

            <section>
                <h2 id="jogok">8. Az Ön jogai</h2>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    {#each jogok as j}
                        <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <p class="font-semibold text-gray-900 dark:text-white">{j.cim}</p>
                            <p class="mt-1 text-sm">{j.leiras}</p>
                        </div>
                    {/each}
                </div>
                <p class="mt-4">Kérelmét a(z) <strong>{ADATKEZELO.email}</strong> címre küldheti; arra legkésőbb egy hónapon belül válaszolunk.</p>
            </section>

            <section>
                <h2 id="jogorvoslat">9. Jogorvoslat</h2>
                <p class="mt-3">
                    Ha úgy érzi, hogy személyes adatai kezelése sérti a jogszabályokat, panaszt tehet a <strong>Nemzeti Adatvédelmi és Információszabadság Hatóságnál</strong> (NAIH, 1055 Budapest, Falk Miksa utca 9–11., <a href="https://naih.hu" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline dark:text-blue-400">naih.hu</a>), vagy bírósághoz fordulhat.
                </p>
            </section>
        </article>
    </div>
</div>
