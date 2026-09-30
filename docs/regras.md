# Regras implementadas

Variação sequencial do Burro, escolhida por ser a mais simples de sincronizar via Bluetooth.

## Baralho e distribuição
- A cada mão, embaralha-se o baralho padrão de **52 cartas** (A, 2, 3 … 10, J, Q, K; quatro naipes).
- São distribuídas **4 cartas por jogador**; as demais ficam fora daquela mão. A distribuição garante uma quadra possível e inclui pelo menos um valor além de A e 2.
- Cada jogador vê somente as próprias cartas.
- A ordem dos jogadores é a ordem de entrada na sala (anfitrião primeiro).

## Rodadas (passar cartas)
1. O jogador da vez escolhe uma carta da mão e a **envia ao próximo** da ordem; ele passa a ter uma carta a menos e o próximo, uma a mais.
2. A vez passa ao próximo, que agora escolhe uma de suas cartas (inclusive a recebida) e envia ao seguinte.
3. O último envia ao primeiro, e a volta recomeça. Cada jogador sempre recebe do anterior e envia ao seguinte.
4. Jogadas fora do turno, com carta que o jogador não tem ou com a partida pausada são recusadas pelo anfitrião.

## Bater
- Quem tiver **4 cartas do mesmo valor** pode tocar em **BATER** a qualquer momento (não precisa ser a sua vez).
- Depois do primeiro, os demais precisam tocar em BATER também (sem precisar de quadra).
- Quando só resta **um jogador sem bater**, a mão termina e ele é o **penalizado**: ganha uma letra de **B-U-R-R-O**.
- O primeiro a bater soma uma "vitória de mão" (usada no desempate).
- A mão seguinte é embaralhada e distribuída de novo; **quem começa gira** a cada mão.

## Fim da partida e resultado
- A partida termina quando um jogador completa **BURRO** (5 letras). Esse jogador é o **penalizado (burro)**.
- **Vencedor:** quem mais vezes bateu primeiro; empate → quem tem menos letras; persistindo → ordem de jogo.
- Outros encerramentos, todos registrados no histórico com o motivo:
  - `ABANDONO`: um jogador saiu durante a partida (status *interrompida*).
  - `DESCONEXAO`: um jogador ficou 60 s sem reconectar (status *interrompida*).
  - `CANCELADA_PELO_ANFITRIAO`: o anfitrião saiu durante a partida (status *cancelada*).
- Nesses casos o vencedor/penalizado são calculados com as letras e vitórias acumuladas até ali.

## Desconexão
- Sem sinal por 15 s, o anfitrião marca o jogador como desconectado e **pausa** a partida.
- O jogador pode voltar (mensagem `RECONEXAO`) e recebe estado e mão de novo. Depois de 60 s a partida é interrompida.
- Na sala de espera, quem perde a conexão simplesmente sai da sala.
