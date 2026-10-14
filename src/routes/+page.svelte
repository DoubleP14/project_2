<script lang="ts">
    // Csomagok (az árak és tartalmak egyeznek a Beállítások > Előfizetés fül adataival)
    const csomagok = [
        {
            nev: 'Starter',
            ar: '0',
            leiras: 'Ismerkedéshez és kisebb hírfigyeléshez.',
            funkciok: ['Max 3 aktív hírforrás', 'Csak RSS alapú feldolgozás', 'Napi 1 e-mail összefoglaló'],
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
</script>

<div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <!-- HERO SZEKCIÓ -->
    <header class="relative overflow-hidden bg-white px-6 py-24 sm:py-32 lg:px-8 shadow-sm">
        <div class="mx-auto max-w-2xl text-center">
            <h1 class="text-4xl font-extrabold tracking-tight sm:text-6xl text-slate-900">
                A te személyes <span class="text-blue-600">AI főszerkesztőd</span>
            </h1>
            <p class="mt-6 text-lg leading-8 text-slate-600">
                Automatizált hírgyűjtés, intelligens összefoglalók és azonnali riasztások. A robotpilóta óránként elemzi a világot, hogy te csak a lényeget lásd.
            </p>
            <div class="mt-10 flex items-center justify-center gap-x-6">
                <a href="/register" class="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    Ingyenes próbaidőszak
                </a>
                <a href="#features" class="text-sm font-semibold leading-6 text-slate-900">
                    Hogyan működik? <span aria-hidden="true">→</span>
                </a>
            </div>
        </div>
    </header>

    <!-- FUNKCIÓK SZEKCIÓ -->
    <section id="features" class="py-24 sm:py-32 bg-slate-50">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
            <div class="mx-auto max-w-2xl lg:text-center">
                <h2 class="text-base font-semibold leading-7 text-blue-600">Okosabb tartalomfogyasztás</h2>
                <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Felejtsd el a végtelen hírfolyamot</p>
            </div>
            <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                    <!-- Feature 1 -->
                    <div class="flex flex-col">
                        <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                            <span class="text-2xl">🤖</span> 24/7 Robotpilóta
                        </dt>
                        <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                            <p class="flex-auto">Automatikusan letölti, megtisztítja és klaszterezi a cikkeket és YouTube videókat a megadott forrásaidból.</p>
                        </dd>
                    </div>
                    <!-- Feature 2 -->
                    <div class="flex flex-col">
                        <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                            <span class="text-2xl">🧠</span> Type-safe AI Elemzés
                        </dt>
                        <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                            <p class="flex-auto">Minden hír kap egy összefoglalót, hangulati értékelést és egy Hírérték pontszámot, hogy kiszűrjük a zajt.</p>
                        </dd>
                    </div>
                    <!-- Feature 3 -->
                    <div class="flex flex-col">
                        <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                            <span class="text-2xl">🚨</span> Személyre szabott riasztások
                        </dt>
                        <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                            <p class="flex-auto">Többé nem maradsz le arról, ami fontos. Állíts be kulcsszavakat, és azonnal értesítünk, ha a témádban hír jelenik meg.</p>
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    </section>

    <!-- ÁRAZÁS (STRIPE ELŐKÉSZÍTÉS) -->
    <section id="pricing" class="py-24 sm:py-32 bg-white">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
            <div class="mx-auto max-w-2xl sm:text-center">
                <h2 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Egyszerű, átlátható árazás</h2>
                <p class="mt-6 text-lg leading-8 text-slate-600">Válaszd a számodra megfelelő csomagot, és vedd át az irányítást a hírfogyasztásod felett.</p>
            </div>
            <!-- A csomagok megegyeznek a Beállítások > Előfizetés fülön lévőkkel.
                 Fizetni csak bejelentkezve lehet, ezért a gombok a regisztrációra visznek. -->
            <div class="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3">
                {#each csomagok as csomag}
                    <div class="flex flex-col justify-between rounded-3xl p-8 ring-1 {csomag.kiemelt ? 'ring-2 ring-blue-600 shadow-xl' : 'ring-slate-200'}">
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
                                    <li class="flex gap-x-3">✓ {funkcio}</li>
                                {/each}
                            </ul>
                        </div>
                        <a href="/register" class="mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold shadow-sm {csomag.kiemelt ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-blue-600 ring-1 ring-inset ring-blue-200 hover:ring-blue-300'}">
                            {csomag.gomb}
                        </a>
                    </div>
                {/each}
            </div>
            <p class="mt-8 text-center text-sm text-slate-500">
                Az AI elemzéshez saját AI szolgáltatói API kulcs szükséges (BYOK). A fizetős csomagok regisztráció után a Beállításokban aktiválhatók, biztonságos bankkártyás fizetéssel (Stripe).
            </p>
        </div>
    </section>
</div>