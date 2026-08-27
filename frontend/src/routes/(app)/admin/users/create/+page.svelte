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
    <h1 class="text-3xl font-bold text-gray-800">Create User</h1>
    <p class="text-gray-600">Add a new user to the system</p>
  </div>
  
  <Card class="p-6">
    <form onsubmit={(e) => { e.preventDefault(); handleCreateUser(); }} class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Username</label>
        <Input bind:value={username} placeholder="Enter username" required />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2">Password</label>
        <Input type="password" bind:value={password} placeholder="Enter password" required />
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
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        {@html responseMessage}
      </div>
    {/if}
  </Card>
</div>
