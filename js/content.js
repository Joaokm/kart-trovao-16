/* Conteúdo original: circuitos, temas, rivais e regulamento. Scripts locais. */
(function () {
  "use strict";
  KT.LEVELS = [
    {name:"NOVATO", speed:0.80, skill:0.72, reward:1, note:"Rivais tranquilos, mais tempo para aprender."},
    {name:"PILOTO", speed:0.90, skill:0.86, reward:1.25, note:"Ritmo competitivo e ultrapassagens."},
    {name:"ÁS", speed:0.97, skill:0.97, reward:1.6, note:"Frenagem tardia e uso preciso dos itens."},
    {name:"LENDA", speed:1, skill:1, reward:2, note:"Vença as três copas no nível ÁS para liberar."}
  ];
  KT.THEMES = {
    vulcano:{name:"Vulcânico", ground:"#241527", soil:"#64505b", grass:"#354d34", road:"#3b3b4c", curb:"#e54a37", sky:["#181431","#b35356"], fog:[92,58,76], accent:"#ff9b40", prop:"crystal", tune:0},
    costa:{name:"Litoral", ground:"#206778", soil:"#c5ac69", grass:"#568c63", road:"#425f69", curb:"#ffcf59", sky:["#296e9d","#b8e2df"], fog:[123,177,189], accent:"#72ead2", prop:"palm", tune:1},
    mata:{name:"Floresta", ground:"#122f33", soil:"#4b6550", grass:"#39865d", road:"#3c5050", curb:"#f0c65b", sky:["#123b52","#80b2a1"], fog:[57,105,96], accent:"#91eb86", prop:"tree", tune:2},
    gelo:{name:"Glacial", ground:"#62869f", soil:"#a5c6d2", grass:"#749fac", road:"#475a78", curb:"#6cd7ef", sky:["#23406d","#bedfee"], fog:[139,174,204], accent:"#bcecff", prop:"ice", tune:3},
    deserto:{name:"Desértico", ground:"#926144", soil:"#c59a68", grass:"#927944", road:"#68534c", curb:"#eab650", sky:["#693f64","#e9b782"], fog:[183,127,95], accent:"#ffd983", prop:"cactus", tune:4},
    cidade:{name:"Noturno", ground:"#111a34", soil:"#30334f", grass:"#355c61", road:"#333d55", curb:"#dc5999", sky:["#091328","#405e89"], fog:[41,51,80], accent:"#ff7cab", prop:"tower", tune:5},
    ceu:{name:"Altitude", ground:"#455884", soil:"#9fa7c0", grass:"#6c92a0", road:"#4f5877", curb:"#fff29a", sky:["#476fa8","#d1e4ed"], fog:[138,165,200], accent:"#e8d6ff", prop:"cloud", tune:6},
    tempestade:{name:"Tempestade", ground:"#172333", soil:"#455165", grass:"#3a6868", road:"#303e53", curb:"#efbe54", sky:["#111a31","#637488"], fog:[63,78,97], accent:"#ffe179", prop:"antenna", tune:7}
  };
  /* [nome, tema, raio, 3 harmônicas (amplitude/frequência/fase), escalas,
      largura, perigo]. Cada circuito possui traçado próprio, sem rotação de clones. */
  var rows = [
    ["Circuito Vulcano","vulcano",380,[105,3,.4,52,5,0,28,2,.9],1.12,.94,88,""],
    ["Enseada Azul","costa",400,[42,2,.2,22,3,.7,12,5,1.2],1.12,.87,108,""],
    ["Bosque dos Vagalumes","mata",390,[62,3,.8,20,5,1,15,2,2],.96,1.1,102,""],
    ["Dunas do Sol","deserto",410,[65,2,1,29,4,.5,12,3,1],1.1,.88,110,"sand"],
    ["Porto das Lanternas","cidade",380,[43,4,.4,24,2,1.8,14,3,.2],1.14,.98,102,"oil"],
    ["Vale da Brisa","mata",405,[60,2,2,30,3,.4,18,5,1.1],1.02,1.0,100,""],
    ["Baía Coral","costa",385,[56,3,1.8,38,2,.4,12,4,.6],1.12,.94,104,"water"],
    ["Pedreira Rubra","vulcano",390,[78,3,1.4,24,5,.7,18,2,.5],1.03,1.03,100,"rocks"],
    ["Jardim Suspenso","ceu",390,[48,4,.2,20,2,.4,12,3,1.4],1.04,1.02,106,""],
    ["Forja da Faísca","vulcano",395,[80,3,.7,34,5,1.2,20,2,2],1.1,.98,96,"lava"],
    ["Serra de Cristal","gelo",390,[66,3,.3,32,4,.8,12,2,2],1.08,1.04,102,"ice"],
    ["Mangue das Marés","mata",405,[60,2,.5,46,3,1.3,16,5,2],1.1,.9,98,"water"],
    ["Passarela do Vento","ceu",405,[72,2,1.8,26,5,.2,15,3,1],.94,1.07,98,"wind"],
    ["Ferrovia Fantasma","cidade",390,[55,4,1.2,36,2,.4,16,3,2],1.13,.94,98,"oil"],
    ["Cânion Ocre","deserto",400,[77,2,.8,30,5,1.2,25,3,.4],1.13,.88,98,"sand"],
    ["Lago da Aurora","gelo",405,[42,3,2,42,2,.7,12,5,.8],1.04,1.01,100,"ice"],
    ["Cascata Esmeralda","mata",390,[74,3,2,28,4,.5,16,2,1.4],1.09,.96,96,"water"],
    ["Ilhas do Tufão","costa",400,[70,3,1,32,5,2,18,2,.3],1.0,1.02,98,"wind"],
    ["Ponte das Nuvens","ceu",400,[62,2,.3,38,4,1,19,3,2],1.11,.9,94,"fall"],
    ["Olho do Ciclone","tempestade",400,[85,3,1.9,36,5,.1,20,2,.8],1.08,.98,96,"wind"],
    ["Metrópole Elétrica","cidade",395,[64,4,.2,32,2,.9,16,5,1],1.05,1.02,96,"oil"],
    ["Desfiladeiro Solar","deserto",405,[88,2,.6,37,3,2.2,20,5,1.5],1.06,.92,94,"fall"],
    ["Geleira do Eco","gelo",390,[76,3,2.4,32,5,1.3,18,2,.5],1.07,1.01,96,"ice"],
    ["Raízes Antigas","mata",390,[80,3,.6,40,4,1.6,16,2,.2],1.03,1.04,94,"rocks"],
    ["Arquipélago Prisma","costa",400,[74,3,1.3,40,2,2.1,20,5,.6],1.07,.96,96,"water"],
    ["Fornalha Profunda","vulcano",380,[94,3,2,40,5,.3,22,2,1.4],1.1,1.02,94,"lava"],
    ["Estrada Estelar","ceu",410,[62,4,1.7,30,2,1,14,3,2.4],1.01,.95,94,"fall"],
    ["Antenas do Horizonte","tempestade",390,[76,3,.9,40,5,2,22,2,.1],1.09,1.01,94,"wind"],
    ["Coroa de Obsidiana","vulcano",385,[95,3,.2,42,4,.8,22,2,2.2],1.08,1.02,94,"lava"],
    ["Coração do Trovão","tempestade",400,[93,3,1.2,42,5,.6,23,2,1.7],1.08,.98,96,"fall"]
  ];
  KT.TRACKS = rows.map(function(r,i) {
    return {id:i,name:r[0],theme:r[1],radius:r[2],waves:r[3],sx:r[4],sy:r[5],width:r[6],hazard:r[7],cup:Math.floor(i/10),seed:16+i*7919,
      pads:i===0?[175,520,860,1050]:[145+i*3%70,470+i*7%100,815+i*11%80,1030+i*3%70],
      description:r[7] ? ({sand:"Bancos de areia roubam velocidade.",oil:"Desvie das manchas de óleo.",water:"Poças nas curvas: escolha sua linha.",rocks:"Rochas no asfalto. Prepare o desvio.",lava:"Gêiseres de lava alternam entre aviso e erupção.",ice:"Placas de gelo reduzem a aderência.",wind:"Rajadas laterais exigem correção.",fall:"Bordas abertas nos setores marcados. Use a mola."}[r[7]]) : "Pista limpa para acertar a linha e dominar a Carga Trovão."};
  });
  KT.CUPS = [
    {name:"Copa Faísca",rival:9,color:"#ffb759",prize:450},
    {name:"Copa Ciclone",rival:10,color:"#76e2de",prize:700},
    {name:"Copa Trovão",rival:11,color:"#d8baff",prize:1000}
  ];
})();
