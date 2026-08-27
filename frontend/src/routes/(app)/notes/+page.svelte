<script lang="ts">
  import { onMount } from 'svelte';
  import apiClient from '$lib/api/client';
  import { extractErrorMessage } from '$lib/utils/errorHandler';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import type { Note } from '$lib/types';
  
  let notes = $state<Note[]>([]);
  let noteName = $state('');
  let noteType = $state('public');
  let noteBody = $state('');
  let responseMessage = $state('');
  let isLoading = $state(false);
  
  const noteTypes = ['public', 'note', 'reminder', 'list', 'secret'];
  
  async function fetchNotes() {
    try {
      const { data } = await apiClient.get('/api/v2/notes');
      notes = Array.isArray(data) ? data : data.notes || [];
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  }
  
  async function createNote() {
    isLoading = true;
    responseMessage = '';
    
    try {
      await apiClient.post('/api/v2/notes', {
        name: noteName,
        type: noteType,
        body: noteBody
      });
      
      responseMessage = 'Note created successfully!';
      noteName = '';
      noteBody = '';
      
      setTimeout(() => {
        responseMessage = '';
        fetchNotes();
      }, 2000);
    } catch (error: any) {
      responseMessage = extractErrorMessage(error, 'Failed to create note');
    } finally {
      isLoading = false;
    }
  }
  
  async function updateNote() {
    isLoading = true;
    responseMessage = '';
    
    try {
      await apiClient.put(`/api/v2/notes/${noteName}`, {
        type: noteType,
        body: noteBody
      });
      
      responseMessage = 'Note updated successfully!';
      
      setTimeout(() => {
        responseMessage = '';
        fetchNotes();
      }, 2000);
    } catch (error: any) {
      responseMessage = extractErrorMessage(error, 'Failed to update note');
    } finally {
      isLoading = false;
    }
  }
  
  async function deleteNote(name: string) {
    if (!confirm(`Delete note "${name}"?`)) return;
    
    try {
      await apiClient.delete(`/api/v2/notes/${name}`);
      fetchNotes();
    } catch (error: any) {
      alert('Failed to delete note');
    }
  }
  
  function loadNote(note: Note) {
    noteName = note.name;
    noteType = note.type;
    noteBody = note.body;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  onMount(() => {
    fetchNotes();
  });
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-gray-800">Notes Management</h1>
    <p class="text-gray-600">Create, view, and manage your notes</p>
  </div>
  
  <!-- Note Form -->
  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-4">Create/Update Note</h2>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Note Name</label>
        <Input bind:value={noteName} placeholder="Enter note name" />

      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2">Note Type</label>
        <select bind:value={noteType} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
          {#each noteTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2">Note Body</label>
        <textarea 
          bind:value={noteBody}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows="5"
          placeholder="Enter note content"
        ></textarea>
      </div>
      
      <div class="flex gap-2">
        <Button onclick={createNote} disabled={isLoading}>Create</Button>
        <Button onclick={updateNote} disabled={isLoading} variant="secondary">Update</Button>
        <Button variant="outline" onclick={() => window.location.href = '/notes/import'}>
          Import XML
        </Button>
      </div>
    </div>
    
    {#if responseMessage}
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        {@html responseMessage}
      </div>
    {/if}
  </Card>
  
  <!-- Notes List -->
  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-4">Your Notes ({notes.length})</h2>
    
    {#if notes.length === 0}
      <p class="text-gray-500 text-center py-8">No notes yet. Create your first note above.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-semibold">Name</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Type</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Body</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each notes as note}
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">{note.name}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                    {note.type}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm max-w-md truncate">{note.body}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex gap-2">
                    <button 
                      onclick={() => loadNote(note)}
                      class="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onclick={() => deleteNote(note.name)}
                      class="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>
