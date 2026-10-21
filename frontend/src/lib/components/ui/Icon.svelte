<script lang="ts">
  let { name, size = 20, label = '' }: { name: string; size?: number; label?: string } = $props();
</script>

<svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined}>
  {#if label}<title>{label}</title>{/if}
  {#if name === 'dashboard'}<path fill="currentColor" stroke="none" d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-16v5h8V4h-8Z" />
  {:else if name === 'notes'}<path d="M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5" />
  {:else if name === 'search'}<circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" />
  {:else if name === 'profile'}<circle cx="12" cy="8" r="3" /><path d="M5 20c.6-3.3 3-5 7-5s6.4 1.7 7 5" />
  {:else if name === 'websocket'}<path d="M8 7a6 6 0 0 1 8 0M5 4a10 10 0 0 1 14 0M12 11v9M9 17l3 3 3-3" />
  {:else if name === 'cache'}<path d="M4 6h16v5H4zM4 13h16v5H4zM7 9h.01M7 16h.01" />
  {:else if name === 'key'}<circle cx="8" cy="15" r="4" /><path d="m11 12 8-8m-3 0h3v3" />
  {:else if name === 'files'}<path d="M5 3h9l5 5v13H5V3Z" /><path d="M14 3v6h6" />
  {:else if name === 'admin'}<path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Z" /><path d="m9 12 2 2 4-4" />
  {:else if name === 'logout'}<path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
  {:else if name === 'menu'}<path d="M4 7h16M4 12h16M4 17h16" />
  {:else if name === 'close'}<path d="m6 6 12 12M18 6 6 18" />
  {:else if name === 'chevron'}<path d="m9 18 6-6-6-6" />
  {:else if name === 'upload'}<path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" />
  {:else}<path fill="currentColor" stroke="none" d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-16v5h8V4h-8Z" />{/if}
</svg>
