<script lang="ts">
    import { Card, Badge, Button, Input, Helper, Spinner, Toast } from 'flowbite-svelte';
    import { SearchSolid, CogSolid, RefreshOutline, CheckCircleSolid, CloseCircleSolid } from 'flowbite-svelte-icons';
    import { enhance } from '$app/forms'; 
    import { fly } from 'svelte/transition';
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

    let showToast = false;
    let toastType: 'success' | 'error' = 'success';
    let toastMessage = '';

    function triggerToast(type: 'success' | 'error', message: string) {
        toastType = type;
        toastMessage = message;
        showToast = true;
        // 4 másodperc után magától eltűnik
        setTimeout(() => { showToast = false; }, 4000);
    }

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

    // --- Kézi frissítés logikája ---
    let isSyncing = false;

    async function keziFrissites() {
        isSyncing = true; 
        try {
            const response = await fetch('/api/news/sync', { method: 'GET' });
            if (response.ok) {
                triggerToast('success', 'Sikeres szinkronizálás! Hírek frissítése...');
                setTimeout(() => { window.location.reload(); }, 1500);
            } else {
                const resData = await response.json();
                triggerToast('error', resData.uzenet || 'Hiba történt a frissítés során!');
            }
        } catch (error) {
            console.error('Hiba a hálózati kérésben:', error);
            triggerToast('error', 'Nem sikerült elérni a szervert.');
        } finally {
            isSyncing = false;
        }
    }
</script>

<div class="container mx-auto p-4 mt-8 max-w-7xl">
    
    <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white text-center sm:text-left">
            <span class="text-blue-600 dark:text-blue-500">Hírelemző</span>
        </h1>
        
        <Button on:click={keziFrissites} disabled={isSyncing} color="alternative" class="font-medium shadow-sm">
            {#if isSyncing}
                <Spinner class="me-2" size="4" /> Hírek letöltése és AI elemzés...
            {:else}
                <RefreshOutline class="w-4 h-4 me-2" /> Kézi Frissítés (Sync)
            {/if}
        </Button>
    </div>

    <!-- SZŰRŐ MODUL -->
    <div class="mb-10 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        
        <h2 class="text-xl font-bold mb-3 text-gray-900 dark:text-white">Gyorsszűrők (Kategóriák)</h2>
        <div class="flex flex-wrap gap-3 mb-6">
            {#each kategoriak as kat}
                <Button 
                    href="?kategoria={kat.id}{data.keresoKifejezes ? `&q=${data.keresoKifejezes}` : ''}"
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
            <Input name="q" placeholder="Keress cikkekre, személyekre..." value={data.keresoKifejezes} />
            <Button type="submit" color="blue"><SearchSolid class="w-4 h-4 mr-2"/> Keresés</Button>
            {#if data.keresoKifejezes}
                <Button href="?kategoria={data.aktivKategoria}" color="light">Törlés</Button>
            {/if}
        </form>
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
                                    <Badge color="red" rounded class="font-bold">📉 TS: {elemzes.pontszam}</Badge>
                                {:else if elemzes.pontszam <= 70}
                                    <Badge color="yellow" rounded class="font-bold">📊 TS: {elemzes.pontszam}</Badge>
                                {:else}
                                    <Badge color="green" rounded class="font-bold">🚀 TS: {elemzes.pontszam}</Badge>
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

{#if showToast}
    <div transition:fly={{ y: 30, duration: 300 }} class="fixed bottom-5 right-5 z-[100] max-w-xs shadow-2xl">
        <Toast color={toastType === 'success' ? 'green' : 'red'} class="border dark:border-gray-700">
            <svelte:fragment slot="icon">
                {#if toastType === 'success'}
                    <CheckCircleSolid class="w-5 h-5" />
                {:else}
                    <CloseCircleSolid class="w-5 h-5" />
                {/if}
            </svelte:fragment>
            <span class="text-sm font-bold text-gray-900 dark:text-white">{toastMessage}</span>
        </Toast>
    </div>
{/if}