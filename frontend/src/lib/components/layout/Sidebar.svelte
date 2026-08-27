<script lang="ts">
  import { page } from '$app/stores';
  
  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/notes', label: 'Notes', icon: '📝' },
    { href: '/search', label: 'Search', icon: '🔍' },
    { href: '/profile', label: 'Profile', icon: '👤' },
    { href: '/passphrase', label: 'Passphrase', icon: '🔑' },
    { href: '/files', label: 'Files', icon: '📁' },
    { href: '/admin', label: 'Admin', icon: '⚙️' },
  ];
  
  let currentPath = $derived($page.url.pathname);
</script>

<aside class="w-64 bg-slate-900 text-white flex flex-col">
  <div class="p-6 border-b border-slate-800">
    <h1 class="text-xl font-bold">DVWS</h1>
    <p class="text-sm text-slate-400 mt-1">Vulnerable Web Services</p>
  </div>
  
  <nav class="flex-1 p-4">
    <ul class="space-y-2">
      {#each menuItems as item}
        <li>
          <a 
            href={item.href}
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors {
              currentPath.startsWith(item.href) 
                ? 'bg-primary-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800'
            }"
          >
            <span class="text-xl">{item.icon}</span>
            <span class="font-medium">{item.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
  
  <div class="p-4 border-t border-slate-800">
    <a 
      href="/logout"
      class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
    >
      <span class="text-xl">🚪</span>
      <span class="font-medium">Logout</span>
    </a>
  </div>
</aside>
