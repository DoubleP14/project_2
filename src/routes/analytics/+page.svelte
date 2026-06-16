<script lang="ts">
    import { Card, Progressbar } from 'flowbite-svelte';
    import { ChartPieSolid, NewspaperSolid, FireSolid } from 'flowbite-svelte-icons';

    export let data;

    // Segédfüggvény a százalékok kiszámolásához
    $: szazalek = (ertek: number) => {
        if (data.osszesElemzes === 0) return 0;
        return Math.round((ertek / data.osszesElemzes) * 100);
    };

    // Szín meghatározása a globális átlag alapján
    $: tsSzinSema = (score: number) => {
        if (score <= 30) return 'text-red-500 dark:text-red-400';
        if (score <= 70) return 'text-yellow-500 dark:text-yellow-400';
        return 'text-green-500 dark:text-green-400';
    };
</script>

<div class="container mx-auto p-4 mt-8 max-w-5xl">
    <h1 class="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
        <ChartPieSolid class="w-10 h-10 text-blue-600 dark:text-blue-500" />
        Rendszer Statisztikák
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card class="text-center shadow-lg dark:bg-gray-800">
            <h5 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Feldolgozott Hírek</h5>
            <span class="text-5xl font-extrabold text-blue-600 dark:text-blue-400">{data.osszesElemzes}</span>
            <p class="text-sm mt-2 text-gray-500">AI által kielemzett cikkek</p>
        </Card>

        <Card class="text-center shadow-lg dark:bg-gray-800">
            <h5 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Átlagos Hírérték (TS)</h5>
            <span class="text-5xl font-extrabold {tsSzinSema(data.atlagosTrustScore)}">{data.atlagosTrustScore} <span class="text-2xl">/100</span></span>
            <p class="text-sm mt-2 text-gray-500">A teljes adatbázis súlyozott átlaga</p>
        </Card>

        <Card class="text-center shadow-lg dark:bg-gray-800">
            <h5 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Figyelt Források</h5>
            <span class="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">{data.forrasok.length}</span>
            <p class="text-sm mt-2 text-gray-500">Egyedi RSS és YouTube csatornák</p>
        </Card>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        <Card class="shadow-lg dark:bg-gray-800 w-full max-w-none">
            <h5 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Hangulati Megoszlás</h5>
            
            <div class="space-y-4">
                <div>
                    <div class="flex justify-between mb-1 text-sm font-medium text-green-700 dark:text-green-400">
                        <span>Pozitív hírek ({data.stat.POZITIV} db)</span>
                        <span>{szazalek(data.stat.POZITIV)}%</span>
                    </div>
                    <Progressbar progress={szazalek(data.stat.POZITIV)} color="green" size="h-2.5" />
                </div>
                
                <div>
                    <div class="flex justify-between mb-1 text-sm font-medium text-red-700 dark:text-red-400">
                        <span>Negatív hírek ({data.stat.NEGATIV} db)</span>
                        <span>{szazalek(data.stat.NEGATIV)}%</span>
                    </div>
                    <Progressbar progress={szazalek(data.stat.NEGATIV)} color="red" size="h-2.5" />
                </div>

                <div>
                    <div class="flex justify-between mb-1 text-sm font-medium text-gray-700 dark:text-gray-400">
                        <span>Semleges hírek ({data.stat.SEMLEGES} db)</span>
                        <span>{szazalek(data.stat.SEMLEGES)}%</span>
                    </div>
                    <Progressbar progress={szazalek(data.stat.SEMLEGES)} color="gray" size="h-2.5" />
                </div>
            </div>
        </Card>

        <Card class="shadow-lg dark:bg-gray-800 w-full max-w-none">
            <h5 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FireSolid class="w-5 h-5 text-orange-500" /> Hírérték és Minőség Szerint
            </h5>
            
            <div class="space-y-4">
                <div>
                    <div class="flex justify-between mb-1 text-sm font-medium text-green-700 dark:text-green-400">
                        <span>Kiemelkedő / Stratégiai (71-100 TS: {data.trustScoreMegoszlas.kiemelkedo} db)</span>
                        <span>{szazalek(data.trustScoreMegoszlas.kiemelkedo)}%</span>
                    </div>
                    <Progressbar progress={szazalek(data.trustScoreMegoszlas.kiemelkedo)} color="green" size="h-2.5" />
                </div>
                
                <div>
                    <div class="flex justify-between mb-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        <span>Normál Napi Tartalom (31-70 TS: {data.trustScoreMegoszlas.normal} db)</span>
                        <span>{szazalek(data.trustScoreMegoszlas.normal)}%</span>
                    </div>
                    <Progressbar progress={szazalek(data.trustScoreMegoszlas.normal)} color="yellow" size="h-2.5" />
                </div>

                <div>
                    <div class="flex justify-between mb-1 text-sm font-medium text-red-700 dark:text-red-400">
                        <span>Alacsony Érték / Clickbait (0-30 TS: {data.trustScoreMegoszlas.clickbait} db)</span>
                        <span>{szazalek(data.trustScoreMegoszlas.clickbait)}%</span>
                    </div>
                    <Progressbar progress={szazalek(data.trustScoreMegoszlas.clickbait)} color="red" size="h-2.5" />
                </div>
            </div>
        </Card>
    </div>

    <Card size="xl" class="shadow-lg dark:bg-gray-800 w-full max-w-none">
        <h5 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <NewspaperSolid class="w-5 h-5" /> Aktív Hírforrások terheltsége
        </h5>
        
        <div class="flex flex-wrap gap-4">
            {#each data.forrasok as forras}
                <div class="flex-1 min-w-[280px] p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center transition-all hover:shadow-md">
                    <div>
                        <p class="font-bold text-gray-900 dark:text-white">{forras.forras_nev || 'Ismeretlen forrás'}</p>
                        <a href={forras.forras_url} target="_blank" class="text-xs text-blue-500 hover:underline">{forras.forras_url}</a>
                    </div>
                    <span class="whitespace-nowrap bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300 ml-3">
                        {forras._count.hirek} hír
                    </span>
                </div>
            {/each}
        </div>
    </Card>
</div>