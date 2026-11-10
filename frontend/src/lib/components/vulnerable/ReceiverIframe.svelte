<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let { token = '' }: { token?: string } = $props();

  type JwtView = {
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
  };

  let decoded = $state<JwtView | null>(null);
  let error = $state('');

  function decodeToken(value: unknown): JwtView | null {
    if (typeof value !== 'string') return null;

    try {
      const [encodedHeader, encodedPayload] = value.split('.');
      if (!encodedHeader || !encodedPayload) throw new Error('Not a JWT');

      const decodePart = (part: string) => {
        const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      };

      return { header: decodePart(encodedHeader), payload: decodePart(encodedPayload) };
    } catch {
      return null;
    }
  }
  
  onMount(() => {
    const showMessage = (event: MessageEvent) => {
      const message = decodeToken(event.data);
      if (message) {
        decoded = message;
        error = '';
      } else {
        error = 'The received message was not a decodable JWT.';
      }
    };

    window.addEventListener('message', showMessage);

    return () => window.removeEventListener('message', showMessage);
  });

  $effect(() => {
    if (!browser || !token) return;

    decoded = decodeToken(token);

    // Intentionally vulnerable: an embedded page or opener can receive the
    // session token because the target origin is not restricted.
    if (window.parent !== window) {
      window.parent.postMessage(token, '*');
    } else if (window.opener) {
      window.opener.postMessage(token, '*');
    }
  });
</script>

<div class="border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 rounded-lg">
  <h3 class="text-sm font-medium mb-2 text-yellow-900">JWT claims viewer</h3>
  <p class="text-xs text-yellow-800 mb-3">
    The token is decoded locally so you can inspect its header and claims.
  </p>
  
  <div class="rounded border border-amber-500/30 bg-amber-500/10 p-3 space-y-3">
    {#if decoded}
      <div>
        <div class="text-xs font-semibold uppercase tracking-wide text-yellow-900">Header</div>
        <pre class="mt-1 whitespace-pre-wrap break-words text-xs text-slate-800">{JSON.stringify(decoded.header, null, 2)}</pre>
      </div>
      <div>
        <div class="text-xs font-semibold uppercase tracking-wide text-yellow-900">Claims / payload</div>
        <pre class="mt-1 whitespace-pre-wrap break-words text-xs text-slate-800">{JSON.stringify(decoded.payload, null, 2)}</pre>
      </div>
    {:else if error}
      <span class="text-sm text-rose-700">{error}</span>
    {:else}
      <span class="text-sm text-slate-500">No JWT available.</span>
    {/if}
  </div>

</div>
