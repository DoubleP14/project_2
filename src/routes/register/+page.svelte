<script lang="ts">
    import { Card, Button, Label, Input, Alert, Helper } from 'flowbite-svelte';
    import GoogleGomb from '$lib/components/GoogleGomb.svelte';

    export let data;

    const MIN_JELSZO_HOSSZ = 8;

    // Ezek a változók fogják tárolni, amit a felhasználó beír
    let username = '';
    let email = '';
    let password = '';

    // Visszajelzések a UI-on
    let hibaUzenet = '';
    let sikerUzenet = '';
    let loading = false;

    $: jelszoRovid = password.length > 0 && password.length < MIN_JELSZO_HOSSZ;

    // Ez a függvény fut le, amikor rákattintanak a "Regisztráció" gombra
    const handleRegister = async () => {
        hibaUzenet = '';
        sikerUzenet = '';

        if (password.length < MIN_JELSZO_HOSSZ) {
            hibaUzenet = `A jelszónak legalább ${MIN_JELSZO_HOSSZ} karakter hosszúnak kell lennie.`;
            return;
        }

        loading = true;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                hibaUzenet = data.error;
            } else {
                // A szerver üzenete: a belépéshez előbb meg kell erősíteni az e-mail címet
                sikerUzenet = data.message;
                username = '';
                email = '';
                password = '';
            }
        } catch (err) {
            hibaUzenet = 'Hálózati hiba történt. Kérlek próbáld újra!';
        } finally {
            loading = false;
        }
    };
</script>

<svelte:head>
    <title>Regisztráció – News Trends</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-900 px-4 py-12">
    <Card class="w-full max-w-md shadow-xl" size="lg">
        <h1 class="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            Fiók létrehozása
        </h1>
        <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">Ingyenes Starter csomag, bankkártya nélkül.</p>

        {#if hibaUzenet}
            <Alert color="red" class="mb-4">{hibaUzenet}</Alert>
        {/if}
        {#if sikerUzenet}
            <Alert color="green" class="mb-4">{sikerUzenet}</Alert>
        {/if}

        <form class="space-y-5" on:submit|preventDefault={handleRegister}>
            {#if data.googleBeallitva}
                <GoogleGomb szoveg="Regisztráció Google-fiókkal" />
            <div class="flex items-center gap-3 text-xs uppercase text-gray-400">
                <span class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>vagy e-mail címmel<span class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
            </div>
            {/if}
            <div>
                <Label for="username" class="mb-2">Felhasználónév</Label>
                <Input type="text" name="username" id="username" placeholder="pl. KovacsAnna" autocomplete="username" bind:value={username} required />
            </div>
            <div>
                <Label for="email" class="mb-2">E-mail cím</Label>
                <Input type="email" name="email" id="email" placeholder="nev@ceg.hu" autocomplete="email" bind:value={email} required />
            </div>
            <div>
                <Label for="password" class="mb-2">Jelszó</Label>
                <Input type="password" name="password" id="password" placeholder="••••••••" autocomplete="new-password" minlength={MIN_JELSZO_HOSSZ} bind:value={password} required color={jelszoRovid ? 'red' : 'base'} />
                <Helper class="mt-1.5" color={jelszoRovid ? 'red' : 'gray'}>Legalább {MIN_JELSZO_HOSSZ} karakter.</Helper>
            </div>

            <Button type="submit" class="w-full" disabled={loading}>
                {loading ? 'Regisztráció folyamatban...' : 'Regisztráció'}
            </Button>

            <p class="text-xs leading-5 text-gray-500 dark:text-gray-400">
                A regisztrációval tudomásul veszed az
                <a href="/adatvedelem" target="_blank" class="font-medium text-primary-600 hover:underline dark:text-primary-500">Adatkezelési tájékoztatóban</a>
                foglaltakat. A fiókodat és minden adatodat bármikor véglegesen törölheted a Beállításokban.
            </p>

            <p class="text-center text-sm text-gray-500 dark:text-gray-400">
                Már van fiókod? <a href="/login" class="font-medium text-primary-600 hover:underline dark:text-primary-500">Jelentkezz be</a>
            </p>
        </form>
    </Card>
</div>
