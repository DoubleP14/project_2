<script lang="ts">
    import { Card, Badge, Button } from 'flowbite-svelte';

    // Itt kapja meg az adatokat a +page.server.ts fájlból!
    export let data;
</script>

<div class="container mx-auto p-4 mt-8">
    <h1 class="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white text-center">
        <span class="text-blue-600 dark:text-blue-500">Hírelemző</span>
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {#each data.cikkek as elemzes}
            <Card size="lg" class="flex flex-col justify-between h-full shadow-lg hover:shadow-xl transition-shadow">
                
                <div class="mb-4">
                    <h5 class="mb-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {elemzes.hir.cim}
                    </h5>
                    
                    <div class="flex flex-wrap gap-2 mb-4">
                        {#if elemzes.hangulat === 'POZITIV'}
                            <Badge color="green" rounded>Pozitív</Badge>
                        {:else if elemzes.hangulat === 'NEGATIV'}
                            <Badge color="red" rounded>Negatív</Badge>
                        {:else}
                            <Badge color="dark" rounded>Semleges</Badge>
                        {/if}
                        
                        <Badge color="indigo">{elemzes.hasznalt_modell}</Badge>
                    </div>

                    <p class="font-normal text-gray-700 dark:text-gray-400 leading-relaxed">
                        {elemzes.osszefoglalo}
                    </p>
                </div>

                <Button href={elemzes.hir.url ?? '#'} target="_blank" color="alternative" class="w-full mt-4">
                    Eredeti cikk elolvasása a Telexen
                </Button>
                
            </Card>
        {/each}

    </div>
</div>