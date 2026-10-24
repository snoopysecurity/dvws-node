<script lang="ts">
  import { onMount } from 'svelte';
  import apiClient from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import StatusMessage from '$lib/components/ui/StatusMessage.svelte';

  type StoreItem = { id: string; name: string; description: string; price: number };
  type StoreOrder = { _id: string; itemName: string; unitPrice: number; quantity: number; creditChange: number; createdAt: string };
  type PromotionRedemption = { _id: string; code: string; credits: number; redeemedAt: string };
  type StatementOrder = { itemName: string; unitPrice: number; quantity: number; creditChange: number; createdAt: string };
  type MonthlyStatement = {
    period: string;
    account: { username: string; email: string | null };
    statement: { orders: StatementOrder[]; totalCreditsBilled: number };
  };
  let balance = $state<number | null>(null);
  let catalogue = $state<StoreItem[]>([]);
  let orders = $state<StoreOrder[]>([]);
  let redemptions = $state<PromotionRedemption[]>([]);
  let monthlyStatement = $state<MonthlyStatement | null>(null);
  let selectedItem = $state('api-monitor');
  let quantity = $state('1');
  let promotionCode = $state('');
  let loading = $state(false);
  let error = $state('');
  let message = $state('');

  async function refresh() {
    try {
      const [storeResponse, reportResponse] = await Promise.all([
        apiClient.get('/api/v2/resource-store'),
        apiClient.get('/api/v2/reports/monthly')
      ]);
      balance = storeResponse.data.balance;
      catalogue = storeResponse.data.catalogue;
      orders = storeResponse.data.orders;
      redemptions = storeResponse.data.redemptions || [];
      monthlyStatement = reportResponse.data;
      if (!catalogue.some((item: StoreItem) => item.id === selectedItem) && catalogue.length) selectedItem = catalogue[0].id;
    } catch (err: any) {
      error = err.response?.data?.error || 'Resource Store or monthly statement is unavailable right now.';
    }
  }

  async function placeOrder(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = '';
    message = '';
    try {
      const { data } = await apiClient.post('/api/v2/resource-store/orders', { itemId: selectedItem, quantity: Number(quantity) });
      balance = data.balance;
      message = `Order recorded. New balance: ${data.balance} credits.`;
      await refresh();
    } catch (err: any) {
      error = err.response?.data?.error || 'The order could not be placed.';
    } finally {
      loading = false;
    }
  }

  async function redeemPromotion(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = '';
    message = '';
    try {
      const { data } = await apiClient.post('/api/v2/resource-store/promotions/redeem', { code: promotionCode.trim() });
      balance = data.balance;
      message = `${data.credits} credits added. New balance: ${data.balance} credits.`;
      promotionCode = '';
      await refresh();
    } catch (err: any) {
      error = err.response?.data?.error || 'The promotion could not be redeemed.';
    } finally {
      loading = false;
    }
  }

  onMount(refresh);
</script>

<div class="mx-auto max-w-6xl space-y-7">
  <header class="page-heading"><div><p class="page-kicker">Operations</p><h1 class="page-title mt-1">Resource Store</h1><p class="mt-2 text-sm text-slate-400">Developer services for your workspace.</p></div></header>
  {#if error}<StatusMessage tone="error">{error}</StatusMessage>{/if}
  {#if message}<StatusMessage tone="success">{message}</StatusMessage>{/if}
  <Card class="flex flex-wrap items-center justify-between gap-4 p-6"><div><p class="page-kicker">Available credits</p><p class="mt-2 text-3xl font-bold text-slate-100">{balance ?? '—'} <span class="text-base font-medium text-slate-400">credits</span></p></div><p class="max-w-md text-sm text-slate-400">Choose a service and quantity to place an order.</p></Card>

  {#if monthlyStatement}
    <Card class="p-6">
      <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="section-title">Monthly statement</h2><p class="mt-1 text-sm text-slate-400">{monthlyStatement.account.email || monthlyStatement.account.username} · {monthlyStatement.period}</p></div><p class="text-right"><span class="block text-xs uppercase tracking-wide text-slate-500">Credits billed</span><strong class="mt-1 block text-2xl text-indigo-300">{monthlyStatement.statement.totalCreditsBilled}</strong></p></div>
      {#if monthlyStatement.statement.orders.length === 0}
        <p class="mt-4 text-sm text-slate-400">No billed orders for this month.</p>
      {:else}
        <div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="text-xs uppercase tracking-wide text-slate-500"><tr><th class="py-3 pr-4">Service</th><th class="py-3 pr-4">Quantity</th><th class="py-3 pr-4">Unit price</th><th class="py-3">Credits billed</th></tr></thead><tbody class="divide-y divide-slate-800">{#each monthlyStatement.statement.orders as line, index (`${line.createdAt}-${index}`)}<tr class="text-slate-300"><td class="py-3 pr-4 font-medium text-slate-100">{line.itemName}</td><td class="py-3 pr-4">{line.quantity}</td><td class="py-3 pr-4">{line.unitPrice}</td><td class="py-3">{Math.max(0, -line.creditChange)}</td></tr>{/each}</tbody></table></div>
      {/if}
    </Card>
  {/if}

  <section><div class="page-heading"><div><p class="page-kicker">Catalogue</p><h2 class="section-title mt-1">Developer services</h2></div></div><div class="grid gap-4 md:grid-cols-3">
    {#each catalogue as item (item.id)}<Card class="flex flex-col p-5"><h3 class="font-semibold text-slate-100">{item.name}</h3><p class="mt-2 flex-1 text-sm leading-6 text-slate-400">{item.description}</p><p class="mt-5 text-sm font-semibold text-indigo-300">{item.price} credits each</p></Card>{/each}
  </div></section>

  <Card class="p-6"><h2 class="section-title">Place an order</h2><form class="mt-5 grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end" onsubmit={placeOrder}>
    <div><label class="mb-2 block text-sm font-medium text-slate-300" for="store-item">Service</label><select id="store-item" bind:value={selectedItem} class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">{#each catalogue as item (item.id)}<option value={item.id}>{item.name} — {item.price} credits</option>{/each}</select></div>
    <div><label class="mb-2 block text-sm font-medium text-slate-300" for="store-quantity">Quantity</label><Input id="store-quantity" type="number" min="1" max="1000" step="1" bind:value={quantity} required /></div>
    <Button type="submit" disabled={loading || !catalogue.length}>{loading ? 'Placing…' : 'Purchase'}</Button>
  </form></Card>

  <Card class="p-6"><h2 class="section-title">Redeem a promotion</h2><p class="mt-2 text-sm text-slate-400">Enter an active code to add credits to this workspace.</p><form class="mt-5 flex flex-wrap items-end gap-3" onsubmit={redeemPromotion}>
    <div class="min-w-64 flex-1"><label class="mb-2 block text-sm font-medium text-slate-300" for="promotion-code">Promotion code</label><Input id="promotion-code" bind:value={promotionCode} required maxlength="100" autocomplete="off" /></div>
    <Button type="submit" disabled={loading || !promotionCode.trim()}>{loading ? 'Redeeming…' : 'Redeem code'}</Button>
  </form>{#if redemptions.length}<p class="mt-4 text-sm text-slate-400">Redeemed promotions: {redemptions.length}</p>{/if}</Card>

  <Card class="overflow-hidden p-6"><h2 class="section-title">Recent orders</h2>{#if orders.length === 0}<p class="mt-4 text-sm text-slate-400">No orders yet.</p>{:else}<div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="text-xs uppercase tracking-wide text-slate-500"><tr><th class="py-3 pr-4">Service</th><th class="py-3 pr-4">Quantity</th><th class="py-3 pr-4">Credit change</th><th class="py-3">Date</th></tr></thead><tbody class="divide-y divide-slate-800">{#each orders as order (order._id)}<tr class="text-slate-300"><td class="py-3 pr-4 font-medium text-slate-100">{order.itemName}</td><td class="py-3 pr-4">{order.quantity}</td><td class="py-3 pr-4">{order.creditChange > 0 ? '+' : ''}{order.creditChange}</td><td class="py-3">{new Date(order.createdAt).toLocaleString()}</td></tr>{/each}</tbody></table></div>{/if}</Card>
</div>
