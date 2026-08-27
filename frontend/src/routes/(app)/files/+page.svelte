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

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold text-gray-800">File Upload & Download</h1>
    <p class="text-gray-600">Upload and manage files</p>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Upload Section -->
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-4">Upload File</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Select File</label>
          <input 
            type="file" 
            onchange={handleFileSelect}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        {#if selectedFile}
          <div class="p-3 bg-gray-50 rounded text-sm">
            <p><strong>Selected:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        {/if}
        
        <Button onclick={uploadFile} disabled={isLoading || !selectedFile}>
          {isLoading ? 'Uploading...' : 'Upload File'}
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
      <h2 class="text-xl font-semibold mb-4">Download File</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Filename</label>
          <Input 
            bind:value={downloadFilename}
            placeholder="Enter filename to download"
          />
        </div>
        
        <Button onclick={downloadFile}>
          Download File
        </Button>
      </div>
    </Card>
  </div>
  
  <!-- Uploaded Files List -->
  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-4">Your Uploaded Files ({files.length})</h2>
    
    {#if files.length === 0}
      <p class="text-gray-500 text-center py-8">No files uploaded yet</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-sm font-semibold">Filename</th>
              <th class="px-4 py-2 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each files as file}
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">{file.filename}</td>
                <td class="px-4 py-3 text-sm">
                  <button 
                    onclick={() => { downloadFilename = file.filename; downloadFile(); }}
                    class="text-blue-600 hover:text-blue-800"
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
