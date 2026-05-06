<script lang="ts">
    import { enhance } from '$app/forms'; 
    import { Card, Input, Label, Button, Alert, Select, Toggle, Badge } from 'flowbite-svelte';
    import { InfoCircleSolid, LockSolid, BellSolid, GlobeSolid } from 'flowbite-svelte-icons';

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

    // Legördülő opciók a Forrás típusához
    let sourceTypes = [
        { value: 'RSS', name: 'Hagyományos Weboldal (RSS)' },
        { value: 'YOUTUBE', name: 'YouTube Csatorna' },
        { value: 'TWITTER', name: 'Twitter / X Profil' }
    ];

    // Alapértelmezett értékek beállítása
    let selectedProvider = data.felhasznalo?.ai_provider || 'GROQ';
    let selectedChannel = data.felhasznalo?.preferalt_csatorna || 'EMAIL';
    
    // Alapértelmezett forrás típus
    let selectedSourceType = 'RSS'; 

    let isOwnSourceChecked = false;
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
                            placeholder="sk-xxxxxxxxxxxxxxxx..." 
                            value={data.felhasznalo?.api_key ?? ''} 
                        />
                    </div>
                    
                    <!-- ÚJ: YouTube API Kulcs -->
                    <div class="md:col-span-2 mt-2">
                        <Label for="youtube_api_key" class="mb-2 flex items-center gap-2">
                            <LockSolid class="w-4 h-4 text-gray-500" /> YouTube API Kulcs
                        </Label>
                        <Input 
                            type="password" 
                            id="youtube_api_key" 
                            name="youtube_api_key" 
                            placeholder="AIzaSy..." 
                            value={data.felhasznalo?.youtube_api_key ?? ''} 
                        />
                        <p class="text-xs text-gray-500 mt-1">
                            Opcionális. Ha üresen hagyod, a rendszer a központi tartalék kulcsot használja a videók lekéréséhez.
                        </p>
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

        <div class="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <GlobeSolid class="w-5 h-5 text-green-500" /> Figyelt Hírforrások
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Itt adhatod meg azokat az újságokat, csatornákat vagy profilokat, amiket a rendszernek figyelnie kell.
            </p>

            {#if data.forrasok && data.forrasok.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {#each data.forrasok as forras}
                        <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border {forras.is_own_source ? 'border-green-500' : 'border-gray-200 dark:border-gray-600'} shadow-sm">
                            <div class="overflow-hidden">
                                <div class="flex items-center gap-2 mb-1">
                                    <p class="font-bold text-gray-900 dark:text-white truncate">{forras.forras_nev}</p>
                                    
                                    <!-- Dinamikus Badge a forrás típusához -->
                                    {#if forras.tipus === 'YOUTUBE'}
                                        <Badge color="red" size="xs">YouTube</Badge>
                                    {:else if forras.tipus === 'TWITTER'}
                                        <Badge color="blue" size="xs">Twitter</Badge>
                                    {:else}
                                        <Badge color="dark" size="xs">RSS</Badge>
                                    {/if}

                                    {#if forras.is_own_source}
                                        <Badge color="green" size="xs">Saját</Badge>
                                    {/if}
                                </div>
                                <a href={forras.forras_url} target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block">
                                    {forras.forras_url}
                                </a>
                            </div>
                            <form method="POST" action="?/deleteSource" use:enhance>
                                <input type="hidden" name="id" value={forras.id} />
                                <Button type="submit" color="red" size="xs" outline class="ml-2">Törlés</Button>
                            </form>
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="text-sm text-gray-500 dark:text-gray-400 italic mb-8 bg-gray-50 dark:bg-gray-800 p-4 rounded text-center border border-dashed border-gray-300 dark:border-gray-700">
                    Még nem adtál hozzá hírforrást. Add meg az elsőt alább!
                </p>
            {/if}

            <form method="POST" action="?/addSource" use:enhance class="bg-gray-100 dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 class="font-semibold text-gray-900 dark:text-white mb-4">Új forrás hozzáadása</h4>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    
                    <!-- Típus választó -->
                    <div class="md:col-span-2">
                        <Label for="tipus" class="mb-2">Forrás Típusa</Label>
                        <Select id="tipus" name="tipus" items={sourceTypes} bind:value={selectedSourceType} />
                    </div>

                    <!-- Dinamikusan változó címkék a típus alapján -->
                    <div>
                        <Label for="forras_nev" class="mb-2">
                            {#if selectedSourceType === 'RSS'}Forrás Neve (pl. Telex)
                            {:else if selectedSourceType === 'YOUTUBE'}Csatorna Neve (pl. Partizán)
                            {:else}Profil Neve (pl. Elon Musk){/if}
                        </Label>
                        <Input type="text" id="forras_nev" name="forras_nev" required placeholder="Név megadása..." />
                    </div>
                    
                    <div>
                        <Label for="forras_url" class="mb-2">
                            {#if selectedSourceType === 'RSS'}Weboldal URL-je
                            {:else if selectedSourceType === 'YOUTUBE'}Csatorna link (pl. youtube.com/@Partizan)
                            {:else}Twitter URL (pl. x.com/elonmusk){/if}
                        </Label>
                        <Input type="url" id="forras_url" name="forras_url" required placeholder="https://..." />
                    </div>
                    
                    <!-- RSS URL bemenet csak akkor jelenik meg, ha RSS a típus -->
                    {#if selectedSourceType === 'RSS'}
                        <div class="md:col-span-2 animate-fade-in">
                            <Label for="rss_url" class="mb-2">
                                RSS link (Opcionális)
                                <span class="text-xs text-gray-500 font-normal ml-2">Ha üresen hagyod, a háttérrendszer megpróbálja megkeresni.</span>
                            </Label>
                            <Input type="url" id="rss_url" name="rss_url" placeholder="https://telex.hu/rss" />
                        </div>
                    {/if}

                    <div class="md:col-span-2 mt-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Toggle bind:checked={isOwnSourceChecked} color="green" class="font-medium text-gray-900 dark:text-gray-300">
                            Ez az én SAJÁT forrásom (Ezzel akarom összehasonlítani a többieket)
                        </Toggle>
                        <input type="hidden" name="is_own_source" value={isOwnSourceChecked} />
                    </div>
                </div>

                <Button type="submit" color="green" class="w-full sm:w-auto mt-2">
                    + Hozzáadás a figyelőlistához
                </Button>
            </form>
        </div>

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