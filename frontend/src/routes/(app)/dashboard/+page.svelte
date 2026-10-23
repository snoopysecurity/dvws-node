<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import apiClient from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let notifications = $state<any[]>([]);
  let activityError = $state('');
  const actions = [
    { href: '/notes', title: 'Create a note', description: 'Capture workspace context and updates.', icon: 'notes' },
    { href: '/files', title: 'Upload artifact', description: 'Add a file to your workspace.', icon: 'files' },
    { href: '/passphrase', title: 'Create credentials', description: 'Generate and store a credential record.', icon: 'key' },
    { href: '/profile', title: 'Account settings', description: 'Manage notifications, sessions, and data.', icon: 'profile' },
    { href: '/resource-store', title: 'Resource Store', description: 'Spend workspace credits on developer services.', icon: 'cache' }
  ];
  onMount(async () => {
    try { const { data } = await apiClient.get('/api/v2/notifications'); notifications = data.notifications || []; }
    catch { activityError = 'Recent activity is unavailable right now.'; }
  });
</script>

<div class="mx-auto max-w-6xl space-y-7">
  <section class="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 shadow-sm sm:p-8">
    <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Workspace overview</p>
    <div class="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Welcome, {$authStore.user?.username || 'account'}.</h1><p class="mt-2 max-w-2xl text-slate-600">Your DVWS Cloud workspace is ready for the next update.</p></div><a class="focus-ring inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700" href="/profile">Open account <Icon name="chevron" size={16} /></a></div>
  </section>
  <section class="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
    <Card class="p-5 sm:p-6"><div class="flex items-center justify-between"><div><p class="page-kicker">Activity</p><h2 class="section-title mt-1">Recent activity</h2></div><a class="focus-ring text-sm font-semibold text-indigo-300 hover:text-indigo-200" href="/profile#notifications">View notifications</a></div>
      {#if activityError}<p class="error-message mt-5" role="alert">{activityError}</p>{:else if notifications.length === 0}<div class="mt-5 rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No recent activity. Notifications will appear here as they arrive.</div>{:else}<div class="mt-5 divide-y divide-slate-800">{#each notifications.slice(0, 5) as notification (notification._id)}<article class="py-3 first:pt-0"><p class="font-medium text-slate-200">{notification.message}</p><p class="mt-1 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()} · {notification.read ? 'Read' : 'Unread'}</p></article>{/each}</div>{/if}
    </Card>
    <Card class="p-5 sm:p-6"><p class="page-kicker">Account</p><h2 class="section-title mt-1">Account summary</h2><dl class="mt-5 space-y-4 text-sm"><div><dt class="text-slate-500">Username</dt><dd class="mt-1 font-medium text-slate-200">{$authStore.user?.username || '—'}</dd></div><div><dt class="text-slate-500">Email</dt><dd class="mt-1 break-all font-medium text-slate-200">{$authStore.user?.email || 'Not configured'}</dd></div><div><dt class="text-slate-500">Bio</dt><dd class="mt-1 text-slate-300">{$authStore.user?.bio || 'Not set'}</dd></div></dl></Card>
  </section>
  <section><div class="page-heading"><div><p class="page-kicker">Actions</p><h2 class="section-title mt-1">Workspace tools</h2></div></div><div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{#each actions as action}<a href={action.href} class="focus-ring group rounded-xl"><Card class="h-full p-5 hover:border-indigo-500/50 hover:bg-slate-800/70"><div class="flex items-start justify-between text-indigo-300"><Icon name={action.icon} /><Icon name="chevron" size={18} /></div><h3 class="mt-5 font-semibold text-slate-100">{action.title}</h3><p class="mt-2 text-sm leading-6 text-slate-400">{action.description}</p></Card></a>{/each}</div></section>
</div>
