# Kart Trovão 16 — Grand Tour

Corrida arcade original em pixel art, com renderização de plano em perspectiva, três copas, 30 circuitos e salas online para até quatro amigos.

## Jogar

Abra `index.html`. O modo solo funciona offline, sem instalação ou build.

Para desenvolvimento, rode `node ferramentas/serve.js` e abra `http://127.0.0.1:8080`.

## O upgrade

- **30 circuitos** com geometria própria, distribuídos nas copas Faísca, Ciclone e Trovão, com 10 etapas cada. Os 30 também estão disponíveis na Corrida Livre.
- **8 temas**: vulcânico, litoral, floresta, glacial, desértico, noturno, altitude e tempestade. Paletas, cenários laterais e músicas próprios por tema.
- **12 pilotos**, oito disponíveis inicialmente. Iara Fluxo é liberada com cinco vitórias. Dona Brasa, Caio Ciclone e Maestra Raio são os rivais das copas e se tornam selecionáveis após um pódio na respectiva copa.
- **Grid de oito karts**. Massa influencia a transferência de energia e separação nas colisões.
- **IA preditiva**, com distância de frenagem, escolha da linha, ultrapassagem, desvio de obstáculos, procura de caixas e uso contextual de itens.
- **NOVATO, PILOTO, ÁS e LENDA**. LENDA exige vitória nas três copas no ÁS. Nenhuma IA ultrapassa 100% da velocidade permitida ao próprio piloto.
- **Carga Trovão em três níveis**: segurar o drift por 0,85 / 1,75 / 2,7 segundos permite impulsos de 0,6 / 1,05 / 1,55 segundos. HUD com marcas, cores e nível por escrito.
- **Seis itens**: Turbina de Magma, Esfera de Plasma, Poça de Piche, Bolha de Força, Mola Saltadora e Ímã de Reboque.
- **Perigos**: bancos de areia, água, óleo, gelo escorregadio, rochas, gêiseres de lava, rajadas de vento e setores sem proteção lateral com resgate após queda.
- **Campeonatos e save**: 15/12/10/8/6/4/2/1 pontos por chegada. Empates compartilham posição. Pódio libera a copa seguinte, o rival e um bônus. Retomada após cada etapa.
- **Oficina do Dr. Parafuso**: três níveis de Motor, Rodas e Chassi, com efeitos e custos mostrados antes da compra; seis pinturas gratuitas.
- **Contrarrelógio com fantasma**: três voltas, sem itens nem adversários. Peças padrão. Recordes separados por circuito, piloto e sentido.
- **Sentido espelhado**, gamepad padrão, botões de toque, volume, CRT opcional, redução de partículas e modo foto com exportação PNG.
- **Salas online**: dois a quatro amigos, completadas com IA até oito karts. Código de oito caracteres e link de convite. Configuração e largada controladas pelo anfitrião.

## Jogar com amigos

1. Todos abrem o mesmo endereço público do jogo.
2. O anfitrião abre **Jogar com amigos**, informa apelido e piloto, escolhe pista/dificuldade/voltas e clica em **Criar sala**.
3. Compartilha o código ou **Copiar convite**.
4. Os amigos abrem o convite ou usam **Entrar na sala**.
5. Com pelo menos duas pessoas na sala, o anfitrião clica em **Iniciar corrida**.

Até quatro humanos participam. A IA preenche os lugares restantes. Peças padrão para todos. Quem desconectar é substituído por IA; se o anfitrião sair, a conexão termina para todos. Depois do resultado, o anfitrião pode voltar à mesma sala e iniciar outra partida.

O jogo usa WebRTC e sinalização do PeerServer Cloud. A simulação roda no anfitrião; os convidados enviam controles e recebem posições e resultados. Não há câmera, microfone, cadastro ou chat. Mantenha a aba do anfitrião em primeiro plano. O modo online não pausa.

**Limites:** internet e disponibilidade do serviço de sinalização são necessárias. Redes que impedem conexão direta podem exigir TURN. A opção de servidor próprio fica em `js/online-config.js`. Não existe migração automática de anfitrião nem reconexão no meio da corrida; entre novamente quando a sala voltar ao lobby. O modo solo continua funcionando sem esses serviços.

**127.0.0.1 e localhost não são links públicos.** Para jogar de computadores em redes diferentes, publique o jogo. Veja `PUBLICAR.md`.

## Controles

| Entrada | Ação |
|---|---|
| Setas / WASD | Acelerar, frear, virar e dar ré |
| Espaço / Shift | Derrapar e acumular Carga Trovão |
| Ctrl / Z | Usar item |
| Enter | Confirmar / continuar |
| Esc / P | Pausa; Esc de novo sai para o menu (solo) |
| C | Modo foto (solo): setas ajustam a câmera, Enter salva PNG |
| F / M | Tela cheia / silenciar |
| Gamepad A / B | Acelerar / frear; confirmar / voltar nos menus |
| Gamepad X / LB ou RB | Item / derrapagem |
| Gamepad Start | Pausar / continuar no solo |

Largada relâmpago: acelere no último instante da contagem. Menus também aceitam Tab, Enter, mouse e controle. Em telas de toque há botões sob o jogo.

## Save e progressão

O progresso fica no `localStorage` deste navegador, chave `kart-trovao-16-v2`. Em **Opções**, exporte ou importe um JSON. Importar substitui o progresso atual. Em navegadores com armazenamento bloqueado, a sessão continua em memória e o menu orienta a exportação.

A mesma semente reproduz a simulação. `rngSim` e `rngVis` separam resultado e aparência. Testes automáticos não alteram o save do jogador. Os testes de navegador usam saves próprios em memória.

## Validação

```
node ferramentas/qa.js             # regressão e métricas em 8 sementes
node ferramentas/qa.js --rapido    # regressão em 2 sementes
node ferramentas/qa-upgrade.js     # 240 corridas + progressão, save, fantasma e itens
```

Com o servidor local ativo, abra `/ferramentas/qa-browser.html` para os testes dos menus e do online real. A bateria online cria uma sala temporária com quatro jogadores WebRTC, tenta um quinto, verifica controles, sincronização, IA na desconexão, resultados e retorno ao lobby.

Os relatórios ficam em `ferramentas/relatorios/`. `STATUS-UPGRADE.md` registra o resultado da entrega. O Circuito Vulcano original mantém os hashes de geometria e terreno da referência.

## Organização

| Arquivo | Responsabilidade |
|---|---|
| `js/content.js` | Catálogo das 30 pistas, temas, copas e dificuldades |
| `js/career.js` | Save validado, economia, campeonatos e fantasmas |
| `js/track.js` | Geometria, textura, objetos, perigos e terreno |
| `js/scenery.js` | Cenários e silhuetas por tema |
| `js/kart.js` / `js/ai.js` | Física, progresso, colisões, IA e efeitos de terreno |
| `js/items.js` | Sorteio e simulação de itens |
| `js/game.js` | Simulação, renderização, câmera e fluxo da corrida |
| `js/ui.js` / `css/style.css` | Menus responsivos e acessíveis |
| `js/controls.js` | Gamepad e toque |
| `js/network.js` | Salas, protocolo, controles remotos e sincronização |
| `js/online-config.js` | Configuração opcional de sinalização e TURN |
| `js/vendor/` | PeerJS 1.5.5, licença MIT; carregado somente no online |
| `js/audio.js` / `js/sprites.js` / `js/hud.js` | Música, pixel art e HUD |
| `js/mode7.js` / `js/utils.js` | Renderizador, entrada e utilitários |

Scripts clássicos compartilham `KT` para funcionar por `file://`. Não existe framework nem dependência de build.

## Roadmap entregue

| Fase | Estado |
|---|---|
| 0 · Fundação, sementes, QA e correções | Preservada |
| 1 · IA e dificuldades | Implementada |
| 2 · Pistas como dados, temas e Corrida Livre | Implementada com 30 pistas |
| 3 · Copas, save e Copa Faísca | Implementada |
| 4 · Pilotos, rivais e massa | Implementada |
| 5 · Perigos, itens e Copa Ciclone | Implementada |
| 6 · Oficina, fantasma e Copa Trovão | Implementada |
| 7 · Temas musicais, controle, opções e foto | Implementada |
| Extra solicitado · Online para 4 amigos + IA | Implementado; publicação depende do repositório |

Versão anterior preservada em `backups/pre-upgrade-fase0.zip`.

Personagens, nomes, traçados, pixel art e músicas são originais do projeto. A biblioteca de conectividade PeerJS é de terceiros e sua licença está incluída.
