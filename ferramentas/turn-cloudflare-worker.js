/* Cloudflare Worker que entrega credenciais TURN temporárias ao Kart Trovão 16.
   No painel da Cloudflare: Realtime → TURN → criar chave; Workers → criar Worker, colar este arquivo
   e cadastrar em Settings → Variables as secrets TURN_KEY_ID e TURN_KEY_TOKEN.
   ORIGEM limita quem pode pedir credenciais ao endereço publicado do jogo. */
const ORIGEM = 'https://joaokm.github.io';

export default {
  async fetch(request, env) {
    /* O navegador sempre manda Origin no fetch cross-origin; pedido sem ele é script, não o jogo.
       Origin forjado continua possível fora do navegador: por isso a regra de limite no PUBLICAR.md. */
    const cors = { 'Access-Control-Allow-Origin': ORIGEM, 'Vary': 'Origin' };
    if (request.headers.get('Origin') !== ORIGEM) return new Response('origem não permitida', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    if (request.method !== 'GET') return new Response('método não permitido', { status: 405, headers: cors });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 4 * 3600 })
    });
    if (!r.ok) return new Response('falha ao gerar credenciais', { status: 502, headers: cors });
    return new Response(await r.text(), { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
};
