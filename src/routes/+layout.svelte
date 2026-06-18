<script lang="ts">
    import "../app.css";
    import { Navbar, NavBrand, NavHamburger, NavUl, NavLi, DarkMode, Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Badge } from 'flowbite-svelte';
    import { CogSolid, CreditCardSolid, ArrowRightToBracketOutline } from 'flowbite-svelte-icons';
    import { page } from '$app/stores'; 

    let { children } = $props();

    async function handleLogout() {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/login'; 
        }
    }
</script>

{#if $page.data.user}
<Navbar class="px-2 sm:px-4 py-2.5 fixed w-full z-50 top-0 left-0 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
    
    <NavBrand href="/">
        <span class="self-center whitespace-nowrap text-xl font-bold text-blue-600 dark:text-blue-500">
            AI Hírelemző
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
            
            <DropdownDivider />
            
            <DropdownItem on:click={handleLogout} class="flex items-center gap-2 py-2.5 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg">
                <ArrowRightToBracketOutline class="w-4 h-4" /> Kijelentkezés
            </DropdownItem>
        </Dropdown>

        <NavHamburger />
    </div>

    <NavUl>
        <NavLi href="/" class="font-medium text-lg">Hírek</NavLi>
        <NavLi href="/analytics" class="font-medium text-lg">Statisztika</NavLi>
        <NavLi href="/settings" class="font-medium text-lg">Beállítások</NavLi>
    </NavUl>

</Navbar>
{/if}

<main class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 {$page.data.user ? 'pt-20' : ''}">
    {@render children()}
</main>