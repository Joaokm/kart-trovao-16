/* Padrão: sinalização gratuita PeerServer Cloud + STUN.
   Para jogar entre redes diferentes (4G, CGNAT, rede de empresa) é preciso um TURN.
   iceServers: lista fixa de servidores (credencial estática do Metered, painel → TURN Server → Credenciais TURN).
   iceUrl: alternativa que devolve credenciais TURN temporárias, em um destes formatos:
     - Metered: 'https://SEUAPP.metered.live/api/v1/turn/credentials?apiKey=SUA_CHAVE'
     - Cloudflare Realtime (1000 GB/mês grátis), via ferramentas/turn-cloudflare-worker.js:
       'https://SEU-WORKER.workers.dev/'
   A credencial do Metered fica visível no site; o pior caso é alguém gastar a sua franquia.
   Para sinalização própria, preencha host/port/path/secure (API do PeerJS). */
(function(){
  var u='5167d6c1f4ccaf52c9c95626',p='yCIFJzg2FsBCSqqi';
  KT.ONLINE_CONFIG = {
    iceUrl: '',
    iceServers: [
      {urls: 'stun:stun.relay.metered.ca:80'},
      {urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:80?transport=tcp',
              'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp'], username: u, credential: p}
    ]
  };
})();
