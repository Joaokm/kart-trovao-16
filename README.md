# Kart Trovão 16 · Grand Tour

Jogo original de corrida arcade em pixel art, no navegador.

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

Sem instalação de dependências para o modo solo. O online carrega a cópia incluída de PeerJS 1.5.5 (MIT), usa sinalização pública e depende de conexão WebRTC entre os participantes. Redes restritas podem exigir TURN; detalhes em `PUBLICAR.md`.
