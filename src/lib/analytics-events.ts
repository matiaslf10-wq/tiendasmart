import { getAnalyticsIdentity } from '@/lib/analytics-identity';
import { getStoredAttribution } from '@/lib/analytics-source';
type Params={storeSlug:string;eventName:string;productId?:string;metadata?:Record<string,unknown>};
const lastPage=new Map<string,string>();
async function send(params:Params){
 const attribution=typeof window!=='undefined'?getStoredAttribution(params.storeSlug):{source:'direct'};
 const identity=getAnalyticsIdentity(params.storeSlug);
 const body=JSON.stringify({eventId:crypto.randomUUID(),occurredAt:new Date().toISOString(),sessionId:identity.sessionId,storeSlug:params.storeSlug,eventName:params.eventName,productId:params.productId,metadata:{...params.metadata,visitor_id:identity.visitorId,traffic_source:attribution.source,traffic_medium:attribution.medium,traffic_campaign:attribution.campaign,traffic_referrer:attribution.referrer,landing_path:attribution.landingPath,traffic_ts_link:attribution.tsLink}});
 if(typeof navigator!=='undefined'&&navigator.sendBeacon&&navigator.sendBeacon('/api/public/analytics/event',new Blob([body],{type:'application/json'})))return;
 const options={method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true};
 try{const response=await fetch('/api/public/analytics/event',options);if(!response.ok&&response.status>=500)await fetch('/api/public/analytics/event',options);}catch{await fetch('/api/public/analytics/event',options);}
}
export async function trackStoreEvent(params:Params){
 try{
  const path=typeof window!=='undefined'?window.location.pathname:'';
  if(path){
   const identity=getAnalyticsIdentity(params.storeSlug);
   const pageKey=identity.sessionId+':'+path;
   if(params.eventName==='page_view'){
    if(lastPage.get(params.storeSlug)===pageKey)return;
    lastPage.set(params.storeSlug,pageKey);
   }else if(lastPage.get(params.storeSlug)!==pageKey){
    lastPage.set(params.storeSlug,pageKey);
    // Issue the page event first; timestamp metadata preserves the client order.
    void send({storeSlug:params.storeSlug,eventName:'page_view',metadata:{path}}).catch(()=>{});
   }
  }
  await send(params);
 }catch{ /* Measurement errors must not interrupt checkout. */ }
}
