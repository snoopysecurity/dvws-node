<script lang="ts">
  import { onMount } from 'svelte';
  import apiClient from '$lib/api/client';
  import { authStore } from '$lib/stores/auth';
  import { extractErrorMessage } from '$lib/utils/errorHandler';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  
  let bio = $state('');
  let exportXml = $state('');
  let importXml = $state('');
  let exportResponse = $state('');
  let importResponse = $state('');
  let isLoading = $state(false);
  
  async function handleExport() {
    isLoading = true;
    exportResponse = '';
    
    try {
      const { data } = await apiClient.post('/api/v2/users/profile/export/xml', {
        username: $authStore.user?.username,
        bio
      });
      
      exportXml = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      exportResponse = 'Profile exported successfully!';
    } catch (error: any) {
      exportResponse = extractErrorMessage(error, 'Failed to export profile');
    } finally {
      isLoading = false;
    }
  }
  
  async function handleImport() {
    isLoading = true;
    importResponse = '';
    
    try {
      const { data } = await apiClient.post('/api/v2/users/profile/import/xml', {
        xml: importXml
      });
      
      importResponse = JSON.stringify(data, null, 2);
      
      // Refresh profile
      const profile = await apiClient.get('/api/v2/users/profile');
      authStore.setUser(profile.data);
      bio = profile.data.bio || '';
    } catch (error: any) {
      importResponse = extractErrorMessage(error, 'Failed to import profile');
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    if ($authStore.user) {
      bio = $authStore.user.bio || '';
    }
  });
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-gray-800">Profile Management</h1>
    <p class="text-gray-600">Export and import your profile data</p>
  </div>
  
  <!-- Current Profile -->
  {#if $authStore.user}
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4">Current Profile</h2>
      <div class="space-y-2">
        <p><strong>Username:</strong> {$authStore.user.username}</p>
        <p><strong>Role:</strong> {$authStore.user.admin ? 'Admin' : 'User'}</p>
        <p><strong>Bio:</strong> {$authStore.user.bio || 'Not set'}</p>
      </div>
    </Card>
  {/if}
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Export Section -->
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4">Export Profile (XML)</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Bio</label>
          <textarea 
            bind:value={bio}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows="3"
            placeholder="Enter your bio"
          ></textarea>
        </div>
        
        <Button onclick={handleExport} disabled={isLoading}>
          Export as XML
        </Button>
        
        {#if exportXml}
          <div>
            <label class="block text-sm font-medium mb-2">Exported XML</label>
            <pre class="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-48 font-mono">{exportXml}</pre>
          </div>
        {/if}
        
        {#if exportResponse}
          <div class="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            {exportResponse}
          </div>
        {/if}
      </div>
    </Card>
    
    <!-- Import Section -->
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4">Import Profile (XML)</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">XML Data</label>
          <textarea 
            bind:value={importXml}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            rows="5"
            placeholder="Paste XML data here"
          ></textarea>
        </div>
        
        <Button onclick={handleImport} disabled={isLoading}>
          Import from XML
        </Button>
        
        {#if importResponse}
          <div>
            <label class="block text-sm font-medium mb-2">Import Result</label>
            <pre class="bg-gray-50 p-4 rounded text-xs overflow-x-auto max-h-48">{importResponse}</pre>
          </div>
        {/if}
      </div>
    </Card>
  </div>
</div>
