<script lang="ts">
  import { goto } from '$app/navigation';
  import apiClient from '$lib/api/client';
  import { authStore } from '$lib/stores/auth';
  import { extractErrorMessage } from '$lib/utils/errorHandler';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  
  let username = $state('');
  let password = $state('');
  let errorMessage = $state('');
  let successMessage = $state('');
  let isRegisterMode = $state(false);
  let isLoading = $state(false);
  
  async function handleLogin() {
    isLoading = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      const { data } = await apiClient.post('/api/v2/login', 
        `username=${username}&password=${password}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}
      );
      
      if (data.status === 200) {
        authStore.setToken(data.token, data.result);
        goto(`/dashboard#${data.result.username}`);
      }
    } catch (error: any) {
      errorMessage = extractErrorMessage(error, 'Login failed');
    } finally {
      isLoading = false;
    }
  }
  
  async function handleRegister() {
    isLoading = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      const { data } = await apiClient.post('/api/v2/users',
        `username=${username}&password=${password}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}
      );
      
      if (data.status === 201) {
        successMessage = `${data.user} created successfully!`;
        setTimeout(() => {
          isRegisterMode = false;
          successMessage = '';
        }, 2000);
      }
    } catch (error: any) {
      errorMessage = extractErrorMessage(error, 'Registration failed');
    } finally {
      isLoading = false;
    }
  }
  
  function handleSubmit(e: Event) {
    e.preventDefault();
    if (isRegisterMode) {
      handleRegister();
    } else {
      handleLogin();
    }
  }
</script>

<div class="flex min-h-screen">
  <!-- Sidebar -->
  <div class="w-1/3 bg-slate-900 text-white p-12 flex flex-col justify-center">
    <h1 class="text-4xl font-bold mb-4">Damn Vulnerable Web Services</h1>
    <p class="text-lg text-slate-300">Login or register for access</p>
    <p class="text-sm text-slate-400 mt-4">⚠️ This is an intentionally vulnerable application for security training</p>
  </div>
  
  <!-- Main Content -->
  <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
    <Card class="w-full max-w-md p-8">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">
        {isRegisterMode ? 'Register' : 'Login'}
      </h2>
      
      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-700">Username</label>
          <Input bind:value={username} placeholder="Enter username" required />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-700">Password</label>
          <Input type="text" bind:value={password} placeholder="Enter password" required />
        </div>
        
        <div class="flex gap-2 pt-2">
          <Button type="submit" variant="primary" class="flex-1" disabled={isLoading}>
            {isLoading ? 'Loading...' : (isRegisterMode ? 'Register' : 'Login')}
          </Button>
          <Button 
            type="button"
            onclick={() => { isRegisterMode = !isRegisterMode; errorMessage = ''; successMessage = ''; }} 
            variant="outline"
          >
            {isRegisterMode ? 'Back to Login' : 'Register'}
          </Button>
        </div>
      </form>
      
      {#if errorMessage}
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          {@html errorMessage}
        </div>
      {/if}
      
      {#if successMessage}
        <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          {@html successMessage}
        </div>
      {/if}
    </Card>
  </div>
</div>
