<script lang="ts">
  import apiClient from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  
  let username = $state('');
  let userStatus = $state<any>(null);
  let isLoading = $state(false);
  
  function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
  
  async function checkUserStatus() {
    isLoading = true;
    userStatus = null;
    
    try {
      // Client-side XML escaping (but backend may still be vulnerable)
      const safeName = escapeXml(username);
      
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
  xmlns:urn="urn:examples:userservice">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:Username soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      <username xsi:type="xsd:string">${safeName}</username>
    </urn:Username>
  </soapenv:Body>
</soapenv:Envelope>`;
      
      const { data } = await apiClient.post('/dvwsuserservice', soapEnvelope, {
        headers: { 'Content-Type': 'text/xml' }
      });
      
      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, 'text/xml');
      
      const usernameEl = xmlDoc.getElementsByTagName('username')[0];
      const roleEl = xmlDoc.getElementsByTagName('role')[0];
      const statusEl = xmlDoc.getElementsByTagName('status')[0];
      
      userStatus = {
        username: usernameEl?.textContent || '',
        role: roleEl?.textContent || '',
        status: statusEl?.textContent || ''
      };
    } catch (error: any) {
      console.error('SOAP request failed:', error);
      userStatus = { error: 'Failed to check user status' };
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-2xl">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-800">User Status Check (SOAP)</h1>
    <p class="text-gray-600">Check user status using legacy SOAP service</p>
  </div>
  
  <Card class="p-6">
    <form onsubmit={(e) => { e.preventDefault(); checkUserStatus(); }} class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Username</label>
        <Input bind:value={username} placeholder="Enter username to check" required />

      </div>
      
      <div class="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Check Status'}
        </Button>
        <Button type="button" variant="outline" onclick={() => window.history.back()}>
          Back to Admin
        </Button>
      </div>
    </form>
    
    {#if userStatus}
      <div class="mt-6">
        <h3 class="font-semibold mb-3">User Status Result:</h3>
        {#if userStatus.error}
          <div class="p-3 bg-red-50 border border-red-200 rounded">
            {userStatus.error}
          </div>
        {:else}
          <div class="space-y-2 bg-gray-50 p-4 rounded">
            <p><strong>Username:</strong> {@html userStatus.username}</p>
            <p><strong>Role:</strong> {@html userStatus.role}</p>
            <p><strong>Status:</strong> {@html userStatus.status}</p>
          </div>
        {/if}
      </div>
    {/if}
  </Card>
</div>
