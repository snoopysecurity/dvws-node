<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import TopBar from './TopBar.svelte';
  
  let { children }: any = $props();
  let navigationOpen = $state(false);
</script>

<div class="flex min-h-screen bg-slate-50">
  <Sidebar bind:isOpen={navigationOpen} />
  <div class="flex-1 flex flex-col overflow-hidden">
    <TopBar onMenu={() => navigationOpen = true} />
    <main class="light-console flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      {@render children()}
    </main>
  </div>
</div>
