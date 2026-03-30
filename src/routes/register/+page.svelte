<script lang="ts">
    import { Card, Button, Label, Input, Alert } from 'flowbite-svelte';

    // Ezek a változók fogják tárolni, amit a felhasználó beír
    let username = '';
    let email = '';
    let password = '';
    
    // Visszajelzések a UI-on
    let hibaUzenet = '';
    let sikerUzenet = '';
    let loading = false;

    // Ez a függvény fut le, amikor rákattintanak a "Regisztráció" gombra
    const handleRegister = async () => {
        hibaUzenet = '';
        sikerUzenet = '';
        loading = true;

        try {
            // Elküldjük az adatokat a saját API végpontomra!
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Ha a szerver hibát dob
                hibaUzenet = data.error;
            } else {
                // Ha minden tökéletes
                sikerUzenet = 'Sikeres regisztráció! Most már bejelentkezhetsz.';
                // Űrlap törlése
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

<div class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0 mt-8">
    <a href="/" class="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
        <span class="text-blue-600 ml-2">Hírelemző</span>
    </a>
    
    <Card class="w-full max-w-md" size="lg">
        <h1 class="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white mb-4">
            Fiók létrehozása
        </h1>

        {#if hibaUzenet}
            <Alert color="red" class="mb-4">{hibaUzenet}</Alert>
        {/if}
        {#if sikerUzenet}
            <Alert color="green" class="mb-4">{sikerUzenet}</Alert>
        {/if}

        <form class="space-y-4 md:space-y-6" on:submit|preventDefault={handleRegister}>
            <div>
                <Label for="username" class="mb-2">Felhasználónév</Label>
                <Input type="text" name="username" id="username" placeholder="pl. Hírolvasó123" bind:value={username} required />
            </div>
            <div>
                <Label for="email" class="mb-2">Email cím</Label>
                <Input type="email" name="email" id="email" placeholder="nev@pelda.hu" bind:value={email} required />
            </div>
            <div>
                <Label for="password" class="mb-2">Jelszó</Label>
                <Input type="password" name="password" id="password" placeholder="••••••••" bind:value={password} required />
            </div>
            
            <Button type="submit" class="w-full" disabled={loading}>
                {loading ? 'Regisztráció folyamatban...' : 'Regisztráció'}
            </Button>
            
            <p class="text-sm font-light text-gray-500 dark:text-gray-400">
                Már van fiókod? <a href="/login" class="font-medium text-primary-600 hover:underline dark:text-primary-500">Jelentkezz be itt</a>
            </p>
        </form>
    </Card>
</div>