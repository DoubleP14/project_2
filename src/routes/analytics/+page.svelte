<script lang="ts">
    import { Card, Badge, Button, Chart } from 'flowbite-svelte';
    import { ChartPieSolid, NewspaperSolid, FireSolid, ExclamationCircleSolid, RocketSolid, CogSolid } from 'flowbite-svelte-icons';
    import { onMount, onDestroy } from 'svelte';

    export let data;

    let labelObserver: MutationObserver | null = null;
    let themeObserver: MutationObserver | null = null;

    function applyLabelColor() {
    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? '#D1D5DB' : '#111827';

    document.querySelectorAll('.apexcharts-datalabel-label').forEach((el) => {
        const svgEl = el as SVGElement;
            if (svgEl.getAttribute('style') !== `fill: ${color} !important`) {
                svgEl.setAttribute('style', `fill: ${color} !important`);
            }
        });
    }

    function fixDonutLabel() {
        setTimeout(() => {
            applyLabelColor();

            if (!labelObserver) {
                const chartCanvas = document.querySelector('.apexcharts-canvas');
                if (chartCanvas) {
                    labelObserver = new MutationObserver(applyLabelColor);
                    labelObserver.observe(chartCanvas, {
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['fill', 'style']
                    });
                }
            }
        }, 50);
    }

        onMount(() => {
            themeObserver = new MutationObserver(() => fixDonutLabel());
            themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            });
        });

        onDestroy(() => {
            labelObserver?.disconnect();
            themeObserver?.disconnect();
        });
    
    // Szín meghatározása a globális átlag alapján
    $: tsSzinSema = (score: number) => {
        if (score <= 30) return 'text-red-500 dark:text-red-400';
        if (score <= 70) return 'text-yellow-500 dark:text-yellow-400';
        return 'text-green-500 dark:text-green-400';
    };

    // --- 1. GRAFIKON: HANGULAT (FÁNK DIAGRAM) ---
    $: donutOptions = {
        series: [data.stat.POZITIV, data.stat.NEGATIV, data.stat.SEMLEGES],
        colors: ['#31C48D', '#F05252', '#9CA3AF'],
        chart: {
            height: 320,
            type: 'donut' as 'donut',
            fontFamily: 'Inter, sans-serif',
            foreColor: '#E5E7EB',
            events: {
                mounted: () => fixDonutLabel(),
                updated: () => fixDonutLabel(),
            }
        },
        stroke: {
            colors: ['transparent'],
            lineCap: 'round' as 'round',
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontFamily: 'Inter, sans-serif',
                            offsetY: 20,
                            color: '#D1D5DB' 
                        },
                        total: {
                            showAlways: true,
                            show: true,
                            label: 'Összes hír',
                            fontFamily: 'Inter, sans-serif',
                            color: '#D1D5DB', 
                            formatter: function (w: any) {
                                return data.osszesElemzes + " db"
                            },
                        },
                        value: {
                            show: true,
                            fontFamily: 'Inter, sans-serif',
                            offsetY: -20,
                            color: '#FFFFFF', 
                            formatter: function (value: string) {
                                return value + " db"
                            },
                        },
                    },
                },
            },
        },
        labels: ['Pozitív', 'Negatív', 'Semleges'],
        dataLabels: {
            enabled: false,
        },
        legend: {
            position: 'bottom' as 'bottom',
            fontFamily: 'Inter, sans-serif',
            labels: { 
                colors: '#E5E7EB' 
            }
        },
        tooltip: { enabled: false },
        states: { hover: { filter: { type: 'none' } } }
    };

    // --- 2. GRAFIKON: HÍRÉRTÉK (OSZLOPDIAGRAM) ---
    $: barOptions = {
        series: [{
            name: 'Hírek száma',
            data: [data.trustScoreMegoszlas.kiemelkedo, data.trustScoreMegoszlas.normal, data.trustScoreMegoszlas.clickbait]
        }],
        chart: {
            type: 'bar' as 'bar',
            height: 320,
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
            foreColor: '#9CA3AF'
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '45%', 
                borderRadius: 4,
                distributed: true 
            },
        },
        tooltip: { enabled: false },
        states: {
            hover: { filter: { type: 'darken', value: 0.9 } }, // Finomabb hover effekt
        },
        stroke: { show: true, width: 0, colors: ['transparent'] },
        grid: {
            show: true,
            strokeDashArray: 4,
            padding: { left: 2, right: 2, top: -14 },
            borderColor: '#374151' 
        },
        dataLabels: { enabled: false },
        legend: { show: false },
        colors: ['#31C48D', '#FACA15', '#F05252'],
        xaxis: {
            categories: ['Kiemelkedő', 'Normál', 'Clickbait'],
            labels: {
                style: {
                    colors: ['#9CA3AF', '#9CA3AF', '#9CA3AF'], 
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#9CA3AF', fontFamily: 'Inter, sans-serif' },
                formatter: function (value: number) { return Math.round(value) + " db" }
            }
        },
    };
</script>

<div class="container mx-auto p-4 mt-8 max-w-5xl">
    <h1 class="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
        <ChartPieSolid class="w-10 h-10 text-blue-600 dark:text-blue-500" />
        Rendszer Statisztikák
    </h1>

    {#if data.forrasok.length === 0}
        
        <Card size="xl" class="text-center shadow-lg dark:bg-gray-800 w-full max-w-none py-16 mt-8 border border-gray-200 dark:border-gray-700">
            <RocketSolid class="w-24 h-24 mx-auto text-blue-500 mb-6 animate-bounce" />
            <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Üdv a fedélzeten! 🚀</h2>
            <p class="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                Úgy tűnik, még teljesen üres a Vezérlőpultod. Ahhoz, hogy az AI elkezdhessen dolgozni és kielemezze a konkurenciát, először meg kell adnod néhány hírforrást (pl. Telex, IGN, vagy egy YouTube csatorna)!
            </p>
            <Button href="/settings" color="blue" size="xl" class="font-bold shadow-md transition-transform hover:scale-105">
                <CogSolid class="w-5 h-5 mr-2" /> Első hírforrás hozzáadása
            </Button>
        </Card>

    {:else if data.osszesElemzes === 0}
        
        <Card size="xl" class="text-center shadow-lg dark:bg-gray-800 w-full max-w-none py-16 mt-8 border border-gray-200 dark:border-gray-700">
            <div class="flex justify-center mb-6">
                <CogSolid class="w-24 h-24 text-purple-500 animate-[spin_3s_linear_infinite]" />
            </div>
            <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">A Robotpilóta melegíti a motorokat... ⚙️</h2>
            <p class="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                Szuper, már felvettél <b>{data.forrasok.length} db</b> hírforrást! A háttérrendszer (Cron) jelenleg is dolgozik, vagy a következő ütemezett időpontban fogja letölteni és kielemezni a legfrissebb híreket. Nézz vissza egy picit később!
            </p>
            <Button href="/settings" color="alternative" size="lg" class="font-bold border-gray-300 dark:border-gray-600 hover:text-blue-600 transition-colors">
                Tovább a Beállításokhoz
            </Button>
        </Card>

    {:else}
        
        <div class="animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card class="text-center shadow-lg dark:bg-gray-800">
                    <h5 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">AI Által Elemzett Hírek</h5>
                    <span class="text-5xl font-extrabold text-blue-600 dark:text-blue-400">{data.osszesElemzes}</span>
                    <p class="text-sm mt-2 text-gray-500">Mélyrehatóan kielemezve</p>
                </Card>

                <Card class="text-center shadow-lg dark:bg-gray-800">
                    <h5 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Átlagos Hírérték (TS)</h5>
                    <span class="text-5xl font-extrabold {tsSzinSema(data.atlagosTrustScore)}">{data.atlagosTrustScore} <span class="text-2xl">/100</span></span>
                    <p class="text-sm mt-2 text-gray-500">A te hírfolyamod súlyozott átlaga</p>
                </Card>

                <Card class="text-center shadow-lg dark:bg-gray-800">
                    <h5 class="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">Saját Hírforrások</h5>
                    <span class="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">{data.forrasok.length}</span>
                    <p class="text-sm mt-2 text-gray-500">Aktív RSS és YouTube csatornák</p>
                </Card>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card class="shadow-lg dark:bg-gray-800 w-full max-w-none">
                    <div class="flex justify-between items-start mb-4">
                        <h5 class="text-xl font-bold leading-none text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700 w-full">Hangulati Megoszlás</h5>
                    </div>
                    <Chart options={donutOptions} />
                </Card>

                <Card class="shadow-lg dark:bg-gray-800 w-full max-w-none">
                    <h5 class="text-xl font-bold leading-none text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 w-full flex items-center gap-2">
                        <FireSolid class="w-5 h-5 text-orange-500" /> Hírérték és Minőség
                    </h5>
                    <Chart options={barOptions} />
                </Card>
            </div>

            <Card size="xl" class="shadow-lg dark:bg-gray-800 w-full max-w-none">
                <h5 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <NewspaperSolid class="w-5 h-5" /> Aktív Hírforrások terheltsége
                </h5>
                
                <div class="flex flex-wrap gap-4">
                    {#each data.forrasok as forras}
                        <div class="flex-1 min-w-[280px] p-4 rounded-lg border {forras.hiba_szamlalo && forras.hiba_szamlalo > 0 ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'} flex justify-between items-center transition-all hover:shadow-md">
                            <div>
                                <div class="flex items-center gap-2">
                                    <p class="font-bold text-gray-900 dark:text-white">{forras.forras_nev || 'Ismeretlen forrás'}</p>
                                    {#if forras.hiba_szamlalo && forras.hiba_szamlalo > 0}
                                        <Badge color="yellow" size="xs" class="flex items-center gap-1" title={forras.utolso_hiba || 'Hiba történt a letöltéskor'}>
                                            <ExclamationCircleSolid class="w-3 h-3" /> Hiba!
                                        </Badge>
                                    {/if}
                                </div>
                                <a href={forras.forras_url} target="_blank" class="text-xs text-blue-500 hover:underline break-all">{forras.forras_url}</a>
                            </div>
                            <span class="whitespace-nowrap bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300 ml-3">
                                Begyűjtve: {forras._count.hirek}
                            </span>
                        </div>
                    {/each}
                </div>
            </Card>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-in-out; }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>