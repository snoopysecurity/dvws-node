<script lang="ts">
  import { onMount } from 'svelte';
  
  let receivedMessage = $state('');
  
  onMount(() => {
    window.addEventListener('message', (event) => {
      receivedMessage = event.data;
    });
  });
</script>

<div class="border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 rounded-lg">
  <h3 class="text-sm font-medium mb-2 text-yellow-900">Message Receiver (PostMessage)</h3>
  
  <div class="min-h-[60px] rounded border border-amber-500/30 bg-amber-500/10 p-3">
    {#if receivedMessage}
      {@html receivedMessage}
    {:else}
      <span class="text-sm text-slate-400">Waiting for message...</span>
    {/if}
  </div>
  
</div>
