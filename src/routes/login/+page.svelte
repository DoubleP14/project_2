<script lang="ts">
    import { Card, Button, Label, Input, Alert } from 'flowbite-svelte';
    import { page } from '$app/stores';

    let email = '';
    let password = '';

    let hibaUzenet = '';
    let sikerUzenet = '';
    let loading = false;

    // Visszajelzés az e-mail megerősítő linkről érkezőknek
    const megerositve = $page.url.searchParams.get('verified') === 'true';
    const ervenytelenLink = $page.url.searchParams.get('error') === 'invalid_token';
    const jelszoVisszaallitva = $page.url.searchParams.get('reset') === 'true';

    // Megerősítő e-mail újraküldése (ha a fiók még nincs aktiválva)
    let nincsMegerositve = false;
    let ujrakuldesFolyamatban = false;
    let ujrakuldesUzenet = '';
    let ujrakuldesHiba = false;

    const megerositoUjrakuldese = async () => {
        ujrakuldesFolyamatban = true;
        ujrakuldesUzenet = '';
        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            ujrakuldesHiba = !response.ok;
            ujrakuldesUzenet = data.message || data.error;
        } catch (err) {
            ujrakuldesHiba = true;
            ujrakuldesUzenet = 'Hálózati hiba történt. Kérlek próbáld újra!';
        } finally {
            ujrakuldesFolyamatban = false;
        }
    };

    const handleLogin = async () => {
        hibaUzenet = '';
        sikerUzenet = '';
        nincsMegerositve = false;
        ujrakuldesUzenet = '';
        loading = true;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                hibaUzenet = data.error;
                nincsMegerositve = data.code === 'EMAIL_NOT_VERIFIED';
            } else {
                sikerUzenet = 'Sikeres bejelentkezés! Betöltés...';
                window.location.href = '/dashboard';
            }
        } catch (err) {
            hibaUzenet = 'Hálózati hiba történt. Kérlek próbáld újra!';
        } finally {
            loading = false;
        }
    };
</script>

<svelte:head>
    <title>Bejelentkezés – News Trends</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-900 px-4 py-12">
    <Card class="w-full max-w-md shadow-xl" size="lg">
        <h1 class="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            Üdv újra!
        </h1>
        <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">Jelentkezz be a hírelemző felületedhez.</p>

        {#if megerositve}
            <Alert color="green" class="mb-4">Az e-mail címed sikeresen megerősítve! Most már bejelentkezhetsz.</Alert>
        {/if}
        {#if ervenytelenLink}
            <Alert color="red" class="mb-4">A megerősítő link érvénytelen vagy már felhasználták.</Alert>
        {/if}
        {#if jelszoVisszaallitva}
            <Alert color="green" class="mb-4">Az új jelszavad elmentve! Most már bejelentkezhetsz vele.</Alert>
        {/if}
        {#if hibaUzenet}
            <Alert color="red" class="mb-4">
                {hibaUzenet}
                {#if nincsMegerositve}
                    <div class="mt-3">
                        <Button size="xs" color="red" outline on:click={megerositoUjrakuldese} disabled={ujrakuldesFolyamatban}>
                            {ujrakuldesFolyamatban ? 'Küldés...' : 'Megerősítő e-mail újraküldése'}
                        </Button>
                    </div>
                {/if}
            </Alert>
        {/if}
        {#if ujrakuldesUzenet}
            <Alert color={ujrakuldesHiba ? 'red' : 'green'} class="mb-4">{ujrakuldesUzenet}</Alert>
        {/if}
        {#if sikerUzenet}
            <Alert color="green" class="mb-4">{sikerUzenet}</Alert>
        {/if}

        <form class="space-y-5" on:submit|preventDefault={handleLogin}>
            <div>
                <Label for="email" class="mb-2">E-mail cím</Label>
                <Input type="email" name="email" id="email" placeholder="nev@ceg.hu" autocomplete="email" bind:value={email} required />
            </div>
            <div>
                <div class="mb-2 flex items-center justify-between">
                    <Label for="password">Jelszó</Label>
                    <a href="/forgot-password" class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500">Elfelejtetted a jelszavad?</a>
                </div>
                <Input type="password" name="password" id="password" placeholder="••••••••" autocomplete="current-password" bind:value={password} required />
            </div>

            <Button type="submit" class="w-full" disabled={loading}>
                {loading ? 'Bejelentkezés folyamatban...' : 'Bejelentkezés'}
            </Button>

            <p class="text-center text-sm text-gray-500 dark:text-gray-400">
                Még nincs fiókod? <a href="/register" class="font-medium text-primary-600 hover:underline dark:text-primary-500">Regisztrálj ingyen</a>
            </p>
        </form>
    </Card>
</div>
