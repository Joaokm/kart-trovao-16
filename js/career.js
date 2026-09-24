/* Save versionado, economia e campeonato. Não depende do DOM nem da corrida. */
(function () {
  "use strict";
  /* v3 (fase 2): pistas esticadas. Um save v2 é migrado mantendo tudo, menos os recordes e fantasmas. */
  var KEY="kart-trovao-16-v3", OLD_KEY="kart-trovao-16-v2", storageOK=true, POINTS=[15,12,10,8,6,4,2,1];
  function fresh() { return {version:3,bolts:150,wins:0,races:0,cups:{},records:{},parts:[0,0,0],paint:0,settings:{volume:70,crt:true,motion:true},activeCup:null}; }
  function integer(n,min,max,fallback) { return Number.isInteger(n)&&n>=min&&n<=max?n:fallback; }
  function clean(raw) {
    var d=fresh();
    if (!raw || (raw.version!==2&&raw.version!==3)) return d;
    d.bolts=integer(raw.bolts,0,999999,150); d.wins=integer(raw.wins,0,999999,0); d.races=integer(raw.races,0,999999,0);
    d.parts=d.parts.map(function(_,i){return integer(raw.parts&&raw.parts[i],0,3,0);});
    d.paint=integer(raw.paint,0,5,0);
    for(var c=0;c<3;c++) for(var l=0;l<4;l++) {
      var key=c+":"+l,v=raw.cups&&raw.cups[key];
      if (Number.isInteger(v)&&v>=1&&v<=8) d.cups[key]=v;
    }
    if(raw.version===3 && raw.records && typeof raw.records==="object") Object.keys(raw.records).slice(0,720).forEach(function(k){
      var r=raw.records[k];
      if(/^\d{1,2}:\d{1,2}:[01]$/.test(k) && r && Number.isFinite(r.time)&&r.time>0&&r.time<900 && Array.isArray(r.samples) && r.samples.length<=9000 && r.samples.every(function(p){return Array.isArray(p)&&p.length===4&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=900&&p[1]>=0&&p[1]<=4096&&p[2]>=0&&p[2]<=4096;})) d.records[k]=r;
    });
    if(raw.settings) {
      d.settings.volume=integer(raw.settings.volume,0,100,70);
      d.settings.crt=raw.settings.crt!==false; d.settings.motion=raw.settings.motion!==false;
    }
    var a=raw.activeCup;
    if(a&&Number.isInteger(a.cup)&&a.cup>=0&&a.cup<3&&Number.isInteger(a.level)&&a.level>=0&&a.level<4&&Number.isInteger(a.stage)&&a.stage>=0&&a.stage<10&&Array.isArray(a.drivers)&&a.drivers.length===8&&new Set(a.drivers).size===8&&a.drivers.every(function(n){return Number.isInteger(n)&&n>=0&&n<12;})&&a.drivers.indexOf(a.player)>=0&&Array.isArray(a.scores)&&a.scores.length===8&&a.scores.every(function(n){return Number.isInteger(n)&&n>=0&&n<=150;})) d.activeCup=a;
    return d;
  }
  var data=fresh();
  try { var saved=localStorage.getItem(KEY); if(saved==null)saved=localStorage.getItem(OLD_KEY); data=clean(JSON.parse(saved)); } catch(e) { storageOK=false; }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));storageOK=true;return true;}catch(e){storageOK=false;return false;}}
  function won(c,l){return (data.cups[c+":"+l]||99)<=3;}
  function unlockedCup(c){return c===0||[0,1,2,3].some(function(l){return won(c-1,l);});}
  function legend(){return [0,1,2].every(function(c){return data.cups[c+":2"]===1;});}
  function unlockedDriver(i){return i<8||(i===8&&data.wins>=5)||(i>=9&&[0,1,2,3].some(function(l){return won(i-9,l);}));}
  function beginCup(c,level,player){
    if(!unlockedCup(c)||!unlockedDriver(player)||(level===3&&!legend())) return null;
    var pool=KT.DRIVERS.map(function(_,i){return i;}).filter(function(i){return i!==player&&i!==KT.CUPS[c].rival;});
    var drivers=[player]; if(KT.CUPS[c].rival!==player) drivers.push(KT.CUPS[c].rival);
    for(var i=0;drivers.length<8;i++) drivers.push(pool[i]);
    data.activeCup={cup:c,level:level,player:player,stage:0,drivers:drivers,scores:drivers.map(function(){return 0;})};save();return data.activeCup;
  }
  function cupConfig(){var a=data.activeCup;if(!a)return null;return {jogador:a.player,adversarios:a.drivers.filter(function(i){return i!==a.player;}),karts:8,pista:a.cup*10+a.stage,nivel:a.level,voltas:3,modo:"cup",cupStage:a.stage};}
  function standings(a){return a.drivers.map(function(d,i){return {driver:d,points:a.scores[i]};}).sort(function(x,y){return y.points-x.points||x.driver-y.driver;});}
  function finish(race){
    if(race.teste||race.rewarded)return null;race.rewarded=true;
    var p=race.player,level=KT.LEVELS[race.level],finished=p.finished;
    var reward=finished?Math.round((race.mode==="tt"?35:35+(9-p.pos)*9)*level.reward):0;
    data.races++;if(finished&&p.pos===1&&race.mode!=="tt")data.wins++;
    data.bolts=Math.min(999999,data.bolts+reward);
    var out={reward:reward,championship:null,unlock:[]};
    var a=data.activeCup;
    if(race.mode==="cup"&&a&&a.stage===race.cupStage&&race.trackId===a.cup*10+a.stage) {
      race.karts.forEach(function(k){var i=a.drivers.indexOf(k.di);if(i>=0)a.scores[i]+=k.finished?POINTS[k.pos-1]:0;});
      a.stage++;out.championship={cup:a.cup,stage:a.stage,table:standings(a),done:a.stage===10};
      if(a.stage===10){
        var table=standings(a),playerRow=table.find(function(r){return r.driver===a.player;});
        /* Empate na pontuação compartilha posição e recompensas. */
        var place=1+table.filter(function(r){return r.points>playerRow.points;}).length;
        var key=a.cup+":"+a.level;data.cups[key]=Math.min(data.cups[key]||99,place);
        out.championship.place=place;
        if(place<=3){var prize=Math.round(KT.CUPS[a.cup].prize*level.reward);data.bolts=Math.min(999999,data.bolts+prize);out.reward+=prize;out.unlock.push(KT.DRIVERS[KT.CUPS[a.cup].rival].nome);if(a.cup<2)out.unlock.push(KT.CUPS[a.cup+1].name);}
        data.activeCup=null;
      }
    }
    if(data.wins===5&&finished&&p.pos===1)out.unlock.push("IARA FLUXO");
    save();return out;
  }
  /* GP online: só pontos entre amigos, nunca toca em activeCup nem em data.cups.
     A tabela é indexada pelo slot do grid (0..7), porque dois amigos podem usar o mesmo piloto.
     No online, quem não termina no tempo-limite (300 s, ou 60 s + 75 s por volta se for maior) pontua pela posição em que estava. */
  var GP_LEGS=[[0,1,2,3],[4,5,6,7],[6,7,8,9]];
  KT.GP={POINTS:POINTS,LEGS:GP_LEGS,
    tracks:function(liga,tamanho,parte){return (tamanho===10?[0,1,2,3,4,5,6,7,8,9]:GP_LEGS[parte]).map(function(i){return liga*10+i;});},
    label:function(c){return KT.CUPS[c.liga].name+' · '+(c.tamanho===10?'liga completa':'parte '+(c.parte+1));},
    score:function(gp,positions){gp.last=positions.map(function(p){return POINTS[p-1]||0;});gp.last.forEach(function(v,i){gp.scores[i]+=v;});var w=positions.indexOf(1);if(w>=0)gp.wins[w]++;gp.stage++;},
    table:function(gp){return gp.scores.map(function(s,i){return {slot:i,entry:gp.entries[i],points:s,last:gp.last[i],wins:gp.wins[i]};})
      .sort(function(a,b){return b.points-a.points||b.wins-a.wins||b.last-a.last||a.slot-b.slot;})
      .map(function(r,_,all){r.place=1+all.filter(function(o){return o.points>r.points;}).length;return r;});}
  };
  var paints=[null,"#f5bf49","#61dfce","#f47eb1","#b4a1f5","#eeeae0"];
  KT.Career={get data(){return data;},get storageOK(){return storageOK;},save:save,clean:clean,won:won,unlockedCup:unlockedCup,unlockedDriver:unlockedDriver,legend:legend,beginCup:beginCup,cupConfig:cupConfig,standings:standings,finish:finish,
    price:function(i){return [120,180,260][data.parts[i]]||0;},
    buy:function(i){if(!Number.isInteger(i)||i<0||i>2)return false;var price=this.price(i);if(!price||data.bolts<price)return false;data.bolts-=price;data.parts[i]++;save();return true;},
    paint:function(i){if(!Number.isInteger(i)||i<0||i>=paints.length)return false;data.paint=i;save();return true;},paints:paints,
    tune:function(k,stock){if(stock)return;k.driver=Object.assign({},k.driver);var p=data.parts;k.driver.vel*=1+p[0]*.018-p[2]*.007;k.driver.acel*=1+p[2]*.035-p[0]*.009;k.driver.grip*=1+p[1]*.035;k.mass*=1+p[0]*.035-p[2]*.06;if(paints[data.paint])k.driver.cor=paints[data.paint];k.sprites=KT.Sprites.buildKart(k.driver.cor,k.driver.capacete,k.driver.pele);},
    exportSave:function(){return JSON.stringify(data,null,2);},
    importSave:function(raw){var value=JSON.parse(raw);if(!value||(value.version!==2&&value.version!==3))throw Error("Arquivo de save incompatível.");data=clean(value);return save();}
  };
  KT.Ghost={
    key:function(r){return r.trackId+":"+r.player.di+":"+(r.mirror?1:0);},
    start:function(r){r.ghostSamples=[];r.ghostTick=0;r.ghostRecord=r.mode==="tt"?data.records[this.key(r)]:null;},
    update:function(r,dt){if(r.mode!=="tt"||r.state!=="race"||r.player.finished)return;r.ghostTick-=dt;if(r.ghostTick<=0){r.ghostTick+=.1;r.ghostSamples.push([+r.time.toFixed(3),+r.player.x.toFixed(2),+r.player.y.toFixed(2),+r.player.ang.toFixed(4)]);}},
    finish:function(r){if(r.teste||r.mode!=="tt"||!r.player.finished)return false;var key=this.key(r),prev=data.records[key];if(prev&&prev.time<=r.player.finishTime)return false;data.records[key]={time:r.player.finishTime,samples:r.ghostSamples};save();return true;},
    point:function(r){var g=r.ghostRecord;if(!g||!g.samples.length||r.time>g.time)return null;var list=g.samples,lo=0,hi=list.length-1;while(lo<hi){var m=Math.ceil((lo+hi)/2);if(list[m][0]<=r.time)lo=m;else hi=m-1;}var a=list[lo],b=list[Math.min(lo+1,list.length-1)],t=b[0]>a[0]?KT.clamp((r.time-a[0])/(b[0]-a[0]),0,1):0;return {x:KT.lerp(a[1],b[1],t),y:KT.lerp(a[2],b[2],t),ang:a[3]+KT.angDiff(b[3],a[3])*t};}
  };
})();
