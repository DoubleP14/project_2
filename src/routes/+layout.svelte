<script lang="ts">
    import "../app.css";
    import { Navbar, NavBrand, NavHamburger, NavUl, NavLi, DarkMode } from 'flowbite-svelte';
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
        <DarkMode class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm p-2.5" />
        
        <button onclick={handleLogout} class="text-sm font-semibold text-red-600 dark:text-red-500 hover:underline px-2 cursor-pointer">
            Kijelentkezés
        </button>

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