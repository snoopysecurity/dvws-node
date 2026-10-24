<script lang="ts">
  import { onMount } from 'svelte';
  import apiClient from '$lib/api/client';
  import { authStore } from '$lib/stores/auth';
  import { extractErrorMessage } from '$lib/utils/errorHandler';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  
  let bio = $state('');
  let exportXml = $state('');
  let exportSignature = $state('');
  let bioStatus = $state('');
  let restoreStatus = $state('');
  let importXml = $state('');
  let exportResponse = $state('');
  let importResponse = $state('');
  let recoveryEmail = $state('');
  let recoveryPassword = $state('');
  let recoveryAccount = $state<{ userId: string; username: string } | null>(null);
  let recoveryResponse = $state('');
  let currentPassword = $state('');
  let newPassword = $state('');
  let passwordSessionStatus = $state('');
  let passwordSessionError = $state('');
  let passwordSessionLoading = $state(false);
  let sharingEnabled = $state(false);
  let sharingPartnerOrigin = $state('https://partner.test:8443');
  let sharingFields = $state<string[]>(['username', 'email', 'homeAddress']);
  let sharingStatus = $state('');
  let sharingError = $state('');
  let isLoading = $state(false);
  let inbox = $state<any[]>([]);
  let inboxStatus = $state('Loading notifications…');
  let inboxError = $state('');
  let notificationEmail = $state('');
  let weeklyDigest = $state(false);
  let preferencesStatus = $state('');
  let preferencesError = $state('');

  function mergeNotifications(incoming: any[]) {
    const existing = new Map(inbox.map((notification) => [notification._id, notification]));
    inbox = incoming.map((notification) => {
      const current = existing.get(notification._id);
      // Notification updates are currently read-only transitions. Do not let a
      // delayed REST or initial socket snapshot turn a known read item unread.
      return current?.read && !notification.read ? current : notification;
    });
  }

  async function loadNotifications() {
    try {
      const { data } = await apiClient.get('/api/v2/notifications');
      mergeNotifications(data.notifications || []);
      inboxStatus = 'Inbox loaded';
    } catch (error: any) {
      inboxError = extractErrorMessage(error, 'Could not load notifications');
      inboxStatus = 'Offline';
    }
  }

  function updateNotification(notification: any) {
    const index = inbox.findIndex((item) => item._id === notification._id);
    inbox = index === -1 ? [notification, ...inbox] : inbox.map((item) => item._id === notification._id ? notification : item);
  }

  async function markNotificationRead(id: string) {
    try {
      const { data } = await apiClient.put(`/api/v2/notifications/${id}/read`);
      updateNotification(data.notification);
    } catch (error: any) {
      inboxError = extractErrorMessage(error, 'Could not mark notification as read');
    }
  }

  async function saveNotificationPreferences(event: Event) {
    event.preventDefault();
    preferencesStatus = '';
    preferencesError = '';
    try {
      const { data } = await apiClient.put('/api/v2/users/notification-preferences', {
        email: notificationEmail,
        weeklyDigest
      });
      notificationEmail = data.email || '';
      weeklyDigest = Boolean(data.weeklyDigest);
      preferencesStatus = 'Notification preferences saved.';
    } catch (error: any) {
      preferencesError = extractErrorMessage(error, 'Could not save notification preferences');
    }
  }

  async function loadProfileSharing() {
    try {
      const { data } = await apiClient.get('/api/v2/users/profile-sharing');
      const settings = data.profileSharing || {};
      sharingEnabled = Boolean(settings.enabled);
      sharingPartnerOrigin = settings.partnerOrigin || '';
      sharingFields = settings.fields || [];
    } catch (error: any) {
      sharingError = extractErrorMessage(error, 'Could not load profile sharing settings');
    }
  }

  function toggleSharingField(field: string, checked: boolean) {
    sharingFields = checked ? [...new Set([...sharingFields, field])] : sharingFields.filter((item) => item !== field);
  }

  async function saveProfileSharing(enabled: boolean) {
    sharingStatus = '';
    sharingError = '';
    try {
      const { data } = await apiClient.put('/api/v2/users/profile-sharing', {
        enabled, partnerOrigin: sharingPartnerOrigin, fields: sharingFields
      });
      sharingEnabled = Boolean(data.profileSharing.enabled);
      sharingPartnerOrigin = data.profileSharing.partnerOrigin || '';
      sharingFields = data.profileSharing.fields || [];
      sharingStatus = enabled ? 'Profile sharing is enabled.' : 'Profile sharing has been revoked.';
    } catch (error: any) {
      sharingError = extractErrorMessage(error, 'Could not update profile sharing');
    }
  }

  async function changePassword(event: Event) {
    event.preventDefault();
    passwordSessionLoading = true;
    passwordSessionStatus = '';
    passwordSessionError = '';

    try {
      await apiClient.post('/api/v2/users/change-password', { currentPassword, newPassword });
      currentPassword = '';
      newPassword = '';
      passwordSessionStatus = 'Password updated. Other signed-in sessions may remain active.';
    } catch (error: any) {
      passwordSessionError = extractErrorMessage(error, 'Password update failed');
    } finally {
      passwordSessionLoading = false;
    }
  }

  async function lookupRecoveryAccount(event: Event) {
    event.preventDefault();
    isLoading = true;
    recoveryResponse = '';
    recoveryAccount = null;

    try {
      const { data } = await apiClient.post('/api/v2/account-recovery/lookup', { email: recoveryEmail });
      recoveryAccount = { userId: data.userId, username: data.username };
      recoveryResponse = 'Password reset request created.';
    } catch (error: any) {
      recoveryResponse = extractErrorMessage(error, 'Could not find an account for that email');
    } finally {
      isLoading = false;
    }
  }

  async function resetRecoveryPassword(event: Event) {
    event.preventDefault();
    if (!recoveryAccount) return;

    isLoading = true;
    recoveryResponse = '';

    try {
      const { data } = await apiClient.post('/api/v2/account-recovery/reset', {
        userId: recoveryAccount.userId,
        newPassword: recoveryPassword
      });
      recoveryResponse = `Password changed for ${data.username}. Sign in again to verify the change.`;
      recoveryPassword = '';
    } catch (error: any) {
      recoveryResponse = extractErrorMessage(error, 'Password reset failed');
    } finally {
      isLoading = false;
    }
  }
  
  async function saveBio() {
    bioStatus = '';
    exportXml = '';
    exportSignature = '';
    try {
      const { data } = await apiClient.put('/api/v2/users/profile/bio', { bio });
      authStore.setUser({ ...$authStore.user, bio: data.bio });
      bioStatus = 'Bio saved.';
    } catch (error: any) {
      bioStatus = extractErrorMessage(error, 'Could not save bio');
    }
  }

  async function handleExport() {
    isLoading = true;
    exportResponse = '';
    
    try {
      const { data, headers } = await apiClient.post('/api/v2/users/profile/export/xml');
      
      exportXml = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      exportSignature = String(headers['x-profile-export-signature'] || '');
      exportResponse = 'Profile exported successfully!';
    } catch (error: any) {
      exportResponse = extractErrorMessage(error, 'Failed to export profile');
    } finally {
      isLoading = false;
    }
  }

  async function restoreExport() {
    restoreStatus = '';
    try {
      const { data } = await apiClient.post('/api/v2/users/profile/restore/xml', {
        xml: exportXml, signature: exportSignature
      });
      authStore.setUser({ ...$authStore.user, admin: data.admin });
      restoreStatus = `Profile restored. Role: ${data.admin ? 'Admin' : 'User'}. Sign in again to refresh token permissions.`;
    } catch (error: any) {
      restoreStatus = extractErrorMessage(error, 'Could not restore export');
    }
  }
  
  async function handleImport() {
    isLoading = true;
    importResponse = '';
    
    try {
      const { data } = await apiClient.post('/api/v2/users/profile/import/xml', {
        xml: importXml
      });
      
      importResponse = JSON.stringify(data, null, 2);
      
      // Refresh profile
      const profile = await apiClient.get('/api/v2/users/profile');
      authStore.setUser(profile.data);
      bio = profile.data.bio || '';
    } catch (error: any) {
      importResponse = extractErrorMessage(error, 'Failed to import profile');
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    if ($authStore.user) {
      bio = $authStore.user.bio || '';
      recoveryEmail = $authStore.user.email || '';
      notificationEmail = $authStore.user.email || '';
      weeklyDigest = Boolean($authStore.user.weeklyDigest);
    }
    loadNotifications();
    loadProfileSharing();

    const apiBase = import.meta.env.PUBLIC_API_BASE_URL || window.location.origin;
    const socketUrl = new URL(apiBase);
    socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    socketUrl.pathname = '/ws/notifications';
    socketUrl.search = '';
    const socket = new WebSocket(socketUrl.toString());
    socket.onopen = () => { inboxStatus = 'Live updates connected'; };
    socket.onerror = () => { inboxStatus = 'Live updates unavailable; using inbox refresh state'; };
    socket.onclose = () => {
      if (inboxStatus === 'Live updates connected') inboxStatus = 'Live updates disconnected';
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'snapshot') mergeNotifications(message.notifications || []);
        if (message.type === 'notification-updated') updateNotification(message.notification);
      } catch (_error) { /* Ignore malformed messages. */ }
    };
    return () => socket.close();
  });
</script>

<div class="mx-auto max-w-6xl space-y-6">
  <div class="page-heading">
    <div><p class="page-kicker">Account</p><h1 class="page-title mt-1">Account settings</h1><p class="page-description mt-2">Manage your profile, notifications, password, external access, and data.</p></div>
  </div>
  <nav class="sticky top-2 z-10 -mx-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur" aria-label="Account sections"><div class="flex w-max gap-1 text-sm font-medium"><a class="focus-ring rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" href="#account">Profile</a><a class="focus-ring rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" href="#notifications">Notifications</a><a class="focus-ring rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" href="#recovery">Recovery</a><a class="focus-ring rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" href="#password">Password</a><a class="focus-ring rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" href="#external-access">External access</a><a class="focus-ring rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" href="#xml-tools">Data import/export</a></div></nav>
  
  <!-- Current Profile -->
  {#if $authStore.user}
    <Card id="account" class="scroll-mt-24 p-6">
      <h2 class="section-title mb-4">Profile</h2>
      <div class="space-y-2">
        <p><strong>Username:</strong> {$authStore.user.username}</p>
        <p><strong>Role:</strong> {$authStore.user.admin ? 'Admin' : 'User'}</p>
        <p><strong>Bio:</strong> {$authStore.user.bio || 'Not set'}</p>
      </div>
    </Card>
  {/if}

  <Card id="notifications" class="scroll-mt-24 p-6">
    <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="section-title">Notifications</h2><p class="mt-1 text-sm text-slate-400">Your account inbox stays synchronized with live updates.</p></div><span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">{inboxStatus}</span></div>
    {#if inboxError}<p class="error-message mt-4" role="alert">{inboxError}</p>{/if}
    <div class="mt-5 space-y-3">
      {#each inbox as notification (notification._id)}
        <article class:opacity-60={notification.read} class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 p-4">
          <div><p class="font-medium text-slate-100">{notification.message}</p><p class="mt-1 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()} · {notification.read ? 'Read' : 'Unread'}</p></div>
          {#if !notification.read}<Button type="button" variant="outline" onclick={() => markNotificationRead(notification._id)}>Mark read</Button>{/if}
        </article>
      {:else}
        <p class="text-sm text-slate-600">No notifications yet.</p>
      {/each}
    </div>
    <form class="mt-6 border-t border-slate-700 pt-6" onsubmit={saveNotificationPreferences}>
      <h3 class="font-semibold text-slate-100">Notification preferences</h3><p class="mt-1 text-sm text-slate-400">Choose where account notifications are delivered.</p>
      <div class="mt-4 grid gap-4 md:grid-cols-2"><div><label for="notification-email" class="block text-sm font-medium mb-2">Notification email</label><Input id="notification-email" type="email" bind:value={notificationEmail} required /></div><label class="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" bind:checked={weeklyDigest} /> Receive weekly digest</label></div>
      <Button class="mt-4" type="submit">Save notification preferences</Button>
      {#if preferencesStatus}<p class="mt-3 text-sm text-green-700" role="status">{preferencesStatus}</p>{/if}
      {#if preferencesError}<p class="error-message mt-3" role="alert">{preferencesError}</p>{/if}
    </form>
  </Card>

  <Card id="recovery" class="scroll-mt-24 p-6">
    <h2 class="section-title mb-2">Recovery</h2>
    <p class="mb-4 text-sm text-slate-400">Request a password reset for an account using its email address.</p>

    <form onsubmit={lookupRecoveryAccount} class="space-y-4">
      <div>
        <label for="recovery-email" class="block text-sm font-medium mb-2">Account email</label>
        <Input id="recovery-email" type="email" bind:value={recoveryEmail} required placeholder="Enter an account email" />
      </div>
      <Button type="submit" disabled={isLoading}>{isLoading ? 'Loading…' : 'Request password reset'}</Button>
    </form>

    {#if recoveryAccount}
      <form onsubmit={resetRecoveryPassword} class="mt-6 space-y-4 border-t pt-5">
        <p class="text-sm text-slate-300">Reset request for <strong>{recoveryAccount.username}</strong></p>
        <div>
          <label for="recovery-password" class="block text-sm font-medium mb-2">New password</label>
          <Input id="recovery-password" type="password" bind:value={recoveryPassword} required minlength="4" autocomplete="new-password" />
        </div>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Resetting…' : 'Set new password'}</Button>
      </form>
    {/if}

    {#if recoveryResponse}
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm" role="status">
        {recoveryResponse}
      </div>
    {/if}
  </Card>

  <Card id="password" class="scroll-mt-24 p-6">
    <h2 class="text-xl font-semibold mb-2">Password</h2>
    <p class="mb-5 text-sm text-slate-400">Update your account password.</p>

    <div class="space-y-5">
      <form onsubmit={changePassword} class="space-y-4">
        <div>
          <label for="current-password" class="block text-sm font-medium mb-2">Current password</label>
          <Input id="current-password" type="password" bind:value={currentPassword} required autocomplete="current-password" />
        </div>
        <div>
          <label for="new-password" class="block text-sm font-medium mb-2">New password</label>
          <Input id="new-password" type="password" bind:value={newPassword} required minlength="4" autocomplete="new-password" />
        </div>
        <Button type="submit" disabled={passwordSessionLoading}>{passwordSessionLoading ? 'Updating…' : 'Update password'}</Button>
      </form>
    </div>

    {#if passwordSessionStatus}
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm" role="status">{passwordSessionStatus}</div>
    {/if}
    {#if passwordSessionError}
      <div class="error-message mt-4" role="alert">{passwordSessionError}</div>
    {/if}
  </Card>

  <Card id="external-access" class="scroll-mt-24 p-6">
    <h2 class="section-title mb-2">External access</h2>
    <p class="mb-4 text-sm text-slate-500">Choose profile details for a partner application. Sharing remains on until you revoke it.</p>
    <div class="space-y-4">
      <div>
        <label for="sharing-origin" class="block text-sm font-medium mb-2">Partner origin</label>
        <Input id="sharing-origin" type="url" bind:value={sharingPartnerOrigin} placeholder="https://partner.example" />
      </div>
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium mb-2">Shared profile fields</legend>
        {#each [['username', 'Username'], ['email', 'Email'], ['homeAddress', 'Home address']] as [field, label]}
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sharingFields.includes(field)} onchange={(event) => toggleSharingField(field, event.currentTarget.checked)} />
            {label}
          </label>
        {/each}
      </fieldset>
      <div class="flex items-center gap-3">
        <Button type="button" onclick={() => saveProfileSharing(true)}>Enable sharing</Button>
        <Button type="button" onclick={() => saveProfileSharing(false)}>Revoke sharing</Button>
      </div>
      <p class="text-sm" role="status">Sharing status: <strong>{sharingEnabled ? 'Enabled' : 'Revoked'}</strong>{#if sharingPartnerOrigin} for {sharingPartnerOrigin}{/if}.</p>
      {#if sharingEnabled}<p class="text-sm text-slate-500">Selected fields: {sharingFields.length ? sharingFields.join(', ') : 'none'}</p>{/if}
    </div>
    {#if sharingStatus}
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm" role="status">{sharingStatus}</div>
    {/if}
    {#if sharingError}
      <div class="error-message mt-4" role="alert">{sharingError}</div>
    {/if}
  </Card>
  
  <div id="xml-tools" class="scroll-mt-24 grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Export Section -->
    <Card class="p-6">
      <h2 class="section-title mb-4">Data export</h2>
      
      <div class="space-y-4">
        <div>
          <label for="profile-bio" class="block text-sm font-medium mb-2">Bio</label>
          <textarea 
            id="profile-bio"
            bind:value={bio}
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            rows="3"
            maxlength="2000"
            placeholder="Enter your bio"
          ></textarea>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <Button onclick={saveBio} disabled={isLoading}>Save bio</Button>
          <Button onclick={handleExport} disabled={isLoading}>Export saved profile as XML</Button>
          {#if exportSignature}<Button onclick={restoreExport} disabled={isLoading}>Restore signed export</Button>{/if}
        </div>
        {#if bioStatus}<p role="status" class="text-sm">{bioStatus}</p>{/if}
        {#if restoreStatus}<p role="status" class="text-sm">{restoreStatus}</p>{/if}
        
        {#if exportXml}
          <div>
            <p class="block text-sm font-medium mb-2">Exported XML</p>
            <pre class="code-panel max-h-48">{exportXml}</pre>
          </div>
        {/if}
        
        {#if exportResponse}
          <div class="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            {exportResponse}
          </div>
        {/if}
      </div>
    </Card>
    
    <!-- Import Section -->
    <Card class="p-6">
      <h2 class="section-title mb-4">Data import</h2>
      
      <div class="space-y-4">
        <div>
          <label for="profile-xml" class="block text-sm font-medium mb-2">XML Data</label>
          <textarea 
            id="profile-xml"
            bind:value={importXml}
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            rows="5"
            placeholder="Paste XML data here"
          ></textarea>
        </div>
        
        <Button onclick={handleImport} disabled={isLoading}>
          Import from XML
        </Button>
        
        {#if importResponse}
          <div>
            <p class="block text-sm font-medium mb-2">Import Result</p>
            <pre class="code-panel max-h-48">{importResponse}</pre>
          </div>
        {/if}
      </div>
    </Card>
  </div>
</div>
