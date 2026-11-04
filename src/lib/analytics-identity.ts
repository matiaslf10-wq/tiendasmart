// Random browser identifiers, scoped to a store. No fingerprint or personal data.
const sessions = new Map<string,{sessionId:string;visitorId:string;last:number;expires:number}>();
export function getAnalyticsIdentity(slug:string, now=Date.now()) {
  const key=`tiendasmart_measurement_v1_${slug}`;
  let state=sessions.get(slug);
  try { const raw=localStorage.getItem(key);if(raw) state=JSON.parse(raw); } catch {}
  if(!state||!state.visitorId||now>state.expires) state={visitorId:crypto.randomUUID(),sessionId:crypto.randomUUID(),last:now,expires:now+90*86400000};
  if(!state.sessionId||now-state.last>=30*60000) state.sessionId=crypto.randomUUID();
  state.last=now;sessions.set(slug,state);
  try { localStorage.setItem(key,JSON.stringify(state)); } catch {}
  return {sessionId:state.sessionId,visitorId:state.visitorId};
}
