/* Testes end-to-end executados no navegador, em iframes com saves isolados. */
window.__qaStores={};
const frameBox=document.getElementById('frames'),log=document.getElementById('log'),frames=[];
function report(s){log.textContent+='\n'+s;}
function waitFor(fn,timeout=18000){const begin=Date.now();return new Promise((resolve,reject)=>{const timer=setInterval(()=>{try{if(fn()){clearInterval(timer);resolve();}else if(Date.now()-begin>timeout){clearInterval(timer);reject(Error('Tempo esgotado: '+fn.toString()));}}catch(e){clearInterval(timer);reject(e);}},100);});}
function assert(c,s){if(!c)throw Error(s);report('OK '+s);}
for(let i=0;i<5;i++){const f=document.createElement('iframe');f.src='qa-frame.html?id='+i;f.title='Jogador de teste '+i;frameBox.appendChild(f);frames.push(f);}
const ready=waitFor(()=>frames.every(f=>f.contentWindow.KT&&f.contentWindow.KT.Game&&f.contentWindow.KT.Game.state!=='boot'));
ready.then(()=>report('Pronto. Escolha uma bateria de testes.')).catch(e=>report('ERRO '+e.message));
document.getElementById('solo').onclick=async()=>{
  try{
    await ready;const w=frames[0].contentWindow,K=w.KT,doc=w.document;K.Game.menu();
    assert(!doc.getElementById('race-menu').hidden,'menu abre no DOM real');
    for(const tab of ['cups','garage','records','options','guide','online','free']){doc.querySelector('[data-action="tab:'+tab+'"]').click();assert(!!doc.querySelector('h1'),'tela '+tab+' renderiza');}
    doc.querySelector('[data-action="tab:garage"]').click();const before=K.Career.data.bolts;doc.querySelector('[data-action="buy:0"]').click();assert(K.Career.data.bolts===before-120&&K.Career.data.parts[0]===1,'compra pela interface instala a peça e desconta o saldo');
    K.Game.start({pista:1,nivel:0,voltas:1,jogador:1,jogadorIA:true});K.simular(6000);K.Game.render();assert(K.Game.state==='results','corrida completa chega ao resultado real');assert(doc.querySelector('.result-page'),'resultado e recompensa aparecem no DOM');
    K.Game.start({pista:2,modo:'tt',voltas:3,jogador:1,jogadorIA:true});K.simular(8000);assert(K.Game.state==='results'&&Object.keys(K.Career.data.records).length===1,'contrarrelógio termina e salva fantasma');
    K.Game.start({pista:2,modo:'tt',voltas:3,jogador:1});assert(K.race.ghostRecord,'segunda tentativa carrega fantasma');
    K.Input.virtual('pause',true);K.simular(1);K.Input.virtual('pause',false);assert(K.Game.state==='paused','tecla pausa funciona');
    K.Input.virtual('photo',true);K.simular(1);K.Input.virtual('photo',false);assert(K.Game.state==='photo','modo foto funciona');assert(K.Game.photoFrame().startsWith('data:image/png'),'foto gera PNG real');
    K.Game.menu();report('SOLO: TODOS OS TESTES PASSARAM');
  }catch(e){report('FALHA SOLO: '+e.stack);}
};
document.getElementById('online').onclick=async()=>{
  const clients=frames.map(f=>f.contentWindow.KT);
  var simulationTimer=null;
  try{
    await ready;clients.forEach(k=>{k.Net.leave();k.Game.menu();});const host=clients[0];
    await host.Net.create('Host QA',1,{pista:1,nivel:0,voltas:1,espelho:false});await waitFor(()=>host.Net.phase==='lobby');
    report('Sala real criada: '+host.Net.code);
    for(let i=1;i<4;i++){await clients[i].Net.join(i===1?host.Net.invite():host.Net.code,'Amigo '+i,i+1);await waitFor(()=>clients[i].Net.phase==='lobby');}
    await waitFor(()=>host.Net.players.length===4);assert(true,'4 jogadores conectados por WebRTC');
    await clients[4].Net.join(host.Net.code,'Quinto jogador',5);await waitFor(()=>clients[4].Net.phase==='error');assert(host.Net.players.length===4,'quinto jogador é recusado');
    host.Net.start();await waitFor(()=>clients.slice(0,4).every(k=>k.Net.phase==='racing'));
    simulationTimer=setInterval(()=>clients.slice(0,4).forEach(k=>{if(k.Game.state==='race')k.simular(1);}),16);
    assert(host.race.karts.length===8&&host.race.karts.filter(k=>k.ai).length===4,'grid tem quatro humanos e quatro IAs');
    assert(clients.slice(0,4).every((k,i)=>k.race.player===k.race.karts[i]),'cada amigo controla um kart diferente');
    clients[1].Input.virtual('up',true);
    await waitFor(()=>host.race.karts[1].sp>10,12000);assert(true,'acelerador do amigo chega ao anfitrião');clients[1].Input.virtual('up',false);
    await waitFor(()=>Math.abs(clients[1].race.karts[1].x-host.race.karts[1].x)<30,4000);assert(true,'posição retorna sincronizada ao amigo');
    clients[3].Net.leave();await waitFor(()=>host.race.karts[3].ai);assert(true,'IA assume o kart de quem desconecta');
    /* Piloto automático do fixture acelera uma corrida inteira sem interação humana. */
    host.race.karts.forEach(k=>{k.ai=true;k.remoteInput=null;});
    await waitFor(()=>host.Game.state==='results',90000);
    await waitFor(()=>clients[1].Game.state==='results'&&clients[2].Game.state==='results');
    assert(clients[1].race.karts.every((k,i)=>k.pos===host.race.karts[i].pos),'resultado idêntico entre anfitrião e convidados');
    host.Net.backLobby();await waitFor(()=>clients[1].Net.phase==='lobby');assert(true,'sala pode ser reutilizada depois da corrida');
    host.Net.leave();await waitFor(()=>clients[1].Net.phase==='error');assert(true,'saída do anfitrião é comunicada');
    report('ONLINE: TODOS OS TESTES PASSARAM');
  }catch(e){report('FALHA ONLINE: '+e.stack);}finally{clearInterval(simulationTimer);clients.forEach(k=>k&&k.Net.leave());}
};
