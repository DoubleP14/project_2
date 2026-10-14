<script lang="ts">
    import "../app.css";
    import { Navbar, NavBrand, NavHamburger, NavUl, NavLi, DarkMode, Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Badge } from 'flowbite-svelte';
    import { CogSolid, CreditCardSolid, ArrowRightToBracketOutline, ShieldCheckSolid } from 'flowbite-svelte-icons';
    import { page } from '$app/stores';

    let { children } = $props();

    async function handleLogout() {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/login';
        }
    }

    // Aktív menüpont kiemelése
    const aktiv = (utvonal: string) => $page.url.pathname.startsWith(utvonal);
    const navLinkOsztaly = (utvonal: string) =>
        `font-medium text-base ${aktiv(utvonal) ? 'text-blue-600 dark:text-blue-500' : ''}`;
</script>

<svelte:head>
    <meta name="description" content="Automatizált piac- és médiafigyelés mesterséges intelligenciával: objektív összefoglalók, hangulatelemzés, hírérték pontozás és valós idejű riasztások." />
</svelte:head>

{#if $page.data.user}
<!-- BEJELENTKEZETT FELHASZNÁLÓ NAVIGÁCIÓJA -->
<Navbar class="px-2 sm:px-4 py-2.5 fixed w-full z-50 top-0 left-0 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">

    <NavBrand href="/dashboard">
        <span class="self-center whitespace-nowrap text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            News <span class="text-blue-600 dark:text-blue-500">Trends</span>
        </span>
    </NavBrand>

    <div class="flex md:order-2 gap-3 items-center">
        <DarkMode class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm p-2.5 mr-1" />

        <Avatar id="user-menu" class="cursor-pointer bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-bold" dot={{ color: 'green' }}>
            {$page.data.user?.username ? $page.data.user.username.charAt(0).toUpperCase() : 'U'}
        </Avatar>

        <Dropdown triggeredBy="#user-menu" class="w-56 p-0 overflow-hidden text-sm font-medium shadow-xl border border-gray-100 dark:border-gray-700">
            <DropdownHeader class="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
                <span class="block text-sm text-gray-900 dark:text-white font-bold">
                    {$page.data.user?.username || 'Felhasználó'}
                </span>
                <span class="block text-xs text-gray-500 truncate dark:text-gray-400">
                    {$page.data.user?.email || 'Fiók részletei'}
                </span>
                <Badge color="purple" size="xs" class="mt-2 w-fit">
                    {$page.data.user?.subscription_tier === 'pro' ? 'Pro Analyst' : ($page.data.user?.subscription_tier === 'enterprise' ? 'Enterprise' : 'Starter')}
                </Badge>
            </DropdownHeader>

            <DropdownItem href="/settings" class="flex items-center gap-2 py-2.5">
                <CogSolid class="w-4 h-4 text-gray-500" /> Beállítások & Kulcsok
            </DropdownItem>
            <DropdownItem href="/settings?tab=elofizetes" class="flex items-center gap-2 py-2.5">
                <CreditCardSolid class="w-4 h-4 text-gray-500" /> Előfizetés kezelése
            </DropdownItem>
            {#if $page.data.user?.role === 'admin'}
                <DropdownItem href="/admin" class="flex items-center gap-2 py-2.5">
                    <ShieldCheckSolid class="w-4 h-4 text-indigo-500" /> Admin központ
                </DropdownItem>
            {/if}

            <DropdownDivider />

            <DropdownItem on:click={handleLogout} class="flex items-center gap-2 py-2.5 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg">
                <ArrowRightToBracketOutline class="w-4 h-4" /> Kijelentkezés
            </DropdownItem>
        </Dropdown>

        <NavHamburger />
    </div>

    <NavUl>
        <NavLi href="/dashboard" class={navLinkOsztaly('/dashboard')}>Hírek</NavLi>
        <NavLi href="/analytics" class={navLinkOsztaly('/analytics')}>Statisztika</NavLi>
        <NavLi href="/settings" class={navLinkOsztaly('/settings')}>Beállítások</NavLi>
        {#if $page.data.user?.role === 'admin'}
            <NavLi href="/admin" class={navLinkOsztaly('/admin')}>Admin</NavLi>
        {/if}
    </NavUl>

</Navbar>
{:else}
<!-- VENDÉG (PUBLIKUS) FEJLÉC -->
<header class="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
    <nav class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" class="text-xl font-extrabold tracking-tight text-slate-900">
            News <span class="text-blue-600">Trends</span>
        </a>
        <div class="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="/#features" class="hover:text-slate-900">Funkciók</a>
            <a href="/#how" class="hover:text-slate-900">Hogyan működik?</a>
            <a href="/#pricing" class="hover:text-slate-900">Árazás</a>
        </div>
        <div class="flex items-center gap-2 sm:gap-3">
            <a href="/login" class="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 {$page.url.pathname === '/login' ? 'bg-slate-100' : ''}">
                Bejelentkezés
            </a>
            <a href="/register" class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                Regisztráció
            </a>
        </div>
    </nav>
</header>
{/if}

<main class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 {$page.data.user ? 'pt-20' : 'pt-16'}">
    {@render children()}
</main>

<!-- LÁBLÉC -->
<footer class="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} News Trends · Hírtrend-elemző és Értesítő Rendszer</p>
        <div class="flex items-center gap-5">
            {#if !$page.data.user}
                <a href="/#pricing" class="hover:text-gray-900 dark:hover:text-white">Árazás</a>
            {/if}
            <a href="/adatvedelem" class="hover:text-gray-900 dark:hover:text-white">Adatkezelési tájékoztató</a>
        </div>
    </div>
</footer>
