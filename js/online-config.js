/* Padrão: sinalização gratuita PeerServer Cloud + STUN.
   Para jogar entre redes diferentes (4G, CGNAT, rede de empresa) é preciso um TURN.
   iceUrl: endereço que devolve credenciais TURN temporárias, em um destes formatos:
     - Metered (Open Relay, 20 GB/mês grátis):
       'https://SEUAPP.metered.live/api/v1/turn/credentials?apiKey=SUA_CHAVE'
     - Cloudflare Realtime (1000 GB/mês grátis), via ferramentas/turn-cloudflare-worker.js:
       'https://SEU-WORKER.workers.dev/'
   A chave do Metered fica visível no site; o pior caso é alguém gastar a sua franquia.
   Para sinalização própria, preencha host/port/path/secure (API do PeerJS). */
KT.ONLINE_CONFIG = {
  iceUrl: ''
};
