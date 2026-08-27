<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import TopBar from './TopBar.svelte';
  
  let { children }: any = $props();
</script>

<div class="flex h-screen bg-gray-50">
  <Sidebar />
  <div class="flex-1 flex flex-col overflow-hidden">
    <TopBar />
    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
