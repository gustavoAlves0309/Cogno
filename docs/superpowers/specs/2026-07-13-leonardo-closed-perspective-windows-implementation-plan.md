# Plano de implementação — Leonardo: Janela de Perspectiva fechada

Data: 2026-07-13

Base: `2026-07-13-leonardo-closed-perspective-windows-design.md`

## Objetivo

Trocar a implementação de corredores sobrepostos por safezones fechadas A/B/C, com quatro perfis determinísticos (`v1`, `v2`, `v3-intro`, `v3-mature`), fechamento e dano no mesmo frame, Lab com quatro opções e usos temporários do roteiro que nunca cortem ou empilhem Ponto.

## Baseline confirmado

Antes deste plano:

- `npm.cmd test`: 3 suítes, 21 testes aprovados;
- `npm.cmd run build`: aprovado;
- o warning de chunk grande do Vite já existia e não pertence a este escopo;
- os arquivos de Leonardo e `src/game/mechanics/` fazem parte de um worktree amplo e majoritariamente não rastreado;
- nenhuma operação de reset, stash, checkout destrutivo ou formatação em massa é permitida.

## Política de alterações e commits

- Usar `apply_patch` e preservar mudanças não relacionadas.
- Registrar hashes de `src/game/audio/GameAudio.ts` e `public/audio/**` antes do primeiro patch de código e compará-los no final.
- Não alterar áudio.
- Não criar commits de código automaticamente: os arquivos-alvo já contêm a implementação anterior ainda não isolada no Git. Um commit desses arquivos incluiria trabalho preexistente que não pode ser separado com segurança.
- O único commit desta etapa de planejamento contém este documento. A implementação fica no worktree para revisão, salvo autorização posterior do usuário para consolidá-la.

## Decisões de implementação

### Tipo próprio de perfil

Não ampliar `LeonardoVersion`, pois ele continua representando `1 | 2 | 3` nas outras cinco mecânicas. Janela de Perspectiva recebe um tipo independente:

```ts
export type PerspectiveProfile = "v1" | "v2" | "v3-intro" | "v3-mature";
export type PerspectiveFigureId = "A" | "B" | "C";
```

`LeonardoPontoDeFugaAttack` recebe `PerspectiveProfile`, nunca deduz estreia ou maturidade a partir de desempenho, posição ou dano.

### Complemento exterior sem máscara

Não usar `GeometryMask.invertAlpha`, pois a inversão é exclusiva de WebGL e o jogo usa `Phaser.AUTO`.

Como A/B/C são convexas, `leonardoPerspectiveGeometry.ts` decompõe o retângulo da arena em faixas verticais nos `x` dos vértices e retorna polígonos convexos que cobrem somente o exterior. Essa solução:

- funciona em Canvas e WebGL;
- usa os mesmos vértices da colisão;
- é validável por área em Vitest;
- não cria máscara, listener, textura ou GameObject auxiliar;
- permite desenhar preenchimento e hachura sem tingir o interior.

### Política explícita do schedule

Eventos de ataque passam a declarar `replaceExisting`. `LeonardoScene` deixa de inferir limpeza por `event.attacks.length === 1`.

Entradas de Ponto formam uma união discriminada com `profile` obrigatório. Entradas de outras mecânicas continuam usando `version`.

Na tentativa real temporária:

- primeiro cast de Ponto: V1 em `phase1 + 0 s`;
- segundo cast: V2 em `phase1 + 30 s`;
- terceiro cast: V3 estreia em `phase1 + 60 s`;
- não gerar repetições intermediárias de Ponto nesses três windows;
- Ultimate: V3 madura em `+8 s` e `+17 s`;
- preservar Asa V2 em `+8 s`, `+14 s` e `+20 s` como eventos não substitutivos;
- revisão em `+26 s` ocorre 900 ms depois do fim da V3 madura iniciada em `+17 s`.

Isso é somente uma adaptação segura do roteiro temporário; não aprova o roteiro completo de Leonardo.

## Arquivos previstos

| Arquivo | Ação |
|---|---|
| `src/game/mechanics/leonardoPerspectiveGeometry.test.ts` | substituir testes dos corredores por contratos de A/B/C e complemento exterior |
| `src/game/mechanics/leonardoPerspectiveGeometry.ts` | trocar modelo de corredor por figuras fechadas e helpers puros |
| `src/game/mechanics/leonardoPerspectiveTimeline.test.ts` | testar os quatro perfis e boundaries exatos |
| `src/game/mechanics/leonardoPerspectiveTimeline.ts` | implementar timeline `windup/active/dissipation` |
| `src/game/attacks/LeonardoPontoDeFugaAttack.ts` | reescrever renderer e colisão para figura fechada |
| `src/game/scenes/leonardoSchedule.test.ts` | novo teste puro para progressão, duração e política de limpeza |
| `src/game/scenes/leonardoSchedule.ts` | perfis explícitos, `replaceExisting` e offsets seguros |
| `src/game/scenes/LeonardoScene.ts` | Lab de quatro perfis e consumo da união discriminada |
| `src/game/attacks/AttackManager.test.ts` | regressão de término, `clear()` e chaves ativas |
| `src/game/mechanics/damageWindowLedger.test.ts` | regressão de cleanup de múltiplas chaves da mesma instância |
| `docs/progress.md`, `docs/next-steps.md` | atualizar somente depois do QA, preservando o conteúdo existente |

`PlayerController.ts`, `AttackManager.ts`, `types.ts`, `GameAudio.ts` e os arquivos de áudio não precisam de mudança funcional.

## Tarefa 0 — Capturar baseline e proteger o escopo

**Arquivos:** nenhum.

1. Conferir o worktree antes dos patches:

   ```powershell
   git status --short
   ```

2. Capturar os hashes de áudio em memória/saída do terminal:

   ```powershell
   Get-FileHash -Algorithm SHA256 src/game/audio/GameAudio.ts
   Get-ChildItem public/audio -File -Recurse | Sort-Object FullName | Get-FileHash -Algorithm SHA256
   ```

3. Confirmar novamente o baseline se a implementação ocorrer em outra sessão:

   ```powershell
   npm.cmd test
   npm.cmd run build
   ```

4. Não prosseguir se aparecer falha nova não explicada pelo baseline.

## Tarefa 1 — Substituir o modelo geométrico por A/B/C

**Arquivos:**

- modificar `src/game/mechanics/leonardoPerspectiveGeometry.test.ts`;
- modificar `src/game/mechanics/leonardoPerspectiveGeometry.ts`.

### 1.1 Escrever primeiro os testes vermelhos

Remover expectativas de `from`, `to`, meias-larguras, interseção obrigatória e corredores. Adicionar testes para:

1. IDs e vértices normalizados exatos da spec;
2. 4/5/6 lados, orientação horária na tela, convexidade e não degeneração;
3. áreas normalizadas `0.1104`, `0.1026` e `0.11935`;
4. todos os vértices dentro da arena e transformação idêntica após resize;
5. quatro quinas fora de cada figura, inclusive com tolerância 2;
6. gaps A/B, B/C e A/C maiores que um diâmetro do player mais 4 unidades;
7. ausência de interseção entre todos os pares, inclusive após tolerância;
8. clearance do centroide maior ou igual a cinco raios do player nas arenas suportadas;
9. alcance arena→A, A→B e B→C com 250 ms de reserva;
10. prefixo do perímetro baseado em comprimento: 0%, intermediário e 100%;
11. decomposição exterior cuja soma de áreas seja `arena.size² - polygonArea(safezone)`;
12. nenhum polígono exterior contendo o centroide da safezone;
13. segmentos de hachura cortados exatamente na fronteira segura.

Manter as arenas atuais de 212, 260, 274, 280 e 330 unidades.

Executar e confirmar falha pelo motivo esperado:

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveGeometry.test.ts
```

### 1.2 Implementar a API pura mínima

Preservar:

- `Point2`;
- `ArenaSquare`;
- `playerRadiusForArena`;
- `playerMaxSpeedForArena`;
- `signedPolygonArea`, `polygonArea`, `isConvexPolygon` e `pointInConvexPolygon`.

Substituir os conceitos de corredor por:

- `PerspectiveFigureId`;
- `NormalizedPerspectiveFigure`;
- `PerspectiveFigure`;
- `getNormalizedPerspectiveFigures()`;
- `getNormalizedPerspectiveFigure(id)`;
- `transformPerspectiveFigure(definition, arena)`;
- `transformPerspectiveFigures(arena)`;
- `polygonCentroid()`;
- `minimumDistanceBetweenPolygons()`;
- `worstDistanceBetweenPolygons()`;
- `getPolygonPathPrefix()`;
- `buildArenaExteriorBands()`;
- `subtractConvexPolygonFromSegment()`;
- `validatePerspectiveGeometry()`.

Remover APIs órfãs específicas de corredor após confirmar que não há consumidores.

`validatePerspectiveGeometry()` deve rejeitar figura ausente, degenerada, não convexa, fora da arena, exterior com área divergente ou separação inválida.

### 1.3 Fazer o teste passar

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveGeometry.test.ts
```

Gate: nenhum teste pode aceitar sobreposição entre figuras.

## Tarefa 2 — Implementar os quatro perfis de timeline

**Arquivos:**

- modificar `src/game/mechanics/leonardoPerspectiveTimeline.test.ts`;
- modificar `src/game/mechanics/leonardoPerspectiveTimeline.ts`.

### 2.1 Escrever os testes de boundary

Trocar `PerspectiveVersion` por `PerspectiveProfile`. Testar cada fronteira, incluindo o milissegundo anterior:

Os intervalos da tabela usam a convenção `[início, fim)`: o instante escrito no fim de um estado já pertence ao estado seguinte.

| Perfil/beat | Windup | Active | Dissipation |
|---|---:|---:|---:|
| V1 A | 0–2500 | 2500–3150 | 3150–3400 |
| V2 A | 0–1800 | 1800–2450 | 2450–2700 |
| V2 B | 2700–4900 | 4900–5550 | 5550–5800 |
| V3 estreia A | 0–1800 | 1800–2450 | 2450–2700 |
| V3 estreia B | 2700–4500 | 4500–5150 | 5150–5400 |
| V3 estreia C | 5400–7600 | 7600–8250 | 8250–8500 |
| V3 madura A | 0–1800 | 1800–2450 | 2450–2700 |
| V3 madura B | 2700–4500 | 4500–5150 | 5150–5400 |
| V3 madura C | 5400–7200 | 7200–7850 | 7850–8100 |

Adicionar expectativas para:

- sequência de `figureId` A/B/C;
- nenhum ghost ou segundo diagrama;
- guia atingindo legibilidade de trabalho em 180 ms;
- `perimeterProgress` chegando a 1 exatamente no primeiro frame de `active`;
- `closingProgress` restrito aos últimos 200 ms de windup;
- nenhum dano antes do fechamento;
- active de 650 ms e dissipação de 250 ms;
- V3 estreia e madura diferindo somente no windup de C;
- chaves estáveis por beat e distintas entre beats;
- clamp de tempo negativo e `complete` nas durações 3400/5800/8500/8100 ms.

Executar e confirmar falha:

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveTimeline.test.ts
```

### 2.2 Implementar segmentos derivados de dados

Definir perfis como dados de beats, não como arrays manuais de estados duplicados. Cada beat contém somente `figureId` e `windupMs`; `activeMs = 650` e `dissipationMs = 250` são constantes compartilhadas.

O snapshot expõe:

- `profile`;
- `state: "windup" | "active" | "dissipation" | "complete"`;
- `beatIndex` e `figureId`;
- `stateProgress`, `guideProgress`, `perimeterProgress`, `closingProgress`;
- `isDamageActive` e `damageKey`.

Não manter aliases de `entry`, `construction`, `lock`, `reposition`, corredor ou ghost.

### 2.3 Fazer o teste passar

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveTimeline.test.ts
```

Gate: figura visualmente fechada e ausência de dano nunca podem coexistir depois do boundary de fechamento.

## Tarefa 3 — Reescrever ataque e renderer

**Arquivo:** modificar `src/game/attacks/LeonardoPontoDeFugaAttack.ts`.

### 3.1 Trocar o contrato do ataque

- Remover import de `LeonardoVersion` vindo da cena.
- Receber `PerspectiveProfile` da timeline.
- Resolver `figureId` pelo snapshot e a figura transformada pela geometria.
- `collides()` consulta somente a figura transformada que `draw()` usou naquele frame.
- Continuar usando tolerância segura de 2 unidades e chave por beat.

### 3.2 Tornar resize atômico

Manter assinatura dos bounds atuais (`x`, `y`, `size`). Quando mudar:

1. construir e validar todas as figuras em variável local;
2. construir seus polígonos exteriores em variável local;
3. somente depois substituir o snapshot geométrico armazenado;
4. preservar timeline, beat, progresso e chave.

Nunca atualizar desenho e colisão em passos separados.

### 3.3 Substituir integralmente o renderer antigo

Remover:

- `drawSafeCorridor`;
- `drawDangerExterior` baseado apenas em topo/baixo;
- `getCorridorRangeAtX` local;
- linhas longitudinais;
- ghost da próxima faixa;
- moldura física lateral;
- lock notch.

Adicionar helpers privados focados:

- `drawGuide()` — contorno ciano tracejado completo desde o início;
- `drawVertexPins()` — pinos de latão pequenos e atrás do player;
- `drawConstructionStroke()` — prefixo turquesa pelo comprimento do perímetro;
- `drawDrawingHead()` — ponto luminoso sem ocultar a última aresta;
- `drawWarningExterior()` — hachura recortada fora da figura;
- `drawActiveExterior()` — preencher apenas `buildArenaExteriorBands()`;
- `drawSafeInterior()` — marfim sem vermelho e borda sólida;
- `drawDissipation()` — reduzir massa/alpha sem manter colisão;
- `traceOpenPath()` e `traceClosedPolygon()`.

Ordem de desenho:

1. hachura/preenchimento exterior;
2. interior claro;
3. guia;
4. traço concluído;
5. pinos;
6. ponto de desenho.

### 3.4 Implementar falha segura

Se transformação, validação ou decomposição exterior falhar:

- limpar `Graphics`;
- tornar `collides()` falso;
- retornar chave nula;
- marcar a instância como concluída;
- emitir `console.error` somente em `import.meta.env.DEV`;
- permitir que `AttackManager` execute `destroy()` no mesmo ciclo.

Não criar máscaras, tweens ou listeners; o único `Graphics` atual continua sendo propriedade da instância.

### 3.5 Validar compilação e regressões puras

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveGeometry.test.ts src/game/mechanics/leonardoPerspectiveTimeline.test.ts
npm.cmd run build
```

Gate: nenhuma referência a corredor, ghost, moldura lateral ou lock permanece no ataque.

## Tarefa 4 — Tornar o schedule explícito e testável

**Arquivos:**

- criar `src/game/scenes/leonardoSchedule.test.ts`;
- modificar `src/game/scenes/leonardoSchedule.ts`.

### 4.1 Escrever testes do roteiro temporário

Adicionar expectativas para:

1. entradas de Ponto na luta real seguindo exatamente `v1 → v2 → v3-intro → v3-mature...`;
2. V1, V2 e V3 estreia aparecendo uma vez cada por tentativa;
3. todos os Ponto da Ultimate usando `v3-mature`;
4. Retry recriando o mesmo schedule desde V1, sem contador persistente;
5. ausência de `profile` em ataques não Ponto;
6. `profile` obrigatório em Ponto;
7. `replaceExisting` explícito em todo evento de ataque;
8. nenhum Ponto começando antes do fim do anterior;
9. nenhum evento substitutivo/revisão limpando Ponto antes do fim;
10. Asa V2 preservada em 8/14/20 s da Ultimate;
11. Ponto maduro em 8/17 s e revisão em 26 s;
12. schedules das fases II e III inalterados.

Executar e confirmar falha:

```powershell
npm.cmd test -- src/game/scenes/leonardoSchedule.test.ts
```

### 4.2 Introduzir união discriminada e política de limpeza

Estrutura pretendida:

```ts
type LeonardoAttackScriptEntry =
  | { id: "ponto"; profile: PerspectiveProfile }
  | { id: Exclude<LeonardoAttackId, "ponto">; version: LeonardoVersion };

interface LeonardoAttackScriptEvent {
  kind: "attack";
  at: number;
  attacks: readonly LeonardoAttackScriptEntry[];
  replaceExisting: boolean;
  label: string;
}
```

`validateLeonardoSchedule()` usa `getPerspectiveDuration(profile)` para rejeitar auto-overlap e cortes. A validação não aceita perfil incoerente nem volta de V3 para V1/V2/estreia.

### 4.3 Adaptar somente os eventos necessários

- Não gerar os repeats genéricos de 4,3/8,6 s quando `id === "ponto"`.
- Preservar repeats das outras mecânicas.
- Separar os eventos da abertura da Ultimate conforme a política descrita neste plano.
- Não alterar eventos de Ponte, Carro, Válvula ou Sfumato.

### 4.4 Fazer o teste passar

```powershell
npm.cmd test -- src/game/scenes/leonardoSchedule.test.ts
```

Gate: o validador precisa falhar se um teste reintroduzir 6 s entre duas V3 maduras.

## Tarefa 5 — Integrar perfis e quatro opções no Lab

**Arquivo:** modificar `src/game/scenes/LeonardoScene.ts`.

### 5.1 Remover versão ambígua do estado do Lab

- `labVersion` → `labProfile`;
- `startPerspectiveLab(version)` → `startPerspectiveLab(profile)`;
- `getDebugLabVersion()` → `getDebugLabProfile()`;
- mapear `phase1 → v1`, `phase2 → v2`, `phase3 → v3-intro`, `ultimate → v3-mature`;
- mapear o estágio visual do Lab como `v1 → phase1`, `v2 → phase2` e ambos os perfis V3 → `phase3`;
- `restartUltimateLab()` usa `v3-mature`;
- centralizar label em `getPerspectiveProfileLabel(profile)`.

### 5.2 Atualizar execução e cleanup

- Usar `getPerspectiveDuration(labProfile)` no timer.
- Criar `LeonardoPontoDeFugaAttack` com o perfil exato.
- `Repeat` captura e repete o mesmo perfil; estreia não vira madura.
- Ao concluir ou abortar, limpar ataques e ledger imediatamente.
- Preservar player, iframe, cronômetro e continuação durante dano.

### 5.3 Atualizar o seletor

Usar grid 2×2:

- linha 1: `Ponto V1`, `Ponto V2`;
- linha 2: `Ponto V3 — estreia`, `Ponto V3 — madura`.

Manter áreas de toque e testar o label longo em 320, 360 e 390 px. Se necessário, permitir font size menor somente nesses dois botões; não abreviar o significado de estreia/madura.

### 5.4 Consumir o schedule sem inferências

- `runScriptEvent()` usa `event.replaceExisting` para decidir `attacks.clear()`;
- `spawnStudy()` recebe `LeonardoAttackScriptEntry` e deixa o TypeScript estreitar `profile` versus `version`;
- nenhum contador runtime decide a maturidade da V3.

### 5.5 Validar

```powershell
npm.cmd test -- src/game/scenes/leonardoSchedule.test.ts
npm.cmd run build
```

Gate: o modo normal continua sem Lab e a primeira abertura em DEV mostra as quatro opções.

## Tarefa 6 — Regressões de lifecycle e dano

**Arquivos:**

- criar `src/game/attacks/AttackManager.test.ts`;
- modificar `src/game/mechanics/damageWindowLedger.test.ts` somente com testes.

### 6.1 Testar AttackManager com ataques falsos

Sem importar Phaser, verificar:

- ataque concluído chama `destroy()` e desaparece das chaves ativas no mesmo update;
- `clear()` destrói todas as instâncias e zera colisões/chaves;
- duas instâncias coexistentes mantêm chaves independentes;
- uma instância abortada não deixa chave no frame seguinte.

Não alterar `AttackManager.ts` se os testes passarem.

### 6.2 Ampliar a regressão do ledger

Adicionar um caso com três chaves da mesma instância consumidas em beats distintos e confirmar que `retainDamageWindows(ledger, [])` remove todas. Preservar o teste de colisão sob iframe sem dano atrasado.

### 6.3 Rodar a suíte completa

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Gate: toda mudança de produção precisa estar coberta pelas suítes puras correspondentes; não alterar código genérico apenas para satisfazer teste redundante.

## Tarefa 7 — QA visual e mobile

**Arquivos de produção:** nenhum novo; corrigir somente falhas observadas nos arquivos já previstos.

### 7.1 Verificar em viewports controladas

Usar 360×800 e 390×844:

1. Lab visível na primeira entrada em DEV;
2. quatro botões legíveis e tocáveis;
3. cada perfil iniciado separadamente;
4. guia reconhecível sem áudio desde o início;
5. último trecho e ponto de desenho legíveis nos 200 ms finais;
6. exterior ativando no mesmo frame do fechamento;
7. interior sem qualquer contribuição vermelha;
8. pinos não ocultando player ou vértice;
9. hachura não invadindo a figura;
10. strokes sobrevivendo ao target size.

Capturar pelo menos:

- V1 no início do windup, fechamento e active;
- V2 na transição A→B;
- V3 estreia durante C;
- V3 madura durante os três active;
- uma captura após resize durante windup e outra durante active.

### 7.2 Verificar gameplay e lifecycle

- ficar parado em A e confirmar dano em B/C;
- realizar A→B→C e observar margem confortável;
- testar bordas e vértices;
- tomar dano em todos os beats sem encerrar a mecânica;
- zerar estabilidade e confirmar restauração sem reset/reposição;
- confirmar no máximo uma perda por beat e nenhum dano atrasado;
- usar `Repeat` em V3 estreia e madura;
- abortar por `Lab` durante os três estados;
- retornar ao menu e repetir cinco ciclos;
- confirmar console sem exceções ou warnings novos;
- validar que nenhuma instância V3 é cortada no schedule temporário.

### 7.3 Gate físico

O QA automatizado não aprova balanceamento. Manter o app disponível na LAN e solicitar teste no aparelho para:

- leitura da forma na primeira exposição;
- conforto do deslocamento;
- clareza do fechamento;
- tamanho real de pinos, hachura e strokes.

## Tarefa 8 — Fechamento documental e invariantes

**Arquivos:**

- modificar cuidadosamente `docs/progress.md`;
- modificar cuidadosamente `docs/next-steps.md`.

1. Registrar somente o que foi realmente implementado e verificado.
2. Manter como próximo gate a aprovação minuciosa dos quatro perfis no celular.
3. Não declarar a luta inteira ou o roteiro de Leonardo aprovados.
4. Repetir:

   ```powershell
   npm.cmd test
   npm.cmd run build
   git diff --check
   ```

5. Comparar hashes de áudio com o baseline e falhar o fechamento se qualquer um divergir.
6. Revisar `git diff --stat` e `git status --short`; não stagear nem commitá-los automaticamente.

## Critério final de entrega

- quatro perfis implementados exatamente;
- A/B/C canônicas, separadas, alcançáveis e usadas por desenho e colisão;
- fechamento e dano simultâneos;
- exterior real sem vermelho no interior;
- V1/V2/V3 estreia uma vez, depois apenas V3 madura;
- Lab 2×2, timer e Repeat exatos;
- schedule explícito sem corte/auto-overlap;
- dano, iframe, zero estabilidade, resize e lifecycle sem regressão;
- testes, build, console e QA mobile aprovados;
- hashes de áudio idênticos;
- documentação atualizada sem afirmar aprovação física antes do teste do usuário.
