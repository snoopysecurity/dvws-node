<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import apiClient from '$lib/api/client';
  
  let { children }: any = $props();
  let ready = $state(false);
  
  onMount(async () => {
    // Check if authenticated
    if (!$authStore.isAuthenticated) {
      goto('/');
      return;
    }
    
    // Fetch user profile
    try {
      const { data } = await apiClient.get('/api/v2/users/profile');
      authStore.setUser(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      authStore.logout();
      goto('/');
      return;
    }
    
    ready = true;
  });
</script>

{#if ready}
  <AppShell>
    {@render children()}
  </AppShell>
{:else}
  <div class="flex items-center justify-center min-h-screen">
    <p class="text-gray-500">Loading...</p>
  </div>
{/if}
