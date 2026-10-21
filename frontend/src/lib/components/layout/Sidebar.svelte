<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '$lib/components/ui/Icon.svelte';
  let { isOpen = $bindable(false) }: { isOpen?: boolean } = $props();
  const groups = [
    { label: 'Workspace', items: [{ href: '/dashboard', label: 'Overview', icon: 'dashboard' }, { href: '/notes', label: 'Notes', icon: 'notes' }, { href: '/search', label: 'Shared Notes', icon: 'search' }, { href: '/files', label: 'Artifacts', icon: 'files' }, { href: '/passphrase', label: 'Credentials', icon: 'key' }, { href: '/profile', label: 'Account', icon: 'profile' }] },
    { label: 'Operations', items: [{ href: '/admin', label: 'Administration', icon: 'admin' }] }
  ];
  let currentPath = $derived($page.url.pathname);
  function close() { isOpen = false; }
</script>
{#if isOpen}<button class="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" aria-label="Close navigation" onclick={close}></button>{/if}
<aside class:translate-x-0={isOpen} class="fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-slate-800 bg-[#0c1019] text-white transition-transform duration-200 lg:static lg:translate-x-0">
  <div class="flex items-start justify-between border-b border-slate-800 p-6"><a href="/dashboard" class="focus-ring rounded-md" onclick={close}><p class="text-lg font-bold tracking-tight">DVWS Cloud</p><p class="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-indigo-300">Developer console</p></a><button class="focus-ring rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Close navigation" onclick={close}><Icon name="close" /></button></div>
  <nav class="flex-1 overflow-y-auto p-4" aria-label="Main navigation">{#each groups as group}<section class="mb-6"><h2 class="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{group.label}</h2><ul class="space-y-1">{#each group.items as item}<li><a href={item.href} onclick={close} class:!bg-primary-600={currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(`${item.href}/`))} class="focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"><Icon name={item.icon} size={18} /><span>{item.label}</span></a></li>{/each}</ul></section>{/each}</nav>
  <div class="border-t border-slate-800 p-4"><a href="/logout" class="focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"><Icon name="logout" size={18} />Sign out</a></div>
</aside>
