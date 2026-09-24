/* Salas de 2–4 amigos + IA, em estrela pelo servidor de salas (servidor/): o anfitrião simula a corrida
   e o servidor só repassa as mensagens. */
(function(){
  'use strict';
  /* VERSION 5: salas pelo servidor de salas (servidor/), sem PeerJS. VERSION 4: pistas esticadas. VERSION 3: GP online. */
  var VERSION=5,MAX=4,gp=null,keepalive=0;
  var socket=null,welcomed=false,links=new Map(),role='',phase='idle',code='',myId='',roster=[],settings={},message='',generation=0,epoch=0;
  var target=null,lastSequence=-1,sequence=0,lastHeard=0,inputSequence=0,lastInputAt=0,lastInputKey='',lastSnapAt=0,timeout=null,pingTimer=null,latency=0;
  var fields=['x','y','ang','moveAng','sp','lap','pos','progress','idx','boost','spin','shield','slowTimer','hop','driftCharge','air','rescue','magnet','finishTime','lapStart','terrain'];
  var finite=function(n){return typeof n==='number'&&Number.isFinite(n);};
  var name=function(s){return String(s||'Piloto').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,18)||'Piloto';};
  function notify(){if(KT.UI&&KT.UI.onlineChanged)KT.UI.onlineChanged();}
  /* force: mensagem de estado (sala, largada, chegada, tabela) não pode ser descartada com o buffer cheio */
  /* Tudo passa por um WebSocket só; bufferedAmount alto = conexão lenta, descarta snapshot em vez de acumular. */
  function raw(text,force){if(socket&&socket.readyState===1&&(force||socket.bufferedAmount<16384))try{socket.send(text);}catch(e){/* onclose trata a perda */}}
  function send(c,m,force){if(c&&c.open)c.send(m,force);}
  function broadcast(m,force){if(role==='host')raw('*\t'+JSON.stringify(m),force);}
  function clearTimers(){clearTimeout(timeout);clearInterval(pingTimer);timeout=null;pingTimer=null;}
  /* Link com a mesma cara da conexão do PeerJS (peer, open, on, send, close), para o resto do arquivo não depender do transporte.
     out é o prefixo de destino: id+'\t' no anfitrião, vazio no convidado. close() do anfitrião derruba o convidado no servidor. */
  function link(id,out){var h={},l={peer:id,open:true,
    on:function(e,f){(h[e]=h[e]||[]).push(f);},emit:function(e,x){(h[e]||[]).slice().forEach(function(f){f(x);});},
    send:function(m,force){raw(out+JSON.stringify(m),force);},
    close:function(){if(!l.open)return;l.open=false;if(role==='host')raw('\t'+JSON.stringify({r:'kick',id:id}),true);l.emit('close');}};return l;}
  /* Endereço do servidor de salas. ?relay= só vale em localhost: um convite forjado não desvia o tráfego de ninguém. */
  function relayUrl(){var cfg=KT.ONLINE_CONFIG||{},url=cfg.relayUrl||'';
    try{if(typeof location!=='undefined'&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){var q=new URLSearchParams(location.search).get('relay');if(q&&/^wss?:\/\//.test(q))url=q;}}catch(e){/* sem location */}
    return url.replace(/\/+$/,'');}
  function randomCode(){var bytes=new Uint8Array(8);crypto.getRandomValues(bytes);var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(bytes,function(b){return chars[b%chars.length];}).join('');}
  function leave(reason){generation++;clearTimers();phase='idle';role='';target=null;gp=null;links.clear();if(socket){var s=socket;socket=null;s.onclose=s.onmessage=null;try{s.close(1000);}catch(e){}}roster=[];code='';message=reason||'';notify();}
  function fail(text){leave(text);phase='error';if(KT.Game&&KT.Game.state==='race')KT.Game.menu(true);notify();}
  function closeText(ev){var c=ev&&ev.code;
    if(c===4004)return 'Sala não encontrada. Confira o código; se o anfitrião acabou de atualizar o jogo, atualize esta página (Ctrl+F5).';
    if(c===4009)return 'Esse código já está em uso. Crie outra sala.';
    if(c===4013)return 'Sala lotada. Entre em outra sala.';
    if(c===4001)return 'Você foi removido da sala: a conexão demorou para responder. Entre novamente.';
    if(c===4008)return 'Conexão encerrada por excesso de mensagens. Entre novamente.';
    if(!welcomed)return 'Não foi possível alcançar o serviço de salas. Confira sua internet; se persistir, o limite diário pode ter acabado.';
    return role==='host'?'A conexão com o serviço de salas caiu. A sala foi encerrada.':'O anfitrião saiu ou a conexão foi perdida. Crie ou entre em outra sala.';}
  function lobby(){broadcast({t:'lobby',v:VERSION,code:code,players:roster,settings:settings},true);notify();}
  function drop(c){
    if(!links.has(c.peer))return;links.delete(c.peer);
    if(role==='host'){
      var index=roster.findIndex(function(p){return p.id===c.peer;});
      if(index>=0&&phase!=='lobby'){var slot=roster[index].slot,k=KT.race.karts[slot];if(k){k.ai=true;k.remoteInput=null;k.networkId=null;KT.race.banner('AMIGO SAIU: IA ASSUMIU O KART',2);}}
      /* no GP o slot de quem saiu segue na tabela, pilotado pela IA */
      if(index>=0&&gp&&Number.isInteger(roster[index].slot)){var e=gp.entries[roster[index].slot];e.human=false;e.left=true;}
      roster=roster.filter(function(p){return p.id!==c.peer;});
      if(phase==='lobby')lobby();else {broadcast({t:'players',players:roster},true);if(gp)broadcast({t:'gp',gp:wire(gp)},true);notify();ready();}
    }else if(phase==='connecting')fail(closeText());
    else fail('O anfitrião saiu ou a conexão foi perdida. Crie ou entre em outra sala.');
  }
  function validSettings(s){return s&&Number.isInteger(s.pista)&&s.pista>=0&&s.pista<30&&Number.isInteger(s.nivel)&&s.nivel>=0&&s.nivel<4&&Number.isInteger(s.voltas)&&s.voltas>=1&&s.voltas<=5&&(s.gp==null||validGpCfg(s.gp));}
  function validGpCfg(g){return !!g&&typeof g==='object'&&Number.isInteger(g.liga)&&g.liga>=0&&g.liga<KT.CUPS.length&&(g.tamanho===4&&Number.isInteger(g.parte)&&g.parte>=0&&g.parte<KT.GP.LEGS.length||g.tamanho===10&&g.parte===0);}
  function ints(a,min,max){return Array.isArray(a)&&a.length===8&&a.every(function(n){return Number.isInteger(n)&&n>=min&&n<=max;});}
  /* A tabela vem do anfitrião; o convidado confere forma e limites e recalcula as pistas localmente. */
  function validGp(g){var c=settings.gp;return !!g&&typeof g==='object'&&validGpCfg(c)&&g.liga===c.liga&&g.tamanho===c.tamanho&&g.parte===c.parte&&Number.isInteger(g.stage)&&g.stage>=0&&g.stage<=g.tamanho
    &&ints(g.drivers,0,11)&&ints(g.scores,0,15*g.tamanho)&&ints(g.last,0,15)&&ints(g.wins,0,g.stage)
    &&Array.isArray(g.entries)&&g.entries.length===8&&g.entries.every(function(e){return e&&typeof e.name==='string'&&e.name.length<=18&&Number.isInteger(e.driver)&&e.driver>=0&&e.driver<12&&typeof e.human==='boolean'&&typeof e.left==='boolean';});}
  function readGp(g){return {liga:g.liga,tamanho:g.tamanho,parte:g.parte,stage:g.stage,tracks:KT.GP.tracks(g.liga,g.tamanho,g.parte),drivers:g.drivers.slice(),scores:g.scores.slice(),last:g.last.slice(),wins:g.wins.slice(),
    entries:g.entries.map(function(e){return {name:name(e.name),driver:e.driver,human:e.human,left:e.left};})};}
  function wire(g){return {liga:g.liga,tamanho:g.tamanho,parte:g.parte,stage:g.stage,drivers:g.drivers,scores:g.scores,last:g.last,wins:g.wins,entries:g.entries};}
  function validPlayers(a){return Array.isArray(a)&&a.length>=1&&a.length<=MAX&&a.every(function(p){return p&&typeof p.id==='string'&&p.id.length<=100&&typeof p.name==='string'&&p.name.length<=18&&Number.isInteger(p.driver)&&p.driver>=0&&p.driver<12;})&&new Set(a.map(function(p){return p.id;})).size===a.length;}
  function accept(c){
    if(role!=='host'||phase!=='lobby'||links.size>=MAX-1){c.on('open',function(){send(c,{t:'error',message:phase==='lobby'?'Sala cheia: máximo de 4 amigos.':gp?'GP em andamento. Entre quando voltarem à sala.':'Esta corrida já começou. Entre quando voltarem à sala.'});setTimeout(function(){c.close();},250);});return;}
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
    if(m.t==='hello'&&m.v!==VERSION){fail('Versão diferente da do anfitrião. Todos precisam atualizar a página (Ctrl+F5).');return;}
    if(m.t==='lobby'&&m.v===VERSION&&validPlayers(m.players)&&validSettings(m.settings)){
      if(!m.players.some(function(p){return p.id===myId;}))return;
      clearTimeout(timeout);roster=m.players;settings=m.settings;gp=null;code=String(m.code).slice(0,8);phase='lobby';target=null;message='Conectado. Aguardando o anfitrião iniciar.';if(KT.Game.state!=='select')KT.Game.menu(true);notify();
    }
    if(m.t==='prepare'&&validPlayers(m.players)&&validSettings(m.cfg)&&Array.isArray(m.cfg.drivers)&&m.cfg.drivers.length===8&&m.cfg.drivers.every(function(n){return Number.isInteger(n)&&n>=0&&n<12;})){
      var mine=m.players.find(function(p){return p.id===myId;});if(!mine||!Number.isInteger(mine.slot)||mine.slot<0||mine.slot>7||!Number.isInteger(m.epoch))return;
      if(settings.gp){if(!validGp(m.gp)||m.gp.stage>=m.gp.tamanho)return;var next=readGp(m.gp);if(m.cfg.pista!==next.tracks[next.stage])return;gp=next;}
      roster=m.players;epoch=m.epoch;lastSequence=-1;target=null;phase='loading';
      KT.Game.start(Object.assign({},m.cfg,{jogador:mine.driver,slotJogador:mine.slot,modo:'online',network:true}));
      send(c,{t:'ready',epoch:epoch});message='Todos carregando a pista...';
    }
    if((m.t==='snapshot'||m.t==='finish')&&m.epoch===epoch&&validSnapshot(m)&&m.seq>lastSequence){
      lastSequence=m.seq;target=m;phase=m.t==='finish'?'results':'racing';
      if(m.t==='finish'){if(gp&&validGp(m.gp))gp=readGp(m.gp);applySnapshot(KT.race,m,1);KT.Game.finishOnline();}
    }
    if(m.t==='players'&&validPlayers(m.players))roster=m.players;
    if(m.t==='gp'&&gp&&validGp(m.gp)){gp=readGp(m.gp);notify();}
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
  /* Largada comum à corrida avulsa e a cada etapa do GP; os slots já estão em roster[i].slot. */
  function launch(pista,drivers){
    epoch++;sequence=0;phase='loading';
    var cfg=Object.assign({},settings,{pista:pista,drivers:drivers,karts:8,slotJogador:0,jogador:drivers[0],modo:'online',network:true,semente:KT.novaSemente()});
    KT.Game.start(cfg);
    roster.slice(1).forEach(function(p){var k=KT.race.karts[p.slot];k.ai=false;k.networkId=p.id;k.remoteInput={throttle:0,brake:0,steer:0,drift:false,useItem:false};});
    var m={t:'prepare',epoch:epoch,cfg:cfg,players:roster};if(gp)m.gp=wire(gp);broadcast(m,true);
    timeout=setTimeout(function(){links.forEach(function(c){if(c.ready!==epoch)c.close();});ready();},12000);ready();return true;
  }
  /* Mensagens do servidor: 'pong' do keepalive, "\t"+controle, e dados do jogo (id+"\t"+json no anfitrião, json no convidado). */
  function receive(text,nick,driver){
    lastHeard=Date.now();if(text==='pong')return;
    var tab=text.indexOf('\t'),m;try{m=JSON.parse(tab<0?text:text.slice(tab+1));}catch(e){return;}
    if(tab===0){control(m,nick,driver);return;}
    if(role==='host'){var c=tab>0&&links.get(text.slice(0,tab));if(c&&c.open)c.emit('data',m);}
    else if(tab<0){var h=links.get('host');if(h)h.emit('data',m);}
  }
  function control(m,nick,driver){
    if(!m||typeof m.id!=='string')return;
    if(m.r==='welcome'&&!welcomed){welcomed=true;myId=m.id;
      if(role==='host'){phase='lobby';roster=[{id:myId,name:name(nick),driver:driver}];message='Sala criada. Compartilhe o convite.';clearTimeout(timeout);notify();}
      else{var h=link('host','');links.set('host',h);bind(h);send(h,{t:'join',v:VERSION,name:name(nick),driver:driver},true);}}
    /* o open vem depois do accept: o caminho de recusa registra c.on('open') */
    else if(m.r==='open'&&role==='host'){var c=link(m.id,m.id+'\t');accept(c);c.emit('open');}
    else if(m.r==='close'&&role==='host'){var l=links.get(m.id);if(l&&l.open){l.open=false;l.emit('close');}}
  }
  function beginConnection(host,room,nick,driver,cfg){
    leave();var gen=generation,base=relayUrl(),ws;role=host?'host':'client';phase='connecting';message='Conectando ao serviço de salas...';notify();
    if(!base){fail('O online não está configurado nesta versão. Atualize a página (Ctrl+F5).');return Promise.resolve();}
    if(typeof WebSocket!=='function'){fail('Este navegador não suporta a conexão online.');return Promise.resolve();}
    code=host?randomCode():room;settings=cfg||{};welcomed=false;lastHeard=Date.now();keepalive=0;
    try{ws=new WebSocket(base+'/v1/sala/'+code+'?papel='+role.replace('client','guest'));}catch(e){fail(closeText());return Promise.resolve();}
    socket=ws;
    ws.onmessage=function(ev){if(gen===generation&&typeof ev.data==='string')receive(ev.data,nick,driver);};
    ws.onclose=function(ev){if(gen!==generation)return;socket=null;fail(closeText(ev));};
    /* Convidado pinga o anfitrião (15 s sem nada = falha); o anfitrião manda 'ping' ao servidor a cada 24 s para a conexão ociosa não cair. */
    pingTimer=setInterval(function(){
      if(role==='client'&&welcomed){send(links.get('host'),{t:'ping',time:Date.now()});if(Date.now()-lastHeard>15000)fail('O anfitrião deixou de responder. Tente entrar novamente.');}
      else if(role==='host'){if(++keepalive%12===0)raw('ping');if(Date.now()-lastHeard>60000)fail('A conexão com o serviço de salas caiu. A sala foi encerrada.');}
    },2000);
    timeout=setTimeout(function(){if(gen===generation&&phase==='connecting')fail('A sala não respondeu. Confira a internet, o código e se o anfitrião está online.');},16000);
    return Promise.resolve();
  }
  KT.Net={
    get phase(){return phase;},get host(){return role==='host';},get active(){return phase==='loading'||phase==='racing';},get client(){return role==='client';},get code(){return code;},get players(){return roster;},get settings(){return settings;},get message(){return message;},get latency(){return latency;},get connected(){return !!role&&phase!=='error'&&phase!=='idle';},MAX:MAX,
    create:function(nick,driver,cfg){if(!validSettings(cfg))return Promise.reject(Error('Configuração inválida.'));return beginConnection(true,'',nick,driver,cfg);},
    join:function(room,nick,driver){room=String(room).trim();try{if(room.indexOf('://')>=0)room=new URL(room).hash.replace(/^#sala=/i,'');}catch(e){}room=room.toUpperCase();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(room)){message='Digite o código de 8 caracteres ou cole o link do convite.';notify();return Promise.resolve();}return beginConnection(false,room,nick,driver);},
    leave:leave,
    invite:function(){var url=new URL(location.href);url.hash='sala='+code;return url.href;},
    start:function(){
      if(role!=='host'||phase!=='lobby'||roster.length<2)return false;
      roster.forEach(function(p,i){p.slot=i;});
      var drivers=roster.map(function(p){return p.driver;});for(var i=0;drivers.length<8;i++){var d=i%12;if(drivers.indexOf(d)<0)drivers.push(d);}
      /* No GP, slots e pilotos ficam fixos da 1ª à última corrida: a tabela depende deles. */
      if(settings.gp){var c=settings.gp,zeros=[0,0,0,0,0,0,0,0];
        gp={liga:c.liga,tamanho:c.tamanho,parte:c.parte,stage:0,tracks:KT.GP.tracks(c.liga,c.tamanho,c.parte),drivers:drivers,scores:zeros.slice(),last:zeros.slice(),wins:zeros.slice(),
          entries:drivers.map(function(d,i){var p=roster[i];return p?{name:p.name,driver:d,human:true,left:false}:{name:KT.DRIVERS[d].nome,driver:d,human:false,left:false};})};
        return launch(gp.tracks[0],drivers);}
      return launch(settings.pista,drivers);
    },
    /* Próxima etapa do GP. Aceita o anfitrião sozinho: quem saiu virou IA. */
    next:function(){if(role!=='host'||phase!=='results'||!gp||gp.stage>=gp.tracks.length)return false;return launch(gp.tracks[gp.stage],gp.drivers);},
    step:function(dt,r,I){
      if(role==='host'){links.forEach(function(c){if(Date.now()-c.lastInput>600){var p=roster.find(function(p){return p.id===c.peer;}),k=p&&r.karts[p.slot];if(k&&!k.ai)k.remoteInput={throttle:0,brake:1,steer:0,drift:false,useItem:false};}});return phase==='loading';}
      if(role!=='client')return false;
      if(phase==='loading')return true;
      /* Pelo relógio, não pelos passos: recuperar atraso não dispara rajada. Manda quando o controle muda (até 20/s),
         item na hora, e repete a cada 200 ms para o anfitrião não frear o kart (ele freia após 600 ms sem input). */
      var now=Date.now(),ctl={up:I.held('up'),down:I.held('down'),steer:Math.round(I.axisX()*8)/8,drift:I.held('drift'),item:I.hit('item')},key=JSON.stringify(ctl);
      if(ctl.item||now-lastInputAt>=50&&(key!==lastInputKey||now-lastInputAt>=200)){lastInputAt=now;lastInputKey=key;send(links.get('host'),{t:'input',epoch:epoch,seq:inputSequence++,c:ctl});}
      if(target){var was=r.state;applySnapshot(r,target,Math.min(1,dt*24));if(was==='countdown'&&r.state==='race')KT.Audio.music('theme'+KT.THEMES[KT.Track.definition.theme].tune);KT.Audio.engineUpdate(r.player.rpm(),r.player.drifting,false);}
      return true;
    },
    /* 15 snapshots/s pelo relógio; o convidado suaviza entre eles em applySnapshot */
    afterStep:function(dt,r){if(role!=='host'||phase!=='racing')return;var now=Date.now();if(now-lastSnapAt>=66){lastSnapAt=Math.max(lastSnapAt+66,now-66);broadcast(packet(r));}},
    finish:function(r){if(role!=='host')return;var m=packet(r,'finish');if(gp&&gp.scored!==epoch){gp.scored=epoch;KT.GP.score(gp,r.karts.map(function(k){return k.pos;}));}if(gp)m.gp=wire(gp);broadcast(m,true);phase='results';},
    get gp(){return gp;},
    get mySlot(){var me=roster.find(function(p){return p.id===myId;});return me&&Number.isInteger(me.slot)?me.slot:-1;},
    backLobby:function(){if(role!=='host')return;phase='lobby';target=null;gp=null;roster.forEach(function(p){delete p.slot;});KT.Game.menu(true);lobby();},
    validSnapshot:validSnapshot,packet:packet,applySnapshot:applySnapshot
  };
})();
