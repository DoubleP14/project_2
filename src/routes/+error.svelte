<script lang="ts">
    import { page } from '$app/stores';
    import { Card, Button } from 'flowbite-svelte';
    import { ExclamationCircleSolid, ArrowLeftOutline } from 'flowbite-svelte-icons';
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
    <Card size="lg" class="text-center shadow-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        
        <div class="flex justify-center mb-6">
            <ExclamationCircleSolid class="w-24 h-24 text-red-500 animate-pulse" />
        </div>
        
        <h1 class="text-6xl font-extrabold text-gray-900 dark:text-white mb-4">
            {$page.status}
        </h1>
        
        <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            {#if $page.status === 404}
                Hoppá, eltévedtél a mátrixban!
            {:else if $page.status === 403}
                Ehhez az oldalhoz nincs jogosultságod!
            {:else if $page.status === 500}
                A szerver váratlanul összeomlott.
            {:else}
                Valami hiba csúszott a gépezetbe.
            {/if}
        </h2>
        
        <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {$page.error?.message || 'A keresett oldal nem található, vagy a rendszer átmeneti karbantartás alatt áll. Kérjük, próbáld újra később.'}
        </p>
        
        <div class="flex justify-center">
            <Button href="/" color="blue" size="lg" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold transition-transform hover:scale-105">
                <ArrowLeftOutline class="w-5 h-5" />
                Vissza a biztonságba
            </Button>
        </div>
        
    </Card>
</div>