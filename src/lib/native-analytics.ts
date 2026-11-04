import { argentinaDateKey, getRangeWindow, getPreviousRangeWindow, normalizeOrderStatus, type RangeValue } from '@/lib/admin/orders';

export type NativeEvent = { event_name: string; created_at: string; session_id: string | null; product_id: string | null; metadata: Record<string, unknown> | null };
export type NativeOrder = { id: string; created_at: string; total: number | string; status: string; metadata?: Record<string, unknown> | null };
export type NativeItem = { order_id: string; product_id: string | null; product_name: string; quantity: number; line_total: number | string };
export type NativeProduct = { id: string; name: string };
const number = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const text = (v: unknown, fallback = '') => typeof v === 'string' && v.trim() ? v.trim() : fallback;
export function safeSource(source: unknown) {
  return text(source, 'direct').toLowerCase().slice(0, 80);
}
export function buildNativeAnalytics(events: NativeEvent[], orders: NativeOrder[], items: NativeItem[], products: NativeProduct[], range: RangeValue, now = new Date()) {
  const window = getRangeWindow(range, now), previousWindow = getPreviousRangeWindow(range, now);
  const inWindow = (value: string, w: typeof window) => !w || (new Date(value) >= w.start && new Date(value) < w.end);
  const currentEvents = events.filter(e => inWindow(e.created_at, window));
  const currentOrders = orders.filter(o => inWindow(o.created_at, window));
  const revenueOrders = currentOrders.filter(o => normalizeOrderStatus(o.status) !== 'cancelled');
  const currentIds = new Set(revenueOrders.map(o => o.id));
  const revenueItems = items.filter(i => currentIds.has(i.order_id));
  const revenue = revenueOrders.reduce((s, o) => s + number(o.total), 0);
  const delivered = currentOrders.filter(o => o.status === 'delivered');
  const previous = previousWindow ? orders.filter(o => inWindow(o.created_at, previousWindow) && o.status !== 'cancelled') : [];
  const previousRevenue = previous.reduce((s, o) => s + number(o.total), 0);
  const sessionMap = new Map<string, NativeEvent[]>();
  for (const e of currentEvents) if (e.session_id) sessionMap.set(e.session_id, [...(sessionMap.get(e.session_id) ?? []), e]);
  const visitors = new Set(currentEvents.map(e => text(e.metadata?.visitor_id)).filter(Boolean));
  const funnelNames = ['page_view','add_to_cart','begin_checkout','order_created'] as const;
  const funnelCounts = [0,0,0,0];
  const sources = new Map<string, { source: string; sessions: number; orders: number; revenue: number }>();
  for (const entries of sessionMap.values()) {
    const time=(e:NativeEvent)=>text(e.metadata?.client_at,e.created_at);
    entries.sort((a,b) => time(a).localeCompare(time(b)) || funnelNames.indexOf(a.event_name as typeof funnelNames[number])-funnelNames.indexOf(b.event_name as typeof funnelNames[number]));
    // A stage counts only when it follows the previous stage in this session.
    let next = 0;
    for (const e of entries) if (e.event_name === funnelNames[next]) { funnelCounts[next]++; next++; }
    const first = entries.find(e => e.event_name === 'page_view');
    if (!first) continue;
    const source = safeSource(first.metadata?.traffic_source);
    const row = sources.get(source) ?? { source, sessions: 0, orders: 0, revenue: 0 };
    row.sessions++; sources.set(source,row);
  }
  for (const o of revenueOrders) {
    const source = safeSource(o.metadata?.traffic_source);
    const row = sources.get(source) ?? { source, sessions:0, orders:0, revenue:0 };
    row.orders++;row.revenue+=number(o.total);sources.set(source,row);
  }
  const productMap = new Map(products.map(p => [p.id,{id:p.id,name:p.name,views:0,cart:0,units:0,revenue:0}]));
  for (const e of currentEvents) if (e.product_id) {
    const p=productMap.get(e.product_id)??{id:e.product_id,name:text(e.metadata?.item_name,'Producto sin nombre'),views:0,cart:0,units:0,revenue:0};
    if(e.event_name==='view_item')p.views++;if(e.event_name==='add_to_cart')p.cart++;productMap.set(p.id,p);
  }
  for(const i of revenueItems){const id=i.product_id??`deleted:${i.product_name}`;const p=productMap.get(id)??{id,name:i.product_name,views:0,cart:0,units:0,revenue:0};p.units+=number(i.quantity);p.revenue+=number(i.line_total);productMap.set(id,p);}
  const dailyMap = new Map<string,{date:string;views:number;sessions:Set<string>;orders:number;revenue:number}>();
  const day=(stamp:string)=>{const date=argentinaDateKey(stamp);const row=dailyMap.get(date)??{date,views:0,sessions:new Set<string>(),orders:0,revenue:0};dailyMap.set(date,row);return row;};
  for(const e of currentEvents)if(e.event_name==='page_view'){const d=day(e.created_at);d.views++;if(e.session_id)d.sessions.add(e.session_id);}
  for(const o of currentOrders){const d=day(o.created_at);d.orders++;if(o.status!=='cancelled')d.revenue+=number(o.total);}
  const campaigns = new Map<string,{campaign:string;source:string;orders:number;revenue:number}>();
  for(const o of revenueOrders){const campaign=text(o.metadata?.traffic_campaign);if(!campaign)continue;const source=safeSource(o.metadata?.traffic_source),key=JSON.stringify([source,campaign]);const row=campaigns.get(key)??{campaign,source,orders:0,revenue:0};row.orders++;row.revenue+=number(o.total);campaigns.set(key,row);}
  return {
    views:currentEvents.filter(e=>e.event_name==='page_view').length,
    sessions:[...sessionMap.values()].filter(es=>es.some(e=>e.event_name==='page_view')).length,
    visitors:visitors.size,
    orders:currentOrders.length,cancelled:currentOrders.filter(o=>o.status==='cancelled').length,
    revenue,deliveredRevenue:delivered.reduce((s,o)=>s+number(o.total),0),delivered:delivered.length,
    averageTicket:revenueOrders.length?revenue/revenueOrders.length:0,
    units:revenueItems.reduce((s,i)=>s+number(i.quantity),0),
    revenueDelta:!previousWindow||!previousRevenue?null:(revenue-previousRevenue)/previousRevenue*100,
    whatsapp:currentEvents.filter(e=>e.event_name==='send_to_whatsapp').length,
    contacts:currentEvents.filter(e=>e.event_name==='contact_whatsapp').length,
    funnel:funnelNames.map((name,index)=>({name,count:funnelCounts[index],rate:index&&funnelCounts[index-1]?funnelCounts[index]/funnelCounts[index-1]*100:null})),
    sources:[...sources.values()].sort((a,b)=>b.sessions-a.sessions||b.orders-a.orders),
    products:[...productMap.values()].filter(p=>p.views||p.cart||p.units).sort((a,b)=>b.revenue-a.revenue||b.views-a.views),
    campaigns:[...campaigns.values()].sort((a,b)=>b.revenue-a.revenue),
    daily:[...dailyMap.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({...d,sessions:d.sessions.size})),
    measurementStart:events.filter(e=>e.event_name==='page_view').map(e=>e.created_at).sort()[0]??null,
  };
}
