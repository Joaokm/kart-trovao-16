# Estado da entrega · Grand Tour

## Escopo

Roadmap de fases 0–7 implementado. Extra solicitado: salas com dois a quatro amigos e IA completando oito karts. [Jogo publicado no GitHub Pages](https://joaokm.github.io/kart-trovao-16/) e [código público](https://github.com/Joaokm/kart-trovao-16).

## Testes executados

- Oito grupos da regressão original passaram, incluindo geometria original, determinismo, progresso em ré, colisões junto ao muro e corridas de seis e oito karts.
- Onze grupos do upgrade passaram. Foram **240 corridas** com oito karts, cobrindo todas as 30 pistas, quatro dificuldades e dois sentidos. Todos terminaram.
- Compras, limite de peças, validação de saves, pontuação, retomada, desbloqueios, recompensas sem duplicação, interpolação do fantasma e novos itens foram verificados.
- No navegador real, os menus, compra pela interface, corrida até o resultado, contrarrelógio, fantasma na segunda tentativa, pausa, foto e geração de PNG passaram.
- No teste online real, quatro jogadores conectaram por WebRTC. O quinto foi recusado. Controles chegaram ao anfitrião, posições retornaram ao convidado, a IA assumiu uma desconexão, resultados coincidiram, a sala pôde ser reutilizada e a saída do anfitrião foi comunicada.

Os testes de navegador usam instâncias isoladas com saves em memória. As conexões WebRTC foram realizadas entre instâncias no mesmo computador; ainda é necessário testar com amigos em redes diferentes.

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

## Limites conhecidos

- Online depende de PeerServer Cloud e da viabilidade da conexão WebRTC. Entre redes diferentes, quando a ligação direta falha, é preciso preencher `iceUrl` em `js/online-config.js` com um TURN (Metered ou Cloudflare, passo a passo no PUBLICAR.md). Sem isso, a reserva é o TURN público do PeerJS, que costuma estar fora do ar.
- GP online (22/09/2026): testado com 4 jogadores reais em 4 corridas no mesmo computador, incluindo saída no meio e atrasado recusado. Falta testar com amigos em redes diferentes.
- Em 24/09/2026 ficou decidido testar primeiro só com STUN, sem publicar chave de TURN. Há uma conta no Metered pronta como reserva (500 MB por mês, sem cartão). Alternativas, consumo estimado e o estado da conta estão no PUBLICAR.md, na seção "Jogar entre redes diferentes".
- O anfitrião deve manter a aba aberta e em primeiro plano. Não há migração de anfitrião nem retorno durante uma corrida já iniciada.
- Gamepad foi implementado para o mapeamento padrão. A confirmação com controle físico depende de hardware disponível.
- Save é local ao navegador, com exportação/importação manual; não há conta nem sincronização em nuvem.

## Recuperação

A versão anterior está preservada localmente em `backups/pre-upgrade-fase0.zip`, fora do repositório público.
