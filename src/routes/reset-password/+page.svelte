<script lang="ts">
    import { Card, Button, Label, Input, Alert, Helper } from 'flowbite-svelte';
    import { enhance } from '$app/forms';

    export let data;
    export let form;

    const MIN_JELSZO_HOSSZ = 8;

    let password = '';
    let passwordConfirm = '';
    let loading = false;

    $: jelszoRovid = password.length > 0 && password.length < MIN_JELSZO_HOSSZ;
    $: nemEgyezik = passwordConfirm.length > 0 && password !== passwordConfirm;
</script>

<svelte:head>
    <title>Új jelszó beállítása – News Trends</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-900 px-4 py-12">
    <Card class="w-full max-w-md shadow-xl" size="lg">
        <h1 class="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            Új jelszó beállítása
        </h1>

        {#if !data.ervenyes}
            <Alert color="red" class="mt-6 mb-4">A jelszó-visszaállító link érvénytelen, lejárt vagy már felhasználták.</Alert>
            <Button href="/forgot-password" class="w-full">Új link kérése</Button>
        {:else}
            <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">Add meg az új jelszavadat.</p>

            {#if form?.message}
                <Alert color="red" class="mb-4">{form.message}</Alert>
            {/if}

            <form method="POST" class="space-y-5" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }}>
                <input type="hidden" name="token" value={data.token} />
                <div>
                    <Label for="password" class="mb-2">Új jelszó</Label>
                    <Input type="password" name="password" id="password" autocomplete="new-password" minlength={MIN_JELSZO_HOSSZ} bind:value={password} required color={jelszoRovid ? 'red' : 'base'} />
                    <Helper class="mt-1.5" color={jelszoRovid ? 'red' : 'gray'}>Legalább {MIN_JELSZO_HOSSZ} karakter.</Helper>
                </div>
                <div>
                    <Label for="password_confirm" class="mb-2">Új jelszó még egyszer</Label>
                    <Input type="password" name="password_confirm" id="password_confirm" autocomplete="new-password" bind:value={passwordConfirm} required color={nemEgyezik ? 'red' : 'base'} />
                    {#if nemEgyezik}
                        <Helper class="mt-1.5" color="red">A két jelszó nem egyezik.</Helper>
                    {/if}
                </div>
                <Button type="submit" class="w-full" disabled={loading || jelszoRovid || nemEgyezik}>
                    {loading ? 'Mentés...' : 'Jelszó mentése'}
                </Button>
            </form>
        {/if}
    </Card>
</div>
