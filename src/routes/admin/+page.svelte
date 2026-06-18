<script lang="ts">
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';
    import { Card, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Badge, Toggle, Search, Indicator } from 'flowbite-svelte';
    import { UsersSolid, ShieldCheckSolid, GlobeSolid, NewspaperSolid, BrainSolid } from 'flowbite-svelte-icons';
    import { formatDate } from '$lib/utils/format-date';
    
    export let data;
    
    // A betöltött adatok
    $: felhasznalok = data.adminFelhasznalok;
    let searchTerm = '';

    // Keresés funkció a táblázathoz (Név vagy E-mail alapján)
    $: szurtFelhasznalok = felhasznalok.filter((user: any) => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDatum = (dateInput: string | Date | null) => 
    dateInput ? formatDate('%Y. $m. %d.', dateInput) : 'Ismeretlen';
</script>

<div class="container mx-auto p-4 mt-8 max-w-7xl">
    
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                <ShieldCheckSolid class="w-8 h-8 text-indigo-600" /> SzuperAdmin Központ
            </h1>
            <p class="text-gray-500 mt-2">Felhasználók, előfizetések és rendszerstatisztikák kezelése.</p>
        </div>
    </div>
        
        <div class="flex flex-wrap gap-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div class="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg"><UsersSolid class="w-5 h-5 text-blue-600 dark:text-blue-400"/></div>
        <div>
            <p class="text-xs text-gray-500 font-medium">Összes Fiók</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{felhasznalok.length}</p>
        </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div class="bg-green-100 dark:bg-green-900 p-2 rounded-lg"><GlobeSolid class="w-5 h-5 text-green-600 dark:text-green-400"/></div>
        <div>
            <p class="text-xs text-gray-500 font-medium">Figyelt Források</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{data.statisztikak.osszesForras}</p>
        </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div class="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-lg"><NewspaperSolid class="w-5 h-5 text-yellow-600 dark:text-yellow-400"/></div>
        <div>
            <p class="text-xs text-gray-500 font-medium">Begyűjtött Hírek</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{data.statisztikak.osszesHir}</p>
        </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div class="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg"><BrainSolid class="w-5 h-5 text-purple-600 dark:text-purple-400"/></div>
        <div>
            <p class="text-xs text-gray-500 font-medium">AI Által Elemzett</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{data.statisztikak.aiElemzesek}</p>
        </div>
    </div>
</div>

    <Card size="xl" class="w-full max-w-none shadow-lg border border-gray-100 dark:border-gray-700">
        
        <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UsersSolid class="w-5 h-5"/> Regisztrált Felhasználók
            </h2>
            <div class="w-full md:w-72">
                <Search size="md" bind:value={searchTerm} placeholder="Keresés név vagy email alapján..." />
            </div>
        </div>

        <div class="overflow-x-auto">
            <Table hoverable class="w-full">
                <TableHead class="bg-gray-50 dark:bg-gray-700">
                    <TableHeadCell>Felhasználó</TableHeadCell>
                    <TableHeadCell>Előfizetés</TableHeadCell>
                    <TableHeadCell>Statisztikák</TableHeadCell>
                    <TableHeadCell>Regisztrált</TableHeadCell>
                    <TableHeadCell>Állapot (Aktív)</TableHeadCell>
                </TableHead>
                <TableBody>
                    {#each szurtFelhasznalok as user}
                        <TableBodyRow class={!user.aktiv ? 'bg-red-50/50 dark:bg-red-900/10 grayscale-[30%]' : ''}>
                            <TableBodyCell>
                                <div class="flex items-center gap-3">
                                    <div class="relative">
                                        <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        {#if user.role === 'admin'}
                                            <Indicator color="purple" class="absolute bottom-0 right-0" title="Adminisztrátor" />
                                        {:else if user.email_verified}
                                            <Indicator color="green" class="absolute bottom-0 right-0" title="Megerősített Email" />
                                        {/if}
                                    </div>
                                    <div>
                                        <div class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            {user.username}
                                            {#if user.role === 'admin'}<Badge color="purple" size="xs">Admin</Badge>{/if}
                                        </div>
                                        <p class="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                            </TableBodyCell>

                            <TableBodyCell>
                                {#if user.subscription_tier === 'enterprise'}
                                    <Badge color="dark" class="font-bold">Enterprise</Badge>
                                {:else if user.subscription_tier === 'pro'}
                                    <Badge color="purple" class="font-bold">Pro Analyst</Badge>
                                {:else}
                                    <Badge color="blue">Starter</Badge>
                                {/if}
                            </TableBodyCell>

                            <TableBodyCell>
                                <div class="flex flex-col gap-1 text-xs text-gray-500">
                                    <span title="Figyelt Hírforrások száma">🌐 Források: <b>{user._count.hir_forrasok}</b></span>
                                    <span title="Kielemezett Hírek száma">📰 Hírek: <b>{user._count.hirek}</b></span>
                                </div>
                            </TableBodyCell>

                            <TableBodyCell class="text-sm text-gray-500">
                                {formatDatum(user.regisztracio_datuma)}
                            </TableBodyCell>

                            <TableBodyCell>
                                <form method="POST" action="?/toggleUserStatus" use:enhance class="flex items-center gap-2">
                                    <input type="hidden" name="userId" value={user.id} />
                                    <Toggle color="green" checked={user.aktiv} on:change={(e) => (e.target as HTMLElement)?.closest('form')?.requestSubmit()} />
                                    <span class="text-xs font-medium {user.aktiv ? 'text-green-600' : 'text-red-500'}">
                                        {user.aktiv ? 'Aktív' : 'Felfüggesztve'}
                                    </span>
                                </form>
                            </TableBodyCell>

                        </TableBodyRow>
                    {:else}
                        <TableBodyRow>
                            <TableBodyCell colspan="5" class="text-center py-8 text-gray-500">
                                Nincs a keresésnek megfelelő felhasználó.
                            </TableBodyCell>
                        </TableBodyRow>
                    {/each}
                </TableBody>
            </Table>
        </div>
    </Card>
    {#if data.hibasForrasok && data.hibasForrasok.length > 0}
        <div transition:fade class="mb-8 mt-4">
            <h2 class="text-xl font-bold text-red-600 dark:text-red-500 flex items-center gap-2 mb-4">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                Rendszerriasztás: Hibás Hírforrások ({data.hibasForrasok.length})
            </h2>
            
            <Card size="xl" class="w-full max-w-none border-red-200 dark:border-red-900 shadow-md">
                <div class="overflow-x-auto">
                    <Table>
                        <TableHead class="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                            <TableHeadCell>Forrás Neve / URL</TableHeadCell>
                            <TableHeadCell>Felhasználó</TableHeadCell>
                            <TableHeadCell>Hibák Száma</TableHeadCell>
                            <TableHeadCell>Utolsó Hibaüzenet</TableHeadCell>
                        </TableHead>
                        <TableBody>
                            {#each data.hibasForrasok as forras}
                                <TableBodyRow class="hover:bg-red-50/50 dark:hover:bg-red-900/10">
                                    <TableBodyCell>
                                        <p class="font-bold text-gray-900 dark:text-white">{forras.forras_nev || 'Ismeretlen Név'}</p>
                                        <a href={forras.rss_url || forras.forras_url} target="_blank" class="text-xs text-blue-500 hover:underline break-all">
                                            {forras.rss_url || forras.forras_url}
                                        </a>
                                    </TableBodyCell>
                                    <TableBodyCell>
                                        {#if forras.felhasznalo}
                                            <span class="font-medium">{forras.felhasznalo.username}</span>
                                        {:else}
                                            <Badge color="dark">Rendszer (Globális)</Badge>
                                        {/if}
                                    </TableBodyCell>
                                    <TableBodyCell>
                                        <Badge color="red" class="animate-pulse">{forras.hiba_szamlalo} Hiba</Badge>
                                    </TableBodyCell>
                                    <TableBodyCell class="text-xs text-gray-500 max-w-xs truncate" title={forras.utolso_hiba}>
                                        {forras.utolso_hiba || 'Ismeretlen hiba történt a letöltéskor.'}
                                    </TableBodyCell>
                                </TableBodyRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    {/if}
    <div class="mt-8 mb-12">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <svg class="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg>
            Rendszer és Cron Naplók
        </h2>
        
        <Card size="xl" class="w-full max-w-none bg-gray-900 dark:bg-gray-950 border-gray-800 shadow-inner">
            <div class="font-mono text-sm h-64 overflow-y-auto space-y-3 p-2">
                {#each data.naplok as naplo}
                    <div class="flex flex-col md:flex-row gap-2 md:gap-4 border-b border-gray-800/50 pb-2">
                        <span class="text-gray-500 shrink-0 w-36">
                            [{new Date(naplo.letrehozva).toLocaleDateString('hu-HU', {month: '2-digit', day: '2-digit'})} {new Date(naplo.letrehozva).toLocaleTimeString('hu-HU')}]
                        </span>
                        
                        <div class="shrink-0 w-28">
                            {#if naplo.esemeny_tipus.includes('HIBA') || naplo.esemeny_tipus.includes('ERROR')}
                                <Badge color="red" class="font-bold">{naplo.esemeny_tipus}</Badge>
                            {:else if naplo.esemeny_tipus.includes('CRON') || naplo.esemeny_tipus.includes('SYSTEM')}
                                <Badge color="indigo" class="font-bold">{naplo.esemeny_tipus}</Badge>
                            {:else}
                                <Badge color="green" class="font-bold">{naplo.esemeny_tipus}</Badge>
                            {/if}
                        </div>
                        
                        <span class="text-gray-300 break-words flex-grow">
                            {naplo.leiras}
                            {#if naplo.felhasznalo}
                                <span class="text-gray-500 text-xs ml-2">(@{naplo.felhasznalo.username})</span>
                            {/if}
                        </span>
                    </div>
                {:else}
                    <p class="text-green-500 italic flex items-center gap-2">
                        <span class="animate-pulse">_</span> Várom a rendszereseményeket...
                    </p>
                {/each}
            </div>
        </Card>
    </div>
</div>