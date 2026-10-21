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

<div class="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(22rem,0.9fr)_1.1fr]">
  <!-- Sidebar -->
  <div class="relative overflow-hidden border-b border-slate-800 bg-[#0c1019] p-8 text-white sm:p-12 lg:flex lg:flex-col lg:justify-center lg:border-b-0 lg:border-r">
    <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-600/30 blur-3xl"></div>
    <div class="relative max-w-md"><p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Developer operations</p><h1 class="mt-4 text-4xl font-bold tracking-tight">DVWS Cloud</h1>
    <p class="mt-4 text-lg text-slate-300">A compact workspace for account controls, artifacts, notes, and operational administration.</p>
    <div class="mt-8 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300"><p class="font-semibold text-indigo-200">Console access</p><p class="mt-1">Sign in to manage your workspace and account preferences.</p></div></div>
  </div>
  
  <!-- Main Content -->
  <div class="flex items-center justify-center bg-slate-50 p-5 sm:p-8">
    <Card class="w-full max-w-md p-6 shadow-lg sm:p-8">
      <h2 class="mb-2 text-2xl font-bold text-slate-900">
        {isRegisterMode ? 'Create account' : 'Sign in'}
      </h2>
      <p class="mb-6 text-sm text-slate-600">Use your DVWS Cloud account to continue.</p>
      
      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="username" class="mb-2 block text-sm font-medium text-slate-700">Username</label>
          <Input id="username" bind:value={username} placeholder="Enter username" autocomplete="username" required />
        </div>
        
        <div>
          <label for="password" class="mb-2 block text-sm font-medium text-slate-700">Password</label>
          <Input id="password" type="password" bind:value={password} placeholder="Enter password" autocomplete={isRegisterMode ? 'new-password' : 'current-password'} required />
        </div>
        
        <div class="flex gap-2 pt-2">
          <Button type="submit" variant="primary" class="flex-1" disabled={isLoading}>
            {isLoading ? 'Loading...' : (isRegisterMode ? 'Create account' : 'Sign in')}
          </Button>
          <Button 
            type="button"
            onclick={() => { isRegisterMode = !isRegisterMode; errorMessage = ''; successMessage = ''; }} 
            variant="outline"
          >
            {isRegisterMode ? 'Back to sign in' : 'Create account'}
          </Button>
        </div>
      </form>
      
      {#if errorMessage}
        <div class="error-message mt-4">
          <span role="alert">{@html errorMessage}</span>
        </div>
      {/if}
      
      {#if successMessage}
        <div class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span role="status">{@html successMessage}</span>
        </div>
      {/if}
    </Card>
  </div>
</div>
