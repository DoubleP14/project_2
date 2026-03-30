<script lang="ts">
    import "../app.css";
    // Flowbite kész sötét mód kapcsolója
    import { DarkMode } from 'flowbite-svelte'; 

    let { children } = $props();
</script>

<header class="p-4 flex justify-end items-center bg-white dark:bg-gray-800 shadow-sm">
    <span class="mr-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Téma:</span>
    <DarkMode />
</header>

<main class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    {@render children()}
</main>