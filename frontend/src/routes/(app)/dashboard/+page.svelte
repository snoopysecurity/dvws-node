<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import apiClient from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  
  let releaseInfo = $state<any>(null);
  
  let hashUsername = $derived($page.url.hash.slice(1));
  
  onMount(async () => {
    // Fetch release info
    try {
      const release = await apiClient.get('/api/v2/release/0.0.1');
      releaseInfo = release.data;
    } catch (error) {
      console.error('Failed to fetch release info:', error);
    }
  });
</script>

<div class="space-y-6">
  <Card class="p-6 bg-gradient-to-r from-primary-50 to-blue-50">
    <h1 class="text-3xl font-bold text-gray-800">
      Welcome User: {@html '<b>' + hashUsername + '</b>'}
    </h1>
  </Card>
  
  <!-- User Profile Card -->
  {#if $authStore.user}
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-800">Your Profile</h2>
      <div class="space-y-2 text-gray-700">
        <p><strong>Username:</strong> {$authStore.user.username}</p>
        <p><strong>Bio:</strong> {$authStore.user.bio || 'No bio set'}</p>
        <p><strong>Role:</strong> {$authStore.user.role}</p>
      </div>
    </Card>
  {/if}
  
  <!-- Quick Actions Grid -->
  <div>
    <h2 class="text-lg font-semibold mb-4 text-gray-800">Quick Actions</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <a href="/notes" class="block">
          <div class="text-3xl mb-2">📝</div>
          <h3 class="font-semibold text-lg mb-2">Notes</h3>
          <p class="text-sm text-gray-600">Manage your notes</p>
        </a>
      </Card>
      
      <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <a href="/search" class="block">
          <div class="text-3xl mb-2">🔍</div>
          <h3 class="font-semibold text-lg mb-2">Search</h3>
          <p class="text-sm text-gray-600">Search public notes</p>
        </a>
      </Card>
      
      <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <a href="/admin" class="block">
          <div class="text-3xl mb-2">⚙️</div>
          <h3 class="font-semibold text-lg mb-2">Admin Panel</h3>
          <p class="text-sm text-gray-600">Administrative tools</p>
        </a>
      </Card>
      
      <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <a href="/profile" class="block">
          <div class="text-3xl mb-2">👤</div>
          <h3 class="font-semibold text-lg mb-2">Profile</h3>
          <p class="text-sm text-gray-600">View and export profile</p>
        </a>
      </Card>
      
      <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <a href="/passphrase" class="block">
          <div class="text-3xl mb-2">🔑</div>
          <h3 class="font-semibold text-lg mb-2">Passphrase</h3>
          <p class="text-sm text-gray-600">Generate passphrases</p>
        </a>
      </Card>
      
      <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <a href="/files" class="block">
          <div class="text-3xl mb-2">📁</div>
          <h3 class="font-semibold text-lg mb-2">Files</h3>
          <p class="text-sm text-gray-600">Upload and download</p>
        </a>
      </Card>
    </div>
  </div>
  
  {#if releaseInfo}
    <Card class="p-4 bg-gray-50">
      <p class="text-sm text-gray-600">Version: {releaseInfo.version || '0.0.1'}</p>
    </Card>
  {/if}
</div>
