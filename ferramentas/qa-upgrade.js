"use strict";
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const {carregarJogo,assinaturaPista}=require('./qa.js');
const KT=carregarJogo(path.resolve(__dirname,'..'));
const results=[];
function test(name,fn){try{const detail=fn();console.log('OK '+name+(detail?' · '+detail:''));results.push({name,ok:true});}catch(e){console.error('FALHA '+name+' · '+e.stack);results.push({name,ok:false,error:e.message});}}
test('30 traçados distintos, finitos e dentro do mapa',()=>{
  const hashes=new Set();
  for(const t of KT.TRACKS){KT.Track.build(t.id);const signature=assinaturaPista(KT);assert(!hashes.has(signature.hashPontos),'traçado duplicado '+t.name);hashes.add(signature.hashPontos);assert(KT.Track.pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>140&&p.x<1396&&p.y>140&&p.y<1396),t.name);assert.equal(KT.Track.startGrid.length,8);assert.equal(KT.Track.checkpoints.length,24);}
  return hashes.size+' circuitos';
});
test('espelho reflete a geometria e preserva comprimento',()=>{KT.Track.build(12);const x=KT.Track.pts.map(p=>[p.x,p.y]),len=KT.Track.total;KT.Track.build(12,true);KT.Track.pts.forEach((p,i)=>{assert(Math.abs(p.x+x[i][0]-1536)<1e-7);assert.equal(p.y,x[i][1]);});assert(Math.abs(KT.Track.total-len)<1e-6);});
const runs=[];
test('todos terminam: 30 pistas × 4 dificuldades × 2 sentidos',()=>{
  for(const t of KT.TRACKS){for(let level=0;level<4;level++)for(const mirror of [false,true]){
    const r=KT.Teste.corrida({pista:t.id,nivel:level,espelho:mirror,voltas:1,karts:8,semente:20260922+t.id*101+level,tempoMax:180});
    const missing=r.karts.filter(k=>!k.terminou);assert.equal(missing.length,0,t.name+' '+level+' mirror='+mirror+' '+missing.map(k=>k.nome));
    runs.push({track:t.id,level,mirror,time:r.tempoSimulado,offroad:r.karts.reduce((a,k)=>a+k.foraPct,0)/8,walls:r.karts.reduce((a,k)=>a+k.muroQuadros,0)});
  }console.log('  '+t.name+' concluído em todos os níveis e sentidos');}
  return runs.length+' corridas';
});
test('determinismo em pista com perigos',()=>{const cfg={pista:25,nivel:2,voltas:3,semente:19383,karts:8};assert.equal(KT.Teste.corrida(cfg).hash,KT.Teste.corrida(cfg).hash);});
test('contrarrelógio sem timeout de último colocado nem itens',()=>{const r=KT.Teste.preparar({pista:1,modo:'tt'});assert.equal(r.karts.length,1);KT.simular(4000);assert.equal(KT.Game.state,'race');assert.equal(r.player.item,null);assert.equal(r.finishTimer,0);});
test('economia: compra limitada por saldo e nível',()=>{const d=KT.Career.data;d.bolts=119;assert.equal(KT.Career.buy(0),false);d.bolts=1000;for(let i=0;i<3;i++)assert.equal(KT.Career.buy(0),true);assert.equal(KT.Career.buy(0),false);assert.equal(d.parts[0],3);assert.equal(d.bolts,440);});
test('save inválido, obsoleto e dados corrompidos',()=>{assert.equal(KT.Career.clean({version:1}).bolts,150);const c=KT.Career.clean({version:2,bolts:-100,parts:[99,'3',null],activeCup:{stage:200}});assert.equal(c.bolts,150);assert.equal(c.parts.join(','),'0,0,0');assert.equal(c.activeCup,null);assert.throws(()=>KT.Career.importSave('not json'));assert.throws(()=>KT.Career.importSave('{"version":1}'));});
test('campeonato: pontuação, save retomável e recompensa única',()=>{
  const d=KT.Career.data;d.activeCup=null;d.cups={};assert.equal(KT.Career.beginCup(1,1,1),null);assert(KT.Career.beginCup(0,1,1));
  for(let stage=0;stage<10;stage++){
    const cfg=KT.Career.cupConfig();assert.equal(cfg.pista,stage);const r=KT.Teste.preparar(cfg);r.teste=false;
    r.karts.sort((a,b)=>Number(b.isPlayer)-Number(a.isPlayer)).forEach((k,i)=>{k.finished=true;k.pos=i+1;k.finishTime=60+i;});
    const outcome=KT.Career.finish(r),bolts=d.bolts;assert.equal(KT.Career.finish(r),null);assert.equal(d.bolts,bolts);
    if(stage<9){const saved=KT.Career.clean(JSON.parse(KT.Career.exportSave()));assert.equal(saved.activeCup.stage,stage+1);}else assert.equal(outcome.championship.place,1);
  }
  assert.equal(d.activeCup,null);assert(KT.Career.unlockedCup(1));assert(KT.Career.unlockedDriver(9));assert.equal(d.cups['0:1'],1);
});
test('LENDA exige três ouros no ÁS',()=>{const d=KT.Career.data;assert.equal(KT.Career.legend(),false);d.cups['0:2']=1;d.cups['1:2']=1;d.cups['2:2']=2;assert.equal(KT.Career.legend(),false);d.cups['2:2']=1;assert(KT.Career.legend());});
test('fantasma guarda o melhor, interpola e separa piloto e sentido',()=>{const r=KT.Teste.preparar({pista:3,modo:'tt',jogador:1});r.teste=false;r.player.finished=true;r.player.finishTime=50;r.ghostSamples=[[0,500,500,6.2],[1,510,520,.1]];assert(KT.Ghost.finish(r));r.player.finishTime=55;assert.equal(KT.Ghost.finish(r),false);KT.Ghost.start(r);r.time=.5;const p=KT.Ghost.point(r);assert.equal(p.x,505);assert.equal(p.y,510);assert(Math.abs(p.ang-6.29)<.02);r.mirror=true;KT.Ghost.start(r);assert.equal(r.ghostRecord,undefined);});
test('mola protege de golpes e ímã depende de alvo',()=>{const r=KT.Teste.preparar({semente:1});const p=r.player;p.item='spring';r.useItem(p);assert.equal(p.air,1.5);assert.equal(p.hit('rock'),false);p.air=0;assert.equal(p.hit('rock'),true);p.item='magnet';r.useItem(p);assert.equal(p.magnet,4);});
fs.writeFileSync(path.join(__dirname,'relatorios','upgrade.json'),JSON.stringify({date:new Date().toISOString(),tests:results,runs},null,2));
console.log(results.filter(t=>t.ok).length+'/'+results.length+' grupos passaram.');
process.exitCode=results.some(t=>!t.ok)?1:0;
