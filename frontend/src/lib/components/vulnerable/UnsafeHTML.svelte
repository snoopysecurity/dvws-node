<script lang="ts">
  let { 
    content = '',
    vulnerability = 'XSS',
    class: className = ''
  }: {
    content: string;
    vulnerability?: string;
    class?: string;
  } = $props();
</script>

<div class="unsafe-content {className}">
  {@html content}
</div>
