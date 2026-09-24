# Publicar o Kart Trovão 16

Versão publicada: **[Jogar Kart Trovão 16](https://joaokm.github.io/kart-trovao-16/)**. Repositório: [Joaokm/kart-trovao-16](https://github.com/Joaokm/kart-trovao-16).

O jogo é um site estático e pode ser publicado no GitHub Pages sem build.

## Arquivos necessários

`index.html`, `.nojekyll`, `css/` e `js/`. Os caminhos são relativos e funcionam em `https://USUARIO.github.io/REPOSITORIO/`.

Não envie `backups/` ou saves exportados. São desnecessários para o jogo.

## GitHub Pages

1. Envie os arquivos para o repositório escolhido.
2. Abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch que contém o jogo e a pasta **/(root)**.
5. Salve e aguarde o endereço público aparecer no painel do Pages.
6. Abra o endereço, entre em **Jogar com amigos** e crie a sala. Compartilhe o convite gerado nessa versão pública.

Referência: [configuração da origem do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Online

GitHub Pages entrega os arquivos. As mensagens da partida passam pelo servidor de salas em `servidor/`: um Cloudflare Worker com um Durable Object por sala, que só repassa texto entre o anfitrião e os convidados. O anfitrião simula a corrida e envia 15 snapshots por segundo; os convidados mandam o controle quando ele muda, e a cada 200 ms no mínimo. Os lugares vazios ficam com IA.

Por que não ligação direta: em 24/09/2026 o PeerJS com WebRTC não ligou dois jogadores em redes diferentes, nem com STUN nem com o TURN do Metered (a credencial funcionava no teste Trickle ICE e mesmo assim o amigo não entrou). O servidor de salas usa uma conexão comum de site, que passa por 4G, CGNAT e rede de empresa.

### Publicar o servidor de salas

Precisa de Node 20 e de uma conta grátis na Cloudflare (não pede cartão; ao passar da cota o serviço recusa conexões, não cobra).

```
cd servidor
npm install
npx wrangler login
npm run deploy
```

Na primeira vez a Cloudflare pede para registrar um subdomínio `workers.dev`. O deploy mostra o endereço `https://kart-trovao-salas.SUBDOMINIO.workers.dev`. Cole em `relayUrl`, em `js/online-config.js`, trocando `https` por `wss`, e publique o site.

Se o jogo mudar de endereço, acrescente a nova origem em `ORIGENS`, no `servidor/wrangler.toml`, e rode `npm run deploy` de novo.

O wrangler fica fixo na 4.86.0 porque as versões novas exigem Node 22.

### Quanto cabe no plano grátis

O plano grátis dá 100 mil requisições por dia a Durable Objects, e cada 20 mensagens recebidas contam como uma. Bytes não contam. Pela conta do código (ainda não medida no painel), uma corrida de 4 jogadores gera cerca de 40 mensagens por segundo, ou 7 mil requisições por hora: umas 14 horas por dia. Com 2 jogadores, o dobro. Há também um teto de 13.000 GB-s de Durable Object por dia, cerca de 28 horas de sala ativa. A cota renova à 0h UTC (21h de Brasília). O servidor limita cada IP a 20 conexões por minuto e cada conexão a 30 mensagens por segundo, mas quem quiser gastar a cota de propósito, com muitos IPs, ainda consegue: aí o online para até a renovação, sem cobrança. O painel da Cloudflare, em **Workers & Pages → kart-trovao-salas**, mostra o consumo real.

### Testar localmente

Em um terminal, `cd servidor && npm run dev`; em outro, `node ferramentas/serve.js`. Abra `http://127.0.0.1:8080/?relay=ws://127.0.0.1:8787`. O `?relay=` só vale em localhost. `node ferramentas/qa-relay.js` testa o servidor sozinho.

## Teste após publicar

- Abra em dois navegadores ou aparelhos diferentes.
- Crie a sala em um e entre pelo convite no outro.
- Confira se os dois aparecem antes de largar.
- Teste uma corrida inteira e o retorno à sala.
- Teste quatro pessoas em redes distintas antes de anunciar disponibilidade geral.

Os testes locais já verificam quatro conexões reais, mas não representam todos os roteadores e condições de internet.
