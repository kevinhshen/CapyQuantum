// Headless logic tests, not a real-browser substitute. Exercise the production
// game with a minimal DOM/canvas harness and deterministic input/noise.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
function harness(){
 const all=new Set(),ids=new Map(),storage=new Map();
 class El {
  constructor(tag='div',attrs={}){this.tagName=tag.toUpperCase();this.attrs=attrs;this.dataset={};this.style={};this.children=[];this.value=attrs.value||'';this.hidden='hidden' in attrs;this.disabled='disabled' in attrs;this.textContent='';this._html='';this.classes=new Set((attrs.class||'').split(/\s+/).filter(Boolean));this.classList={add:(x)=>this.classes.add(x),remove:(x)=>this.classes.delete(x),toggle:(x,on)=>{const yes=on??!this.classes.has(x);yes?this.classes.add(x):this.classes.delete(x);return yes;},contains:x=>this.classes.has(x)};for(const [k,v] of Object.entries(attrs)){if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}if(attrs.id)ids.set(attrs.id,this);all.add(this);}
  set innerHTML(html){const clear=e=>{for(const c of e.children){clear(c);all.delete(c);if(c.attrs.id)ids.delete(c.attrs.id);}};clear(this);this._html=html;this.children=parse(html);}
  get innerHTML(){return this._html;}
  querySelector(sel){const walk=children=>{for(const c of children){if(matches(c,sel))return c;const found=walk(c.children);if(found)return found;}return null;};return walk(this.children);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(){} focus(){} scrollIntoView(){} setPointerCapture(){} click(){if(!this.disabled)this.onclick?.();} remove(){all.delete(this);}
  getBoundingClientRect(){return {width:800,height:560,left:0,top:0};}
  showModal(){this.open=true;}close(){this.open=false;}
 }
 function parse(html){const roots=[],stack=[];for(const match of html.matchAll(/<\/?([\w-]+)([^>]*)>/g)){const full=match[0],tag=match[1];if(full.startsWith('</')){if(stack.at(-1)?.tagName===tag.toUpperCase())stack.pop();continue;}const attrs={};for(const a of match[2].matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)')?/g))attrs[a[1]]=a[2]??a[3]??'';const el=new El(tag,attrs);(stack.length?stack.at(-1).children:roots).push(el);if(!['input','meta','link','br','hr','img'].includes(tag))stack.push(el);}return roots;}
 function matches(e,selector){if(selector.startsWith('#'))return e.attrs.id===selector.slice(1);if(selector.startsWith('.'))return e.classes.has(selector.slice(1));if(selector.startsWith('['))return selector.slice(1,-1) in e.attrs;return e.tagName===selector.toUpperCase();}
 function find(sel){if(sel.startsWith('#'))return ids.get(sel.slice(1))||null;return [...all].find(e=>matches(e,sel))||null;}
 parse(fs.readFileSync(new URL('index.html',root),'utf8'));
 const gradient={addColorStop(){}},context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,k)=>k in t?t[k]:(()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
 const canvas=ids.get('world');canvas.getContext=()=>context;
 const document={querySelector:sel=>find(sel),querySelectorAll:sel=>{const split=sel.split(/\s+/);if(split.length===2){const parent=find(split[0]);return parent?parent.children.flatMap(function flatten(e){return [e,...e.children.flatMap(flatten)];}).filter(e=>matches(e,split[1])):[];}return [...all].filter(e=>matches(e,sel));},createElement:tag=>new El(tag),body:{append:e=>all.add(e)},addEventListener(){},hidden:false};
 const math=Object.create(Math);math.random=()=>.25;
 const sandbox={document,window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Math:math,console,Float64Array,JSON,Set,Array,Number,String,Error,Object,Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}},matchMedia:()=>({matches:false}),performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},devicePixelRatio:1,confirm:()=>false,AbortSignal};
 const quantum=fs.readFileSync(new URL('quantum.js',root),'utf8').replace(/^export /gm,'');
 const game=fs.readFileSync(new URL('game.js',root),'utf8').replace(/^import .*?;\n/,'');
 vm.createContext(sandbox);vm.runInContext(quantum+'\n'+game+`\nthis.testGame={state:()=>({save,program,runState,selected}),start,install,tab,finish,draw,compileCode,advance:(seconds,adapt=false)=>{for(let t=0;t<seconds;t+=.02){if(runState){ship.x=100;ship.y=160;ship.vx=0;ship.vy=0;if(adapt){const key=currentWeather()==='X'?'bit':'phase';if(program.basis!==PRESETS[key].basis)program=clone(PRESETS[key]);}}update(.02);}},get:(s)=>$(s),preset:(p)=>clone(PRESETS[p]),select:(i)=>selected=i,buy:(key)=>$$('[data-upgrade]').find(b=>b.dataset.upgrade===key).click()};`,sandbox);
 return sandbox.testGame;
}
test('a full contract pays cargo, unlocks the next route, and creates an archive',()=>{const g=harness();g.start();g.advance(36);const s=g.state();assert.equal(s.runState,null);assert.equal(s.save.history[0].success,true);assert.deepEqual([...s.save.cleared],[0]);assert.ok(s.save.credits>200);assert.equal(g.get('#debrief').hidden,false);});
test('wrong protection fails phase weather; switching the design succeeds',()=>{const g=harness();g.select(1);g.start();g.advance(41);assert.equal(g.state().save.history[0].success,false);g.install(g.preset('phase'));g.start();g.advance(41);assert.equal(g.state().save.history[0].success,true);});
test('the boss requires adaptation; one unchanged code fails',()=>{const g=harness();g.select(3);g.start();g.advance(51);assert.equal(g.state().save.history[0].success,false);g.install(g.preset('bit'));g.start();g.advance(51,true);assert.equal(g.state().save.history[0].success,true);});
test('flight pause freezes cargo and clock; abort still returns safely',()=>{const g=harness();g.start();g.get('#pause').click();g.advance(5);assert.equal(g.state().runState.elapsed,0);g.get('#resume').click();g.advance(2);assert.ok(g.state().runState.cargo>0);g.get('#restart').click();assert.equal(g.state().runState,null);assert.equal(g.state().save.history[0].success,false);});
test('a purchased recycler earns actual credits while the station is active',()=>{const g=harness();g.start();g.advance(36);g.tab('upgrades');const old=g.state().save.credits;g.buy('drone');assert.equal(g.state().save.upgrades.drone,1);assert.equal(g.state().save.credits,old-80);const after=g.state().save.credits;g.advance(8);assert.ok(g.state().save.credits>=after+2);});
test('engineering bounties reject broken designs and pay only once',()=>{const g=harness();g.get('[data-bounty]').click();g.get('#submit-bounty').click();assert.equal(g.state().save.credits,0);g.install(g.preset('bit'));g.get('#submit-bounty').click();assert.equal(g.state().save.credits,50);g.get('#submit-bounty').click();assert.equal(g.state().save.credits,50);});
test('invalid terminal code cannot replace a working circuit',()=>{const g=harness();g.get('#code').value='CX q0 q0';const before=JSON.stringify(g.state().program);g.compileCode();assert.equal(JSON.stringify(g.state().program),before);assert.match(g.get('#terminal-output').textContent,/COMPILE ERROR/);});
test('drawing and a valid terminal compile do not throw',()=>{const g=harness();g.draw();g.get('#code').value='CX q0 q1\nCX q0 q2\nCHECK Z\nRECOVER 00 NONE\nRECOVER 01 q2\nRECOVER 10 q1\nRECOVER 11 q0';g.compileCode();assert.match(g.get('#terminal-output').textContent,/COMPILE OK/);g.start();g.advance(1);g.draw();});
