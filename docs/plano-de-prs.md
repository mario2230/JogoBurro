# Plano de Pull Requests

Um integrante cria o repositório com um commit inicial (README + `.gitignore`). Depois, **cada integrante entra o código por Pull Requests** na sua área, com revisão cruzada. Cada um deve conseguir **explicar oralmente** o que fez e o resto do fluxo.

| Integrante | Foco | PRs sugeridos |
|---|---|---|
| 1. Bluetooth | `src/services/bluetooth/`, `sessao-*.ts`, `docs/protocolo.md`, `docs/permissoes.md` | `feat/config-projeto` (package.json, vite, capacitor, scripts) → `feat/transporte-ble` → `feat/sessoes` |
| 2. Domínio e jogo | `src/domain/`, `tests/`, `JogoPage`, `ResultadoPage`, `docs/regras.md` | `feat/dominio` → `feat/testes-dominio` → `feat/tela-jogo` |
| 3. Persistência e UI | `repositorio.ts`, `preferencias.ts`, `stores/`, `views/` (demais telas), `theme/`, README | `feat/persistencia` → `feat/store-e-rotas` → `feat/telas-fluxo` → `feat/historico` → `docs/readme-final` |

Ordem recomendada de merge: config → domínio → transporte → sessões → store/rotas → telas → histórico → docs.
