const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/app/signup/page.tsx','utf8');const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
let states=[],refs=[],cursor=0,refCursor=0,rpcValid=true,signupCalls=[],routes=[];
const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useRef(initial){const i=refCursor++;return refs[i]??(refs[i]={current:initial})}};
const client={rpc:async()=>({data:rpcValid,error:null}),auth:{signUp:async input=>{signupCalls.push(input);return {data:{user:{id:'fixture',identities:[{}]},session:{access_token:'mock'}},error:null}}}};
const mod={exports:{}};new Function('require','module','exports',compiled)(n=>n==='react'?react:n==='next/navigation'?{useRouter:()=>({replace:p=>routes.push(p),refresh(){}})}:n==='@/lib/supabase/client'?{createClient:()=>client}:n==='next/image'||n==='next/link'?{__esModule:true,default:()=>null}:require(n),mod,mod.exports);
function render(){cursor=refCursor=0;return mod.exports.default()}
function all(n){if(!n||typeof n!=='object')return[];return[n,...(Array.isArray(n.props?.children)?n.props.children:[n.props?.children]).flatMap(all)]}
const fixture={business_name:'QA Negocio',business_type:'Pruebas',business_phone:'5491100000000',city:'CABA',first_name:'QA',last_name:'Ficticio',email:'qa@example.invalid',holder_phone:'1100000000',password:'mock-password-123',confirm_password:'mock-password-123',pilot_code:'TIENDASMART-PILOTO-2026'};
global.FormData=class{get(k){return fixture[k]}};global.window={location:{origin:'https://tiendasmart.vercel.app'}};
async function submit(){return all(render()).find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}})}
(async()=>{
let nodes=all(render());assert.equal(nodes.filter(n=>n.type==='fieldset').length,3);assert.equal(nodes.filter(n=>n.type==='button'&&n.props.type==='submit').length,1);console.log('PASS three sections, one final submit');
await submit();assert.equal(signupCalls.length,1);assert.equal(signupCalls[0].options.data.use_pilot_code,false);assert.equal(signupCalls[0].options.data.pilot_code,null);assert.equal(routes[0],'/signup/completar');console.log('PASS without code creates pending registration input');
all(render()).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});await submit();assert.equal(signupCalls[1].options.data.pilot_code,fixture.pilot_code);assert.equal(signupCalls[1].options.data.use_pilot_code,true);console.log('PASS checkbox sends pilot code');
rpcValid=false;await submit();assert.equal(signupCalls.length,2);assert(states.includes('El código TiendaSmart no es válido. Revisalo para continuar.'));console.log('PASS invalid code does not create account');
fixture.confirm_password='different';await submit();assert.equal(signupCalls.length,2);assert(states.includes('Las contraseñas no coinciden.'));console.log('PASS password mismatch does not create account');
console.log('5 signup flow checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
