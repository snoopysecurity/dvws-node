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
    <p class="text-slate-400">Loading administration…</p>
  </div>
{:else if !isAdmin}
  <div class="text-center py-12">
    <Card class="inline-block p-8">
      <div class="text-6xl mb-4">🚫</div>
      <h2 class="mb-2 text-2xl font-bold text-rose-800">Access restricted</h2>
      <p class="text-slate-400">Administrator access is required.</p>
    </Card>
  </div>
{:else}
  <div class="space-y-6">
    <div>
      <p class="page-kicker">Operations</p><h1 class="page-title mt-1">Administration</h1>
      <p class="page-description mt-2">Manage users, diagnostics, and audit records.</p>
    </div>
    
    <!-- System Info -->
    <Card class="p-6">
      <h2 class="section-title mb-4">Diagnostics</h2>
      <pre class="code-panel">{systemInfo}</pre>
    </Card>
    
    <Card class="p-6">
      <h2 class="section-title mb-4">Session receiver</h2>
      <ReceiverIframe />
    </Card>
    
    <!-- Admin Actions -->
    <div>
      <h2 class="section-title mb-4">Administration tools</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <a href="/admin/users/create" class="block">
            <div class="text-3xl mb-2">➕</div>
            <h3 class="mb-2 text-lg font-semibold text-slate-100">Create user</h3>
            <p class="text-sm text-slate-400">Add a workspace account.</p>
          </a>
        </Card>
        
        <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <a href="/admin/users/status" class="block">
            <div class="text-3xl mb-2">👥</div>
            <h3 class="mb-2 text-lg font-semibold text-slate-100">User directory</h3>
            <p class="text-sm text-slate-400">Check user account status.</p>
          </a>
        </Card>
        
        <Card class="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <a href="/admin/logs" class="block">
            <div class="text-3xl mb-2">📋</div>
            <h3 class="mb-2 text-lg font-semibold text-slate-100">Audit logs</h3>
            <p class="text-sm text-slate-400">View authentication records.</p>
          </a>
        </Card>
      </div>
    </div>
  </div>
{/if}

{#if errorMessage}
  <Card class="error-message mt-4">
    {@html errorMessage}
  </Card>
{/if}
