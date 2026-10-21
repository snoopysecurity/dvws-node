<script lang="ts">
  let { 
    value = $bindable(''),
    type = 'text',
    class: className = '',
    ...props 
  }: any = $props();

  const baseClasses = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
</script>

<input 
  {type}
  bind:value
  class="{baseClasses} {className}"
  {...props}
/>
