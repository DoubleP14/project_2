<script lang="ts">
    import { enhance } from '$app/forms'; 
    import { page } from '$app/stores'; 
    import { Card, Input, Label, Button, Alert, Select, Toggle, Badge, Modal, Tabs, TabItem, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import { InfoCircleSolid, LockSolid, BellSolid, GlobeSolid, EditOutline, TrashBinOutline, UserCircleSolid, AdjustmentsVerticalSolid, CreditCardSolid, CheckCircleSolid, CloseCircleSolid, ExclamationCircleOutline } from 'flowbite-svelte-icons';
    import { formatDate } from '$lib/utils/format-date'; // ÚJ IMPORT

    export let data;
    export let form;

    // --- URL PARAMÉTER FIGYELŐ ---
    $: isElofizetesTab = $page.url.searchParams.get('tab') === 'elofizetes';

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

    let torlesModalNyitva = false;

    let editModalOpen = false;
    let editingSource: any = null;
    let editFormData = {
        id: 0,
        forras_nev: '',
        forras_url: '',
        rss_url: '',
        szuro_kifejezesek: '',
        is_own_source: false
    };

    function openEditModal(forras: any) {
        editingSource = forras;
        editFormData = {
            id: forras.id,
            forras_nev: forras.forras_nev,
            forras_url: forras.forras_url,
            rss_url: forras.rss_url || '',
            szuro_kifejezesek: forras.szuro_kifejezesek || '',
            is_own_source: forras.is_own_source || false
        };
        editModalOpen = true;
    }

    function removeEditModal() {
        editModalOpen = false;
        editingSource = null;
    }
</script>

<div class="container mx-auto p-4 mt-8 max-w-4xl">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            Vezérlőpult & Beállítások
        </h1>
        <Badge color={data.felhasznalo?.subscription_tier === 'pro' ? 'purple' : data.felhasznalo?.subscription_tier === 'enterprise' ? 'indigo' : 'dark'} size="xl" class="px-4 py-2 text-sm font-bold uppercase tracking-wide">
            Csomag: {data.felhasznalo?.subscription_tier || 'starter'}
        </Badge>
    </div>

    {#if $page.url.searchParams.get('downgraded')}
        <Alert color="blue" class="mb-6 animate-fade-in">
            <InfoCircleSolid slot="icon" class="w-4 h-4" />
            <span class="font-medium">Sikeresen visszaváltottál az ingyenes csomagra. A rendszer eltávolította a prémium hozzáféréseket.</span>
        </Alert>
    {/if}

    {#if form?.message}
        <Alert color={form.success ? 'green' : 'red'} class="mb-6 animate-fade-in">
            <InfoCircleSolid slot="icon" class="w-4 h-4" />
            <span class="font-medium">{form.message}</span>
        </Alert>
    {/if}

    <Tabs style="underline" class="mb-6">
        
        <TabItem open={!isElofizetesTab}>
            <div slot="title" class="flex items-center gap-2"><UserCircleSolid size="sm"/> AI & Riasztások</div>
            <Card size="xl" class="shadow-lg dark:bg-gray-800 w-full max-w-none mt-4">
                
                <form method="POST" action="?/saveSettings" use:enhance class="space-y-8">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Mesterséges Intelligencia és API Kulcsok</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Válaszd ki a preferált AI modellt és add meg a saját kulcsaidat a rendszerhez (BYOK). Egyelőre a gyári kulcsok aktívak, ha üresen hagyod.
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
                                    type="text" 
                                    id="api_key" 
                                    name="api_key" 
                                    placeholder="Enyém használata... Írd felül újak mentéséhez" 
                                    value={data.felhasznalo?.api_key ?? ''} 
                                />
                            </div>
                            
                            <div class="md:col-span-2 mt-2">
                                <Label for="youtube_api_key" class="mb-2 flex items-center gap-2">
                                    <LockSolid class="w-4 h-4 text-gray-500" /> YouTube API Kulcs
                                </Label>
                                <Input 
                                    type="text" 
                                    id="youtube_api_key" 
                                    name="youtube_api_key" 
                                    placeholder="Enyém használata... Írd felül újak mentéséhez" 
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
                            <Input type="text" id="discord_webhook" name="discord_webhook" placeholder="https://discord.com/api/webhooks/..." value={data.felhasznalo?.discord_webhook ?? ''} />
                        </div>

                        <div class="animate-fade-in {selectedChannel !== 'TELEGRAM' ? 'hidden' : ''}">
                            <Label for="telegram_chat_id" class="mb-2 flex items-center gap-2">
                                <LockSolid class="w-4 h-4 text-gray-500" /> Telegram Chat ID
                            </Label>
                            <Input type="text" id="telegram_chat_id" name="telegram_chat_id" placeholder="pl. 123456789" value={data.felhasznalo?.telegram_chat_id ?? ''} />
                        </div>

                        <div class="animate-fade-in {selectedChannel !== 'EMAIL' ? 'hidden' : ''}">
                            <p class="text-sm text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                                Az értesítéseket a fiókodhoz tartozó regisztrált e-mail címre küldjük automatikusan.
                            </p>
                        </div>
                    </div>

                    <div class="pt-4">
                        <Button type="submit" color="blue" class="px-8 font-bold">
                            Beállítások Mentése
                        </Button>
                    </div>
                </form> 
                
                <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/50 flex flex-wrap gap-4">
                    <form method="POST" action="?/testNotification" use:enhance class="inline">
                        <Button type="submit" color="alternative" class="flex items-center justify-center gap-2 font-semibold">
                            <BellSolid class="w-4 h-4 text-green-500" />
                            {#if selectedChannel === 'DISCORD'}
                                Teszt Discordra
                            {:else}
                                Riasztás Tesztelése
                            {/if}
                        </Button>
                    </form>

                    <form method="POST" action="?/runArchiveTest" use:enhance class="inline">
                        <Button type="submit" color="purple" class="font-semibold">
                            Szemetes Kiürítése (Teszt)
                        </Button>
                    </form>
                </div>
            </Card>
        </TabItem>

        <TabItem>
            <div slot="title" class="flex items-center gap-2"><AdjustmentsVerticalSolid size="sm"/> Hírforrások ({data.forrasok?.length || 0})</div>
            <div class="mt-4 space-y-6">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <GlobeSolid class="w-5 h-5 text-green-500" /> Figyelt Hírforrások listája
                </h3>
                
                {#if data.forrasok && data.forrasok.length > 0}
                    <div class="grid grid-cols-1 gap-4">
                        {#each [...data.forrasok].sort((a, b) => (b.is_own_source ? 1 : 0) - (a.is_own_source ? 1 : 0)) as forras}
                            <div class="flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl border {forras.is_own_source ? 'border-green-500 ring-1 ring-green-500/50' : 'border-gray-200 dark:border-gray-700'} shadow-sm hover:shadow-md transition-all {!forras.aktiv ? 'opacity-50 grayscale-[30%]' : ''}">
                                <div class="flex justify-between items-center w-full">
                                    <div class="overflow-hidden flex-1">
                                        <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                            <p class="font-bold text-gray-900 dark:text-white text-lg truncate">{forras.forras_nev}</p>
                                            {#if forras.tipus === 'YOUTUBE'}<Badge color="red" size="sm">YouTube</Badge>
                                            {:else}<Badge color="dark" size="sm">RSS</Badge>{/if}
                                            {#if forras.is_own_source}<Badge color="green" size="sm">Saját</Badge>{/if}
                                            {#if !forras.aktiv}<Badge color="purple" size="sm">Inaktív</Badge>{/if}
                                        </div>
                                        <a href={forras.forras_url} target="_blank" class="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block w-fit">
                                            {forras.forras_url}
                                        </a>
                                    </div>
                                    <div class="flex items-center gap-3 ml-4 border-l border-gray-200 dark:border-gray-700 pl-4 py-1">
                                        <form method="POST" action="?/toggleSource" use:enhance class="flex items-center" title="Ki/Be kapcsolás">
                                            <input type="hidden" name="id" value={forras.id} />
                                            <Toggle color="green" size="small" checked={forras.aktiv} on:change={(e) => (e.target as HTMLElement)?.closest('form')?.requestSubmit()} class="cursor-pointer" />
                                        </form>
                                        <Button type="button" size="xs" color="light" class="p-2 border-gray-300 dark:border-gray-600 hover:text-blue-600" on:click={() => openEditModal(forras)}>
                                            <EditOutline class="w-4 h-4" />
                                        </Button>
                                        <form method="POST" action="?/deleteSource" use:enhance class="inline">
                                            <input type="hidden" name="id" value={forras.id} />
                                            <Button type="submit" color="light" size="xs" class="p-2 border-gray-300 dark:border-gray-600 text-red-600 hover:bg-red-50">
                                                <TrashBinOutline class="w-4 h-4" />
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                                {#if forras.szuro_kifejezesek}
                                    <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                        <div class="flex flex-wrap gap-1.5">
                                            {#each forras.szuro_kifejezesek.split(',') as filter}
                                                <Badge color="indigo" size="xs" outline>{filter.trim()}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-sm text-gray-500 dark:text-gray-400 italic mb-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-center border border-dashed border-gray-300">Még nem adtál hozzá hírforrást.</p>
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
                            <Input type="text" id="forras_nev" name="forras_nev" required placeholder="Pl. Telex" />
                        </div>
                        <div>
                            <Label for="forras_url" class="mb-2 font-medium">URL</Label>
                            <Input type="text" id="forras_url" name="forras_url" required placeholder="https://... vagy @csatorna" />
                        </div>
                        {#if selectedSourceType === 'RSS'}
                            <div class="md:col-span-2 animate-fade-in">
                                <Label for="rss_url" class="mb-2 font-medium">RSS link (Opcionális)</Label>
                                <Input type="url" id="rss_url" name="rss_url" placeholder="https://telex.hu/rss" />
                            </div>
                        {/if}
                        <div class="md:col-span-2 animate-fade-in">
                            <Label for="szuro_kifejezesek" class="mb-2 font-medium">Szűrendő szlogenek (Opcionális, vesszővel elválasztva)</Label>
                            <Input id="szuro_kifejezesek" name="szuro_kifejezesek" placeholder="pl.: Iratkozz fel, Támogasd te is" />
                        </div>
                        <div class="md:col-span-2 mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Toggle bind:checked={isOwnSourceChecked} color="green" class="font-medium text-gray-900 dark:text-gray-300">
                                Ez az én SAJÁT forrásom (Ezzel akarom összehasonlítani a konkurenciát)
                            </Toggle>
                            <input type="hidden" name="is_own_source" value={isOwnSourceChecked} />
                        </div>
                    </div>
                    <Button type="submit" color="green" class="w-full sm:w-auto px-6 font-bold">+ Hozzáadás a listához</Button>
                </form>
            </div>
        </TabItem>

        <TabItem>
            <div slot="title" class="flex items-center gap-2"><BellSolid size="sm"/> Értesítési Napló</div>
            <div class="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                <Table hoverable>
                    <TableHead class="bg-gray-50 dark:bg-gray-700">
                        <TableHeadCell>Időpont</TableHeadCell>
                        <TableHeadCell>Hír Címe</TableHeadCell>
                        <TableHeadCell>Csatorna</TableHeadCell>
                        <TableHeadCell>Kézbesítés</TableHeadCell>
                    </TableHead>
                    <TableBody>
                        {#each data.ertesitesek as log}
                            <TableBodyRow>
                                <TableBodyCell class="text-xs text-gray-500">
                                    {log.elkuldve_ekkor ? formatDate('%Y. $m %d. %H:%I:%S', log.elkuldve_ekkor) : 'Most'}
                                </TableBodyCell>
                                <TableBodyCell class="font-medium max-w-xs truncate" title={log.hir?.cim}>
                                    {log.hir?.cim || 'Rendszer Teszt Üzenet'}
                                </TableBodyCell>
                                <TableBodyCell><Badge color="dark">{log.csatorna}</Badge></TableBodyCell>
                                <TableBodyCell>
                                    {#if log.sikeres}
                                        <Badge color="green" class="flex items-center gap-1 w-fit"><CheckCircleSolid class="w-3 h-3"/> Sikeres</Badge>
                                    {:else}
                                        <Badge color="red" class="flex items-center gap-1 w-fit"><CloseCircleSolid class="w-3 h-3"/> Hiba</Badge>
                                    {/if}
                                </TableBodyCell>
                            </TableBodyRow>
                        {:else}
                            <TableBodyRow>
                                <TableBodyCell colspan="4" class="text-center py-8 text-gray-400 italic">Nincsenek még kiküldött értesítések.</TableBodyCell>
                            </TableBodyRow>
                        {/each}
                    </TableBody>
                </Table>
            </div>
        </TabItem>

        <TabItem open={isElofizetesTab}>
            <div slot="title" class="flex items-center gap-2"><CreditCardSolid size="sm"/> Előfizetés (Csomagok)</div>
            
            <div class="mt-6 text-center max-w-xl mx-auto mb-10">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Emeld Új Szintre a Hírelemzést!</h2>
                <p class="text-sm text-gray-500 mt-2">Itt választhatsz a különböző kvóták és prémium mesterséges intelligencia modellek között.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                <Card class="flex flex-col justify-between shadow border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 {data.felhasznalo?.subscription_tier === 'starter' || !data.felhasznalo?.subscription_tier ? 'ring-2 ring-blue-500' : ''}">
                    <div>
                        <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Starter</h3>
                        <div class="flex items-baseline text-gray-900 dark:text-white mb-6">
                            <span class="text-3xl font-extrabold">0 Ft</span>
                            <span class="text-sm text-gray-500 ml-1">/hó</span>
                        </div>
                        <ul class="space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-6">
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-blue-500"/> Max 3 aktív hírforrás</li>
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-blue-500"/> Csak RSS alapú feldolgozás</li>
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-blue-500"/> Napi 1 e-mail összefoglaló</li>
                        </ul>
                    </div>
                    <Button color="alternative" class="w-full font-medium" disabled={data.felhasznalo?.subscription_tier === 'starter' || !data.felhasznalo?.subscription_tier}>
                        {data.felhasznalo?.subscription_tier === 'starter' || !data.felhasznalo?.subscription_tier ? 'Aktív Csomag' : 'Kiválasztás'}
                    </Button>
                </Card>

                <Card class="flex flex-col justify-between shadow-xl border border-purple-200 dark:border-purple-900 relative bg-gradient-to-b from-purple-50/50 to-white dark:from-gray-800 dark:to-gray-800 ring-2 ring-purple-600">
                    <Badge color="purple" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 font-bold text-xs uppercase tracking-wider shadow">Legnépszerűbb</Badge>
                    <div>
                        <h3 class="text-xl font-bold mb-2 text-purple-700 dark:text-purple-400">Pro Analyst</h3>
                        <div class="flex items-baseline text-gray-900 dark:text-white mb-6">
                            <span class="text-3xl font-extrabold">2.990 Ft</span>
                            <span class="text-sm text-gray-500 ml-1">/hó</span>
                        </div>
                        <ul class="space-y-3 text-sm text-gray-700 dark:text-gray-200 mb-6 font-medium">
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-purple-600"/> Végtelen hírforrás (RSS + YT)</li>
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-purple-600"/> Azonnali Discord & Telegram botok</li>
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-purple-600"/> TrustScore (Automatikus pontozás)</li>
                        </ul>
                    </div>
                    <Button href="/checkout?tier=pro" color="purple" class="w-full text-base font-bold shadow-md">
                        {data.felhasznalo?.subscription_tier === 'pro' ? 'Aktív Csomag Kezelése' : 'Előfizetés indítása'}
                    </Button>
                </Card>

                <Card class="flex flex-col justify-between shadow border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 {data.felhasznalo?.subscription_tier === 'enterprise' ? 'ring-2 ring-blue-500' : ''}">
                    <div>
                        <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Enterprise</h3>
                        <div class="flex items-baseline text-gray-900 dark:text-white mb-6">
                            <span class="text-3xl font-extrabold">9.990 Ft</span>
                            <span class="text-sm text-gray-500 ml-1">/hó</span>
                        </div>
                        <ul class="space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-6">
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-gray-400"/> Minden Pro Analyst funkció</li>
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-gray-400"/> Dedikált API hozzáférés</li>
                            <li class="flex items-center gap-2"><CheckCircleSolid class="w-4 h-4 text-gray-400"/> Statisztikai PDF/CSV adatexport</li>
                        </ul>
                    </div>
                    <Button href="/checkout?tier=enterprise" color="dark" class="w-full">
                        {data.felhasznalo?.subscription_tier === 'enterprise' ? 'Aktív Csomag Kezelése' : 'Céges csatlakozás'}
                    </Button>
                </Card>
            </div>

            {#if data.felhasznalo?.subscription_tier === 'pro' || data.felhasznalo?.subscription_tier === 'enterprise'}
                <div class="mt-12 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl max-w-3xl mx-auto text-center">
                    <h3 class="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Veszélyzóna (Csomag lemondása)</h3>
                    <p class="text-sm text-red-600 dark:text-red-300 mb-4">
                        Ha visszaváltasz az ingyenes Starter csomagra, azonnal elveszíted a hozzáférést a prémium hírforrásokhoz, az azonnali riasztásokhoz és az AI klaszterezéshez.
                    </p>
                    <form method="POST" action="?/downgrade" use:enhance>
                        <Button type="submit" color="red" class="font-bold shadow-sm">
                            Igen, lemondom a prémium csomagot
                        </Button>
                    </form>
                </div>
            {/if}
        </TabItem>
    </Tabs>

    <div class="mt-12 border-t border-red-900/30 pt-8 mb-8">
        <h3 class="text-xl font-bold text-red-500 mb-4">Fiók Kezelése (Veszélyes Zóna)</h3>
        
        <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div>
                <h4 class="text-lg font-bold text-gray-900 dark:text-white">Fiók végleges törlése</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Ha törlöd a fiókodat, az összes adatod, hírforrásod, AI elemzésed és előfizetésed <b>azonnal és visszavonhatatlanul</b> törlődik a szervereinkről.
                </p>
            </div>
            <Button color="red" class="whitespace-nowrap font-bold" on:click={() => torlesModalNyitva = true}>
                Fiók Törlése
            </Button>
        </div>
    </div>
</div>

<Modal bind:open={torlesModalNyitva} size="xs" autoclose={false}>
    <div class="text-center">
        <ExclamationCircleOutline class="mx-auto mb-4 text-red-500 w-12 h-12" />
        <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Biztosan törölni szeretnéd a fiókodat? Ezt a műveletet <b>nem lehet</b> visszavonni!
        </h3>
        
        <form method="POST" action="?/fiokTorlese" use:enhance class="flex flex-col gap-3">
            <Button color="red" type="submit" class="w-full font-bold">Igen, véglegesen törlöm</Button>
            <Button color="alternative" class="w-full" on:click={() => torlesModalNyitva = false}>Mégse</Button>
        </form>
    </div>
</Modal>

<Modal title="Hírforrás szerkesztése" bind:open={editModalOpen} autoclose={false} size="sm">
    <form method="POST" action="?/updateSource" use:enhance={() => {
        return async ({ update }) => {
            await update(); 
            removeEditModal(); 
        };
    }} class="space-y-4">
        
        <input type="hidden" name="id" value={editFormData.id} />
        <div>
            <Label for="edit_forras_nev" class="mb-2">Forrás Neve</Label>
            <Input id="edit_forras_nev" name="forras_nev" bind:value={editFormData.forras_nev} required />
        </div>
        <div>
            <Label for="edit_forras_url" class="mb-2">URL / Elérhetőség</Label>
            <Input id="edit_forras_url" name="forras_url" bind:value={editFormData.forras_url} required />
        </div>
        <div>
            <Label for="edit_rss_url" class="mb-2">RSS Link (ha van)</Label>
            <Input id="edit_rss_url" name="rss_url" bind:value={editFormData.rss_url} placeholder="https://..." />
        </div>
        <div>
            <Label for="edit_szuro_kifejezesek" class="mb-2">Szűrőszavak (vesszővel elválasztva)</Label>
            <Input id="edit_szuro_kifejezesek" name="szuro_kifejezesek" bind:value={editFormData.szuro_kifejezesek} />
        </div>
        <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <Toggle bind:checked={editFormData.is_own_source} color="green" class="font-medium">
                Saját forrás? (Konkurencia figyeléséhez)
            </Toggle>
            <input type="hidden" name="is_own_source" value={editFormData.is_own_source} />
        </div>
        <div class="flex justify-end gap-3 mt-6">
            <Button type="button" color="alternative" on:click={removeEditModal}>Mégse</Button>
            <Button type="submit" color="blue">Változtatások Mentése</Button>
        </div>
    </form>
</Modal>

<style>
    .animate-fade-in { animation: fadeIn 0.25s ease-in-out; }
    .hidden { display: none !important; }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>