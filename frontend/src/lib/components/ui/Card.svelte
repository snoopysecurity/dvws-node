<script lang="ts">
  let { 
    class: className = '',
    children,
    ...props 
  }: any = $props();
</script>

<div 
  class="bg-white rounded-lg shadow-sm border border-gray-200 {className}"
  {...props}
>
  {@render children?.()}
</div>
