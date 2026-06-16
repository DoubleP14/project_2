<!-- src/routes/checkout/+page.svelte -->
<script lang="ts">
    import { Button, Card } from 'flowbite-svelte';
    import { ShieldCheckSolid, ArrowLeftOutline, CreditCardSolid } from 'flowbite-svelte-icons';
    import { page } from '$app/stores';

    export let data;
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
    <Card size="md" class="shadow-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        
        <!-- Vissza gomb -->
        <a href="/settings" class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-6">
            <ArrowLeftOutline class="w-4 h-4" /> Vissza a vezérlőpultra
        </a>

        <!-- Csomag részletei -->
        <div class="text-center border-b border-gray-100 dark:border-gray-700 pb-6 mb-6">
            <span class="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-3 py-1 rounded-full">
                Biztonságos Fizetés
            </span>
            <h1 class="text-2xl font-extrabold text-gray-900 dark:text-white mt-3">
                {data.packageDetails.name}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Fiók: <span class="font-medium text-gray-700 dark:text-gray-300">{data.packageDetails.email}</span>
            </p>
            <div class="mt-4 flex items-baseline justify-center gap-1">
                <span class="text-4xl font-black text-gray-950 dark:text-white">
                    {data.packageDetails.price.toLocaleString('hu-HU')} Ft
                </span>
                <span class="text-gray-500 text-sm">/ egyszeri díj</span>
            </div>
        </div>

        {#if $page.url.searchParams.get('canceled')}
            <div class="p-4 mb-6 text-sm text-amber-800 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                ⚠️ **A tranzakció meg lett szakítva.** Nem történt levonás. Ha meggondoltad magad, alább újra megpróbálhatod.
            </div>
        {/if}

        <!-- Előnyök emlékeztető -->
        <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">A csomag tartalma:</p>
            <div class="flex items-center gap-2">✓ Korlátlan RSS és YouTube hírforrás</div>
            <div class="flex items-center gap-2">✓ Azonnali riasztások (Discord & Telegram)</div>
            <div class="flex items-center gap-2">✓ TrustScore minőségi pontozás</div>
        </div>

        <!-- STRIPE ÁTIRÁNYÍTÓ GOMB -->
        <!-- Nincs use:enhance, így a böngésző natívan el tud navigálni a külső Stripe oldalra -->
        <form method="POST" action="?/processPayment">
            <input type="hidden" name="tier" value={data.packageDetails.tier} />
            <Button type="submit" color="purple" size="xl" class="w-full text-base font-bold shadow-lg flex items-center justify-center gap-2">
                <CreditCardSolid class="w-5 h-5" />
                Tovább a biztonságos fizetésre
            </Button>
        </form>

        <div class="mt-6 text-center text-xs text-gray-400 space-y-1">
            <p class="flex items-center justify-center gap-1">
                <ShieldCheckSolid class="w-4 h-4 text-green-500" /> 
                A fizetést a 256 bites titkosítású **Stripe** kezeli.
            </p>
            <p>A kártyaadatok soha nem érintik a mi szerverünket.</p>
        </div>

    </Card>
</div>