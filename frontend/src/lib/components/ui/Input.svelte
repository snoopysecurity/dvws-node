<script lang="ts">
  let { 
    value = $bindable(''),
    type = 'text',
    class: className = '',
    ...props 
  }: any = $props();

  const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
</script>

<input 
  {type}
  bind:value
  class="{baseClasses} {className}"
  {...props}
/>
