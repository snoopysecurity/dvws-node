<script lang="ts">
  let { 
    class: className = '',
    children,
    ...props 
  }: any = $props();
</script>

<div 
  class="rounded-xl border border-slate-200 bg-white shadow-sm {className}"
  {...props}
>
  {@render children?.()}
</div>
