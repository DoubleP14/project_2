<script lang="ts">
    // Ide jöhet a bejelentkezés ellenőrzése vagy a Stripe csomagok betöltése
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
            <div class="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-slate-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                <div class="p-8 sm:p-10 lg:flex-auto">
                    <h3 class="text-2xl font-bold tracking-tight text-slate-900">Pro Előfizetés</h3>
                    <p class="mt-6 text-base leading-7 text-slate-600">Teljes hozzáférés a prémium AI modellekhez (GPT-4o, Claude 3), korlátlan hírforrás és azonnali webhook riasztások.</p>
                    <div class="mt-10 flex items-center gap-x-4">
                        <h4 class="flex-none text-sm font-semibold leading-6 text-blue-600">Mit tartalmaz?</h4>
                        <div class="h-px flex-auto bg-slate-100"></div>
                    </div>
                    <ul class="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-slate-600 sm:grid-cols-2 sm:gap-6">
                        <li class="flex gap-x-3">✓ Korlátlan RSS és YouTube forrás</li>
                        <li class="flex gap-x-3">✓ Type-safe AI analizátor</li>
                        <li class="flex gap-x-3">✓ Clickbait radar (Hamarosan)</li>
                        <li class="flex gap-x-3">✓ 7 napos automatikus archívum</li>
                    </ul>
                </div>
                <div class="p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                    <div class="rounded-2xl bg-slate-50 py-10 text-center ring-1 ring-inset ring-slate-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
                        <div class="mx-auto max-w-xs px-8">
                            <p class="text-base font-semibold text-slate-600">Fizess havonta, mondd le bármikor</p>
                            <p class="mt-6 flex items-baseline justify-center gap-x-2">
                                <span class="text-5xl font-bold tracking-tight text-slate-900">4 990</span>
                                <span class="text-sm font-semibold leading-6 tracking-wide text-slate-600">Ft / hó</span>
                            </p>
                            <form action="/api/stripe/checkout" method="POST">
                                <button type="submit" class="mt-10 block w-full rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                                    Előfizetés indítása
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>