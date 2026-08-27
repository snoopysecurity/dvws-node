<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import apiClient from '$lib/api/client';
  import { authStore } from '$lib/stores/auth';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import type { Passphrase } from '$lib/types';
  
  let reminder = $state('');
  let passphrase = $state('');
  let passphrases = $state<Passphrase[]>([]);
  let verifyUsername = $state('');
  let verifyPassword = $state('');
  let pdfUrl = $state('');
  let isLoading = $state(false);
  
  let PassGen: any = null;
  
  function generatePassphrase() {
    if (browser && PassGen) {
      passphrase = PassGen.generate(16);
    }
  }
  
  async function savePassphrase() {
    isLoading = true;
    
    try {
      await apiClient.post('/api/v2/passphrase', {
        reminder,
        passphrase
      });
      
      reminder = '';
      passphrase = '';
      fetchPassphrases();
    } catch (error) {
      console.error('Failed to save passphrase:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function fetchPassphrases() {
    try {
      const username = $authStore.user?.username || '';
      const { data } = await apiClient.get(`/api/v2/passphrase/${username}`);
      passphrases = Array.isArray(data) ? data : data.passphrases || [];
    } catch (error) {
      console.error('Failed to fetch passphrases:', error);
    }
  }
  
  async function exportToPdf() {
    isLoading = true;
    
    try {
      const objJsonStr = JSON.stringify(passphrases);
      const encodedData = btoa(objJsonStr);
      
      const { data } = await apiClient.post('/api/v2/export', {
        data: encodedData,
        username: verifyUsername,
        password: verifyPassword
      }, {
        responseType: 'blob'
      });
      
      pdfUrl = URL.createObjectURL(data);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF');
    } finally {
      isLoading = false;
    }
  }
  
  onMount(async () => {
    if (browser) {
      // Dynamically import PassGen
      const module = await import('$lib/utils/passgen.js');
      PassGen = (module as any).PassGen;
    }
    
    fetchPassphrases();
  });
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-gray-800">Passphrase Generator</h1>
    <p class="text-gray-600">Generate and manage secure passphrases</p>
  </div>
  
  <!-- Generate & Save -->
  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-4">Generate Passphrase</h2>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Reminder (max 26 chars)</label>
        <Input bind:value={reminder} placeholder="Enter reminder" maxlength="26" />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2">Passphrase (max 35 chars)</label>
        <div class="flex gap-2">
          <Input bind:value={passphrase} placeholder="Generated passphrase" maxlength="35" class="flex-1" />
          <Button onclick={generatePassphrase}>Generate</Button>
        </div>

      </div>
      
      <Button onclick={savePassphrase} disabled={isLoading}>
        Save Passphrase
      </Button>
    </div>
  </Card>
  
  <!-- Saved Passphrases -->
  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-4">Saved Passphrases ({passphrases.length})</h2>
    
    {#if passphrases.length === 0}
      <p class="text-gray-500 text-center py-8">No passphrases saved yet</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-semibold">Reminder</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Passphrase</th>
            </tr>
          </thead>
          <tbody>
            {#each passphrases as item}
              <tr class="border-t">
                <td class="px-4 py-3 text-sm">{item.reminder}</td>
                <td class="px-4 py-3 text-sm font-mono">{item.passphrase}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
  
  <!-- Export to PDF -->
  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-4">Export to PDF</h2>
    
    <div class="space-y-4">
      <p class="text-sm text-gray-600">Verify your credentials to export passphrases to PDF</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Username</label>
          <Input bind:value={verifyUsername} placeholder="Your username" />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Password</label>
          <Input type="password" bind:value={verifyPassword} placeholder="Your password" />
        </div>
      </div>
      
      <Button onclick={exportToPdf} disabled={isLoading || passphrases.length === 0}>
        Export to PDF
      </Button>
      

      
      {#if pdfUrl}
        <div class="mt-4">
          <iframe src={pdfUrl} class="w-full h-96 border rounded"></iframe>
          <a href={pdfUrl} download="passphrases.pdf" class="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Download PDF
          </a>
        </div>
      {/if}
    </div>
  </Card>
</div>
