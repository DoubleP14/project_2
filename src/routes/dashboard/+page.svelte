<script lang="ts">
    import { Card, Badge, Button, Input } from 'flowbite-svelte';
    import { SearchSolid, CogSolid, RefreshOutline } from 'flowbite-svelte-icons';
    import { formatDate } from '$lib/utils/format-date'; 

    export let data;
    
    // --- KATEGÓRIÁK DEFINIÁLÁSA A GOMBOKHOZ ---
    const kategoriak = [
        { id: 'osszes', nev: '🌐 Összes Hír' },
        { id: 'politika', nev: '🏛️ Politika & Belföld' },
        { id: 'gazdasag', nev: '💼 Gazdaság' },
        { id: 'kulfold', nev: '🌍 Külföld' },
        { id: 'tech', nev: '💻 Tech & Tudomány' },
        { id: 'sport', nev: '⚽ Sport' }
    ];

    // --- GAP ANALYSIS (HIÁNYZÓ HÍREK) LOGIKA ---
    $: sajatKlaszterek = new Set(
        data.cikkek
            .filter((e: any) => e.hir.forras?.is_own_source)
            .map((e: any) => e.hir.cluster_id)
            .filter((id: any) => id !== null)
    );

    $: konkurenciaCikkek = data.cikkek.filter((e: any) => !e.hir.forras?.is_own_source);

    // --- KLIENSOLDALI PAGINATION (MUTASS TÖBBET) LOGIKA ---
    let visibleCount = 10; // Alapból csak 10 db hírt mutat meg
    $: megjelenitettCikkek = konkurenciaCikkek.slice(0, visibleCount);

    // URL építő: megtartja az aktuális szűrőket, csak a megadott paramétert írja felül
    function szuroLink(valtozas: Record<string, string>) {
        const params = new URLSearchParams();
        const ertekek = { kategoria: data.aktivKategoria, q: data.keresoKifejezes, rendezes: data.rendezes, ...valtozas };
        if (ertekek.kategoria && ertekek.kategoria !== 'osszes') params.set('kategoria', ertekek.kategoria);
        if (ertekek.q) params.set('q', ertekek.q);
        if (ertekek.rendezes === 'friss') params.set('rendezes', 'friss');
        const qs = params.toString();
        return qs ? `?${qs}` : '?';
    }
</script>

<svelte:head>
    <title>Hírek – News Trends</title>
</svelte:head>

<div class="container mx-auto p-4 mt-8 max-w-7xl">
    
    <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white text-center sm:text-left">
            <span class="text-blue-600 dark:text-blue-500">Hírelemző</span>
        </h1>
    </div>

    <!-- BYOK FIGYELMEZTETÉS -->
    {#if !data.vanApiKulcs}
        <div class="mb-8 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-xl">
            <div>
                <h3 class="font-bold text-yellow-800 dark:text-yellow-300">Nincs beállítva AI API kulcs</h3>
                <p class="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                    A hírek automatikus elemzéséhez (összefoglaló, hangulat, hírérték) add meg a saját AI szolgáltatód API kulcsát. Kulcs nélkül a rendszer nem végez elemzést.
                </p>
            </div>
            <Button href="/settings" color="yellow" class="shrink-0 font-semibold">
                <CogSolid class="w-4 h-4 me-2" /> API kulcs megadása
            </Button>
        </div>
    {/if}

    <!-- SZŰRŐ MODUL -->
    <div class="mb-10 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        
        <h2 class="text-xl font-bold mb-3 text-gray-900 dark:text-white">Gyorsszűrők (Kategóriák)</h2>
        <div class="flex flex-wrap gap-3 mb-6">
            {#each kategoriak as kat}
                <Button 
                    href={szuroLink({ kategoria: kat.id })}
                    color={data.aktivKategoria === kat.id ? 'blue' : 'light'}
                    class="rounded-full px-5 py-2 font-bold shadow-sm transition-transform hover:scale-105"
                >
                    {kat.nev}
                </Button>
            {/each}
        </div>

        <hr class="mb-6 border-gray-200 dark:border-gray-700" />

        <h2 class="text-xl font-bold mb-3 text-gray-900 dark:text-white">Szabad Szavas Keresés</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Keress rá bármilyen kifejezésre az aktuális hírfolyamban. (Ez nem módosítja a riasztásaidat!)
        </p>
        
        <form method="GET" class="flex gap-2 mb-2 max-w-lg">
            <!-- Megtartja a kategóriát, ha van -->
            {#if data.aktivKategoria !== 'osszes'}
                <input type="hidden" name="kategoria" value={data.aktivKategoria} />
            {/if}
            {#if data.rendezes === 'friss'}
                <input type="hidden" name="rendezes" value="friss" />
            {/if}
            <Input name="q" placeholder="Keress cikkekre, személyekre..." value={data.keresoKifejezes} />
            <Button type="submit" color="blue"><SearchSolid class="w-4 h-4 mr-2"/> Keresés</Button>
            {#if data.keresoKifejezes}
                <Button href={szuroLink({ q: '' })} color="light">Törlés</Button>
            {/if}
        </form>

        <hr class="my-6 border-gray-200 dark:border-gray-700" />

        <h2 class="text-xl font-bold mb-3 text-gray-900 dark:text-white">Rendezés</h2>
        <div class="flex flex-wrap items-center gap-3">
            <Button href={szuroLink({ rendezes: 'fontossag' })} color={data.rendezes === 'fontossag' ? 'blue' : 'light'} class="rounded-full px-5 py-2 font-bold shadow-sm">
                ⭐ Fontosság szerint
            </Button>
            <Button href={szuroLink({ rendezes: 'friss' })} color={data.rendezes === 'friss' ? 'blue' : 'light'} class="rounded-full px-5 py-2 font-bold shadow-sm">
                🕒 Legfrissebb elöl
            </Button>
            {#if data.rendezes === 'fontossag'}
                <p class="text-sm text-gray-500 dark:text-gray-400">A kiemelt hírértékű hírek előre, a clickbait és alacsony hírértékű tartalmak hátra kerülnek.</p>
            {/if}
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        
        {#each megjelenitettCikkek as elemzes}
            
            {@const isHianyozo = elemzes.hir.cluster_id && !sajatKlaszterek.has(elemzes.hir.cluster_id)}

            <div class="relative transition-transform duration-300 {isHianyozo ? 'scale-[1.01] z-10' : ''}">
                
                {#if isHianyozo}
                    <div class="absolute -top-3 -right-3 z-20 animate-pulse">
                        <Badge color="red" class="shadow-lg px-3 py-1.5 font-extrabold text-sm border border-red-500">
                            HIÁNYZÓ HÍR!
                        </Badge>
                    </div>
                {/if}

                <Card size="xl" class="max-w-none flex flex-col justify-between h-full shadow-lg hover:shadow-xl transition-shadow {isHianyozo ? 'ring-4 ring-red-500 dark:ring-red-600' : ''}">
                    
                    <div class="mb-4">
                        <h5 class="mb-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {elemzes.hir.cim}
                        </h5>
                        
                        <div class="flex flex-wrap items-center gap-2 mb-4">
                            <Badge color="dark" rounded class="font-bold border border-gray-600">
                                {elemzes.hir.forras?.forras_nev || 'Ismeretlen'}
                            </Badge>

                            {#if elemzes.hangulat === 'POZITIV'}
                                <Badge color="green" rounded>Pozitív</Badge>
                            {:else if elemzes.hangulat === 'NEGATIV'}
                                <Badge color="red" rounded>Negatív</Badge>
                            {:else}
                                <Badge color="dark" rounded>Semleges</Badge>
                            {/if}
                            
                            {#if elemzes.pontszam !== undefined && elemzes.pontszam !== null}
                                {#if elemzes.pontszam <= 30}
                                    <Badge color="red" rounded class="font-bold">📉 Hírérték: {elemzes.pontszam}</Badge>
                                {:else if elemzes.pontszam <= 70}
                                    <Badge color="yellow" rounded class="font-bold">📊 Hírérték: {elemzes.pontszam}</Badge>
                                {:else}
                                    <Badge color="green" rounded class="font-bold">🚀 Hírérték: {elemzes.pontszam}</Badge>
                                {/if}
                            {/if}
                            
                            {#if elemzes.clickbait !== undefined && elemzes.clickbait !== null}
                                {#if elemzes.clickbait >= 71}
                                    <Badge color="red" rounded class="font-extrabold border border-red-500 animate-pulse">
                                        🚨 Clickbait!
                                    </Badge>
                                {:else if elemzes.clickbait >= 31}
                                    <Badge color="yellow" rounded class="font-bold">
                                        ⚠️ Hatásvadász cím
                                    </Badge>
                                {:else}
                                    <Badge color="green" rounded class="font-bold text-green-800">
                                        ✅ Tényszerű
                                    </Badge>
                                {/if}
                            {/if}
                            
                            {#if elemzes.hir.datum}
                                <span class="text-xs text-gray-500 dark:text-gray-400 font-medium ml-auto">
                                    {formatDate('%Y. $m %d.', elemzes.hir.datum)}
                                </span>
                            {/if}
                        </div>

                        <p class="font-normal text-gray-700 dark:text-gray-400 leading-relaxed">
                            {elemzes.osszefoglalo}
                        </p>
                    </div>

                    <Button href={elemzes.hir.url ?? '#'} target="_blank" color="{isHianyozo ? 'red' : 'alternative'}" class="w-full mt-4 font-bold">
                        Eredeti cikk elolvasása
                    </Button>
                    
                </Card>
            </div>
        {/each}

        {#if konkurenciaCikkek.length > visibleCount}
            <div class="col-span-full flex justify-center mt-6 mb-4">
                <Button color="alternative" size="lg" class="font-bold px-10 py-3 shadow-md border-gray-300 dark:border-gray-600 hover:text-blue-600 transition-all hover:scale-105" on:click={() => visibleCount += 6}>
                    Mutass többet ({konkurenciaCikkek.length - visibleCount} hír maradt)
                </Button>
            </div>
        {/if}

        {#if konkurenciaCikkek.length === 0}
            <Card size="xl" class="col-span-full text-center shadow-lg dark:bg-gray-800 w-full max-w-none py-16 mt-4 border border-gray-200 dark:border-gray-700">
                <SearchSolid class="w-24 h-24 mx-auto text-blue-500 mb-6 animate-pulse" />
                <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Jelenleg üres a hírfolyamod!</h2>
                <p class="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                    Nincs a szűrésnek megfelelő cikk. Válassz az "Összes Hír" kategóriát, vagy töröld az egyedi kulcsszavakat.
                </p>
                <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <Button href="?kategoria=osszes" color="blue" size="lg" class="font-bold w-full sm:w-auto">
                        <RefreshOutline class="w-5 h-5 mr-2" /> Összes hír mutatása
                    </Button>
                </div>
            </Card>
        {/if}

    </div>
</div>
