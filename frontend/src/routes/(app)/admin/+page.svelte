<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import apiClient from '$lib/api/client';
  import { extractErrorMessage } from '$lib/utils/errorHandler';
  import Card from '$lib/components/ui/Card.svelte';
  import ReceiverIframe from '$lib/components/vulnerable/ReceiverIframe.svelte';
  
  let systemInfo = $state('');
  let isAdmin = $state(false);
  let isLoading = $state(true);
  let errorMessage = $state('');
  
  onMount(async () => {
    try {
      // Check admin status
      const adminCheck = await apiClient.get('/api/v2/users/checkadmin');
      isAdmin = !!adminCheck.data.Success;
      
      if (isAdmin) {
        // Get system info
        const sysInfo = await apiClient.get('/api/v2/sysinfo/uname');
        systemInfo = sysInfo.data.sysinfo || '';
        
        setTimeout(() => {
          if (browser) {
            const token = localStorage.getItem('JWTSessionID');
            window.postMessage(token, '*');
          }
        }, 1000);
      }
    } catch (error: any) {
      errorMessage = extractErrorMessage(error, 'Failed to load admin panel');
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="text-center py-12">
    <p class="text-gray-600">Loading...</p>
  </div>
{:else if !isAdmin}
  <div class="text-center py-12">
    <Card class="inline-block p-8">
      <div class="text-6xl mb-4">🚫</div>
      <h2 class="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
      <p class="text-gray-600">Admin privileges required</p>
    </Card>
  </div>
{:else}
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      <p class="text-gray-600">System administration and management</p>
    </div>
    
    <!-- System Info -->
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-800">System Information</h2>
      <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto">{systemInfo}</pre>
    </Card>
    
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-800">JWT Token Display</h2>
      <ReceiverIframe />
    </Card>
    
    <!-- Admin Actions -->
    <div>
      <h2 class="text-xl font-semibold mb-4 text-gray-800">Admin Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <a href="/admin/users/create" class="block">
            <div class="text-3xl mb-2">➕</div>
            <h3 class="font-semibold text-lg mb-2">Create User</h3>
            <p class="text-sm text-gray-600">Add new users to the system</p>
          </a>
        </Card>
        
        <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <a href="/admin/users/status" class="block">
            <div class="text-3xl mb-2">👥</div>
            <h3 class="font-semibold text-lg mb-2">User Status</h3>
            <p class="text-sm text-gray-600">Check user status (SOAP)</p>
          </a>
        </Card>
        
        <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <a href="/admin/logs" class="block">
            <div class="text-3xl mb-2">📋</div>
            <h3 class="font-semibold text-lg mb-2">Login Logs</h3>
            <p class="text-sm text-gray-600">View authentication logs</p>
          </a>
        </Card>
      </div>
    </div>
  </div>
{/if}

{#if errorMessage}
  <Card class="p-4 bg-red-50 border border-red-200 mt-4">
    {@html errorMessage}
  </Card>
{/if}
