const fs=require('fs'),ts=require(process.cwd()+'/node_modules/typescript'),assert=require('node:assert/strict');
const root=process.cwd(),cache={};
function load(path){if(cache[path])return cache[path].exports;const m={exports:{}};cache[path]=m;const s=fs.readFileSync(root+'/'+path,'utf8');const out=ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',out)(n=>n.startsWith('@/')?load('src/'+n.slice(2)+'.ts'):require(root+'/node_modules/'+n),m,m.exports);return m.exports;}
const o=load('src/lib/admin/orders.ts'),f=load('src/lib/admin/funnel.ts');const results=[];function test(name,fn){try{fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',details:e.message})}}
const now=new Date(),stamp=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12).toISOString();
const fixture=[{id:'QA-a',order_number:1,customer_name:'QA A',customer_phone:'000',total:100,status:'delivered',notes:'',delivery_type:'pickup',created_at:stamp},{id:'QA-b',order_number:2,customer_name:'QA B',customer_phone:'000',total:900,status:'cancelled',notes:'nota',delivery_type:'delivery',created_at:stamp}];
test('Filtro por estado normaliza in_preparation',()=>{const x=o.filterOrders({orders:[{...fixture[0],status:'in_preparation'}],status:'preparing',queryText:'',delivery:'all',notes:'all',range:'all'});assert.equal(x.visibleOrders.length,1)});
test('Filtro combinado envío/notas/búsqueda',()=>assert.equal(o.filterOrders({orders:fixture,status:'all',queryText:'QA B',delivery:'delivery',notes:'with_notes',range:'all'}).visibleOrders.length,1));
test('Comparativa coherente con tarjetas: excluye cancelados',()=>assert.equal(o.getOrdersComparison(fixture,[],'today').revenue.current,100));
test('Ticket medio coherente con tarjetas: excluye cancelados',()=>assert.equal(o.getOrdersComparison(fixture,[],'today').averageTicket.current,100));
test('Embudo sin eventos no genera NaN',()=>assert.equal(f.buildFunnelConversion({views:0,addToCart:0,checkout:0,whatsapp:0,orders:0}).totalConversion,0));
test('Embudo calcula porcentaje básico',()=>assert.equal(f.buildFunnelConversion({views:10,addToCart:5,checkout:4,whatsapp:3,orders:2}).totalConversion,20));
test('Relación Supabase muchos-a-uno conserva ítems',()=>{const raw={orders:{created_at:stamp,store_id:'QA-a'},quantity:2,line_total:100};const current=o.normalizeOrderItem(raw);assert.equal(o.filterOrderItemsByRange([current],'today').length,1)});
test('Comparación período sin base previa no inventa porcentaje',()=>assert.equal(o.getOrdersComparison([fixture[0]],[],'today').revenue.diffPercent,null));
test('Filtro fecha inválida',()=>assert.equal(o.isWithinRange('invalid','today'),false));
const OriginalDate=Date;const fixed='2026-11-03T01:30:00Z';global.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return new OriginalDate(fixed).getTime()}};
test('Hoy usa día de Argentina en servidor UTC',()=>assert.equal(o.isWithinRange('2026-11-02T15:00:00Z','today'),true));global.Date=OriginalDate;
console.log(JSON.stringify({timezone:process.env.TZ,results},null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
(async()=>{const events=load('src/lib/analytics-events.ts');let fetches=0;Object.defineProperty(global,'navigator',{value:{sendBeacon:()=>false},configurable:true});global.fetch=async()=>{fetches++;return {ok:true}};await events.trackStoreEvent({storeSlug:'qa-local',eventName:'view_item'});if(fetches!==1)process.exitCode=1;console.log(JSON.stringify({test:'Fallback cuando sendBeacon devuelve false',status:fetches===1?'PASS':'FAIL',expected_fetch_calls:1,actual_fetch_calls:fetches}));})();
