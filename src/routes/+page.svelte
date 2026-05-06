<script lang="ts">
    import { Card, Badge, Button, Input, Helper, Spinner } from 'flowbite-svelte';
    import { enhance } from '$app/forms'; // Fontos a sima űrlapküldéshez újratöltés nélkül!

    export let data;
    export let form: any; 

    // --- GAP ANALYSIS (HIÁNYZÓ HÍREK) LOGIKA ---
    // 1. Összegyűjtji a SAJÁT cikkeknek a klaszter azonosítóit
    $: sajatKlaszterek = new Set(
        data.cikkek
            .filter((e: any) => e.hir.forras?.is_own_source)
            .map((e: any) => e.hir.cluster_id)
            .filter((id: any) => id !== null)
    );

    // 2. A képernyőre CSAK a konkurencia cikkeit engedi ki 
    $: konkurenciaCikkek = data.cikkek.filter((e: any) => !e.hir.forras?.is_own_source);


    // --- Kézi frissítés logikája ---
    let isSyncing = false;

    async function keziFrissites() {
        isSyncing = true; 
        try {
            const response = await fetch('/api/news/sync', { method: 'GET' });
            if (response.ok) {
                window.location.reload(); 
            } else {
                const resData = await response.json();
                alert(`${resData.uzenet || 'Hiba történt a frissítés során!'}`);
            }
        } catch (error) {
            console.error('Hiba a hálózati kérésben:', error);
            alert('Nem sikerült elérni a szervert.');
        } finally {
            isSyncing = false;
        }
    }
</script>

<div class="container mx-auto p-4 mt-8">
    
    <!-- FEJLÉC ÉS SYNC GOMB -->
    <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white text-center sm:text-left">
            <span class="text-blue-600 dark:text-blue-500">Hírelemző</span>
        </h1>
        
        <Button on:click={keziFrissites} disabled={isSyncing} color="alternative" class="font-medium shadow-sm">
            {#if isSyncing}
                <Spinner class="me-2" size="4" /> Hírek letöltése és AI elemzés...
            {:else}
                Kézi Frissítés (Sync)
            {/if}
        </Button>
    </div>

    <!-- KIEMELT TÉMA (SZŰRÉS) -->
    <div class="mb-10 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Célzott Szűrés (Kulcsszavak)</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ha megadsz kulcsszavakat, csak azokat a híreket fogod látni, amelyek megfelelnek ezeknek. Ha üres, mindent látsz.
        </p>
        
        <form method="POST" action="?/addKeyword" use:enhance class="flex gap-2 mb-2 max-w-lg">
            <Input name="kulcsszo" placeholder="Pl. gazdaság, választás, adó..." required />
            <Button type="submit" color="blue">Hozzáadás</Button>
        </form>

        {#if form?.message}
            <Helper class="mb-4 text-red-600 dark:text-red-400 font-medium">{form.message}</Helper>
        {/if}

        <div class="flex flex-wrap gap-2 mt-4">
            {#each data.kulcsszavak as k}
                <form method="POST" action="?/deleteKeyword" use:enhance class="inline-block">
                    <input type="hidden" name="id" value={k.id} />
                    <button type="submit" class="border-none bg-transparent p-0 m-0 outline-none">
                        <Badge color="indigo" class="cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-colors px-3 py-1.5 text-sm font-medium">
                            {k.kulcsszo} <span class="ml-2 font-bold text-red-500 hover:text-red-700">✕</span>
                        </Badge>
                    </button>
                </form>
            {:else}
                <span class="text-sm text-gray-500 dark:text-gray-400 italic">Még nincsenek kulcsszavaid. Jelenleg a konkurencia összes hírét látod.</span>
            {/each}
        </div>
    </div>

    <!-- HÍRKÁRTYÁK MEGJELENÍTÉSE -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {#each konkurenciaCikkek as elemzes}
            
            <!-- GAP ANALYSIS: Ha van klaszter ID-je, de a saját listában nem szerepel -->
            {@const isHianyozo = elemzes.hir.cluster_id && !sajatKlaszterek.has(elemzes.hir.cluster_id)}

            <!-- Ha hiányzó hír, felnagyítja és előtérbe hozza -->
            <div class="relative transition-transform duration-300 {isHianyozo ? 'scale-[1.02] z-10' : ''}">
                
                <!-- PIROS VILLOGÓ JELVÉNY -->
                {#if isHianyozo}
                    <div class="absolute -top-3 -right-3 z-20 animate-pulse">
                        <Badge color="red" class="shadow-lg px-3 py-1.5 font-extrabold text-sm border border-red-500">
                            HIÁNYZÓ HÍR!
                        </Badge>
                    </div>
                {/if}

                <Card size="lg" class="flex flex-col justify-between h-full shadow-lg hover:shadow-xl transition-shadow {isHianyozo ? 'ring-4 ring-red-500 dark:ring-red-600' : ''}">
                    
                    <div class="mb-4">
                        <h5 class="mb-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {elemzes.hir.cim}
                        </h5>
                        
                        <div class="flex flex-wrap items-center gap-2 mb-4">
                            <!-- Forrás neve -->
                            <Badge color="dark" rounded class="font-bold border border-gray-600">
                                {elemzes.hir.forras?.forras_nev || 'Ismeretlen'}
                            </Badge>

                            <!-- Hangulat -->
                            {#if elemzes.hangulat === 'POZITIV'}
                                <Badge color="green" rounded>Pozitív</Badge>
                            {:else if elemzes.hangulat === 'NEGATIV'}
                                <Badge color="red" rounded>Negatív</Badge>
                            {:else}
                                <Badge color="dark" rounded>Semleges</Badge>
                            {/if}
                            
                            <!-- Dátum -->
                            {#if elemzes.hir.datum}
                                <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {new Date(elemzes.hir.datum).toLocaleDateString('hu-HU')}
                                </span>
                            {/if}
                        </div>

                        <p class="font-normal text-gray-700 dark:text-gray-400 leading-relaxed">
                            {elemzes.osszefoglalo}
                        </p>
                    </div>

                    <Button href={elemzes.hir.url ?? '#'} target="_blank" color="{isHianyozo ? 'red' : 'alternative'}" class="w-full mt-4 font-bold">
                        {isHianyozo ? 'Eredeti cikk elolvasása' : 'Eredeti cikk elolvasása'}
                    </Button>
                    
                </Card>
            </div>
        {/each}

        <!-- Ha a szűrés után nem maradt cikk -->
        {#if konkurenciaCikkek.length === 0}
            <div class="col-span-full p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                <p class="text-lg text-gray-600 dark:text-gray-400 font-medium">Nincs megjeleníthető cikk a konkurenciától a jelenlegi szűrőkkel.</p>
            </div>
        {/if}

    </div>
</div>