# Plano de implementação — Leonardo: safezones orgânicas em croqui

Data: 2026-07-13

Base: `2026-07-13-leonardo-organic-scribble-safezones-design.md`

## Objetivo

Substituir os polígonos visíveis de `Janela de Perspectiva` por três contornos orgânicos determinísticos em linguagem de croqui corrigido, mantendo uma única geometria para desenho e colisão. A V3 madura passa a usar wind-up de 1,4 s em A, B e C, totalizando 6,9 s.

## Baseline confirmado

Antes deste plano:

- a versão de figuras fechadas A/B/C já está implementada e disponível no Lab;
- a suíte completa possui 43 testes aprovados e o build está aprovado;
- o app está disponível na LAN em `http://192.168.15.84:5173/` e deve permanecer rodando para hot reload e teste físico;
- `LeonardoScene` já oferece V1, V2, V3 estreia, V3 madura e `Repeat` exato;
- schedule e Lab já consultam `getPerspectiveDuration()` em vez de manter duração duplicada;
- dano e restauração de estabilidade já não encerram a mecânica;
- o worktree contém uma implementação ampla ainda não isolada no Git, com vários arquivos modificados ou não rastreados;
- o design orgânico está versionado no commit `dd0782e`.

## Política de alterações

- Usar `apply_patch` e preservar todo conteúdo não relacionado.
- Aplicar a direção aprovada com `$game-art-director`; não introduzir nova decisão visual fora da especificação sem validação.
- Não alterar música, SFX, mixagem, `GameAudio.ts` ou arquivos em `public/audio/`.
- Capturar hashes de áudio antes do primeiro patch de produção e compará-los ao final.
- Não alterar `LeonardoScene.ts` ou `leonardoSchedule.ts` sem uma falha comprovada: ambos já consomem o perfil e sua duração corretamente.
- Não criar commit automático da implementação: os arquivos-alvo contêm trabalho anterior não isolado. Somente este plano será commitado; uma consolidação posterior exige revisão explícita do escopo.
- Não reduzir as 40 amostras nem aproximar separadamente a colisão para resolver desempenho.

## Decisões técnicas

### Pipeline canônico

Cada A/B/C terá exatamente oito pontos de controle normalizados, fixos e em ordem horária na tela. A geometria funcional será derivada assim:

1. duas passadas de Chaikin fechado;
2. reamostragem uniforme por comprimento de arco;
3. exatamente 40 pontos, sem repetir o primeiro no final;
4. transformação uniforme para os bounds atuais da arena.

`PerspectiveFigure.vertices` continuará sendo a API pública para reduzir churn, mas passará a representar as 40 amostras canônicas, nunca os oito controles. Renderização, exterior, hachura, prefixo animado e colisão recebem essa mesma lista.

### Curva orgânica ainda convexa

As curvas terão assimetria e variação suave de curvatura, porém permanecerão convexas. Isso preserva `pointInConvexPolygon`, `buildArenaExteriorBands` e `subtractConvexPolygonFromSegment`, evitando uma refatoração arriscada de clipping e colisão.

### Geometria visual pura e cacheada

Um módulo puro separado derivará:

- estudo irregular aberto, inicialmente com 62% do percurso;
- guia tracejado aberto, inicialmente com 93% do percurso;
- segmentos tracejados com fase contínua entre amostras;
- hachuras já recortadas no exterior.

Os percentuais ficam dentro das faixas aprovadas de 55–70% e 90–95%. Offsets serão pequenos, suaves e determinísticos, limitados por constante relativa à arena. Estudos, tracejado, hachuras e bandas exteriores serão calculados em `syncGeometry()` e reutilizados por frame.

### Schedule derivado

Mudar `PROFILE_BEATS["v3-mature"]` é suficiente para que Lab, timer, validação de schedule e término do ataque adotem 6,9 s. Os casts da Ultimate continuam em `+8 s` e `+17 s`; passam a terminar em `+14,9 s` e `+23,9 s`, sem corte ou sobreposição.

## Arquivos previstos

| Arquivo | Ação |
|---|---|
| `src/game/mechanics/leonardoPerspectiveGeometry.test.ts` | substituir expectativas de vértices por controles, suavização, amostragem e contratos espaciais maduros |
| `src/game/mechanics/leonardoPerspectiveGeometry.ts` | introduzir pontos de controle, Chaikin, reamostragem e contornos canônicos de 40 pontos |
| `src/game/mechanics/leonardoPerspectiveRenderGeometry.test.ts` | criar testes puros para estudos, tracejado e hachura cacheável |
| `src/game/mechanics/leonardoPerspectiveRenderGeometry.ts` | criar derivações visuais puras sem Phaser |
| `src/game/attacks/LeonardoPontoDeFugaAttack.ts` | trocar guia/pinos pelo croqui, consumir caches e adicionar pulso de fechamento |
| `src/game/mechanics/leonardoPerspectiveTimeline.test.ts` | atualizar boundaries e contratos da V3 madura |
| `src/game/mechanics/leonardoPerspectiveTimeline.ts` | reduzir somente A/B/C maduros de 1.800 para 1.400 ms |
| `src/game/scenes/leonardoSchedule.test.ts` | comprovar finais de 14,9/23,9 s e rejeição do overlap de 900 ms |
| `docs/progress.md`, `docs/next-steps.md` | atualizar somente após validação automatizada e teste físico |

Arquivos de áudio, `PlayerController.ts`, `AttackManager.ts`, `LeonardoScene.ts` e `leonardoSchedule.ts` não devem precisar de mudança funcional.

## Tarefa 0 — Proteger baseline e escopo

**Arquivos:** nenhum.

1. Conferir o worktree:

   ```powershell
   git status --short
   ```

2. Capturar hashes do estado atual de áudio:

   ```powershell
   Get-FileHash -Algorithm SHA256 src/game/audio/GameAudio.ts
   Get-ChildItem public/audio -File -Recurse | Sort-Object FullName | Get-FileHash -Algorithm SHA256
   ```

3. Se a execução ocorrer em outra sessão, repetir o baseline:

   ```powershell
   npm.cmd test
   npm.cmd run build
   git diff --check
   ```

4. Registrar separadamente qualquer warning de whitespace preexistente; o fechamento atribuirá falhas somente aos arquivos desta feature.

5. Confirmar HTTP 200 no servidor existente sem reiniciá-lo desnecessariamente.

Gate: nenhuma falha nova e baseline de áudio registrado antes de qualquer patch de produção.

## Tarefa 1 — Construir a geometria orgânica canônica

**Arquivos:**

- modificar `src/game/mechanics/leonardoPerspectiveGeometry.test.ts`;
- modificar `src/game/mechanics/leonardoPerspectiveGeometry.ts`.

### 1.1 Escrever primeiro os testes vermelhos

Substituir o teste de contagem exata 4/5/6 por contratos que exijam:

- oito controles autorais por A/B/C;
- pontos finitos, em ordem horária e base convexa;
- duas passadas de Chaikin, verificadas em um contorno simples conhecido;
- 32 pontos intermediários depois das passadas;
- 40 amostras finais uniformes por comprimento de arco;
- resultado idêntico em chamadas repetidas;
- primeiro ponto e direção de percurso estáveis;
- fechamento implícito, sem duplicar o primeiro ponto no fim;
- convexidade, orientação e ausência de auto-interseção nas 40 amostras.

Congelar no teste as áreas, centroides e bounding boxes da geometria anterior. Para cada nova figura, verificar:

- área dentro de ±10%;
- centroide deslocado no máximo `0,035 × arena.size`;
- pontos dentro da bounding box anterior expandida em `0,03 × arena.size` por eixo;
- gap mínimo de `2 × playerRadiusForArena + 4`;
- expansões pela tolerância de 2 unidades disjuntas;
- clearance do centroide de pelo menos cinco raios do player;
- nenhuma posição segura em beats consecutivos;
- quatro quinas perigosas.

Atualizar alcance para o orçamento maduro real:

```ts
const movementBudget = playerMaxSpeedForArena(arena.size) * (1.4 - 0.25);
```

Esse orçamento deve cobrir arena → A, A → B e B → C em todos os tamanhos mobile existentes.

Rodar e confirmar falha pelos motivos novos:

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveGeometry.test.ts
```

### 1.2 Implementar o pipeline puro mínimo

Introduzir:

```ts
const CONTROL_POINT_COUNT = 8;
const CHAIKIN_PASSES = 2;
const CONTOUR_SAMPLE_COUNT = 40;
```

Separar os tipos de autoria e de consumo:

```ts
interface NormalizedPerspectiveDefinition {
  readonly id: PerspectiveFigureId;
  readonly controlPoints: readonly Point2[];
}

interface NormalizedPerspectiveFigure {
  readonly id: PerspectiveFigureId;
  readonly vertices: readonly Point2[];
}
```

Adicionar funções puras:

- `chaikinClosed(points, passes)`;
- `resampleClosedPathByArcLength(points, sampleCount)`;
- `buildCanonicalNormalizedContour(controlPoints)`;
- `hasSelfIntersections(points)`;
- acesso somente-leitura aos controles para validação/teste.

Para cada aresta `P → N`, Chaikin produz `0,75P + 0,25N` e `0,25P + 0,75N`, nessa ordem. A reamostragem percorre o fechamento implícito e distribui 40 pontos por distância acumulada.

Pré-calcular as três figuras normalizadas no carregamento do módulo. `transformPerspectiveFigure(s)` deve apenas aplicar escala e translação às 40 amostras, preservando resize determinístico.

Remover o mapa legado `EXPECTED_SIDE_COUNTS` de 4/5/6 ou substituí-lo por uma exigência única de `CONTOUR_SAMPLE_COUNT`. `validatePerspectiveGeometry()` deve validar 40 amostras; a contagem de oito controles é validada antes da derivação.

### 1.3 Autorizar A/B/C pelos gates, não pelo mockup literal

Criar oito controles para cada silhueta aprovada:

- A: gesto recolhido, compacto, superior esquerdo;
- B: gesto aberto, mais largo, inferior direito;
- C: gesto suspenso, diagonal suave, superior direito.

O mockup serve como linguagem gestual, não como coordenadas: suas curvas excedem alguns envelopes funcionais. Ajustar os controles até todos os contratos espaciais passarem e a variação de curvatura continuar perceptível no celular.

Não ordenar ou inverter pontos automaticamente; isso mudaria o início e o sentido autorais do desenho.

### 1.4 Fazer os testes passarem

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveGeometry.test.ts
```

Gate: 8 controles → 2 passadas → 40 amostras é determinístico, e todos os contratos espaciais passam com wind-up de 1,4 s.

## Tarefa 2 — Extrair estudos, tracejado e hachura puros

**Arquivos:**

- criar `src/game/mechanics/leonardoPerspectiveRenderGeometry.test.ts`;
- criar `src/game/mechanics/leonardoPerspectiveRenderGeometry.ts`.

### 2.1 Escrever testes vermelhos

Cobrir:

- `buildPerspectiveStudyPaths()` retorna dois caminhos abertos e determinísticos;
- o estudo irregular cobre 62% e o guia cobre 93% do comprimento, dentro das faixas aprovadas;
- nenhum estudo repete o primeiro ponto no fim ou chama fechamento implícito;
- offsets variam suavemente e nunca excedem o limite definido;
- cada estudo é livre de auto-interseção e os dois não se cruzam formando um loop aparente;
- as duas derivações escalam e se reposicionam corretamente após resize;
- `buildDashedPolylineSegments()` mantém a fase através das 40 amostras, sem reiniciar dash/gap em cada aresta;
- `buildWarningHatchSegments()` retorna somente trechos exteriores e determinísticos;
- pontos intermediários das hachuras nunca ficam dentro da safezone canônica;
- o bundle visual preserva por identidade a referência do contorno recebido, tornando impossível criar uma cópia divergente para renderização.

Rodar e observar falha por módulo ausente:

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveRenderGeometry.test.ts
```

### 2.2 Implementar derivações sem Phaser

Exportar tipos simples para estudos e segmentos. Reusar `Point2`, `Segment2`, `getPolygonPathPrefix` e `subtractConvexPolygonFromSegment` da geometria principal.

Derivar os offsets a partir do centroide e de ondas determinísticas por índice/ID da figura. Usar constantes nomeadas para cobertura, fase e deslocamento; não usar `Math.random()`.

O guia de 93% permanece tracejado e aberto na região do fechamento. O estudo de 62% é contínuo, irregular e mais fraco. A função de dash percorre distância acumulada para que o padrão continue suavemente entre segmentos.

Mover para este módulo a construção dos segmentos diagonais de aviso atualmente refeita dentro de `drawWarningExterior()`.

Adicionar `buildPerspectiveRenderGeometry(arena, figure)`, retornando um bundle com `contour: figure.vertices`, estudos, segmentos tracejados, hachuras e bandas exteriores. `contour` deve conservar a mesma referência recebida; o teste usa igualdade por identidade, não apenas igualdade de valores.

### 2.3 Fazer os testes passarem

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveRenderGeometry.test.ts src/game/mechanics/leonardoPerspectiveGeometry.test.ts
```

Gate: toda geometria visual cara é pura, determinística e calculável uma vez por bounds.

## Tarefa 3 — Integrar o croqui no ataque

**Arquivo:** modificar `src/game/attacks/LeonardoPontoDeFugaAttack.ts`.

### 3.1 Ampliar o cache atômico

Adicionar a `PerspectiveGeometryCache` um mapa de bundles por figura contendo:

- o contorno canônico compartilhado por identidade;
- estudos abertos;
- segmentos tracejados do guia;
- segmentos de hachura exterior;
- bandas do exterior ativo.

Em `syncGeometry()`:

1. transformar e validar as três figuras;
2. construir todos os mapas derivados em variáveis locais;
3. somente depois substituir `this.geometry`;
4. em erro, preservar o `failSafely()` já existente.

Nenhum cálculo de suavização, dash, offset ou clipping pode ocorrer a cada frame.

### 3.2 Substituir a gramática visual

No wind-up, desenhar nesta ordem:

1. hachura exterior cacheada;
2. interior claro discreto;
3. estudo irregular aberto;
4. guia tracejado quase completo;
5. prefixo turquesa canônico;
6. cabeça luminosa de tinta.

Substituir `drawGuide()` por `drawStudyStrokes()` e fazer `drawWarningExterior()` apenas percorrer segmentos cacheados.

Multiplicar a opacidade dos dois estudos por `snapshot.guideProgress`, preservando o reveal completo nos primeiros 180 ms sem alterar a geometria já cacheada.

Remover completamente:

- `drawVertexPins()` e todas as chamadas;
- latão ao redor da cabeça de desenho;
- `drawDashedSegment()` que reinicia fase a cada aresta;
- estudos/guia durante `active` e `dissipation`;
- raios de dissipação emitidos por cada vértice.

No estado ativo:

- desenhar exterior e interior usando `bundle.contour`;
- manter a borda canônica sólida;
- adicionar `drawClosurePulse()` no ponto inicial durante aproximadamente 120 ms, calculado a partir de `stateProgress` e dos 650 ms ativos;
- não manter nenhum estudo decorativo.

Na dissipação, reduzir somente massa perigosa e borda durante os 250 ms existentes.

### 3.3 Preservar colisão e lifecycle

- `collides()` e todos os helpers de desenho recebem `bundle.contour`, a mesma referência preservada a partir de `figure.vertices`, com tolerância 2;
- `damageWindowKey()` e `isFinished()` não mudam;
- tomar dano não chama cleanup nem altera a timeline;
- resize troca render e colisão no mesmo cache;
- `destroy()` continua destruindo o único `Graphics` próprio.

### 3.4 Validar integração

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveGeometry.test.ts src/game/mechanics/leonardoPerspectiveRenderGeometry.test.ts
npm.cmd run build
```

Checar remoções:

```powershell
rg -n "drawVertexPins|drawDashedSegment|drawGuide" src/game/attacks/LeonardoPontoDeFugaAttack.ts
```

Gate: busca vazia, build aprovado e nenhuma aproximação paralela de colisão.

O teste puro de `buildPerspectiveRenderGeometry()` deve provar `bundle.contour === figure.vertices`; a revisão do ataque deve confirmar que colisão, borda, exterior e prefixo usam somente `bundle.contour`.

## Tarefa 4 — Acelerar somente a V3 madura

**Arquivos:**

- modificar `src/game/mechanics/leonardoPerspectiveTimeline.test.ts`;
- modificar `src/game/mechanics/leonardoPerspectiveTimeline.ts`;
- modificar `src/game/scenes/leonardoSchedule.test.ts`.

### 4.1 Atualizar primeiro os boundaries esperados

A V3 madura deve ter:

| Beat | Wind-up | Active | Dissipation | Fim |
|---|---:|---:|---:|---:|
| A | 0–1.400 | 1.400–2.050 | 2.050–2.300 | 2.300 |
| B | 2.300–3.700 | 3.700–4.350 | 4.350–4.600 | 4.600 |
| C | 4.600–6.000 | 6.000–6.650 | 6.650–6.900 | 6.900 |

Atualizar os testes de:

- duração e boundary `[start, end)`;
- damage keys em A e B;
- conclusão exata em 6.900 ms;
- comparação entre estreia `[1800, 1800, 2200]` e madura `[1400, 1400, 1400]`.

V1, V2, V3 estreia, reveal de 180 ms, fechamento de 200 ms, active de 650 ms e dissipação de 250 ms permanecem iguais.

Rodar e confirmar falha:

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveTimeline.test.ts
```

### 4.2 Implementar a mudança mínima

Em `PROFILE_BEATS["v3-mature"]`, trocar somente os três `windupMs` de `1_800` para `1_400`. Não adicionar condição na cena nem estado automático de maturidade.

### 4.3 Provar o schedule derivado

Em `leonardoSchedule.test.ts`:

- manter os offsets reais existentes;
- afirmar que os casts da Ultimate terminam em 14.900 e 23.900 ms;
- renomear o teste legado de “six-second mature repeat” para descrever overlap maduro;
- manter o segundo cast movido para 14.000 ms como caso inválido: agora ele sobrepõe o primeiro por 900 ms;
- preservar a prova de reset determinístico em retry.

Não modificar `leonardoSchedule.ts` se esses testes passarem com a duração derivada.

### 4.4 Fazer os testes passarem

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveTimeline.test.ts src/game/scenes/leonardoSchedule.test.ts
```

Gate: somente a V3 madura muda; duração total 6,9 s e schedule sem corte.

## Tarefa 5 — Regressão completa e desempenho

**Arquivos de produção:** nenhum novo; corrigir somente falhas causadas pelos arquivos previstos.

### 5.1 Rodar suítes focadas

```powershell
npm.cmd test -- src/game/mechanics/leonardoPerspectiveGeometry.test.ts src/game/mechanics/leonardoPerspectiveRenderGeometry.test.ts src/game/mechanics/leonardoPerspectiveTimeline.test.ts src/game/scenes/leonardoSchedule.test.ts src/game/attacks/AttackManager.test.ts src/game/mechanics/damageWindowLedger.test.ts
```

Os testes genéricos de manager/ledger devem permanecer verdes sem mudança de produção.

### 5.2 Rodar gates globais

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Além do baseline global, verificar whitespace diretamente nos arquivos novos/não rastreados desta feature:

```powershell
$featureFiles = @(
  'src/game/mechanics/leonardoPerspectiveRenderGeometry.ts',
  'src/game/mechanics/leonardoPerspectiveRenderGeometry.test.ts'
)
$trailing = Select-String -Path $featureFiles -Pattern '[ \t]+$'
if ($trailing) { throw 'Trailing whitespace nos arquivos novos da feature.' }
```

### 5.3 Conferir escopo e áudio

- Comparar os hashes de áudio com a Tarefa 0.
- Confirmar que nenhum arquivo de áudio entrou no diff desta feature.
- Revisar `git diff --stat` e `git status --short` sem descartar mudanças preexistentes.
- Confirmar que `LeonardoScene.ts` e `leonardoSchedule.ts` não mudaram sem justificativa.

### 5.4 Observar custo mobile

Com 40 amostras, `buildArenaExteriorBands()` pode produzir dezenas de bandas. Como o cálculo é cacheado, primeiro medir o frame real em V3 madura.

Se houver queda perceptível:

1. reduzir chamadas de `fillPath` por batching ou fusão de bandas adjacentes;
2. manter os mesmos 40 pontos e cobertura exterior exata;
3. revalidar área e ausência de vermelho no interior;
4. não usar máscara WebGL-only nem simplificar a colisão.

Gate: suíte/build verdes, hashes intactos e nenhuma regressão perceptível de frame.

## Tarefa 6 — QA visual e físico no Lab

**Arquivos de produção:** nenhum novo; ajustes visuais ficam restritos ao ataque e aos controles autorais.

### 6.1 Verificar em 360×800 e 390×844

Para V1, V2, V3 estreia e V3 madura:

- os dois estudos aparecem e tornam o destino legível aos 180 ms;
- estudo irregular e guia tracejado parecem decorativos, não outra safezone;
- não há quinas, lados retos longos, pinos ou raios radiais;
- o traço principal permanece claramente dominante;
- o guia continua aberto até o fechamento real;
- fechamento, pulso e exterior ativo formam um evento único;
- o interior não recebe vermelho;
- a borda visual coincide com a colisão, inclusive com tolerância favorável;
- strokes sobrevivem ao downsample mobile.

### 6.2 Verificar gameplay e lifecycle

- executar A → B → C na V3 madura e confirmar desafio justo em 1,4 s;
- começar a V3 madura nos extremos da arena e alcançar A;
- ficar parado e confirmar que nenhum ponto resolve beats consecutivos;
- testar centro, bordas e quinas de cada forma;
- usar `Repeat` em cada um dos quatro perfis;
- tomar dano em wind-up, active e dissipação sem encerrar o cast;
- zerar estabilidade no Lab sem resetar desenho, timer ou player;
- fazer resize durante os três estados;
- alternar Lab/menu/retry repetidamente sem travamento nem objetos órfãos.

### 6.3 Gate do aparelho real

Manter o servidor LAN ativo e solicitar teste no celular. Balanceamento, leitura dos rabiscos e sensação do wind-up de 1,4 s só são aprovados após esse teste físico.

## Tarefa 7 — Fechamento documental

**Arquivos:**

- modificar cuidadosamente `docs/progress.md`;
- modificar cuidadosamente `docs/next-steps.md`.

Somente depois dos gates automatizados e do retorno físico:

1. registrar o que foi implementado e verificado;
2. registrar que toda decisão/criação artística futura do projeto deve usar `$game-art-director`;
3. manter como próximo passo qualquer ajuste observado no teste, sem declarar a luta completa aprovada;
4. repetir `npm.cmd test`, `npm.cmd run build`, hashes de áudio e `git diff --check` após a documentação;
5. não stagear nem commitar automaticamente o worktree amplo.

## Critério final de entrega

- A/B/C têm oito controles, duas passadas de Chaikin e 40 amostras canônicas;
- safezones parecem rabiscos abstratos distintos, sem vértices aparentes;
- estudos são decorativos, abertos e subordinados ao traço funcional;
- desenho, exterior, hachura e colisão compartilham a geometria canônica;
- hachuras e estudos são cacheados por bounds;
- V3 madura usa 1,4 s em A/B/C e termina em 6,9 s;
- Lab, `Repeat`, schedule, dano, resize e cleanup preservam seus contratos;
- suíte completa e build passam;
- áudio permanece byte a byte inalterado nesta feature;
- desempenho e leitura são aprovados no celular.
