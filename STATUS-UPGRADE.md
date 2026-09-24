# Estado da entrega · Grand Tour

## Escopo

Roadmap de fases 0–7 implementado. Extra solicitado: salas com dois a quatro amigos e IA completando oito karts. [Jogo publicado no GitHub Pages](https://joaokm.github.io/kart-trovao-16/) e [código público](https://github.com/Joaokm/kart-trovao-16).

## Testes executados

- Oito grupos da regressão original passaram, incluindo geometria original, determinismo, progresso em ré, colisões junto ao muro e corridas de seis e oito karts.
- Onze grupos do upgrade passaram. Foram **240 corridas** com oito karts, cobrindo todas as 30 pistas, quatro dificuldades e dois sentidos. Todos terminaram.
- Compras, limite de peças, validação de saves, pontuação, retomada, desbloqueios, recompensas sem duplicação, interpolação do fantasma e novos itens foram verificados.
- No navegador real, os menus, compra pela interface, corrida até o resultado, contrarrelógio, fantasma na segunda tentativa, pausa, foto e geração de PNG passaram.
- No teste online real (ainda com WebRTC, antes do servidor de salas), quatro jogadores conectaram. O quinto foi recusado. Controles chegaram ao anfitrião, posições retornaram ao convidado, a IA assumiu uma desconexão, resultados coincidiram, a sala pôde ser reutilizada e a saída do anfitrião foi comunicada.

Os testes de navegador usam instâncias isoladas com saves em memória. Essas conexões foram entre instâncias no mesmo computador.

Em 22/09/2026, a publicação foi confirmada pelo GitHub Pages. No endereço público HTTPS, uma segunda aba entrou pelo convite e ambas iniciaram a corrida. Renderização conferida e nenhum erro ou aviso registrado no console do anfitrião nessa verificação.

## IA no Circuito Vulcano

Comparação de oito sementes com seis karts e três voltas. O comportamento inclui a nova IA e os novos itens.

| Métrica | Fundação anterior | Grand Tour |
|---|---:|---:|
| Volta média | 18,36 s | 16,92 s |
| Tempo fora da pista | 7,7% | 0,5% |
| Tempo em contato com outro kart | 23,1% | 11,0% |
| Escudos usados sem esfera próxima | 96% | 0% |
| Cargas nível 1 liberadas | 1 | 386 |
| Cargas nível 2 liberadas | 0 | 6 |
| Contatos com muro por volta | 0 | 0 |

## Fases 1 e 2 do upgrade de jogabilidade (24/09/2026)

O dono achou o kart rápido demais e a corrida curta. Mudanças:

- **Fase 1, velocidade:** máxima 305→250, aceleração 185→150, freio 300→260. A IA lê `Kart.TOP` e a Esfera de Plasma caiu para 360.
- **Fase 2, pistas:** os 30 traçados ficaram 2× maiores (`ESCALA` em `js/track.js`) e a pista 15% mais larga (`LARGURA`). A textura cresce com a pista, até 2752 px. Distâncias medidas em amostras (IA, grid, faixa de turbo, decoração) foram convertidas pela escala. O save passou para v3 e migra o v2 sem os recordes. O online subiu para `VERSION=4`, e o tempo-limite do GP passou a ser 300 s ou 60 s + 75 s por volta, o que for maior.

| Métrica (Circuito Vulcano, 6 karts) | Antes (2 sementes) | Fase 1 (8) | Fase 2 (8) |
|---|---:|---:|---:|
| Volta média da IA | 17,46 s | 18,23 s | 29,5 s |
| Fora da pista | 0,6% | 0,7% | 0,3% |
| Contato com outro kart | 17,7% | 8,9% | 4,3% |

A regressão compara o Vulcano com escala 1 e largura 1 contra a referência original, com os mesmos hashes. As 240 corridas terminam.

## Fase 3: pilotos animais (24/09/2026)

Os 12 pilotos viraram animais, cada um com veículo, peso, velocidade de Carga Trovão e uma passiva própria. Os índices 0–11 não mudaram, e o save e o GP online continuam compatíveis. Os dados ficam em `KT.DRIVERS` e `KT.PASSIVAS` (`js/kart.js`). A arte nova entra na fase 4.

| # | Piloto | Animal · veículo | Passiva |
|---|---|---|---|
| 0 | Zeca Turbo | Leão · Muscle car Juba | Juba de Aço: perde 20% menos velocidade nas trombadas |
| 1 | Luna Volt | Raposa · Esportivo Cauda de Fogo | Faro: pega caixas 30% mais de longe |
| 2 | Kika Neon | Coelha · Buggy Cenoura | Salto de Largada: janela maior para a largada relâmpago |
| 3 | Bruto Ferro | Rinoceronte · Trator Blindado | Casco Grosso: grama e cinzas seguram 20% menos |
| 4 | Dr. Parafuso | Castor · Engenhoca de Madeira | Mãos de Mecânico: sai do rodopio 25% mais rápido |
| 5 | Tainá Vento | Arara · Planador de Folhas | Asas: o vento empurra 60% menos |
| 6 | Bento Maré | Tartaruga-marinha · Hidroplano Casco | Nadador: água e areia seguram metade |
| 7 | Nara Polar | Pinguim · Trenó Polar | Trenó: gruda no gelo e não perde velocidade nele |
| 8 | Iara Fluxo | Boto-cor-de-rosa · Jet-ski Anfíbio | Anfíbio: a água quase não segura |
| 9 | Dona Brasa | Dragão-de-komodo · Kart Fornalha | Pele de Brasa: lava só desacelera, sem rodopio |
| 10 | Caio Ciclone | Falcão · Aerokart de Asas | Mergulho: faixas de turbo empurram 25% mais tempo |
| 11 | Maestra Raio | Onça-pintada · Kart Relâmpago | Bote: a Carga Trovão mais rápida do grid |

Equilíbrio medido com cada piloto sozinho, IA no volante, nível ÁS, 3 voltas numa pista de cada perigo (9 pistas). O tempo em relação à média vai de −3,9% (rinoceronte) a +4,3% (castor). Com os pilotos antigos, a mesma medição dava de −4,5% a +5,3%. A medição não inclui trombadas nem itens, onde os leves e as passivas de corrida contam a favor.

## Fase 4: arte dos animais (24/09/2026)

`js/animais.js` desenha cada piloto e veículo por código, numa grade de caracteres com contorno automático, em 32×24 (antes 24×16), com cinco vistas e retrato 24×24. Na pista o kart aparece 15% mais largo e 30% mais alto. A pintura da Oficina muda a cor da lataria; o pelo do animal não muda. A galeria em `ferramentas/galeria-pilotos.html` mostra todas as vistas.

O desenho não usa sorteio: o hash de determinismo do QA é o mesmo da fase 3 (`a1101d80`).

## Fase 5: caixas e poderes (24/09/2026)

Muda só a aparência e o som, sem mexer em raio, tempo nem sorteio. `js/itens-arte.js` desenha a caixa como um cubo girando em 8 quadros e 4 tons, com halo pulsante. A caixa reaparece crescendo no último meio segundo e estoura em confete colorido. A Esfera de Plasma ganhou brilho girando e rastro, e o piche ganhou bolhas. Os seis poderes têm ícones novos, e a roleta do HUD mostra os seis passando e freando até o sorteado dar um salto. Mola e Ímã ganharam som próprio e só tocam para o jogador. O hash de determinismo continua `a1101d80`.

## Fase 6: visual da pista, HUD e menus (24/09/2026)

- **Pista:** a grama ganhou faixas de corte em dois tons a cada 10 amostras, e o asfalto um tracejado central. O céu diurno tem nuvens andando devagar e o noturno tem estrelas piscando; com "reduzir movimento" ligado, as duas animações param. Durante o impulso aparecem riscos de velocidade nas laterais, que também respeitam a opção. Andar na grama ou nas cinzas levanta poeira da cor do terreno. Um kart colado na câmera tem a escala limitada a 3,2× e não vira mais um bloco que tapa a tela.
- **HUD:** o retrato do piloto fica ao lado da colocação, com moldura da cor da posição. "MEL" virou "MELHOR". O velocímetro é feito de blocos, que ficam brancos-quentes durante o impulso. O minimapa subiu para baixo da colocação e ficou translúcido, para não cobrir os karts; o jogador aparece por cima, com anel piscando.
- **Menus:** o retrato do piloto passou para 48 px, 2× exato do sprite de 24 (antes 38 px, borrado). A prévia da Oficina está em 4× exato (128×96); antes o sprite era esticado. O foco (`:focus-visible`, contorno de 4 px) e o `prefers-reduced-motion` já existiam e foram conferidos.
- **Ferramentas:** `?demo` ou `?demo=N` no endereço roda uma corrida com a IA no volante, para conferir o visual. `ferramentas/qa-frame.html` não carregava `animais.js` nem `itens-arte.js` desde a fase 4; foi corrigido, e o `qa-upgrade.js` ganhou um teste que compara a lista de scripts dele com a do `index.html`.

QA: 11/11 na regressão e 13/13 no upgrade; o hash de determinismo continua `a1101d80`. No navegador, as baterias solo (17 verificações) e online com 4 jogadores reais (12 verificações) passaram.

## Limites conhecidos

- Online passa pelo servidor de salas em `servidor/` (Cloudflare Worker) desde 24/09/2026, versão de protocolo 5. Depende da cota diária do plano grátis; conta e publicação no PUBLICAR.md.
- GP online (22/09/2026): testado com 4 jogadores reais em 4 corridas no mesmo computador, incluindo saída no meio e atrasado recusado. Falta testar com amigos em redes diferentes.
- Em 24/09/2026 o WebRTC (STUN e depois TURN do Metered) não ligou dois jogadores em redes diferentes. O PeerJS saiu e o online foi para o servidor de salas. Com ele, as baterias online (11) e GP (23) passaram localmente contra `wrangler dev`; falta o teste com amigos em redes diferentes.
- O anfitrião deve manter a aba aberta e em primeiro plano. Não há migração de anfitrião nem retorno durante uma corrida já iniciada.
- Gamepad foi implementado para o mapeamento padrão. A confirmação com controle físico depende de hardware disponível.
- Save é local ao navegador, com exportação/importação manual; não há conta nem sincronização em nuvem.

## Recuperação

A versão anterior está preservada localmente em `backups/pre-upgrade-fase0.zip`, fora do repositório público.
