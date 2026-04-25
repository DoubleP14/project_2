<script lang="ts">
    import { Card, Input, Label, Button, Alert, Select } from 'flowbite-svelte';
    import { InfoCircleSolid, LockSolid, BellSolid } from 'flowbite-svelte-icons';

    export let data;
    export let form;

    // Legördülő opciók az AI-hoz
    let aiProviders = [
        { value: 'GROQ', name: 'Groq (Llama 3.1 - Leggyorsabb)' },
        { value: 'OPENAI', name: 'OpenAI (ChatGPT)' },
        { value: 'GOOGLE', name: 'Google (Gemini)' },
        { value: 'ANTHROPIC', name: 'Anthropic (Claude)' }
    ];

    // Legördülő opciók a riasztásokhoz
    let notificationChannels = [
        { value: 'EMAIL', name: 'E-mail üzenet' },
        { value: 'DISCORD', name: 'Discord Webhook' },
        { value: 'TELEGRAM', name: 'Telegram Bot' }
    ];

    // Alapértelmezett értékek beállítása, ha még nem lenne mentve
    let selectedProvider = data.felhasznalo?.ai_provider || 'GROQ';
    let selectedChannel = data.felhasznalo?.preferalt_csatorna || 'EMAIL';
</script>

<div class="container mx-auto p-4 mt-8 max-w-3xl">
    <h1 class="text-3xl font-extrabold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
        Rendszer Beállítások
    </h1>

    {#if form?.message}
        <Alert color={form.success ? 'green' : 'red'} class="mb-6">
            <InfoCircleSolid slot="icon" class="w-4 h-4" />
            <span class="font-medium">{form.message}</span>
        </Alert>
    {/if}

    <Card size="xl" class="shadow-lg dark:bg-gray-800 w-full max-w-none">
        <form method="POST" action="?/saveSettings" class="space-y-8">
            
            <div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Mesterséges Intelligencia</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Válaszd ki a preferált AI modellt és add meg a hozzá tartozó API kulcsot.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label for="ai_provider" class="mb-2">AI Szolgáltató</Label>
                        <Select id="ai_provider" name="ai_provider" items={aiProviders} bind:value={selectedProvider} />
                    </div>
                    <div>
                        <Label for="api_key" class="mb-2 flex items-center gap-2">
                            <LockSolid class="w-4 h-4 text-gray-500" /> API Kulcs
                        </Label>
                        <Input 
                            type="password" 
                            id="api_key" 
                            name="api_key" 
                            placeholder="sk-xxxxxxxxxxxxxxxx..." 
                            value={data.felhasznalo?.api_key ?? ''} 
                        />
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <BellSolid class="w-5 h-5 text-indigo-500" /> Riasztási Beállítások
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Hogyan szóljon a rendszer, ha "Hiányzó hírt" (Gap) talál a konkurenciánál?
                </p>

                <div class="mb-4">
                    <Label for="preferalt_csatorna" class="mb-2">Elsődleges Értesítési Csatorna</Label>
                    <Select id="preferalt_csatorna" name="preferalt_csatorna" items={notificationChannels} bind:value={selectedChannel} />
                </div>

                {#if selectedChannel === 'DISCORD'}
                    <div class="animate-fade-in">
                        <Label for="discord_webhook" class="mb-2">Discord Webhook URL</Label>
                        <Input type="url" id="discord_webhook" name="discord_webhook" placeholder="https://discord.com/api/webhooks/..." value={data.felhasznalo?.discord_webhook ?? ''} />
                    </div>
                {/if}

                {#if selectedChannel === 'TELEGRAM'}
                    <div class="animate-fade-in">
                        <Label for="telegram_chat_id" class="mb-2">Telegram Chat ID</Label>
                        <Input type="text" id="telegram_chat_id" name="telegram_chat_id" placeholder="pl. 123456789" value={data.felhasznalo?.telegram_chat_id ?? ''} />
                    </div>
                {/if}

                {#if selectedChannel === 'EMAIL'}
                    <p class="text-sm text-green-600 dark:text-green-400 font-medium">
                        Az értesítéseket a fiókodhoz tartozó e-mail címre küldjük.
                    </p>
                {/if}
            </div>

            <div class="pt-4">
                <Button type="submit" color="blue" class="w-full sm:w-auto px-8">
                    Beállítások Mentése
                </Button>
            </div>
        </form>
    </Card>
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>