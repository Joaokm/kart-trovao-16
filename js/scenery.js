/* Silhuetas e objetos de cada bioma desenhados na resolução nativa. */
KT.Scenery={
  sky:function(ctx,cam,W,H){
    var theme=KT.THEMES[KT.Track.definition.theme],g=ctx.createLinearGradient(0,0,0,cam.horizon);
    g.addColorStop(0,theme.sky[0]);g.addColorStop(1,theme.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,cam.horizon+2);
    var off=KT.normAng(cam.ang)/KT.TAU*640;
    var night=theme.prop==="tower"||theme.prop==="antenna";
    var t=KT.race?KT.race.time:0,motion=KT.Career.data.settings.motion;
    if(night){ctx.fillStyle="#d8dfe8";for(var s=0;s<28;s++){ctx.globalAlpha=motion?.45+.55*Math.abs(Math.sin(t*1.3+s*2.1)):1;ctx.fillRect(((s*89-off*.12)%W+W)%W,8+(s*17)%55,1,1);}ctx.globalAlpha=1;}
    else {ctx.fillStyle=theme.prop==="ice"?"#d9f5f5":"#f9deb0";ctx.fillRect(246,20,21,17);ctx.fillRect(242,24,29,9);}
    /* nuvens altas que andam devagar (paradas com movimento reduzido) */
    if(!night&&theme.prop!=="cloud"){ctx.fillStyle="rgba(255,255,255,.28)";for(var c=0;c<6;c++){var span=W+90,cx=((c*127-off*.08+(motion?t*3:0))%span+span)%span-45,cy=10+(c*23)%(cam.horizon-40);ctx.fillRect(Math.round(cx),cy,36,5);ctx.fillRect(Math.round(cx)+7,cy-3,20,3);}}
    for(var layer=0;layer<2;layer++){
      ctx.fillStyle=layer?theme.ground:theme.soil;
      for(var i=-2;i<15;i++){
        var xx=((i*45-off*(layer?.45:.2))%630+630)%630-100,hh=18+Math.sin(i*4.71+layer)*13,base=cam.horizon+3;
        if(night){ctx.fillRect(xx,base-hh,27,hh);ctx.fillRect(xx+8,base-hh-8,12,8);if(layer&&theme.prop==="tower"){ctx.fillStyle=theme.accent;for(var q=0;q<3;q++)ctx.fillRect(xx+5+q*7,base-hh+5,2,3);ctx.fillStyle=theme.ground;}}
        else if(theme.prop==="cloud"){ctx.fillStyle=layer?"#c3d6e3":"#eef1f0";ctx.fillRect(xx,base-hh,42,15);ctx.fillRect(xx+8,base-hh-7,23,10);}
        else {ctx.beginPath();ctx.moveTo(xx-12,base);ctx.lineTo(xx+24,base-hh-12);ctx.lineTo(xx+61,base);ctx.fill();if(theme.prop==="ice"){ctx.fillStyle="#d5eaf1";ctx.beginPath();ctx.moveTo(xx+10,base-hh+2);ctx.lineTo(xx+24,base-hh-12);ctx.lineTo(xx+38,base-hh+2);ctx.fill();ctx.fillStyle=layer?theme.ground:theme.soil;}}
      }
    }
    if(theme.prop==="antenna"&&KT.Career.data.settings.motion){ctx.strokeStyle="#9fbccc";ctx.lineWidth=1;for(var r=0;r<24;r++){var rx=(r*31+KT.race.time*55)%W,ry=(r*17+KT.race.time*110)%cam.horizon;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-3,ry+7);ctx.stroke();}}
  },
  prop:function(ctx,t,o,p,time){
    var s=Math.max(.12,p.scale),x=Math.round(p.x),y=Math.round(p.y);
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle="#202539";
    if(t.prop==="tree"||t.prop==="palm"){
      ctx.fillStyle="#6c5143";ctx.fillRect(-2,-37,4,37);ctx.fillStyle=t.prop==="palm"?"#55b382":"#428b63";
      if(t.prop==="tree"){for(var i=0;i<3;i++){ctx.beginPath();ctx.moveTo(0,-57+i*11);ctx.lineTo(-16-i*3,-30+i*11);ctx.lineTo(16+i*3,-30+i*11);ctx.fill();}}
      else {ctx.fillRect(-23,-38,46,5);ctx.fillRect(-15,-43,30,5);ctx.fillRect(-5,-51,10,12);ctx.fillRect(-27,-33,11,5);ctx.fillRect(16,-33,11,5);}
    }else if(t.prop==="tower"){
      ctx.fillStyle="#283246";ctx.fillRect(-10,-62,20,62);ctx.fillStyle=t.accent;for(var a=0;a<5;a++){ctx.fillRect(-6,-54+a*10,4,4);ctx.fillRect(3,-54+a*10,4,4);}ctx.fillStyle="#bbcde0";ctx.fillRect(-12,-62,24,3);
    }else if(t.prop==="cactus"){
      ctx.fillStyle="#385b49";ctx.fillRect(-4,-37,8,37);ctx.fillRect(-15,-23,13,6);ctx.fillRect(-15,-34,5,14);ctx.fillRect(3,-15,12,6);ctx.fillRect(11,-28,5,16);ctx.fillStyle="#81a26c";ctx.fillRect(-2,-33,2,28);
    }else if(t.prop==="antenna"){
      ctx.fillStyle="#778a9c";ctx.fillRect(-2,-62,4,62);ctx.fillRect(-14,-43,28,3);ctx.fillRect(-9,-52,18,3);ctx.fillStyle=t.accent;ctx.fillRect(-3,-66,6,5);
    }else if(t.prop==="cloud"){
      ctx.fillStyle="#dbe6ef";ctx.fillRect(-20,-18,40,10);ctx.fillRect(-12,-27,26,12);ctx.fillStyle="#b4c6db";ctx.fillRect(-17,-8,35,4);
    }else{
      ctx.fillStyle=t.prop==="ice"?"#a0dbe9":"#c66a50";ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(-7,-32);ctx.lineTo(3,-47);ctx.lineTo(14,-13);ctx.lineTo(10,0);ctx.fill();ctx.fillStyle=t.accent;ctx.beginPath();ctx.moveTo(3,-47);ctx.lineTo(3,-7);ctx.lineTo(14,-13);ctx.fill();
    }
    ctx.restore();
  }
};
