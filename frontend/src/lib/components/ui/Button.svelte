<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  type Variant = 'primary' | 'secondary' | 'outline' | 'danger';
  type Size = 'sm' | 'md' | 'lg';
  let { 
    variant = 'primary',
    size = 'md',
    class: className = '',
    children,
    ...props 
  }: HTMLButtonAttributes & { variant?: Variant; size?: Size; children?: Snippet } = $props();

  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50';
  
  const variants = {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-400',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-lg',
  };
</script>

<button 
  class="{baseClasses} {variants[variant]} {sizes[size]} {className}"
  {...props}
>
  {@render children?.()}
</button>
