<script lang="ts">
    import { Card, Button, Label, Input, Alert } from 'flowbite-svelte';
    import { enhance } from '$app/forms';

    export let form;

    let loading = false;
</script>

<svelte:head>
    <title>Elfelejtett jelszó – News Trends</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-900 px-4 py-12">
    <Card class="w-full max-w-md shadow-xl" size="lg">
        <h1 class="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            Elfelejtett jelszó
        </h1>
        <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
            Add meg a regisztrált e-mail címedet, és küldünk egy linket, amellyel új jelszót állíthatsz be.
        </p>

        {#if form?.message}
            <Alert color={form.success ? 'green' : 'red'} class="mb-4">{form.message}</Alert>
        {/if}

        {#if !form?.success}
            <form method="POST" class="space-y-5" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }}>
                <div>
                    <Label for="email" class="mb-2">E-mail cím</Label>
                    <Input type="email" name="email" id="email" placeholder="nev@ceg.hu" autocomplete="email" required />
                </div>
                <Button type="submit" class="w-full" disabled={loading}>
                    {loading ? 'Küldés folyamatban...' : 'Visszaállító link küldése'}
                </Button>
            </form>
        {/if}

        <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Eszedbe jutott? <a href="/login" class="font-medium text-primary-600 hover:underline dark:text-primary-500">Vissza a bejelentkezéshez</a>
        </p>
    </Card>
</div>
