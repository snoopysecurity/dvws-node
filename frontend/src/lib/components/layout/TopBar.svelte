<script lang="ts">
  import { authStore } from '$lib/stores/auth';
  import Icon from '$lib/components/ui/Icon.svelte';
  let { onMenu }: { onMenu: () => void } = $props();
</script>
<header class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6"><div class="flex items-center justify-between gap-4"><div class="flex items-center gap-3"><button class="focus-ring rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation" onclick={onMenu}><Icon name="menu" /></button><div><p class="text-sm font-bold text-slate-900 sm:text-base">DVWS Cloud</p><p class="hidden text-xs text-slate-500 sm:block">Developer operations</p></div></div>{#if $authStore.user}<a class="focus-ring flex items-center gap-3 rounded-lg p-1.5 hover:bg-slate-100" href="/profile"><div class="hidden text-right sm:block"><p class="text-sm font-medium text-slate-700">{$authStore.user.username}</p><p class="text-xs text-slate-500">Account settings</p></div><div class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{$authStore.user.username?.[0]?.toUpperCase() || 'U'}</div></a>{/if}</div></header>
