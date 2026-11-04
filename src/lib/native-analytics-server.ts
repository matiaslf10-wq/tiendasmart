import 'server-only';
import { createClient } from '@/lib/supabase/server';
async function allRows<T>(query:{range:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:{message:string}|null}>}) {
 const rows:T[]=[];
 for(let offset=0;;offset+=500){const {data,error}=await query.range(offset,offset+499);if(error)throw new Error('No se pudieron cargar los datos de analytics.');rows.push(...(data??[]));if(!data||data.length<500)return rows;}
}
export async function loadNativeData(storeId:string){
 const db=await createClient();
 const [orders,items,products,events]=await Promise.all([
 allRows(db.from('orders').select('id,order_number,customer_name,customer_phone,total,status,notes,delivery_type,delivery_address,created_at,metadata').eq('store_id',storeId).order('id')),
 allRows(db.from('order_items').select('order_id,product_id,product_name,quantity,line_total,orders!inner(created_at,store_id,status)').eq('orders.store_id',storeId).order('id')),
 allRows(db.from('products').select('id,name').eq('store_id',storeId).order('id')),
 allRows(db.from('analytics_events').select('event_name,created_at,session_id,product_id,metadata').eq('store_id',storeId).order('id')),
 ]);
 return {orders,items,products,events};
}
