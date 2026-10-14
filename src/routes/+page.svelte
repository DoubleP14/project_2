<script lang="ts">
    // Csomagok (az árak és tartalmak egyeznek a Beállítások > Előfizetés fül adataival)
    const csomagok = [
        {
            nev: 'Starter',
            ar: '0',
            leiras: 'Ismerkedéshez és kisebb hírfigyeléshez.',
            funkciok: ['Max 3 aktív hírforrás', 'Csak RSS alapú feldolgozás', 'Azonnali e-mail riasztások'],
            gomb: 'Ingyenes regisztráció',
            kiemelt: false
        },
        {
            nev: 'Pro Analyst',
            ar: '2 990',
            leiras: 'Elemzőknek, akiknek azonnali riasztás kell.',
            funkciok: ['Végtelen hírforrás (RSS + YouTube)', 'Azonnali Discord & Telegram riasztás', 'Hírérték pontozás és Clickbait Radar'],
            gomb: 'Regisztráció és előfizetés',
            kiemelt: true
        },
        {
            nev: 'Enterprise',
            ar: '9 990',
            leiras: 'Cégeknek, teljes körű médiafigyeléshez.',
            funkciok: ['Minden Pro Analyst funkció', 'Dedikált API hozzáférés', 'Statisztikai PDF/CSV adatexport'],
            gomb: 'Céges csatlakozás',
            kiemelt: false
        }
    ];

    const funkciok = [
        { ikon: '📰', cim: 'Folyamatos hírfigyelés', leiras: 'RSS hírforrások és YouTube csatornák automatikus, óránkénti pásztázása emberi beavatkozás nélkül.' },
        { ikon: '🧠', cim: 'Objektív AI összefoglaló', leiras: 'Nagy nyelvi modellek szigorú szabályok alapján, tényszerűen foglalják össze minden cikk lényegét.' },
        { ikon: '🎭', cim: 'Hangulatelemzés', leiras: 'Minden hír Pozitív, Negatív vagy Semleges besorolást kap, így azonnal látod a médiaklímát.' },
        { ikon: '📊', cim: 'Hírérték pontozás', leiras: '0–100-as skála: a makrogazdasági és országos horderejű események előre, a bulvár hátra kerül.' },
        { ikon: '🎣', cim: 'Clickbait Radar', leiras: 'Felismeri a hatásvadász, félrevezető címeket, és automatikusan hátrasorolja őket.' },
        { ikon: '🚨', cim: 'Valós idejű riasztások', leiras: 'Kulcsszavak és témakörök alapján értesítünk e-mailben, Discordon vagy Telegramon.' }
    ];

    const lepesek = [
        { szam: '1', cim: 'Add meg a forrásaidat', leiras: 'Vedd fel a figyelt hírportálok RSS csatornáit vagy YouTube csatornákat, és jelöld meg a saját médiumodat.' },
        { szam: '2', cim: 'Az AI elemez helyetted', leiras: 'A saját AI kulcsoddal (OpenAI, Anthropic, Google vagy Groq) a rendszer összefoglal, pontoz és témák szerint csoportosít.' },
        { szam: '3', cim: 'Csak a lényegről értesülsz', leiras: 'Kulcsszó, kiemelt témakör, több forrás által lehozott bombahír vagy konkurencia által megírt hír esetén azonnal riasztunk.' }
    ];
</script>

<svelte:head>
    <title>News Trends – AI alapú piac- és médiafigyelés</title>
</svelte:head>

<div class="bg-white font-sans text-slate-900">

    <!-- HERO SZEKCIÓ -->
    <section class="relative isolate overflow-hidden">
        <div class="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 via-white to-white"></div>
        <div class="absolute left-1/2 top-0 -z-10 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl"></div>

        <div class="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:px-8">
            <div class="text-center lg:text-left">
                <span class="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700">
                    B2B piac- és médiafigyelés mesterséges intelligenciával
                </span>
                <h1 class="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                    A hírek zaja helyett <span class="text-blue-600">csak a lényeg.</span>
                </h1>
                <p class="mt-6 text-lg leading-8 text-slate-600">
                    A News Trends folyamatosan pásztázza a hírforrásokat, nagy nyelvi modellekkel azonnal elemzi őket, és csak akkor szól, amikor tényleg fontos történik. Cégvezetőknek és elemzőknek.
                </p>
                <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                    <a href="/register" class="w-full rounded-md bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto">
                        Ingyenes regisztráció
                    </a>
                    <a href="#how" class="text-sm font-semibold text-slate-900 hover:text-blue-600">
                        Hogyan működik? <span aria-hidden="true">→</span>
                    </a>
                </div>
                <p class="mt-4 text-xs text-slate-500">Bankkártya nélkül indulhatsz · GDPR-kompatibilis adatkezelés</p>
            </div>

            <!-- Előnézeti hírkártya (illusztráció) -->
            <div class="relative mx-auto w-full max-w-md" aria-hidden="true">
                <div class="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-blue-100 to-indigo-100 blur-xl"></div>
                <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                    <div class="flex items-center justify-between text-xs text-slate-500">
                        <span class="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">Gazdasági hírportál</span>
                        <span>2 perce</span>
                    </div>
                    <h3 class="mt-4 text-lg font-bold leading-snug text-slate-900">Váratlanul emelte az alapkamatot a jegybank</h3>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span class="rounded-full bg-green-100 px-2.5 py-1 text-green-800">🚀 Hírérték: 88</span>
                        <span class="rounded-full bg-red-100 px-2.5 py-1 text-red-800">Negatív</span>
                        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">🎣 Clickbait: 8</span>
                    </div>
                    <div class="mt-4 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-slate-700">
                        <span class="font-semibold text-blue-700">AI összefoglaló:</span> A monetáris tanács 50 bázisponttal emelte az irányadó kamatot az inflációs kockázatok miatt; a lépés a hitelfelvételt drágítja.
                    </div>
                    <div class="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                        🔔 Riasztás elküldve: kiemelt témakör (Gazdaság)
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- FUNKCIÓK SZEKCIÓ -->
    <section id="features" class="scroll-mt-20 bg-slate-50 py-24 sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-base font-semibold leading-7 text-blue-600">Funkciók</h2>
                <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Minden, ami a professzionális médiafigyeléshez kell</p>
            </div>
            <div class="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {#each funkciok as f}
                    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                        <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-2xl">{f.ikon}</div>
                        <h3 class="mt-4 text-base font-semibold text-slate-900">{f.cim}</h3>
                        <p class="mt-2 text-sm leading-6 text-slate-600">{f.leiras}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- HOGYAN MŰKÖDIK -->
    <section id="how" class="scroll-mt-20 bg-white py-24 sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-base font-semibold leading-7 text-blue-600">Hogyan működik?</h2>
                <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Három lépés, utána a rendszer dolgozik</p>
            </div>
            <ol class="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
                {#each lepesek as l}
                    <li class="relative rounded-2xl border border-slate-200 p-6">
                        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{l.szam}</span>
                        <h3 class="mt-4 text-base font-semibold text-slate-900">{l.cim}</h3>
                        <p class="mt-2 text-sm leading-6 text-slate-600">{l.leiras}</p>
                    </li>
                {/each}
            </ol>
        </div>
    </section>

    <!-- ÁRAZÁS -->
    <section id="pricing" class="scroll-mt-20 bg-slate-50 py-24 sm:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-base font-semibold leading-7 text-blue-600">Árazás</h2>
                <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Egyszerű, átlátható csomagok</p>
                <p class="mt-6 text-lg leading-8 text-slate-600">Kezdd ingyen, és válts nagyobb csomagra, amikor szükséged van rá.</p>
            </div>
            <!-- A csomagok megegyeznek a Beállítások > Előfizetés fülön lévőkkel.
                 Fizetni csak bejelentkezve lehet, ezért a gombok a regisztrációra visznek. -->
            <div class="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
                {#each csomagok as csomag}
                    <div class="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 {csomag.kiemelt ? 'ring-2 ring-blue-600 shadow-xl lg:-translate-y-2' : 'ring-slate-200'}">
                        <div>
                            <div class="flex items-center justify-between gap-x-4">
                                <h3 class="text-xl font-bold text-slate-900">{csomag.nev}</h3>
                                {#if csomag.kiemelt}
                                    <span class="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-600">Legnépszerűbb</span>
                                {/if}
                            </div>
                            <p class="mt-4 text-sm leading-6 text-slate-600">{csomag.leiras}</p>
                            <p class="mt-6 flex items-baseline gap-x-1">
                                <span class="text-4xl font-bold tracking-tight text-slate-900">{csomag.ar}</span>
                                <span class="text-sm font-semibold text-slate-600">Ft / hó</span>
                            </p>
                            <ul class="mt-8 space-y-3 text-sm leading-6 text-slate-600">
                                {#each csomag.funkciok as funkcio}
                                    <li class="flex gap-x-3"><span class="text-blue-600">✓</span> {funkcio}</li>
                                {/each}
                            </ul>
                        </div>
                        <a href="/register" class="mt-8 block rounded-md px-3 py-2.5 text-center text-sm font-semibold shadow-sm {csomag.kiemelt ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-blue-600 ring-1 ring-inset ring-blue-200 hover:ring-blue-300'}">
                            {csomag.gomb}
                        </a>
                    </div>
                {/each}
            </div>
            <p class="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-500">
                Az AI elemzéshez saját AI szolgáltatói API kulcs szükséges (BYOK), így a cikkek csak az általad választott szolgáltatóhoz jutnak el. A fizetős csomagok regisztráció után a Beállításokban aktiválhatók, biztonságos bankkártyás fizetéssel (Stripe).
            </p>
        </div>
    </section>

    <!-- ZÁRÓ CTA -->
    <section class="bg-blue-600">
        <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:px-8">
            <div class="text-center lg:text-left">
                <h2 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">Készen állsz, hogy ne maradj le semmi fontosról?</h2>
                <p class="mt-2 text-blue-100">Regisztrálj ingyen, és percek alatt beállíthatod az első forrásaidat.</p>
            </div>
            <a href="/register" class="rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50">
                Kezdés most
            </a>
        </div>
    </section>
</div>
