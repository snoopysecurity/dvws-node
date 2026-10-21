<script lang="ts">
  let { tone = 'info', children }: { tone?: 'info' | 'success' | 'error'; children: any } = $props();
  const styles = { info: 'border-indigo-200 bg-indigo-50 text-indigo-900', success: 'border-emerald-200 bg-emerald-50 text-emerald-900', error: 'border-rose-200 bg-rose-50 text-rose-900' };
</script>
<div class={`rounded-lg border px-4 py-3 text-sm ${styles[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>{@render children()}</div>
