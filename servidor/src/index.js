/* Servidor de salas do Kart Trovão 16. Um Durable Object por código de sala repassa texto entre
   o anfitrião e os convidados sem ler o jogo; quem decide lotação, versão e regras é o anfitrião.
   Formato das mensagens (o \t separa o destino do conteúdo):
     anfitrião → sala: "*\t"+json para todos os convidados, id+"\t"+json para um só,
                       "\t"+{"r":"kick","id"} para derrubar um convidado
     convidado → sala: json, entregue ao anfitrião como id+"\t"+json
     sala → cliente:   "\t"+{"r":"welcome"|"open"|"close","id"} (controle)
   Códigos de fechamento: 4000 anfitrião saiu, 4001 removido, 4004 sala não existe,
   4008 excesso de mensagens, 4009 código em uso, 4013 sala lotada. */
import { DurableObject } from 'cloudflare:workers';

const CODIGO = /^[A-HJ-NP-Z2-9]{8}$/;
/* 3 amigos + 1 vaga para quem chega receber o aviso de sala cheia do anfitrião */
const MAX_CONVIDADOS = 4;
/* uso normal: anfitrião ~17/s, convidado até 20/s de controle + ping */
const LIMITE = { host: { bytes: 32768, porSegundo: 30 }, guest: { bytes: 1024, porSegundo: 30 } };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/v1\/sala\/([^/]+)$/);
    if (!m || !CODIGO.test(m[1])) return new Response('não encontrado', { status: 404 });
    if (!env.ORIGENS.split(',').includes(request.headers.get('Origin'))) return new Response('origem não permitida', { status: 403 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('esperado websocket', { status: 426 });
    const papel = url.searchParams.get('papel');
    if (papel !== 'host' && papel !== 'guest') return new Response('papel inválido', { status: 400 });
    /* Origin se forja fora do navegador; o limite por IP é o que segura um script gastando a cota grátis.
       Loopback só existe no wrangler dev, onde os testes abrem dezenas de conexões. */
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (env.LIMITE_IP && ip !== '127.0.0.1' && ip !== '::1' && !(await env.LIMITE_IP.limit({ key: ip })).success) return new Response('muitas conexões', { status: 429 });
    /* sam: a sala nasce na América do Sul, perto dos jogadores */
    return env.SALAS.get(env.SALAS.idFromName(m[1]), { locationHint: 'sam' }).fetch(request);
  }
};

export class Sala extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    /* contagem de mensagens por segundo; zera ao hibernar, o que só acontece com a sala ociosa */
    this.taxa = new Map();
    /* keepalive responde sem acordar a sala */
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    const papel = new URL(request.url).searchParams.get('papel');
    const [cliente, servidor] = Object.values(new WebSocketPair());
    const anfitriao = this.ctx.getWebSockets('host')[0];
    const recusa = papel === 'host' ? anfitriao && [4009, 'codigo em uso']
      : !anfitriao ? [4004, 'sala nao existe']
      : this.ctx.getWebSockets('guest').length >= MAX_CONVIDADOS ? [4013, 'sala lotada'] : null;
    if (recusa) {
      servidor.accept();
      servidor.close(recusa[0], recusa[1]);
      return new Response(null, { status: 101, webSocket: cliente });
    }
    const id = papel === 'host' ? 'host' : crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.ctx.acceptWebSocket(servidor, papel === 'host' ? ['host'] : ['guest', 'g:' + id]);
    servidor.serializeAttachment({ papel, id });
    /* welcome antes de open: o anfitrião nunca recebe dado de um convidado que ainda não conhece */
    enviar(servidor, controle('welcome', id));
    if (anfitriao) enviar(anfitriao, controle('open', id));
    return new Response(null, { status: 101, webSocket: cliente });
  }

  webSocketMessage(ws, msg) {
    const { papel, id } = ws.deserializeAttachment();
    if (typeof msg !== 'string' || msg.length > LIMITE[papel].bytes || this.excedeu(id, papel)) {
      fechar(ws, 4008, 'excesso de mensagens');
      return;
    }
    if (papel === 'guest') {
      const anfitriao = this.ctx.getWebSockets('host')[0];
      if (anfitriao) enviar(anfitriao, id + '\t' + msg);
      return;
    }
    const tab = msg.indexOf('\t');
    if (tab < 0) return;
    const destino = msg.slice(0, tab), corpo = msg.slice(tab + 1);
    if (destino === '*') this.ctx.getWebSockets('guest').forEach((g) => enviar(g, corpo));
    else if (destino === '') {
      let c;
      try { c = JSON.parse(corpo); } catch (e) { return; }
      if (c && c.r === 'kick' && typeof c.id === 'string') this.ctx.getWebSockets('g:' + c.id).forEach((g) => fechar(g, 4001, 'removido'));
    } else this.ctx.getWebSockets('g:' + destino).forEach((g) => enviar(g, corpo));
  }

  webSocketClose(ws) { this.saiu(ws); }
  webSocketError(ws) { this.saiu(ws); }

  saiu(ws) {
    const { papel, id } = ws.deserializeAttachment();
    this.taxa.delete(id);
    fechar(ws, 1000, 'fim');
    if (papel === 'host') this.ctx.getWebSockets('guest').forEach((g) => fechar(g, 4000, 'anfitriao saiu'));
    else {
      const anfitriao = this.ctx.getWebSockets('host')[0];
      if (anfitriao) enviar(anfitriao, controle('close', id));
    }
  }

  excedeu(id, papel) {
    const agora = Date.now();
    let t = this.taxa.get(id);
    if (!t || agora - t.inicio >= 1000) this.taxa.set(id, t = { inicio: agora, n: 0 });
    return ++t.n > LIMITE[papel].porSegundo;
  }
}

function controle(r, id) { return '\t' + JSON.stringify({ r, id }); }
function enviar(ws, texto) { try { ws.send(texto); } catch (e) { /* o close do socket avisa a saída */ } }
function fechar(ws, codigo, motivo) { try { ws.close(codigo, motivo); } catch (e) { /* já fechado */ } }
