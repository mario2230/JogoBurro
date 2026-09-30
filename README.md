# Burro Bluetooth

Jogo de cartas **Burro** para 2 a 5 jogadores, feito em **Vue 3 + Ionic + Capacitor**. Cada jogador usa um celular e a partida acontece por **Bluetooth Low Energy**, sem internet.

## Identificação da atividade

- **Curso:** _(preencher: nome do curso)_
- **Unidades curriculares e indicadores**
  - **Codificar acesso à web services e recursos de sistemas móveis**
    - Integra recursos nativos do dispositivo, de acordo com as necessidades do aplicativo e as características do sistema mobile. → Bluetooth LE (central e peripheral), permissões em tempo de execução, vibração (Haptics), Preferences.
    - Aplica correções e melhorias a partir da validação e depuração do código de integração dos webservices, conforme necessidades do projeto. → O documento de requisitos exige funcionamento offline e não define API; a validação e depuração foram aplicadas à camada de integração Bluetooth (protocolo, fragmentação, reconexão). _(confirmar com o professor)_
  - **Codificar aplicações para dispositivos móveis**
    - Aplica recursos da biblioteca do sistema mobile de acordo com necessidades do aplicativo. → Ionic Vue (páginas, alertas, toasts, roteamento), Capacitor.
    - Programa persistência local de dados utilizando arquivos e banco de dados portáveis de acordo com as necessidades do sistema. → SQLite (histórico) e Preferences (perfil).
- **Integrantes**

| Nome | GitHub |
|---|---|
| _Integrante 1_ | https://github.com/usuario1 |
| _Integrante 2_ | https://github.com/usuario2 |
| _Integrante 3_ | https://github.com/usuario3 |

## Como o jogo funciona

Resumo (regras completas em [docs/regras.md](docs/regras.md)):

1. Um jogador **cria a partida** (anfitrião); os outros **procuram** e pedem entrada. O anfitrião aceita ou recusa.
2. Com 2 a 5 jogadores, o anfitrião inicia. Cada um recebe **4 cartas** do baralho de 52 (só você vê as suas).
3. Em cada rodada, o **jogador da vez** escolhe uma carta e a **envia ao próximo**. Ele recebe de quem jogou antes.
4. Quem juntar **4 cartas do mesmo valor** toca em **BATER**. Os demais precisam bater em seguida.
5. O **último a bater** ganha uma letra de **B-U-R-R-O**. Quem completar BURRO é o burro e a partida termina.
6. Depois de cada mão, o baralho é embaralhado e distribuído novamente. O vencedor é quem mais vezes bateu primeiro (desempate: menos letras).

## Como jogar

1. Abra o app e informe seu nome.
2. **Anfitrião:** _Criar partida_ → aguarde os pedidos na sala → _Aceitar_ → _Iniciar partida_.
3. **Convidados:** _Procurar partidas_ → toque na partida → aguarde o anfitrião aceitar.
4. Na sua vez, toque em uma carta e em _Enviar carta escolhida_.
5. Ao ter 4 cartas iguais, toque em **BATER!**
6. Consulte as partidas anteriores em _Histórico_.

## Instalação, execução e teste

Pré-requisitos: Node.js 20+ (recomendado 22), Android Studio (SDK 34+ e JDK 21), **2 ou mais celulares Android com Bluetooth LE** e depuração USB ligada. Bluetooth não funciona em emulador.

```bash
npm install
npm test                 # testes da lógica, do protocolo e da sessão (Vitest)
npm run setup:android    # cap add android + permissões no manifesto + build + sync
npm run android          # build + sync + instala no celular conectado
```

Repita `npm run android` em cada celular (`npx cap run android --target <id>`; veja os ids com `npx cap run android --list`).

**Desenvolvimento sem celulares:** `npm run dev` abre o app no navegador e o **simulador** usa BroadcastChannel para conectar abas do mesmo navegador (uma cria a partida, as outras procuram). Serve para telas e regras; **não** testa Bluetooth de verdade.

Detalhes de permissões: [docs/permissoes.md](docs/permissoes.md). Roteiro de testes manuais: [docs/testes.md](docs/testes.md).

## Estrutura

```
src/domain/     regras puras (sem Ionic/Capacitor): tipos, baralho, regras, protocolo, fragmentação
src/services/   bluetooth (anfitrião BLE peripheral, convidado BLE central, simulador), sessões, SQLite
src/stores/     estado da interface (Pinia)
src/views/      9 telas obrigatórias
tests/          testes automatizados
docs/           regras, protocolo e diagrama, decisões técnicas, permissões, testes, plano de PRs
```

## Como contribuir

1. Faça fork/clone e crie uma branch a partir da `main`: `feat/nome-curto` (ex.: `feat/historico`).
2. Commits pequenos e em português no imperativo ("Adiciona validação de turno").
3. `npm test` e `npm run build` precisam passar antes do PR.
4. Abra um **Pull Request** para a `main` usando o modelo do repositório; outro integrante revisa e aprova.
5. Sugestão de divisão em [docs/plano-de-prs.md](docs/plano-de-prs.md).

## Limitações conhecidas

- **Só o anfitrião mantém o estado.** Se o anfitrião fechar o app ou perder a conexão, a partida termina para todos (não há migração de anfitrião).
- **As mãos trafegam pelo mesmo canal BLE.** O anfitrião envia a mão de cada jogador com `destinatarioId` e os demais aparelhos a descartam, mas um cliente modificado poderia lê-la. Aceitável para um jogo entre amigos; a solução seria uma característica GATT por jogador.
- **Mensagens são fragmentadas em pacotes de 20 bytes** (MTU padrão) e enviadas com pausa de 25 ms; atualizações grandes (5 jogadores) levam cerca de 1 s.
- **Reconexão:** tenta 5 vezes e o anfitrião espera 60 s antes de interromper a partida.
- **Anúncio da partida:** em alguns Android o nome do anfitrião não cabe no pacote de anúncio; a lista mostra "Partida de Burro" e o nome real aparece na sala.
- **iOS:** o código não usa APIs exclusivas do Android, mas o app só foi preparado e documentado para Android.
- **Web services:** o requisito manda funcionar sem internet; não há chamadas de API.
- **Histórico no navegador** usa `localStorage` (apenas desenvolvimento); no celular usa SQLite.

## Checklist de features

Marque a coluna "Testado em 2+ aparelhos" à medida que validar no celular.

| Feature | Implementada | Testado em 2+ aparelhos |
|---|---|---|
| Identificação do jogador (nome + id único) | [x] | [ ] |
| Criar partida / anfitrião | [x] | [ ] |
| Procurar partidas via Bluetooth | [x] | [ ] |
| Anfitrião aceita ou recusa jogadores | [x] | [ ] |
| Sair da sala (com confirmação) | [x] | [ ] |
| Sala de espera com jogadores conectados | [x] | [ ] |
| Iniciar com 2 a 5 jogadores | [x] | [ ] |
| Permissões e Bluetooth desligado tratados | [x] | [ ] |
| Mensagens com formato definido e validação (zod) | [x] | n/a |
| Baralho, embaralhar e distribuir 4 cartas | [x] | [ ] |
| Cada jogador vê só as próprias cartas | [x] | [ ] |
| Indicação da vez, de quem recebe e para quem envia | [x] | [ ] |
| Escolher, confirmar e enviar carta | [x] | [ ] |
| Bloqueio de jogada fora do turno | [x] | [ ] |
| Detecção de 4 cartas iguais e BATER | [x] | [ ] |
| Letras de BURRO, vencedor e penalizado | [x] | [ ] |
| Resultado e nova partida | [x] | [ ] |
| Desconexão informada e partida pausada | [x] | [ ] |
| Reconexão com o mesmo jogador | [x] | [ ] |
| Histórico salvo automaticamente (SQLite) | [x] | [ ] |
| Detalhes, exclusão individual e limpar tudo (com confirmação) | [x] | [ ] |
| Funciona sem internet | [x] | [ ] |
| Vibração ao receber a vez (Haptics) | [x] | [ ] |
| Testes automatizados da lógica | [x] | n/a |
| Vídeo curto de uma partida completa | [ ] | [ ] |

## Prints e GIFs

_Adicione aqui imagens em `docs/img/` e referencie: `![Sala de espera](docs/img/sala.png)`._

## Documentação

- [Regras implementadas](docs/regras.md)
- [Protocolo e diagrama de comunicação](docs/protocolo.md)
- [Decisões técnicas](docs/decisoes-tecnicas.md)
- [Permissões](docs/permissoes.md)
- [Testes](docs/testes.md)
- [Plano de Pull Requests](docs/plano-de-prs.md)
