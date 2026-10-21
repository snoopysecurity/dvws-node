<script lang="ts">
  import { onMount } from 'svelte';
  import apiClient from '$lib/api/client';
  import { extractErrorMessage } from '$lib/utils/errorHandler';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import type { FileInfo } from '$lib/types';
  
  let files = $state<FileInfo[]>([]);
  let selectedFile: File | null = $state(null);
  let downloadFilename = $state('');
  let isLoading = $state(false);
  let uploadMessage = $state('');
  
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile = target.files[0];
    }
  }
  
  async function uploadFile() {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }
    
    isLoading = true;
    uploadMessage = '';
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      await apiClient.post('/api/upload', formData);
      
      uploadMessage = 'File uploaded successfully!';
      selectedFile = null;
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      fetchFiles();
    } catch (error: any) {
      uploadMessage = extractErrorMessage(error, 'Failed to upload file');
    } finally {
      isLoading = false;
    }
  }
  
  async function downloadFile() {
    if (!downloadFilename) {
      alert('Please enter a filename');
      return;
    }
    
    try {
      const { data } = await apiClient.post('/api/download', {
        filename: downloadFilename
      }, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download file');
    }
  }
  
  async function fetchFiles() {
    try {
      const { data } = await apiClient.get('/api/upload');
      // Backend returns an array of filename strings, map to FileInfo objects
      const raw = Array.isArray(data) ? data : data.files || [];
      files = raw.map((f: any) => typeof f === 'string' ? { filename: f } : f);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  }
  
  onMount(() => {
    fetchFiles();
  });
</script>

<div class="mx-auto max-w-6xl space-y-6">
  <div class="page-heading"><div><p class="page-kicker">Workspace</p><h1 class="page-title mt-1">Artifacts</h1><p class="page-description mt-2">Upload, retrieve, and manage workspace artifacts.</p></div>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Upload Section -->
    <Card class="p-6">
      <h2 class="section-title mb-4">Upload artifact</h2>
      
      <div class="space-y-4">
        <div>
          <label for="file-upload" class="block cursor-pointer rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-500/10"><span class="mx-auto mb-2 block text-sm font-semibold text-slate-200">Choose an artifact to upload</span><span class="block text-xs text-slate-500">Click to browse from your device</span>
          <input id="file-upload"
            type="file" 
            onchange={handleFileSelect}
            class="sr-only"
          />
          </label>
        </div>
        
        {#if selectedFile}
          <div class="rounded bg-slate-800/60 p-3 text-sm text-slate-300">
            <p><strong>Selected:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        {/if}
        
        <Button onclick={uploadFile} disabled={isLoading || !selectedFile}>
          {isLoading ? 'Uploading...' : 'Upload artifact'}
        </Button>
        
        {#if uploadMessage}
          <div class="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            {uploadMessage}
          </div>
        {/if}
      </div>
    </Card>
    
    <!-- Download Section -->
    <Card class="p-6">
      <h2 class="section-title mb-4">Retrieve artifact</h2>
      
      <div class="space-y-4">
        <div>
          <label for="download-filename" class="block text-sm font-medium mb-2">Filename</label>
          <Input 
            id="download-filename"
            bind:value={downloadFilename}
            placeholder="Enter filename to download"
          />
        </div>
        
        <Button onclick={downloadFile}>
          Retrieve artifact
        </Button>
      </div>
    </Card>
  </div>
  
  <!-- Uploaded Files List -->
  <Card class="p-6">
    <div class="mb-4 flex items-center justify-between"><h2 class="section-title">Available artifacts</h2><span class="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-300">{files.length}</span></div>
    
    {#if files.length === 0}
      <p class="py-8 text-center text-slate-500">No artifacts uploaded yet</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="console-table">
          <thead>
            <tr>
              <th class="px-4 py-2 text-left text-sm font-semibold">Filename</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each files as file}
              <tr>
                <td class="px-4 py-3 text-sm">{file.filename}</td>
                <td class="px-4 py-3 text-sm">
                  <button 
                    onclick={() => { downloadFilename = file.filename; downloadFile(); }}
                    class="focus-ring rounded text-indigo-300 hover:text-indigo-200"
                  >
                    Download
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>
