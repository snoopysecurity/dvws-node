<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';
  
  onMount(() => {
    authStore.logout();
    goto('/');
  });
</script>

<div class="flex items-center justify-center min-h-screen bg-gray-50">
  <div class="text-center">
    <h1 class="text-2xl font-bold mb-4">Logging out...</h1>
    <p class="text-gray-600">Please wait</p>
  </div>
</div>
