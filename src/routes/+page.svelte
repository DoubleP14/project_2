<script lang="ts">
    import { Card, Badge, Button, Input, Helper } from 'flowbite-svelte';

    export let data;
    
    export let form: any; 

    function vanEgyezes(szoveg: string | null, kulcsszavak: any[]) {
        if (!szoveg || !kulcsszavak || kulcsszavak.length === 0) return false;
        
        const szovegLower = szoveg.toLowerCase();
        return kulcsszavak.some(k => szovegLower.includes(k.kulcsszo.toLowerCase()));
    }
</script>

<div class="container mx-auto p-4 mt-8">
    <h1 class="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white text-center">
        <span class="text-blue-600 dark:text-blue-500">Hírelemző</span>
    </h1>

    <div class="mb-10 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Kiemelt témáim</h2>
        
        <form method="POST" action="?/addKeyword" class="flex gap-2 mb-2 max-w-lg">
            <Input name="kulcsszo" placeholder="Pl. gazdaság, választás, adó..." required />
            <Button type="submit" color="blue">Hozzáadás</Button>
        </form>

        {#if form?.message}
            <Helper class="mb-4 text-red-600 dark:text-red-400 font-medium">{form.message}</Helper>
        {/if}

        <div class="flex flex-wrap gap-2 mt-4">
            {#each data.kulcsszavak as k}
                <form method="POST" action="?/deleteKeyword" class="inline-block">
                    <input type="hidden" name="id" value={k.id} />
                    <button type="submit" class="border-none bg-transparent p-0 m-0">
                        <Badge color="indigo" class="cursor-pointer hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-colors px-3 py-1 text-sm">
                            {k.kulcsszo} <span class="ml-2 font-bold text-red-500">✕</span>
                        </Badge>
                    </button>
                </form>
            {:else}
                <span class="text-sm text-gray-500 dark:text-gray-400 italic">Még nincsenek kulcsszavaid. Vegyél fel egyet a kiemeléshez!</span>
            {/each}
        </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {#each data.cikkek as elemzes}
            {@const kiemelt = vanEgyezes(elemzes.hir.cim, data.kulcsszavak) || vanEgyezes(elemzes.osszefoglalo, data.kulcsszavak)}

            <div class="relative transition-transform duration-300 {kiemelt ? 'scale-[1.02] z-10' : ''}">
                
                {#if kiemelt}
                    <Badge color="yellow" class="absolute -top-3 -right-3 z-20 shadow-lg px-3 py-1 font-bold text-sm">
                        TALÁLAT!
                    </Badge>
                {/if}

                <Card size="lg" class="flex flex-col justify-between h-full shadow-lg hover:shadow-xl transition-shadow {kiemelt ? 'ring-4 ring-yellow-400 dark:ring-yellow-500' : ''}">
                    
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
            </div>
        {/each}

    </div>
</div>