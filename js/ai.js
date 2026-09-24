/* Direção preditiva, tráfego e riscos. Mesmas regras físicas para todos. */
(function(){
  "use strict";
  KT.Kart.prototype.aiControls=function(dt,race){
    var Tk=KT.Track,N=Tk.N,pts=Tk.pts,L=KT.LEVELS[race.level==null?1:race.level];
    var top=KT.Kart.TOP*this.driver.vel*this.aiSkill,sp=Math.max(0,this.sp),ahead=Math.round(12+sp*.075);
    var ti=(this.idx+ahead)%N;
    var turn=KT.angDiff(pts[(ti+12)%N].ang,pts[(ti+N-12)%N].ang);
    this.aiLineTimer-=dt;
    if(this.aiLineTimer<=0){this.aiLineTimer=KT.rand(2.4,4.2);this.aiLine=KT.rand(-1,1)*(1-L.skill)*16;}
    var lateral=KT.sign(turn)*Math.min(14,Math.abs(turn)*55)+this.aiLine;
    var myLat=Tk.lateralOffset(this.x,this.y,this.idx),trafficLimit=top;
    for(var j=0;j<race.karts.length;j++){
      var other=race.karts[j];if(other===this)continue;
      var dd=(other.idx-this.idx+N)%N;
      if(dd>0&&dd<ahead+12){var ol=Tk.lateralOffset(other.x,other.y,other.idx);if(Math.abs(ol-myLat)<29){
        var side=myLat>=ol?1:-1;if(Math.abs(ol+side*31)>Tk.halfAt(ti)-10)side=-side;
        lateral=ol+side*31;
        if(dd<12&&Math.abs(ol-myLat)<20)trafficLimit=Math.max(90,other.sp*.94);
      }}
    }
    if(!this.item&&race.mode!=="tt"){
      var best=null,bestScore=1e9;
      Tk.itemBoxes.forEach(function(b){var d=(b.i-this.idx+N)%N;if(b.active&&d>8&&d<65){var lat=Tk.lateralOffset(b.x,b.y,b.i),score=d+Math.abs(lat-lateral)*1.5;if(score<bestScore){best=b;bestScore=score;}}},this);
      if(best)lateral=KT.lerp(lateral,Tk.lateralOffset(best.x,best.y,best.i),.85);
    }
    var obstacles=race.hazards.concat(Tk.dangers);
    for(var h=0;h<obstacles.length;h++){
      var hz=obstacles[h],hd=(hz.i-this.idx+N)%N;
      if(hd>0&&hd<ahead+25){var hl=Tk.lateralOffset(hz.x,hz.y,hz.i);if(Math.abs(hl-lateral)<(hz.radius||16)+14)lateral=hl+(hl>=0?-1:1)*((hz.radius||16)+18);}
    }
    lateral=KT.clamp(lateral,-Tk.halfAt(ti)+10,Tk.halfAt(ti)-10);
    var target=Tk.pointAt(ti,lateral),dist=Math.max(12,Math.hypot(target.x-this.x,target.y-this.y));
    var diff=KT.angDiff(Math.atan2(target.x-this.x,target.y-this.y),this.moveAng);
    var desired=Math.min(top,trafficLimit),curv=0;
    /* Limite angular local + distância de frenagem até a curva. */
    for(var q=5;q<90;q+=6){
      var ix=(this.idx+q)%N,p=pts[ix],curvature=p.curv/Math.max(8,14*p.len);
      curv=Math.max(curv,p.curv);
      var safe=Math.min(top,(1.05+.25*L.skill)*this.driver.grip/Math.max(.001,curvature));
      desired=Math.min(desired,Math.sqrt(safe*safe+2*200*Math.max(0,(q-8)*p.len)));
    }
    if(Math.abs(diff)>1)desired=Math.min(desired,110);
    var ratio=KT.clamp(sp/(KT.Kart.TOP*this.driver.vel),0,1),rate=2.35*(.42+.58*(1-ratio*.75))*this.driver.grip*Tk.PROPS[this.terrain].grip;
    var angError=KT.angDiff(this.moveAng,this.ang);
    var steer=KT.clamp((2*sp*Math.sin(diff)/dist+angError*1.2)/Math.max(.4,rate),-1,1);
    /* Histerese: sustenta o drift numa curva e libera ao endireitar. */
    var drift=false;
    if(this.drifting){
      drift=steer*this.driftDir>.22&&sp>top*.45&&this.driftCharge<1.9&&Math.abs(myLat)<Tk.halfAt(this.idx)-2;
      if(drift)steer=KT.clamp((Math.abs(steer)/1.55-.62)/.38,-.5,1)*this.driftDir;
    }else drift=Math.abs(steer)>.8&&sp>top*.58&&curv>.1&&Math.abs(myLat)<25;
    var use=false;this.aiItemTimer-=dt;
    if(this.item&&this.aiItemTimer<=0){
      this.aiItemTimer=.12+(1-L.skill)*.65;
      if(this.item==="shield")use=race.orbs.some(function(o){return o.owner!==this&&Math.hypot(o.x-this.x,o.y-this.y)<220;},this);
      if(this.item==="orb")use=race.hasTargetAhead(this);
      if(this.item==="goo")use=race.hasTargetBehind(this);
      if(this.item==="turbo")use=curv<.19&&!this.drifting&&Math.abs(myLat)<Tk.halfAt(this.idx);
      if(this.item==="spring")use=obstacles.some(function(h){var d=(h.i-this.idx+N)%N;return d<35;},this)||Tk.definition.hazard==="fall";
      if(this.item==="magnet")use=race.hasTargetAhead(this);
    }
    return {throttle:sp>desired+8?0:1,brake:sp>desired+8?.65:0,steer:steer,drift:drift,useItem:use};
  };
  var update=KT.Kart.prototype.update,hit=KT.Kart.prototype.hit;
  KT.Kart.prototype.hit=function(kind){if(this.air>0||this.rescue>0)return false;return hit.call(this,kind);};
  KT.Kart.prototype.update=function(dt,race){
    this.iceTimer=Math.max(0,(this.iceTimer||0)-dt);
    this.air=Math.max(0,this.air-dt);this.magnet=Math.max(0,this.magnet-dt);this.dangerCooldown=Math.max(0,this.dangerCooldown-dt);
    if(this.rescue>0){this.rescue-=dt;this.sp=0;if(this.rescue<=0){var p=KT.Track.pointAt(this.idx,0);this.x=p.x;this.y=p.y;this.ang=p.ang;this.moveAng=p.ang;this.shield=1.5;}return;}
    update.call(this,dt,race);
    if(race.state!=="race"||this.finished||this.air>0)return;
    var Tk=KT.Track,def=Tk.definition;
    if(this.magnet>0){var target=null,distance=260;race.karts.forEach(function(k){if(k===this||k.progress<=this.progress)return;var d=Math.hypot(k.x-this.x,k.y-this.y);if(d<distance){target=k;distance=d;}},this);if(target){this.boost=Math.max(this.boost,.12);this.magnetTarget=target;}else this.magnetTarget=null;}
    if(def.hazard==="wind"&&this.idx>280&&this.idx<500){var push=Math.sin(race.time*1.7)*19*dt;var a=Tk.pts[this.idx].ang;this.moveWithCollision(Math.cos(a)*push,-Math.sin(a)*push);}
    if(def.hazard==="fall"&&this.idx>270&&this.idx<410&&Math.abs(Tk.lateralOffset(this.x,this.y,this.idx))>Tk.HALF+9){this.rescue=1.4;this.drifting=false;this.driftCharge=0;this.boost=0;if(this.isPlayer)race.banner("RESGATE! CUIDADO COM A BORDA",1.5);return;}
    for(var i=0;i<Tk.dangers.length;i++){
      var h=Tk.dangers[i];if(Math.hypot(this.x-h.x,this.y-h.y)>h.radius+7)continue;
      if(h.kind==="ice"){this.iceTimer=.35;this.sp*=1-dt*.35;}
      else if(h.kind==="water"||h.kind==="sand")this.sp*=1-dt*1.7;
      else if(!this.dangerCooldown&&(h.kind!=="lava"||(race.time+h.phase)%4>2.2)){this.hit(h.kind==="oil"?"goo":"rock");this.dangerCooldown=1.5;}
    }
  };
})();
