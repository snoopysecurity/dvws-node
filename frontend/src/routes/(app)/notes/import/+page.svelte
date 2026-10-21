<script lang="ts">
  import apiClient from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  
  let xmlData = $state('');
  let responseMessage = $state('');
  let isLoading = $state(false);
  
  const exampleXML = `<notes>
  <note>
    <name>My Note</name>
    <body>Content here</body>
    <type>secret</type>
  </note>
</notes>`;
  
  async function importNotes() {
    isLoading = true;
    responseMessage = '';
    
    try {
      const { data } = await apiClient.post('/api/v2/notes/import/xml', {
        xml: xmlData
      });
      
      responseMessage = JSON.stringify(data, null, 2);
    } catch (error: any) {
      responseMessage = error.response?.data || 'Failed to import notes';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-4xl">
  <div class="mb-6">
    <p class="page-kicker">Notes</p><h1 class="page-title mt-1">Data import</h1>
    <p class="page-description mt-2">Import notes from XML data.</p>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Import Form -->
    <Card class="p-6">
      <h2 class="text-lg font-semibold mb-4">XML Data</h2>
      
      <textarea 
        bind:value={xmlData}
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        rows="10"
        placeholder="Paste XML data here"
      ></textarea>
      

      
      <div class="flex gap-2 mt-4">
        <Button onclick={importNotes} disabled={isLoading}>
          {isLoading ? 'Importing...' : 'Import Notes'}
        </Button>
        <Button variant="outline" onclick={() => window.location.href = '/notes'}>
          Back to Notes
        </Button>
      </div>
    </Card>
    
    <!-- Example XML -->
    <Card class="p-6">
      <h2 class="text-lg font-semibold mb-4">Example XML Format</h2>
      
      <pre class="code-panel">{exampleXML}</pre>
      
      <Button 
        variant="outline" 
        size="sm"
        class="mt-4"
        onclick={() => xmlData = exampleXML}
      >
        Use Example
      </Button>
    </Card>
  </div>
  
  {#if responseMessage}
    <Card class="p-6 mt-6">
      <h2 class="text-lg font-semibold mb-4">Import Result</h2>
      <pre class="code-panel">{responseMessage}</pre>
    </Card>
  {/if}
</div>
