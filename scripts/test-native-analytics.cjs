const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const cache={};function load(path){if(cache[path])return cache[path].exports;const m={exports:{}};cache[path]=m;const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;new Function('require','module','exports',js)(n=>n.startsWith('@/')?load('src/'+n.slice(2)+'.ts'):require(n),m,m.exports);return m.exports;}
const {buildNativeAnalytics}=load('src/lib/native-analytics.ts');
const now=new Date('2026-11-04T14:00:00Z');
const names=['page_view','view_item','add_to_cart','begin_checkout','order_created'];
const events=names.map((event_name,i)=>({event_name,created_at:`2026-11-04T12:0${i}:00Z`,session_id:'session-a',product_id:['view_item','add_to_cart'].includes(event_name)?'product-a':null,metadata:{visitor_id:'browser-a',traffic_source:'instagram'}}));
events.push({event_name:'page_view',created_at:'2026-11-04T13:00:00Z',session_id:'session-b',product_id:null,metadata:{visitor_id:'browser-a',traffic_source:'direct'}},{event_name:'add_to_cart',created_at:'2026-11-04T13:01:00Z',session_id:'out-of-order',product_id:'product-a',metadata:{}});
const orders=[{id:'order-a',created_at:'2026-11-04T12:04:00Z',total:100,status:'delivered',metadata:{traffic_source:'instagram',traffic_campaign:'noviembre'}},{id:'order-b',created_at:'2026-11-04T13:00:00Z',total:900,status:'cancelled',metadata:{}},{id:'order-prev',created_at:'2026-11-03T12:00:00Z',total:50,status:'confirmed',metadata:{}}];
const items=[{order_id:'order-a',product_id:'product-a',product_name:'Producto A',quantity:2,line_total:100},{order_id:'order-b',product_id:'product-a',product_name:'Producto A',quantity:9,line_total:900}];
const d=buildNativeAnalytics(events,orders,items,[{id:'product-a',name:'Producto A'}],'today',now);
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('Visits, sessions and estimated browsers differ',()=>{assert.equal(d.views,2);assert.equal(d.sessions,2);assert.equal(d.visitors,1)});
test('Sequential session funnel does not count stray carts',()=>assert.deepEqual(d.funnel.map(s=>s.count),[2,1,1,1]));
test('Cancelled orders excluded from revenue and units',()=>{assert.equal(d.orders,2);assert.equal(d.revenue,100);assert.equal(d.units,2);assert.equal(d.averageTicket,100)});
test('Delivery amount distinct from payment',()=>assert.equal(d.deliveredRevenue,100));
test('Source attribution and campaign',()=>{assert.equal(d.sources.find(s=>s.source==='instagram').revenue,100);assert.equal(d.campaigns[0].campaign,'noviembre')});
test('Product event and order metrics',()=>{assert.equal(d.products[0].views,1);assert.equal(d.products[0].units,2)});
test('Previous day comparison',()=>assert.equal(d.revenueDelta,100));
test('Daily Argentina aggregation',()=>{const r=buildNativeAnalytics([{...events[0],created_at:'2026-11-04T01:00:00Z'}],[],[],[],'all',now);assert.equal(r.daily[0].date,'2026-11-03')});
test('Empty dataset never invents conversions',()=>{const r=buildNativeAnalytics([],[],[],[],'all',now);assert.equal(r.visitors,0);assert.equal(r.averageTicket,0);assert.equal(r.funnel[1].rate,null)});
test('All range includes history',()=>assert.equal(buildNativeAnalytics([],orders,items,[],'all',now).orders,3));
test('Client timestamps tolerate network reordering',()=>{const es=events.slice(0,5).map((e,i)=>({...e,created_at:`2026-11-04T12:0${4-i}:00Z`,metadata:{client_at:`2026-11-04T12:0${i}:00Z`}}));assert.equal(buildNativeAnalytics(es,[],[],[],'today',now).funnel[3].count,1)});
const memory=new Map();global.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const identity=load('src/lib/analytics-identity.ts');const first=identity.getAnalyticsIdentity('store-a',1000);
test('Session continuity',()=>assert.deepEqual(identity.getAnalyticsIdentity('store-a',2000),first));
test('30-minute idle session rollover keeps browser',()=>{const next=identity.getAnalyticsIdentity('store-a',2000+30*60000);assert.notEqual(next.sessionId,first.sessionId);assert.equal(next.visitorId,first.visitorId)});
test('Store identifiers isolated',()=>assert.notEqual(identity.getAnalyticsIdentity('store-b',1000).visitorId,first.visitorId));
test('Identifier expires after 90 days',()=>assert.notEqual(identity.getAnalyticsIdentity('store-a',1000+91*86400000).visitorId,first.visitorId));
console.log(`${passed} native analytics checks passed`);
