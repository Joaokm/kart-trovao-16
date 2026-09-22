/* Controle padrão e botões de toque. Polling sem dependências. */
(function(){
  "use strict";
  var previous={},connected=false,startHeld=false,startAction='pause',selectHeld=0;
  KT.Controls={get connected(){return connected;},poll:function(){
    if(typeof navigator==='undefined'||!navigator.getGamepads)return;
    var pads=navigator.getGamepads(),pad=null;for(var i=0;i<pads.length;i++)if(pads[i]&&pads[i].connected){pad=pads[i];break;}
    connected=!!pad;
    var menu=KT.Game.state==='select'||KT.Game.state==='results'||KT.Game.state==='title',active={};
    if(pad){var b=function(n){return !!(pad.buttons[n]&&pad.buttons[n].pressed);};
      active.left=b(14)||pad.axes[0]<-.3;active.right=b(15)||pad.axes[0]>.3;
      active.up=b(12)||(menu?pad.axes[1]<-.3:b(0)||b(7));active.down=b(13)||(menu?pad.axes[1]>.3:b(1)||b(6));
      if(b(9)&&!startHeld)startAction=KT.Game.state==='paused'?'start':'pause';startHeld=b(9);
      active.drift=b(4)||b(5);active.item=b(2);active.start=menu?b(0):b(9)&&startAction==='start';active.pause=menu?b(1):b(9)&&startAction==='pause';active.photo=b(3);
      if(menu&&(active.left||active.right)&&document.activeElement&&document.activeElement.tagName==='SELECT'){
        var dir=active.right?1:-1;if(selectHeld!==dir){var el=document.activeElement,next=el.selectedIndex+dir;while(next>=0&&next<el.options.length&&el.options[next].disabled)next+=dir;if(next>=0&&next<el.options.length){var id=el.id;el.selectedIndex=next;el.dispatchEvent(new Event('change',{bubbles:true}));var replacement=document.getElementById(id);if(replacement)replacement.focus();}}selectHeld=dir;
        active.left=false;active.right=false;
      }else selectHeld=0;
    }else {startHeld=false;selectHeld=0;}
    Object.keys(Object.assign({},previous,active)).forEach(function(a){if(!!previous[a]!==!!active[a])KT.Input.virtual(a,!!active[a]);});previous=active;
  }};
  window.addEventListener('load',function(){
    if(!document.createElement('div').appendChild)return;
    var dock=document.createElement('div');dock.id='touch-controls';dock.setAttribute('aria-label','Controles de toque');
    [['left','←'],['right','→'],['up','Acelerar'],['down','Frear'],['drift','Drift'],['item','Item'],['pause','Pausa']].forEach(function(p){var b=document.createElement('button');b.type='button';b.textContent=p[1];b.setAttribute('aria-label',p[1]);b.addEventListener('pointerdown',function(e){e.preventDefault();b.setPointerCapture(e.pointerId);KT.Audio.resume();KT.Input.virtual(p[0],true);});['pointerup','pointercancel','lostpointercapture'].forEach(function(name){b.addEventListener(name,function(){KT.Input.virtual(p[0],false);});});dock.appendChild(b);});
    document.getElementById('cabinet').appendChild(dock);
    var start=document.createElement('button');start.id='open-game';start.type='button';start.textContent='Abrir menu';start.addEventListener('click',function(){KT.Audio.resume();KT.Game.menu();start.blur();});document.getElementById('cabinet').appendChild(start);
    window.addEventListener('blur',function(){if(KT.Game.state==='race')KT.Input.virtual('pause',true);});
  });
})();
