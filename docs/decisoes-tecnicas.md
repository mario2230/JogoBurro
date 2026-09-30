# Decisões técnicas

| Decisão | Motivo |
|---|---|
| **BLE com anfitrião peripheral + convidados central** | Permite vários jogadores (até 5) numa topologia em estrela sem que todos se conectem a todos. |
| **`@capacitor-community/bluetooth-le` (central) + `cordova-plugin-ble-peripheral` (peripheral)** | O plugin do Capacitor só implementa o papel central. O plugin Cordova cria o servidor GATT e funciona no Capacitor via `window.blePeripheral`. |
| **Anfitrião como fonte da verdade** | Evita estado inconsistente: só ele embaralha, valida turno/jogada e distribui as mãos. |
| **Domínio puro em `src/domain`** | Regras testáveis com Vitest, sem depender de Ionic, Capacitor ou Bluetooth. |
| **Estado imutável** (funções `estado → estado`) | Facilita testar e evita alterações parciais. |
| **Estado público sem mãos** | Cada jogador só recebe a própria mão (`MAO_ATUALIZADA` com `destinatarioId`). |
| **zod para validar mensagens** | Nada altera o estado antes de a mensagem ser validada. |
| **`token` + `seq` por jogador** | Impede que outro aparelho se passe por um jogador e descarta duplicatas. |
| **Fragmentação com pacote fixo de 20 bytes** | Funciona com o MTU padrão sem negociação (mais compatível). |
| **Ids curtos (8 caracteres)** | Mensagens menores = menos pacotes BLE. |
| **PING a cada 5 s e limite de 15 s** | O plugin peripheral não avisa quando um central desconecta; o anfitrião infere pela ausência de sinal. |
| **Pausa em vez de cancelar na desconexão** | Permite reconexão (60 s) como pede o documento. |
| **SQLite** (`@capacitor-community/sqlite`) para histórico e **Preferences** para o perfil | Requisito de persistência local; duas tabelas (`partidas`, `participantes`) com exclusão em cascata. |
| **`localStorage` apenas no navegador** | SQLite nativo não roda no `vite dev`; mantém a mesma interface (`RepositorioHistorico`). |
| **Simulador com BroadcastChannel** | Desenvolver telas e regras sem dois celulares. |
| **Sem fontes externas** | O app precisa funcionar sem internet. |
| **Pinia** | Estado reativo simples entre as telas. |
