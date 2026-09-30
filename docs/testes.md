# Testes

## Automatizados (`npm test`)
| Arquivo | Cobre |
|---|---|
| `tests/regras.test.ts` | sala (2 a 5 jogadores, recusa de 6º/duplicado), distribuição, troca de cartas, **bloqueio fora do turno**, quatro iguais, letras BURRO, fim de partida, vencedor/penalizado, pausa por desconexão |
| `tests/protocolo.test.ts` | validação do exemplo do documento, rejeição de mensagens inválidas, fragmentação (≤ 20 bytes, fora de ordem, UTF-8, remetentes distintos) |
| `tests/sessao.test.ts` | integração anfitrião ↔ convidados em memória: criação, entrada de vários jogadores, recusa, mãos privadas, jogada fora do turno, sincronização, token inválido, BATER, desconexão e reconexão |

## Manuais em 2+ celulares (marque no README)
| # | Teste | Como | Esperado |
|---|---|---|---|
| 1 | Criação | A: Criar partida | A na sala como anfitrião |
| 2 | Entrada de 2º jogador | B: Procurar → tocar na partida → A aceita | B aparece na sala de A e de B |
| 3 | Vários jogadores | C, D entram | até 5 na lista |
| 4 | Recusa | E pede entrada, A recusa | E vê a recusa |
| 5 | Distribuição | A inicia | cada um vê 4 cartas, ninguém vê as dos outros |
| 6 | Troca | jogador da vez envia carta | próximo recebe; vez avança em todos |
| 7 | Fora do turno | fora da vez, os botões ficam desabilitados; forçar por mensagem manual gera `ERRO` | nada muda |
| 8 | Quatro iguais | forçar quadra (ou jogar até acontecer) | botão BATER habilita |
| 9 | Finalização | 5 mãos com o mesmo perdedor | tela de resultado com vencedor e burro |
| 10 | Desconexão | desligar o Bluetooth de um convidado | aviso e partida pausada |
| 11 | Reconexão | religar em menos de 60 s | partida retoma com a mesma mão |
| 12 | Histórico | terminar a partida | aparece em Histórico |
| 13 | Detalhes | tocar na partida | data, participantes, ordem, motivo |
| 14 | Exclusão | excluir uma / limpar tudo | pede confirmação e apaga |
| 15 | Persistência | fechar e abrir o app | histórico permanece |
| 16 | Sem internet | modo avião com Bluetooth ligado | tudo funciona |

## Dica de depuração
`adb logcat | grep -i -E "BLE|Capacitor|chromium"` ou `chrome://inspect` para o console do WebView. Se a conexão falhar, teste primeiro com um app genérico (nRF Connect) para ver se o serviço `6f2c1a10-…de01` aparece.
