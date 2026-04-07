<script lang="ts">
    import "../app.css";
    // Behozza a Flowbite menü elemeit és a Sötét Mód gombot
    import { Navbar, NavBrand, NavHamburger, NavUl, NavLi, DarkMode } from 'flowbite-svelte';

    // Svelte 5 Runes: így kapja meg az tartalmát
    let { children } = $props();
</script>

<Navbar class="px-2 sm:px-4 py-2.5 fixed w-full z-50 top-0 left-0 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
    
    <NavBrand href="/">
        <span class="self-center whitespace-nowrap text-xl font-bold text-blue-600 dark:text-blue-500">
            AI Hírelemző
        </span>
    </NavBrand>
    
    <div class="flex md:order-2 gap-2 items-center">
        <DarkMode class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm p-2.5" />
        <NavHamburger />
    </div>

    <NavUl>
        <NavLi href="/" class="font-medium text-lg">Hírek</NavLi>
        <NavLi href="/analytics" class="font-medium text-lg"> Statisztika</NavLi>
    </NavUl>

</Navbar>

<main class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pt-20">
    {@render children()}
</main>