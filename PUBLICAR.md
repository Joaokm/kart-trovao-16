# Publicar o Kart Trovão 16

O jogo é um site estático e pode ser publicado no GitHub Pages sem build.

## Arquivos necessários

`index.html`, `.nojekyll`, `css/` e `js/` (incluindo `js/vendor/`). Os caminhos são relativos e funcionam em `https://USUARIO.github.io/REPOSITORIO/`.

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

GitHub Pages entrega os arquivos. PeerServer Cloud faz a sinalização e WebRTC conecta os participantes. O anfitrião simula a partida e envia snapshots aos outros três jogadores. Os lugares vazios ficam com IA.

Para usar sinalização própria, configure `js/online-config.js` com `host`, `port`, `path` e `secure`, conforme a [API oficial do PeerJS](https://peerjs.com/client/api/peer). TURN pode ser configurado por `config.iceServers`; credenciais temporárias devem vir de um backend próprio. Não publique senhas ou chaves permanentes no JavaScript.

Se uma rede corporativa, móvel ou roteador impedir WebRTC direto, a sala pode conectar ao serviço de sinalização mas falhar ao ligar os jogadores. Tente outra rede ou implante TURN. A versão padrão não inclui um servidor TURN próprio.

## Teste após publicar

- Abra em dois navegadores ou aparelhos diferentes.
- Crie a sala em um e entre pelo convite no outro.
- Confira se os dois aparecem antes de largar.
- Teste uma corrida inteira e o retorno à sala.
- Teste quatro pessoas em redes distintas antes de anunciar disponibilidade geral.

Os testes locais já verificam quatro conexões reais, mas não representam todos os roteadores e condições de internet.
