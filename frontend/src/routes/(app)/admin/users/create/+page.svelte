<script lang="ts">
  import apiClient from '$lib/api/client';
  import { extractErrorMessage } from '$lib/utils/errorHandler';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  
  let username = $state('');
  let password = $state('');
  let isAdmin = $state(false);
  let responseMessage = $state('');
  let isLoading = $state(false);
  
  async function handleCreateUser() {
    isLoading = true;
    responseMessage = '';
    
    try {
      const { data } = await apiClient.post('/api/v2/admin/create-user', 
        JSON.stringify({ username, password, admin: isAdmin }),
        { headers: { 'Content-Type': 'application/json' }}
      );
      
      responseMessage = `User ${username} created successfully!`;
      username = '';
      password = '';
      isAdmin = false;
    } catch (error: any) {
      responseMessage = extractErrorMessage(error, 'Failed to create user');
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-2xl">
  <div class="mb-6">
    <p class="page-kicker">Administration</p><h1 class="page-title mt-1">Create user</h1>
    <p class="page-description mt-2">Add a workspace account and access level.</p>
  </div>
  
  <Card class="p-6">
    <form onsubmit={(e) => { e.preventDefault(); handleCreateUser(); }} class="space-y-4">
      <div>
        <label for="new-username" class="block text-sm font-medium mb-2">Username</label>
        <Input id="new-username" bind:value={username} placeholder="Enter username" required />
      </div>
      
      <div>
        <label for="new-password" class="block text-sm font-medium mb-2">Password</label>
        <Input id="new-password" type="password" bind:value={password} placeholder="Enter password" required />
      </div>
      
      <div class="flex items-center gap-2">
        <input type="checkbox" bind:checked={isAdmin} id="admin-checkbox" class="w-4 h-4" />
        <label for="admin-checkbox" class="text-sm font-medium">Grant Admin Privileges</label>
      </div>
      
      <div class="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create User'}
        </Button>
        <Button type="button" variant="outline" onclick={() => window.history.back()}>
          Back to Admin
        </Button>
      </div>
    </form>
    
    {#if responseMessage}
      <div class="mt-4 rounded border border-indigo-500/30 bg-indigo-500/10 p-3 text-indigo-100">
        {@html responseMessage}
      </div>
    {/if}
  </Card>
</div>
