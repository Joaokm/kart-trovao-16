/* Salas de 2–4 amigos + IA. WebRTC em estrela; anfitrião simula a corrida.
   PeerJS 1.5.5 (MIT) é carregado apenas ao abrir uma conexão online. */
(function(){
  'use strict';
  var VERSION=2,MAX=4,PREFIX='kart16-v2-',source=typeof document!=='undefined'&&document.currentScript?document.currentScript.src:'';
  var peer=null,links=new Map(),role='',phase='idle',code='',myId='',roster=[],settings={},message='',generation=0,epoch=0;
  var target=null,lastSequence=-1,sequence=0,sendClock=0,lastHeard=0,inputClock=0,inputSequence=0,timeout=null,loading=null,pingTimer=null,latency=0;
  var fields=['x','y','ang','moveAng','sp','lap','pos','progress','idx','boost','spin','shield','slowTimer','hop','driftCharge','air','rescue','magnet','finishTime','lapStart','terrain'];
  var finite=function(n){return typeof n==='number'&&Number.isFinite(n);};
  var name=function(s){return String(s||'Piloto').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,18)||'Piloto';};
  function notify(){if(KT.UI&&KT.UI.onlineChanged)KT.UI.onlineChanged();}
  function send(c,m){if(c&&c.open&&c.bufferSize<8)try{c.send(m);}catch(e){/* close/error trata a perda */}}
  function broadcast(m){links.forEach(function(c){send(c,m);});}
  function clearTimers(){clearTimeout(timeout);clearInterval(pingTimer);timeout=null;pingTimer=null;}
  function load(){if(typeof window.Peer==='function')return Promise.resolve();if(loading)return loading;loading=new Promise(function(resolve,reject){var script=document.createElement('script');script.src=new URL('vendor/peerjs.min.js',source).href;script.onload=resolve;script.onerror=function(){loading=null;reject(Error('Não foi possível carregar a conexão online.'));};document.head.appendChild(script);});return loading;}
  function randomCode(){var bytes=new Uint8Array(8);crypto.getRandomValues(bytes);var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(bytes,function(b){return chars[b%chars.length];}).join('');}
  function leave(reason){generation++;clearTimers();phase='idle';role='';target=null;links.forEach(function(c){try{c.close();}catch(e){}});links.clear();if(peer){peer.destroy();peer=null;}roster=[];code='';message=reason||'';notify();}
  function fail(text){leave(text);phase='error';if(KT.Game&&KT.Game.state==='race')KT.Game.menu(true);notify();}
  function errorText(e){return ({'peer-unavailable':'Sala não encontrada. Confira o código e se o anfitrião está conectado.','network':'Não foi possível alcançar o serviço de salas. Confira sua internet.','server-error':'O serviço de salas está indisponível. Tente novamente.','socket-error':'Falha no serviço de salas. Tente novamente.','webrtc':'A conexão direta falhou. Tente outra rede; redes restritas podem precisar de TURN.','unavailable-id':'Esse código já está em uso. Crie outra sala.','browser-incompatible':'Este navegador não suporta a conexão online.'})[e.type]||'Conexão interrompida. Tente entrar novamente.';}
  function lobby(){broadcast({t:'lobby',v:VERSION,code:code,players:roster,settings:settings});notify();}
  function drop(c){
    if(!links.has(c.peer))return;links.delete(c.peer);
    if(role==='host'){
      var index=roster.findIndex(function(p){return p.id===c.peer;});
      if(index>=0&&phase!=='lobby'){var slot=roster[index].slot,k=KT.race.karts[slot];if(k){k.ai=true;k.remoteInput=null;k.networkId=null;KT.race.banner('AMIGO SAIU: IA ASSUMIU O KART',2);}}
      roster=roster.filter(function(p){return p.id!==c.peer;});
      if(phase==='lobby')lobby();else broadcast({t:'players',players:roster});
    }else fail('O anfitrião saiu ou a conexão foi perdida. Crie ou entre em outra sala.');
  }
  function validSettings(s){return s&&Number.isInteger(s.pista)&&s.pista>=0&&s.pista<30&&Number.isInteger(s.nivel)&&s.nivel>=0&&s.nivel<4&&Number.isInteger(s.voltas)&&s.voltas>=1&&s.voltas<=5;}
  function validPlayers(a){return Array.isArray(a)&&a.length>=1&&a.length<=MAX&&a.every(function(p){return p&&typeof p.id==='string'&&p.id.length<=100&&typeof p.name==='string'&&p.name.length<=18&&Number.isInteger(p.driver)&&p.driver>=0&&p.driver<12;})&&new Set(a.map(function(p){return p.id;})).size===a.length;}
  function accept(c){
    if(role!=='host'||phase!=='lobby'||links.size>=MAX-1){c.on('open',function(){send(c,{t:'error',message:phase==='lobby'?'Sala cheia: máximo de 4 amigos.':'Esta corrida já começou. Entre quando voltarem à sala.'});setTimeout(function(){c.close();},250);});return;}
    links.set(c.peer,c);bind(c);
    c.on('open',function(){send(c,{t:'hello',v:VERSION});});
    setTimeout(function(){if(links.get(c.peer)===c&&!c.joined)c.close();},10000);
  }
  function bind(c){
    c.on('data',function(m){
      if(!m||typeof m!=='object'||typeof m.t!=='string')return;
      lastHeard=Date.now();
      if(m.t==='ping'){send(c,{t:'pong',time:m.time});return;}
      if(m.t==='pong'){if(finite(m.time))latency=Math.max(0,Math.min(9999,Date.now()-m.time));return;}
      if(role==='host')receiveHost(c,m);else receiveClient(c,m);
    });
    c.on('close',function(){drop(c);});c.on('error',function(){drop(c);});
  }
  function receiveHost(c,m){
    if(m.t==='join'){
      if(c.joined)return;
      if(m.v!==VERSION||phase!=='lobby'||roster.length>=MAX){send(c,{t:'error',message:'Sala cheia ou versão incompatível. Atualize a página.'});setTimeout(function(){c.close();},250);return;}
      c.joined=true;c.lastInput=Date.now();c.inputSeq=-1;
      roster.push({id:c.peer,name:name(m.name),driver:Number.isInteger(m.driver)&&m.driver>=0&&m.driver<12?m.driver:1});lobby();
    }
    if(m.t==='ready'&&m.epoch===epoch&&phase==='loading'){c.ready=epoch;ready();}
    if(m.t==='input'&&phase==='racing'&&m.epoch===epoch&&Number.isInteger(m.seq)&&m.seq>c.inputSeq){
      c.inputSeq=m.seq;c.lastInput=Date.now();var p=roster.find(function(p){return p.id===c.peer;}),k=p&&KT.race.karts[p.slot];if(!k||!m.c)return;
      k.remoteInput={throttle:m.c.up?1:0,brake:m.c.down?1:0,steer:finite(m.c.steer)?KT.clamp(m.c.steer,-1,1):0,drift:!!m.c.drift,useItem:!!m.c.item||(k.remoteInput&&k.remoteInput.useItem)};
    }
  }
  function receiveClient(c,m){
    if(m.t==='error'){fail(String(m.message).slice(0,180));return;}
    if(m.t==='lobby'&&m.v===VERSION&&validPlayers(m.players)&&validSettings(m.settings)){
      if(!m.players.some(function(p){return p.id===myId;}))return;
      clearTimeout(timeout);roster=m.players;settings=m.settings;code=String(m.code).slice(0,8);phase='lobby';target=null;message='Conectado. Aguardando o anfitrião iniciar.';if(KT.Game.state!=='select')KT.Game.menu(true);notify();
    }
    if(m.t==='prepare'&&validPlayers(m.players)&&validSettings(m.cfg)&&Array.isArray(m.cfg.drivers)&&m.cfg.drivers.length===8&&m.cfg.drivers.every(function(n){return Number.isInteger(n)&&n>=0&&n<12;})){
      var mine=m.players.find(function(p){return p.id===myId;});if(!mine||!Number.isInteger(mine.slot)||mine.slot<0||mine.slot>7||!Number.isInteger(m.epoch))return;
      roster=m.players;epoch=m.epoch;lastSequence=-1;target=null;phase='loading';
      KT.Game.start(Object.assign({},m.cfg,{jogador:mine.driver,slotJogador:mine.slot,modo:'online',network:true}));
      send(c,{t:'ready',epoch:epoch});message='Todos carregando a pista...';
    }
    if((m.t==='snapshot'||m.t==='finish')&&m.epoch===epoch&&validSnapshot(m)&&m.seq>lastSequence){
      lastSequence=m.seq;target=m;phase=m.t==='finish'?'results':'racing';
      if(m.t==='finish'){applySnapshot(KT.race,m,1);KT.Game.finishOnline();}
    }
    if(m.t==='players'&&validPlayers(m.players))roster=m.players;
  }
  function validSnapshot(m){return finite(m.time)&&m.time>=0&&finite(m.countdown)&&Array.isArray(m.karts)&&m.karts.length===8&&m.karts.every(function(k){return k&&fields.every(function(f){return finite(k[f]);})&&Math.abs(k.x)<5000&&Math.abs(k.y)<5000&&k.pos>=1&&k.pos<=8&&k.idx>=0&&k.idx<1200;})&&Array.isArray(m.orbs)&&m.orbs.length<=32&&m.orbs.every(function(o){return o&&finite(o.x)&&finite(o.y)&&finite(o.anim);})&&Array.isArray(m.hazards)&&m.hazards.length<=100&&m.hazards.every(function(o){return o&&finite(o.x)&&finite(o.y);})&&Array.isArray(m.boxes)&&m.boxes.length<=100;}
  function packet(r,t){return {t:t||'snapshot',epoch:epoch,seq:sequence++,time:r.time,countdown:r.countdown,state:r.state,
    karts:r.karts.map(function(k){var o={};fields.forEach(function(f){o[f]=+k[f].toFixed(4);});o.finished=k.finished;o.drifting=k.drifting;o.item=k.item;o.itemRoll=k.itemRoll;o.bestLap=k.bestLap;o.lapTimes=k.lapTimes;return o;}),
    orbs:r.orbs.map(function(o){return {x:o.x,y:o.y,anim:o.anim};}),hazards:r.hazards.map(function(o){return {x:o.x,y:o.y};}),boxes:KT.Track.itemBoxes.map(function(b){return b.active;})};}
  function applySnapshot(r,m,blend){
    r.time=m.time;r.countdown=m.countdown;r.state=m.state==='countdown'?'countdown':'race';
    r.karts.forEach(function(k,i){var p=m.karts[i];fields.forEach(function(f){if(f==='x'||f==='y')k[f]=KT.lerp(k[f],p[f],blend);else if(f==='ang'||f==='moveAng')k[f]+=KT.angDiff(p[f],k[f])*blend;else k[f]=p[f];});k.finished=!!p.finished;k.drifting=!!p.drifting;k.item=Object.prototype.hasOwnProperty.call(KT.Items.LABEL,p.item)?p.item:null;k.itemRoll=finite(p.itemRoll)?p.itemRoll:0;k.bestLap=finite(p.bestLap)?p.bestLap:null;k.lapTimes=Array.isArray(p.lapTimes)?p.lapTimes.filter(finite).slice(0,5):[];});
    r.orbs=m.orbs;r.hazards=m.hazards;KT.Track.itemBoxes.forEach(function(b,i){b.active=!!m.boxes[i];});
  }
  function ready(){if(role!=='host'||phase!=='loading')return;var pending=false;links.forEach(function(c){if(c.joined&&c.ready!==epoch)pending=true;});if(!pending){clearTimeout(timeout);phase='racing';message='Corrida em andamento';broadcast(packet(KT.race));}}
  function beginConnection(host,room,nick,driver,cfg){
    leave();var gen=generation;role=host?'host':'client';phase='connecting';message='Conectando ao serviço de salas...';notify();
    return load().then(function(){
      if(gen!==generation)return;
      code=host?randomCode():room;settings=cfg||{};
      peer=new window.Peer(host?PREFIX+code:undefined, Object.assign({debug:0},KT.ONLINE_CONFIG||{}));
      peer.on('error',function(e){if(gen===generation)fail(errorText(e));});
      peer.on('connection',accept);
      peer.on('open',function(id){
        if(gen!==generation)return;myId=id;lastHeard=Date.now();
        if(host){phase='lobby';roster=[{id:id,name:name(nick),driver:driver}];message='Sala criada. Compartilhe o convite.';clearTimeout(timeout);notify();}
        else {var c=peer.connect(PREFIX+room,{reliable:true,serialization:'json',metadata:{game:'Kart Trovao',v:VERSION}});links.set(c.peer,c);bind(c);c.on('open',function(){send(c,{t:'join',v:VERSION,name:name(nick),driver:driver});});}
        pingTimer=setInterval(function(){if(role==='client'){var c=links.values().next().value;send(c,{t:'ping',time:Date.now()});if(Date.now()-lastHeard>15000)fail('O anfitrião deixou de responder. Tente entrar novamente.');}},2000);
      });
      timeout=setTimeout(function(){if(gen===generation&&phase==='connecting')fail('A sala não respondeu. Confira a internet, o código e se o anfitrião está online.');},16000);
    }).catch(function(e){if(gen===generation)fail(e.message);});
  }
  KT.Net={
    get phase(){return phase;},get host(){return role==='host';},get active(){return phase==='loading'||phase==='racing';},get client(){return role==='client';},get code(){return code;},get players(){return roster;},get settings(){return settings;},get message(){return message;},get latency(){return latency;},get connected(){return !!role&&phase!=='error'&&phase!=='idle';},MAX:MAX,
    create:function(nick,driver,cfg){if(!validSettings(cfg))return Promise.reject(Error('Configuração inválida.'));return beginConnection(true,'',nick,driver,cfg);},
    join:function(room,nick,driver){room=String(room).trim();try{if(room.indexOf('://')>=0)room=new URL(room).hash.replace(/^#sala=/i,'');}catch(e){}room=room.toUpperCase();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(room)){message='Digite o código de 8 caracteres ou cole o link do convite.';notify();return Promise.resolve();}return beginConnection(false,room,nick,driver);},
    leave:leave,
    invite:function(){var url=new URL(location.href);url.hash='sala='+code;return url.href;},
    start:function(){
      if(role!=='host'||phase!=='lobby'||roster.length<2)return false;
      epoch++;sequence=0;sendClock=0;phase='loading';
      roster.forEach(function(p,i){p.slot=i;});
      var drivers=roster.map(function(p){return p.driver;});for(var i=0;drivers.length<8;i++){var d=i%12;if(drivers.indexOf(d)<0)drivers.push(d);}
      var cfg=Object.assign({},settings,{drivers:drivers,karts:8,slotJogador:0,jogador:roster[0].driver,modo:'online',network:true,semente:KT.novaSemente()});
      KT.Game.start(cfg);
      roster.slice(1).forEach(function(p){var k=KT.race.karts[p.slot];k.ai=false;k.networkId=p.id;k.remoteInput={throttle:0,brake:0,steer:0,drift:false,useItem:false};});
      broadcast({t:'prepare',epoch:epoch,cfg:cfg,players:roster});
      timeout=setTimeout(function(){links.forEach(function(c){if(c.ready!==epoch)c.close();});ready();},12000);ready();return true;
    },
    step:function(dt,r,I){
      if(role==='host'){links.forEach(function(c){if(Date.now()-c.lastInput>600){var p=roster.find(function(p){return p.id===c.peer;}),k=p&&r.karts[p.slot];if(k&&!k.ai)k.remoteInput={throttle:0,brake:1,steer:0,drift:false,useItem:false};}});return phase==='loading';}
      if(role!=='client')return false;
      if(phase==='loading')return true;
      inputClock+=dt;
      if(inputClock>=1/30||I.hit('item')){inputClock=0;send(links.values().next().value,{t:'input',epoch:epoch,seq:inputSequence++,c:{up:I.held('up'),down:I.held('down'),steer:I.axisX(),drift:I.held('drift'),item:I.hit('item')}});}
      if(target){var was=r.state;applySnapshot(r,target,Math.min(1,dt*24));if(was==='countdown'&&r.state==='race')KT.Audio.music('theme'+KT.THEMES[KT.Track.definition.theme].tune);KT.Audio.engineUpdate(r.player.rpm(),r.player.drifting,false);}
      return true;
    },
    afterStep:function(dt,r){if(role!=='host'||phase!=='racing')return;sendClock+=dt;if(sendClock>=1/20){sendClock=0;broadcast(packet(r));}},
    finish:function(r){if(role==='host'){broadcast(packet(r,'finish'));phase='results';}},
    backLobby:function(){if(role!=='host')return;phase='lobby';target=null;roster.forEach(function(p){delete p.slot;});KT.Game.menu(true);lobby();},
    validSnapshot:validSnapshot,packet:packet,applySnapshot:applySnapshot
  };
})();
