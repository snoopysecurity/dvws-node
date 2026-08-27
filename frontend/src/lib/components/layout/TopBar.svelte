<script lang="ts">
  import { authStore } from '$lib/stores/auth';
</script>

<header class="bg-white border-b border-gray-200 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-semibold text-gray-800">Damn Vulnerable Web Services</h2>
      <p class="text-sm text-gray-500">Security Training Platform</p>
    </div>
    
    <div class="flex items-center gap-4">
      {#if $authStore.user}
        <div class="text-right">
          <p class="text-sm font-medium text-gray-700">{$authStore.user.username}</p>
          <p class="text-xs text-gray-500">{$authStore.user.role || 'User'}</p>
        </div>
        <div class="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold">
          {$authStore.user.username?.[0]?.toUpperCase() || 'U'}
        </div>
      {/if}
    </div>
  </div>
</header>
