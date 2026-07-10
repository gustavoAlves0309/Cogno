# Plano de implementação — Leonardo: Codex Vivo

Data: 2026-07-10
Base: `2026-07-10-leonardo-codex-vivo-design.md`

## Decisão arquitetural

Leonardo será uma cena própria, `LeonardoScene`, e não uma conversão prematura de `CleopatraScene` para uma classe-base. A cena da Cleópatra já mistura menu, layout, roteiro, retrato e regras específicas; extrair uma hierarquia agora aumentaria o risco de regressão sem resolver uma necessidade do segundo boss.

O novo boss reutiliza somente os limites já comprovadamente genéricos:

- `PlayerController`, `AttackManager`, `Attack`, `AttackContext` e os limites de arena;
- fluxo de estabilidade, cronômetro, derrota e controles mobile;
- `MemoryAbsorptionVisuals`, que já aceita paleta e selo próprios;
- o padrão de modo real, Lab por fase e vitória da Ultimate no Lab.

Os desenhos de arena, HUD, retrato, ataques e roteiro permanecem específicos de Leonardo. Isso mantém Cleópatra intacta e estabelece limites reutilizáveis reais para o terceiro boss.

Não será criado sistema persistente de desbloqueio nesta entrega. Como Cleópatra já está validada, o nó de da Vinci será habilitado no menu de desenvolvimento atual. Persistência de progresso é uma tarefa separada.

## Arquivos previstos

| Área | Arquivo | Responsabilidade |
|---|---|---|
| Registro e rota | `src/main.ts`, `src/game/scenes/CleopatraScene.ts` | Registrar a nova cena, habilitar o nó de da Vinci e iniciar a cena correta pelo menu. |
| Nova luta | `src/game/scenes/LeonardoScene.ts` | Estado da luta, layout mobile, roteiro, Lab, estabilidade, transições e finais. |
| Roteiro puro | `src/game/scenes/leonardoSchedule.ts` | Definições de fases, janelas fixas, combinações da Ultimate e validação determinística da agenda. |
| Ataques | `src/game/attacks/Leonardo*.ts` | Uma classe por família de estudo, com versões explícitas e cleanup próprio. |
| Visual | `src/game/rendering/LeonardoPortrait.ts`, `LeonardoArenaVisuals.ts`, `LeonardoHudVisuals.ts` | Autor humano, Codex, arena de pergaminho e HUD de perspectiva. |
| Áudio e tipos | `src/game/types.ts`, `src/game/audio/GameAudio.ts` | Cues de Leonardo e perfil de música que não toque faixas da Cleópatra. |

`MemoryAbsorptionVisuals.ts` será reutilizado sem duplicar sua linha do tempo. O selo e o colapso de Leonardo ficam em `LeonardoPortrait.ts`.

## Fase 1 — Entrada no boss e ciclo de vida de cenas

1. Registrar `LeonardoScene` em `src/main.ts` junto de `CleopatraScene`.
2. Alterar a ação do nó de menu selecionado em `CleopatraScene` para despachar por boss: Cleópatra inicia o modo real atual; da Vinci inicia `LeonardoScene`.
3. Habilitar o nó de da Vinci no menu atual, sem alterar o estado do nó de Genghis Khan.
4. Dar a `LeonardoScene` uma ação de Menu que retorna à tela de seleção, preservando a rota para Cleópatra.
5. Adicionar cleanup explícito do listener global de resize ao desligar cada cena que participa da troca. A implementação deve testar repetidas transições Cleópatra → menu → Leonardo → menu para impedir listeners duplicados, gráficos órfãos ou joysticks adicionais.

Critério de pronto:

- Os dois bosses abrem a partir do menu e voltam ao menu sem recarregar a página.
- A cena de Cleópatra continua iniciando e jogando como antes.
- Após dez trocas de cena, um único resize produz um único relayout visível.
- `npm.cmd run build` passa.

## Fase 2 — Casca visual e agenda determinística de Leonardo

1. Criar `LeonardoScene` com o mesmo contrato de controles, arena responsiva, estabilidade, cronômetro e estados `title/menu/real/test/victory/defeat` necessários para a luta.
2. Criar `LeonardoArenaVisuals` com pergaminho, perspectiva, marcas azuis de medição, tinta e correções em carvão vermelho. Não reutilizar `ArenaVisuals`, que contém laje, cartucho e canais egípcios.
3. Criar `LeonardoHudVisuals` com três selos inspirados em perspectiva/olho, mantendo o mesmo posicionamento seguro em telas mobile.
4. Criar `LeonardoPortrait` com estados de observação, esboço, revisão, Codex crescente e colapso de vitória. O retrato mantém Leonardo humano até a dissolução final.
5. Colocar em `leonardoSchedule.ts` os dados de fase e uma função de validação executada em desenvolvimento. Ela deve rejeitar janelas fora da duração, sobreposição de ataques normais, mais de duas famílias ativas na Ultimate e versões não declaradas.

As três fases normais usam exatamente esta agenda de 90 segundos, substituindo apenas estudo primário e complementar:

| Tempo | Janela |
|---|---|
| 0–13 s | primário V1 |
| 13–15 s | observação e correção, sem dano |
| 15–28 s | complementar V1 |
| 28–30 s | observação e correção, sem dano |
| 30–43 s | primário V2 |
| 43–45 s | observação e correção, sem dano |
| 45–58 s | complementar V2 |
| 58–60 s | observação e correção, sem dano |
| 60–74 s | primário V3 |
| 74–76 s | observação e correção, sem dano |
| 76–90 s | complementar V3 |

Leonardo não deve copiar o reset especial de cronômetro que Cleópatra usa para a música da Ultimate. Cada cronômetro do Lab e da Ultimate de Leonardo deve avançar continuamente de `0:00` até sua duração.

Critério de pronto:

- Lab exibe as quatro fases e cada contador termina exatamente em 90/75 segundos.
- As transições não deixam objetos ativos em `AttackManager`.
- A agenda é validada em desenvolvimento antes de iniciar uma fase.

## Fase 3 — Estudos da Fase I: espaço e voo

Implementar as duas primeiras classes com uma configuração de versão explícita (`1 | 2 | 3`) e sem ler a posição atual do jogador para definir geometria:

1. `LeonardoPontoDeFugaAttack`
   - V1: uma cunha estática;
   - V2: duas cunhas sequenciais com pausa;
   - V3: ponto muda somente entre pulsos já finalizados.
2. `LeonardoAsaEmEstudoAttack`
   - V1: uma diagonal;
   - V2: dois passes ligados com pausa no retorno;
   - V3: pivôs previamente desenhados.

Cada ataque cria seus próprios `Graphics`, passa por esboço → telegráfico → ativo → cleanup e remove seus objetos em `destroy`. A tinta escura só coincide com hitbox ativa; a linha fina e as setas nunca causam dano.

Integrar a Fase I ao Lab antes de tocar nas fases seguintes.

Critério de pronto:

- É possível sobreviver a cada versão da Fase I sabendo apenas a leitura exibida.
- O Lab permite repetir a Fase I sem atravessar a luta inteira.
- Nenhum pivô ou ponto de fuga muda durante uma janela ativa.

## Fase 4 — Estudos da Fase II: passagem e máquina

Implementar:

1. `LeonardoPonteSalvadoraAttack`
   - V1: um corredor seguro contínuo;
   - V2: duas comportas alteram o corredor em ordem fixa;
   - V3: metade da ponte retrai após aviso, enquanto a metade segura permanece clara.
2. `LeonardoCarroBlindadoAttack`
   - V1: leque frontal de uma torre;
   - V2: uma reversão de rotação após a primeira sequência;
   - V3: dois canos alternam, cada um com pausa legível.

A ponte determina o corredor por dados fixos de arena. O carro usa ângulo, velocidade e pausas fixos; nunca mira ou persegue o jogador. A Fase II alterna Ponte como estudo primário e Carro como complementar de acordo com a agenda comum.

Critério de pronto:

- A região segura da ponte está marcada antes do fluxo perigoso.
- A reversão do carro e suas aberturas podem ser previstas só pelo telegráfico.
- Trocar ou encerrar a Fase II limpa ponte, água/tinta, carro e todos os hitboxes.

## Fase 5 — Estudos da Fase III: ritmo e percepção

Implementar:

1. `LeonardoValvulaCoracaoAttack`
   - V1: pulso central simples;
   - V2: câmaras alternam o lado perigoso;
   - V3: dois pulsos pequenos antecedem um grande.
2. `LeonardoSfumatoAttack`
   - V1: uma sombra lenta e uma borda iluminada;
   - V2: duas sombras deixam um corredor iluminado;
   - V3: a iluminação muda apenas no intervalo de correção marcado em vermelho.

Sfumato deve aplicar somente um véu de contraste e uma geometria de perigo já telegráfica. O núcleo, os limites da arena, o corredor seguro e qualquer hitbox ativo permanecem distinguíveis em viewport mobile e sob o dedo.

Critério de pronto:

- O ritmo de Válvula pode ser acompanhado visualmente sem áudio.
- Sfumato não reduz contraste a ponto de ocultar estado de jogo.
- Fase III completa e retorno ao Lab deixam zero ataques ativos.

## Fase 6 — Ultimate e absorção de conhecimento

Adicionar a agenda fixa de 75 segundos da Ultimate:

| Tempo | Combinação |
|---|---|
| 0–8 s | Ruptura não danosa do Codex, água/tinta no fundo e redesenho da perspectiva. |
| 8–26 s | Ponto de Fuga V3 + Asa em Estudo V2. A cunha é desenhada antes da rota da asa. |
| 26–30 s | Liberação e correção, sem dano. |
| 30–48 s | Ponte Salvadora V2 + Carro Blindado V2. A ponte trava antes do leque da torre. |
| 48–52 s | Liberação e correção, sem dano. |
| 52–67 s | Válvula do Coração V3 + Sfumato V2. A rota iluminada aparece antes do ritmo. |
| 67–75 s | Uma sequência abreviada de Válvula V3 no mesmo corredor iluminado de Sfumato V2; nenhuma mecânica nova. |

A cena agenda os dois ataques de cada par com offsets definidos; os ataques não consultam nem modificam um ao outro. Isso mantém a composição determinística e torna o timing verificável.

Quando a Ultimate termina no modo real ou no Lab, a cena:

1. limpa todos os ataques e controles;
2. mantém o jogador visível no seu ponto normalizado da arena;
3. usa `MemoryAbsorptionVisuals` com paleta sépia/azul/tinta e selo de Leonardo;
4. desenha o colapso próprio no retrato: páginas se soltam, linhas de perspectiva e espiral convergem, o rosto desaparece por último;
5. preserva `Retry Ultimate` e `Lab` no final isolado, e `Retry` e `Menu` no final real.

Critério de pronto:

- A Ultimate só combina sistemas já ensinados e nunca passa de dois ataques ativos.
- Vitória real e vitória do Lab executam a mesma absorção antes do modal.
- Resize durante a absorção mantém origem, alvo e selo alinhados.

## Fase 7 — Áudio sem acoplamento com Cleópatra

`GameAudio` hoje possui faixas de música específicas da Cleópatra. Antes de chamar música em Leonardo, torná-lo configurável por perfil de boss e manter o perfil atual como padrão da Cleópatra.

Para esta primeira entrega de Leonardo:

- adicionar cues procedurais discretos para pena/tinta, asa, ponte, engrenagem, pulso e Sfumato;
- não tocar as faixas de Cleópatra durante a luta de Leonardo;
- permitir perfil sem trilha de fundo sem warnings de fetch ou loops pendurados;
- deixar a adição de loops musicais renascentistas como conteúdo posterior, quando houver assets próprios aprovados.

Critério de pronto:

- Cues reforçam telegráficos, mas nenhum deles é requisito para sobreviver.
- Sair, reiniciar ou trocar de boss encerra todas as vozes e loops.
- Cleópatra preserva as faixas e cues existentes.

## Fase 8 — Validação e ajuste de balanceamento

Após cada fase concluída:

1. executar `npm.cmd run build`;
2. abrir a versão de desenvolvimento em viewport mobile;
3. testar a fase correspondente no Lab;
4. verificar console sem erro e troca de cena sem listener duplicado;
5. testar no celular em `http://192.168.15.84:5174` enquanto o servidor Vite estiver ativo.

Ao final, testar em sequência:

- menu → Cleópatra → menu → Leonardo → menu;
- as quatro opções do Lab de Leonardo;
- cada versão de cada estudo, confirmando telegráfico antes de dano;
- derrota nas três fases e na Ultimate;
- vitória completa de Leonardo;
- Ultimate isolada → absorção → `Retry Ultimate` → `Lab`;
- resize durante combate, Lab e absorção.

## Ordem de commits sugerida

1. `Add Leonardo scene routing and lifecycle cleanup`
2. `Add Leonardo visual shell and deterministic schedule`
3. `Add Leonardo phase one studies`
4. `Add Leonardo phase two studies`
5. `Add Leonardo phase three studies`
6. `Add Leonardo Codex ultimate and knowledge absorption`
7. `Add Leonardo audio profile and mobile polish`

Cada commit deve conter somente o bloco funcional correspondente, passar no build e preservar a luta da Cleópatra.
