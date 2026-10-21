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
    document.getElementById('note-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('note-name')?.focus();
  }
  
  onMount(() => {
    fetchNotes();
  });
</script>

<div class="mx-auto max-w-6xl space-y-6">
  <div class="page-heading">
    <div><p class="page-kicker">Workspace</p><h1 class="page-title mt-1">Notes</h1><p class="page-description mt-2">Capture and organize information for your workspace.</p></div>
    <a href="/notes/import" class="focus-ring inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Import notes</a>
  </div>
  
  <!-- Note Form -->
  <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
  <Card class="p-6 xl:sticky xl:top-6">
    <h2 class="section-title mb-1">Note editor</h2><p class="mb-5 text-sm text-slate-500">Select a note from the list to update it, or start a new one.</p>
    
    <div class="space-y-4">
      <div>
        <label for="note-name" class="block text-sm font-medium mb-2">Note Name</label>
        <Input id="note-name" bind:value={noteName} placeholder="e.g. Cache response observation" />

      </div>
      
      <div>
        <label for="note-type" class="block text-sm font-medium mb-2">Note Type</label>
        <select id="note-type" bind:value={noteType} class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
          {#each noteTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="note-body" class="block text-sm font-medium mb-2">Note Body</label>
        <textarea 
          id="note-body"
          bind:value={noteBody}
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          rows="5"
          placeholder="Enter note content"
        ></textarea>
      </div>
      
      <div class="flex gap-2">
        <Button onclick={createNote} disabled={isLoading}>Create</Button>
        <Button onclick={updateNote} disabled={isLoading} variant="secondary">Update</Button>
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
    <div class="mb-4 flex items-center justify-between"><div><h2 class="section-title">Your notes</h2><p class="mt-1 text-sm text-slate-500">Select a row to load it in the editor.</p></div><span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{notes.length}</span></div>
    
    {#if notes.length === 0}
      <p class="py-8 text-center text-slate-500">No notes yet. Create your first note above.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="console-table">
          <thead>
            <tr>
              <th class="px-4 py-2 text-left text-sm font-semibold">Name</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Type</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Body</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each notes as note}
              <tr>
                <td class="px-4 py-3 text-sm font-medium text-slate-800">{note.name}</td>
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
                    class="focus-ring rounded px-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onclick={() => deleteNote(note.name)}
                    class="focus-ring rounded px-1 text-red-600 hover:text-red-800 text-sm"
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
  </Card></div>
</div>
