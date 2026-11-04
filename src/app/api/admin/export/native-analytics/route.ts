import { NextRequest,NextResponse } from 'next/server';
import { getCurrentUserStore } from '@/lib/stores';
import { loadNativeData } from '@/lib/native-analytics-server';
import { buildNativeAnalytics,type NativeEvent,type NativeOrder,type NativeItem,type NativeProduct } from '@/lib/native-analytics';
import type { RangeValue } from '@/lib/admin/orders';
export async function GET(request:NextRequest){
 const membership=await getCurrentUserStore();
 if(!membership?.stores||!['owner','admin'].includes(membership.role)||!['pro','intelligence'].includes(membership.stores.plan))return NextResponse.json({error:'No autorizado'},{status:401});
 const raw=request.nextUrl.searchParams.get('range');const range:RangeValue=['today','7d','30d','month','all'].includes(raw??'')?raw as RangeValue:'30d';
 const {orders,items,products,events}=await loadNativeData(membership.stores.id);
 const d=buildNativeAnalytics(events as NativeEvent[],orders as NativeOrder[],items as NativeItem[],products as NativeProduct[],range);
 const rows:unknown[][]=[['seccion','dimension','metrica','valor'],['resumen',range,'vistas',d.views],['resumen',range,'sesiones',d.sessions],['resumen',range,'visitantes_estimados',d.visitors],['resumen',range,'pedidos',d.orders],['resumen',range,'importe_sin_cancelados',d.revenue]];
 for(const r of d.daily)for(const metric of ['views','sessions','orders','revenue'] as const)rows.push(['dia',r.date,metric,r[metric]]);
 for(const r of d.sources)for(const metric of ['sessions','orders','revenue'] as const)rows.push(['origen',r.source,metric,r[metric]]);
 for(const r of d.products)for(const metric of ['views','cart','units','revenue'] as const)rows.push(['producto',r.name,metric,r[metric]]);
 for(const r of d.funnel)rows.push(['embudo',r.name,'sesiones',r.count]);
 for(const r of d.campaigns)rows.push(['campaña',`${r.source} / ${r.campaign}`,'pedidos',r.orders],['campaña',`${r.source} / ${r.campaign}`,'importe',r.revenue]);
 const escape=(v:unknown)=>{let value=String(v??'');if(/^[=+\-@\t\r]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};
 return new NextResponse('\uFEFF'+rows.map(r=>r.map(escape).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="analytics-propio-${range}.csv"`,'Cache-Control':'no-store'}});
}
