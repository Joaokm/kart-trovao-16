# Publicar o Kart Trovão 16

Versão publicada: **[Jogar Kart Trovão 16](https://joaokm.github.io/kart-trovao-16/)**. Repositório: [Joaokm/kart-trovao-16](https://github.com/Joaokm/kart-trovao-16).

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

Para usar sinalização própria, configure `js/online-config.js` com `host`, `port`, `path` e `secure`, conforme a [API oficial do PeerJS](https://peerjs.com/client/api/peer).

## Jogar entre redes diferentes (TURN)

Sem TURN, a sala só liga jogadores da mesma rede ou atrás de roteador simples. 4G, internet com CGNAT e rede de empresa ou faculdade bloqueiam a ligação direta: o amigo acha a sala e o jogo avisa "A sala existe, mas as redes não se ligaram direto". Os servidores TURN que vêm no PeerJS estão fora do ar, por isso o jogo precisa de um próprio.

O jogo busca credenciais temporárias no endereço de `iceUrl`, em `js/online-config.js`. Se esse endereço falhar, ele segue só com STUN e continua funcionando na mesma rede.

### Qual caminho usar

| Caminho | Custo | O que cada jogador faz | Quando usar |
|---|---|---|---|
| Só STUN (padrão atual) | zero | nada | Primeiro teste. Duas casas com internet fixa comum costumam ligar direto. |
| Rede virtual: Radmin VPN, ZeroTier ou Tailscale | zero, sem limite de dados | instala o programa e entra na mesma rede virtual antes de jogar | Quando o STUN falhar. Para o navegador, todos ficam na mesma rede e a ligação é direta. Ainda não testado com o jogo. |
| TURN da Cloudflare (opção 2 abaixo) | grátis até 1000 GB/mês | nada | Quando o jogo tiver mais gente e ninguém quiser instalar programa. A chave fica escondida no Worker. |
| TURN do Metered (opção 1 abaixo) | 500 MB/mês sem cartão; 20 GB/mês com cartão | nada | Solução rápida. A chave fica visível no site. |

### Quanto o TURN consome

O TURN só entra quando a ligação direta falha. Aí todo o tráfego daquele jogador passa pelo servidor e conta na franquia.

O anfitrião manda o estado dos 8 karts 20 vezes por segundo (`js/network.js`, `afterStep`). Cada envio leva 21 campos numéricos por kart, com 4 casas decimais, além de itens e caixas: de 3 a 4 KB. Isso dá cerca de 60 a 80 KB/s, ou uns 250 MB por hora para cada amigo retransmitido. A conta saiu do código e ainda não foi medida. O painel do provedor mostra o consumo real depois da primeira partida.

Com 500 MB, a franquia rende cerca de 2 horas com um amigo retransmitido, ou 40 minutos com três. Arredondar os números, mandar só os campos que mudaram e baixar para 15 envios por segundo deve reduzir esse volume de 5 a 10 vezes. Não foi implementado.

### Estado em 24/09/2026

- O jogo publicado usa só STUN (`iceUrl` vazio). Plano: testar assim com os amigos e partir para a rede virtual ou o TURN apenas se a ligação falhar.
- Existe uma conta no Metered com o app `jkjogos`, no plano Global de 500 MB sem cartão (renova todo dia 24), e a credencial `kart`. A chave não foi publicada. Ela fica no painel em **TURN Server → Credenciais TURN → Mostrar chave da API**.
- Deixar o repositório privado não esconde a chave. No plano grátis do GitHub, repositório privado tira o GitHub Pages do ar. Nos planos pagos o site continua público, e o navegador de cada jogador precisa baixar a chave para conectar.

### Opção 1: Metered (mais simples, 20 GB por mês grátis)

1. Crie uma conta em [metered.ca](https://www.metered.ca/tools/openrelay/) e um app TURN.
2. No painel, copie o endereço de credenciais, no formato `https://SEUAPP.metered.live/api/v1/turn/credentials?apiKey=SUA_CHAVE`.
3. No GitHub, abra `js/online-config.js`, clique no lápis e cole o endereço entre as aspas de `iceUrl`. Salve com **Commit changes**.

A chave fica visível no site. Quem copiar consegue gastar a sua franquia, mas não acessa mais nada da conta. Só consome franquia o jogador que não conseguiu ligação direta; o consumo aparece no painel do Metered.

### Opção 2: Cloudflare (1000 GB por mês grátis, chave escondida)

1. No painel da Cloudflare, abra **Realtime → TURN** e crie uma chave. Guarde o ID e o token.
2. Em **Workers**, crie um Worker e cole o conteúdo de `ferramentas/turn-cloudflare-worker.js`.
3. Em **Settings → Variables**, cadastre os secrets `TURN_KEY_ID` e `TURN_KEY_TOKEN`.
4. Se o jogo não estiver em `https://joaokm.github.io`, troque `ORIGEM` no Worker.
5. Cole o endereço do Worker (`https://NOME.SUBDOMINIO.workers.dev/`) em `iceUrl`.
6. Em **Security → WAF → Rate limiting rules**, limite o endereço do Worker a 10 pedidos por minuto por IP. O Worker recusa pedidos que não vêm do jogo, mas um script consegue imitar o navegador; o limite impede que alguém gaste a cota em loop.
7. Crie um alerta de uso em **Notifications** para saber se o consumo disparar.

Na opção 1, cadastre no `iceUrl` só a chave da rota de credenciais, nunca a chave secreta da conta. Se o painel do Metered oferecer restrição de domínio ou validade da credencial, ative.

## Teste após publicar

- Abra em dois navegadores ou aparelhos diferentes.
- Crie a sala em um e entre pelo convite no outro.
- Confira se os dois aparecem antes de largar.
- Teste uma corrida inteira e o retorno à sala.
- Teste quatro pessoas em redes distintas antes de anunciar disponibilidade geral.

Os testes locais já verificam quatro conexões reais, mas não representam todos os roteadores e condições de internet.
