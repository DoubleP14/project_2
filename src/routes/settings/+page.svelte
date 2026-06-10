<script lang="ts">
    import { enhance } from '$app/forms'; 
    import { Card, Input, Label, Button, Alert, Select, Toggle, Badge, Modal } from 'flowbite-svelte';
    import { InfoCircleSolid, LockSolid, BellSolid, GlobeSolid, FilterSolid, EditOutline, TrashBinOutline } from 'flowbite-svelte-icons';

    export let data;
    export let form;

    let aiProviders = [
        { value: 'GROQ', name: 'Groq (Llama 3.1 - Leggyorsabb)' },
        { value: 'OPENAI', name: 'OpenAI (ChatGPT)' },
        { value: 'GOOGLE', name: 'Google (Gemini)' },
        { value: 'ANTHROPIC', name: 'Anthropic (Claude)' }
    ];

    let notificationChannels = [
        { value: 'EMAIL', name: 'E-mail üzenet' },
        { value: 'DISCORD', name: 'Discord Webhook' },
        { value: 'TELEGRAM', name: 'Telegram Bot' }
    ];

    let sourceTypes = [
        { value: 'RSS', name: 'Hagyományos Weboldal (RSS)' },
        { value: 'YOUTUBE', name: 'YouTube Csatorna' }
    ];

    let selectedProvider = data.felhasznalo?.ai_provider || 'GROQ';
    let selectedChannel = data.felhasznalo?.preferalt_csatorna || 'EMAIL';
    let selectedSourceType = 'RSS'; 
    let isOwnSourceChecked = false;

    let editModalOpen = false;
    let editingSource: any = null;
    let editFormData = {
        id: 0,
        forras_nev: '',
        forras_url: '',
        rss_url: '',
        szuro_kifejezesek: ''
    };

    function openEditModal(forras: any) {
        editingSource = forras;
        editFormData = {
            id: forras.id,
            forras_nev: forras.forras_nev,
            forras_url: forras.forras_url,
            rss_url: forras.rss_url || '',
            szuro_kifejezesek: forras.szuro_kifejezesek || ''
        };
        editModalOpen = true;
    }

    function closeEditModal() {
        editModalOpen = false;
        editingSource = null;
    }
</script>

<div class="container mx-auto p-4 mt-8 max-w-3xl">
    <h1 class="text-3xl font-extrabold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
        Rendszer Beállítások
    </h1>

    {#if form?.message}
        <Alert color={form.success ? 'green' : 'red'} class="mb-6 animate-fade-in">
            <InfoCircleSolid slot="icon" class="w-4 h-4" />
            <span class="font-medium">{form.message}</span>
        </Alert>
    {/if}

    <Card size="xl" class="shadow-lg dark:bg-gray-800 w-full max-w-none">
        
        <form method="POST" action="?/saveSettings" use:enhance class="space-y-8">
            
            <div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Mesterséges Intelligencia és API Kulcsok</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Válaszd ki a preferált AI modellt és add meg a saját kulcsaidat a rendszerhez (BYOK).
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label for="ai_provider" class="mb-2">AI Szolgáltató</Label>
                        <Select id="ai_provider" name="ai_provider" items={aiProviders} bind:value={selectedProvider} />
                    </div>
                    <div>
                        <Label for="api_key" class="mb-2 flex items-center gap-2">
                            <LockSolid class="w-4 h-4 text-gray-500" /> AI API Kulcs
                        </Label>
                        <Input 
                            type="password" 
                            id="api_key" 
                            name="api_key" 
                            placeholder="Mentve! Írd felül újhoz..." 
                            value={data.felhasznalo?.api_key ?? ''} 
                        />
                    </div>
                    
                    <div class="md:col-span-2 mt-2">
                        <Label for="youtube_api_key" class="mb-2 flex items-center gap-2">
                            <LockSolid class="w-4 h-4 text-gray-500" /> YouTube API Kulcs
                        </Label>
                        <Input 
                            type="password" 
                            id="youtube_api_key" 
                            name="youtube_api_key" 
                            placeholder="Mentve! Írd felül újhoz..." 
                            value={data.felhasznalo?.youtube_api_key ?? ''} 
                        />
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <BellSolid class="w-5 h-5 text-indigo-500" /> Riasztási Beállítások
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Hogyan szóljon a rendszer, ha fontos hírt talál a konkurenciánál?
                </p>

                <div class="mb-4">
                    <Label for="preferalt_csatorna" class="mb-2">Elsődleges Értesítési Csatorna</Label>
                    <Select id="preferalt_csatorna" name="preferalt_csatorna" items={notificationChannels} bind:value={selectedChannel} />
                </div>

                <div class="animate-fade-in {selectedChannel !== 'DISCORD' ? 'hidden' : ''}">
                    <Label for="discord_webhook" class="mb-2 flex items-center gap-2">
                        <LockSolid class="w-4 h-4 text-gray-500" /> Discord Webhook URL
                    </Label>
                    <Input type="password" id="discord_webhook" name="discord_webhook" placeholder="https://discord.com/api/webhooks/..." value={data.felhasznalo?.discord_webhook ?? ''} />
                </div>

                <div class="animate-fade-in {selectedChannel !== 'TELEGRAM' ? 'hidden' : ''}">
                    <Label for="telegram_chat_id" class="mb-2 flex items-center gap-2">
                        <LockSolid class="w-4 h-4 text-gray-500" /> Telegram Chat ID
                    </Label>
                    <Input type="password" id="telegram_chat_id" name="telegram_chat_id" placeholder="pl. 123456789" value={data.felhasznalo?.telegram_chat_id ?? ''} />
                </div>

                <div class="animate-fade-in {selectedChannel !== 'EMAIL' ? 'hidden' : ''}">
                    <p class="text-sm text-green-600 dark:text-green-400 font-medium">
                        Az értesítéseket a fiókodhoz tartozó regisztrált e-mail címre küldjük.
                    </p>
                </div>
            </div>

            <div class="pt-4">
                <Button type="submit" color="blue" class="w-full sm:w-auto px-8">
                    Beállítások Mentése
                </Button>
            </div>
        </form>

        <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/50">
            <form method="POST" action="?/testNotification" use:enhance>
                <Button type="submit" color="alternative" class="w-full sm:w-auto flex items-center gap-2">
                    <svg class="w-5 h-5 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6Z"/>
                        <path d="M10 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3Z"/>
                    </svg>
                    {#if selectedChannel === 'DISCORD'}
                        Teszt Riasztás Küldése a Discordra
                    {:else if selectedChannel === 'EMAIL'}
                        Teszt Riasztás Küldése E-mailben
                    {:else}
                        Teszt Riasztás Küldése ({selectedChannel})
                    {/if}
                </Button>
            </form>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <GlobeSolid class="w-5 h-5 text-green-500" /> Figyelt Hírforrások
            </h3>
            
            {#if data.forrasok && data.forrasok.length > 0}
                <div class="grid grid-cols-1 gap-4 mb-8">
                    {#each [...data.forrasok].sort((a, b) => (b.is_own_source ? 1 : 0) - (a.is_own_source ? 1 : 0)) as forras}
                        <div class="flex flex-col p-4 bg-white dark:bg-gray-800/80 rounded-xl border {forras.is_own_source ? 'border-green-500 ring-1 ring-green-500/50' : 'border-gray-200 dark:border-gray-700'} shadow-sm hover:shadow-md transition-all {!forras.aktiv ? 'opacity-50 grayscale-[30%]' : ''}">
                            
                            <div class="flex justify-between items-center w-full">
                                <div class="overflow-hidden flex-1">
                                    <div class="flex items-center gap-2 mb-1.5">
                                        <p class="font-bold text-gray-900 dark:text-white text-lg truncate">{forras.forras_nev}</p>
                                        {#if forras.tipus === 'YOUTUBE'}<Badge color="red" size="sm" class="font-semibold">YouTube</Badge>
                                        {:else}<Badge color="dark" size="sm" class="font-semibold">RSS</Badge>{/if}
                                        {#if forras.is_own_source}<Badge color="green" size="sm" class="font-semibold">Saját</Badge>{/if}
                                        {#if !forras.aktiv}<Badge color="purple" size="sm" class="font-semibold">Inaktív</Badge>{/if}
                                    </div>
                                    <a href={forras.forras_url} target="_blank" class="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block w-fit">
                                        {forras.forras_url}
                                    </a>
                                </div>
                                
                                <div class="flex items-center gap-3 ml-4 border-l border-gray-200 dark:border-gray-700 pl-4 py-1">
                                    <form method="POST" action="?/toggleSource" use:enhance class="flex items-center" title="Ki/Be kapcsolás">
                                        <input type="hidden" name="id" value={forras.id} />
                                        <Toggle 
                                            color="green" size="small" checked={forras.aktiv} 
                                            on:change={(e) => (e.target as HTMLElement)?.closest('form')?.requestSubmit()} class="cursor-pointer"
                                        />
                                    </form>

                                    <Button type="button" size="xs" color="light" class="p-2 border-gray-300 dark:border-gray-600 hover:text-blue-600 dark:hover:text-blue-400" on:click={() => openEditModal(forras)} title="Szerkesztés">
                                        <EditOutline class="w-4 h-4" />
                                    </Button>

                                    <form method="POST" action="?/deleteSource" use:enhance class="inline">
                                        <input type="hidden" name="id" value={forras.id} />
                                        <Button type="submit" color="light" size="xs" class="p-2 border-gray-300 dark:border-gray-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-500" title="Törlés">
                                            <TrashBinOutline class="w-4 h-4" />
                                        </Button>
                                    </form>
                                </div>
                            </div>

                            {#if forras.szuro_kifejezesek}
                                <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                    <div class="flex flex-wrap gap-1.5">
                                        {#each forras.szuro_kifejezesek.split(',') as filter}
                                            <Badge color="indigo" size="xs" outline class="bg-indigo-50 dark:bg-indigo-900/20">{filter.trim()}</Badge>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="text-sm text-gray-500 dark:text-gray-400 italic mb-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-center border border-dashed border-gray-300 dark:border-gray-700">Még nem adtál hozzá hírforrást.</p>
            {/if}

            <form method="POST" action="?/addSource" use:enhance class="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
                <h4 class="font-semibold text-lg text-gray-900 dark:text-white mb-5">Új forrás hozzáadása</h4>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div class="md:col-span-2">
                        <Label for="tipus" class="mb-2 font-medium">Forrás Típusa</Label>
                        <Select id="tipus" name="tipus" items={sourceTypes} bind:value={selectedSourceType} />
                    </div>

                    <div>
                        <Label for="forras_nev" class="mb-2 font-medium">Forrás Neve</Label>
                        <Input type="text" id="forras_nev" name="forras_nev" required placeholder="Név megadása..." />
                    </div>
                    
                    <div>
                        <Label for="forras_url" class="mb-2 font-medium">URL</Label>
                        <Input type="url" id="forras_url" name="forras_url" required placeholder="https://..." />
                    </div>
                    
                    {#if selectedSourceType === 'RSS'}
                        <div class="md:col-span-2 animate-fade-in">
                            <Label for="rss_url" class="mb-2 font-medium">RSS link (Opcionális)</Label>
                            <Input type="url" id="rss_url" name="rss_url" placeholder="https://telex.hu/rss" />
                        </div>
                    {/if}

                    <div class="md:col-span-2 animate-fade-in">
                        <Label for="szuro_kifejezesek" class="mb-2 font-medium">Szűrendő szlogenek (opcionális)</Label>
                        <Input id="szuro_kifejezesek" name="szuro_kifejezesek" placeholder="pl.: 🟩, Támogasd te is" />
                    </div>

                    <div class="md:col-span-2 mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Toggle bind:checked={isOwnSourceChecked} color="green" class="font-medium text-gray-900 dark:text-gray-300">
                            Ez az én SAJÁT forrásom (Ezzel akarom összehasonlítani a többieket)
                        </Toggle>
                        <input type="hidden" name="is_own_source" value={isOwnSourceChecked} />
                    </div>
                </div>

                <Button type="submit" color="green" class="w-full sm:w-auto mt-2 px-6">
                    + Hozzáadás a figyelőlistához
                </Button>
            </form>
        </div>
    </Card>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
    .hidden { display: none !important; }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>