<script lang="ts">
    import { Card, Button, Label, Input, Alert } from 'flowbite-svelte';

    let email = '';
    let password = '';
    
    let hibaUzenet = '';
    let sikerUzenet = '';
    let loading = false;

    const handleLogin = async () => {
        hibaUzenet = '';
        sikerUzenet = '';
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
            } else {
                sikerUzenet = 'Sikeres bejelentkezés! Betöltés...';
                
                // Sikeres bejelentkezés után átirányítja a főoldalra
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
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
            Bejelentkezés
        </h1>

        {#if hibaUzenet}
            <Alert color="red" class="mb-4">{hibaUzenet}</Alert>
        {/if}
        {#if sikerUzenet}
            <Alert color="green" class="mb-4">{sikerUzenet}</Alert>
        {/if}

        <form class="space-y-4 md:space-y-6" on:submit|preventDefault={handleLogin}>
            <div>
                <Label for="email" class="mb-2">Email cím</Label>
                <Input type="email" name="email" id="email" placeholder="nev@pelda.hu" bind:value={email} required />
            </div>
            <div>
                <Label for="password" class="mb-2">Jelszó</Label>
                <Input type="password" name="password" id="password" placeholder="••••••••" bind:value={password} required />
            </div>
            
            <Button type="submit" class="w-full" disabled={loading}>
                {loading ? 'Bejelentkezés folyamatban...' : 'Bejelentkezés'}
            </Button>
            
            <p class="text-sm font-light text-gray-500 dark:text-gray-400">
                Még nincs fiókod? <a href="/register" class="font-medium text-primary-600 hover:underline dark:text-primary-500">Regisztrálj itt</a>
            </p>
        </form>
    </Card>
</div>