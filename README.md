# Kart Trovão 16 · Grand Tour

Jogo original de corrida arcade em pixel art, no navegador.

**[Jogar agora](https://joaokm.github.io/kart-trovao-16/)**

**30 circuitos · 3 copas · 12 pilotos · até 4 amigos online + IA**

Abra `index.html` para jogar solo offline. Para jogar com amigos, abra a versão publicada, escolha **Jogar com amigos**, crie uma sala e compartilhe o convite. O anfitrião inicia quando todos estiverem conectados.

O upgrade inclui oficina, progressão salva, três níveis de derrapagem, seis itens, perigos, contrarrelógio com fantasma, circuitos espelhados, gamepad e modo foto.

- [Manual e controles](LEIAME.md)
- [Publicação e requisitos do online](PUBLICAR.md)
- [Validação da entrega](STATUS-UPGRADE.md)

## Desenvolvimento

```sh
node ferramentas/serve.js
node ferramentas/qa.js
node ferramentas/qa-upgrade.js
```

Sem instalação de dependências para o modo solo. O online passa pelo servidor de salas em `servidor/` (Cloudflare Worker), que funciona entre redes diferentes; publicação em `PUBLICAR.md`.
