<script lang="ts">
  import apiClient from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import type { Note } from '$lib/types';
  
  let searchQuery = $state('');
  let searchResults = $state<Note[]>([]);
  let allResults = $state<Note[]>([]);
  let isLoading = $state(false);
  
  async function searchNotes() {
    isLoading = true;
    searchResults = [];
    
    try {
      const { data } = await apiClient.post('/api/v2/notesearch', {
        search: searchQuery
      });
      
      searchResults = Array.isArray(data) ? data : data.notes || [];
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function getAllNotes() {
    isLoading = true;
    allResults = [];
    
    try {
      const { data } = await apiClient.get('/api/v2/notesearch/all');
      allResults = Array.isArray(data) ? data : data.notes || [];
    } catch (error) {
      console.error('Failed to get all notes:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-gray-800">Search Public Notes</h1>
    <p class="text-gray-600">Search for notes shared by other users</p>
  </div>
  
  <!-- Search Form -->
  <Card class="p-6">
    <div class="flex gap-2">
      <div class="flex-1">
        <Input 
          bind:value={searchQuery}
          placeholder="Enter note name to search"
          onkeydown={(e) => e.key === 'Enter' && searchNotes()}
        />
      </div>
      <Button onclick={searchNotes} disabled={isLoading}>
        Search
      </Button>
      <Button onclick={getAllNotes} variant="secondary" disabled={isLoading}>
        Show All
      </Button>
    </div>
  </Card>
  
  <!-- Search Results -->
  {#if searchResults.length > 0}
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4">Search Results ({searchResults.length})</h2>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-semibold">Name</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Type</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Body</th>
            </tr>
          </thead>
          <tbody>
            {#each searchResults as note}
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">{note.name}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {note.type}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  {@html note.body}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
  
  <!-- All Public Notes -->
  {#if allResults.length > 0}
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4">All Public Notes ({allResults.length})</h2>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-semibold">Name</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Type</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Body</th>
            </tr>
          </thead>
          <tbody>
            {#each allResults as note}
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">{note.name}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {note.type}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  {@html note.body}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
  
  {#if searchResults.length === 0 && allResults.length === 0 && !isLoading}
    <Card class="p-12 text-center">
      <div class="text-4xl mb-4">🔍</div>
      <p class="text-gray-500">Search for notes or click "Show All" to view all public notes</p>
    </Card>
  {/if}
</div>
