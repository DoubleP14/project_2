<script lang="ts">
    import { Card, Button, Alert } from 'flowbite-svelte';
    import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
    import { enhance } from '$app/forms';

    export let data;
    export let form;

    let folyamatban = false;
</script>

<svelte:head>
    <title>Fiók törlése – News Trends</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-red-50 to-gray-50 dark:from-gray-900 dark:to-gray-900 px-4 py-12">
    <Card class="w-full max-w-md shadow-xl" size="lg">
        {#if !data.ervenyes}
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Fiók törlése</h1>
            <Alert color="red" class="mt-6 mb-4">A link érvénytelen, lejárt vagy már felhasználták. Új megerősítő levelet a Beállítások › Fiók törlése résznél kérhetsz.</Alert>
            <Button href="/settings" color="alternative" class="w-full">Tovább a Beállításokhoz</Button>
        {:else}
            <ExclamationCircleOutline class="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 class="text-center text-2xl font-bold text-gray-900 dark:text-white">Biztosan törlöd a fiókodat?</h1>
            <p class="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
                A(z) <b>{data.email}</b> fiók és minden hozzá tartozó adat (hírforrások, elemzések, beállítások, API kulcsok) <b>véglegesen törlődik</b>. Ezt nem lehet visszavonni.
            </p>
            <p class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                A korábban kiállított számlák a számviteli törvény alapján 8 évig megmaradnak a Számlázz.hu rendszerében.
            </p>

            {#if form?.message}
                <Alert color="red" class="mt-4">{form.message}</Alert>
            {/if}

            <form method="POST" class="mt-6 flex flex-col gap-3" use:enhance={() => { folyamatban = true; return async ({ update }) => { await update(); folyamatban = false; }; }}>
                <input type="hidden" name="token" value={data.token} />
                <Button color="red" type="submit" class="w-full font-bold" disabled={folyamatban}>
                    {folyamatban ? 'Törlés...' : 'Igen, véglegesen törlöm a fiókomat'}
                </Button>
                <Button href="/" color="alternative" class="w-full">Mégse, megtartom</Button>
            </form>
        {/if}
    </Card>
</div>
