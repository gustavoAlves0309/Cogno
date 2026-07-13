# Plano de implementação — Leonardo: Asa em Estudo

## Objetivo

Implementar a especificação aprovada em `2026-07-13-leonardo-asa-em-estudo-design.md` como uma vertical slice isolada, determinística e testável no Lab, sem alterar áudio nem declarar o roteiro completo de Leonardo aprovado.

## Estado inicial e cuidados

- O worktree contém alterações amplas e arquivos não rastreados pertencentes ao desenvolvimento anterior; editar e commitizar somente os arquivos desta tarefa.
- `LeonardoAsaEmEstudoAttack.ts` ainda contém o ataque legado de um pequeno glider sobre curvas.
- O Lab presume exclusivamente `PerspectiveProfile`.
- O roteiro legado repete Asa em intervalos menores que a nova duração e contém combinações ainda não aprovadas.
- `AttackManager` e `damageWindowLedger` já aceitam chaves independentes por janela; não ampliar essas APIs sem necessidade.
- Registrar hashes do manifesto de áudio antes e depois para provar ausência de mudanças.

## Tarefa 1 — Congelar contratos puros da timeline

**Criar:**

- `src/game/mechanics/leonardoWingTimeline.ts`
- `src/game/mechanics/leonardoWingTimeline.test.ts`

### API

- `WingProfile = "v1" | "v2" | "v3-intro" | "v3-mature"`;
- direções `down | up | diagonal`;
- slots `left | right | center`;
- definições imutáveis das passagens;
- `getWingProfileLabel(profile)`;
- `getWingDuration(profile)`;
- `getWingTimelineSnapshot(profile, ageMs, instanceId)`.

O snapshot deve declarar:

- estado geral `windup | active | cadence | dissolve | register | complete`;
- índice/progresso da passagem atual;
- preview forte atual e fantasma seguinte;
- progresso de boss/page cue e telegraph espacial;
- progresso de materialização/dissolução;
- chave `asa:<instanceId>:<passIndex>` somente durante a passagem ativa.

### Testes

- quatro perfis e durações exatas `7.000/8.000/7.000/6.450 ms`;
- sequências e cadências `1.100/900/700 ms`;
- fronteiras `[start, end)`;
- somente atual + próxima no preview;
- fantasma sem dano;
- V3 estreia/madura com a mesma sequência e geometria;
- tempo negativo clampado e `complete` na duração exata.

## Tarefa 2 — Construir geometria canônica e alcançável

**Criar:**

- `src/game/mechanics/leonardoWingGeometry.ts`
- `src/game/mechanics/leonardoWingGeometry.test.ts`

### API

- reutilizar `playerRadiusForArena` de `leonardoPerspectiveGeometry.ts`;
- construir uma geometria completa por arena/perfil;
- resolver base ortonormal, eixo de viagem, eixo transversal e extensão além dos limites;
- gerar os dois painéis separados pela abertura;
- gerar nervuras e segmentos determinísticos de dissolução;
- testar colisão círculo-polígono com o raio do jogador;
- expor uma assinatura estável da arena para cache e resize.

### Invariantes

- posições `0,25 → 0,75 → 0,50`;
- aberturas `3,0/2,5/2,2` diâmetros;
- diagonal fixa a `28°` do eixo vertical;
- centro e tangência interna seguros;
- corners atingidos pelos painéis perigosos;
- nenhuma zona segura comum entre passagens consecutivas;
- render e colisão recebem os mesmos vértices;
- `A → B → A` reproduz A exatamente.

## Tarefa 3 — Reescrever o adaptador Phaser

**Modificar:**

- `src/game/attacks/LeonardoAsaEmEstudoAttack.ts`

### Responsabilidades

- iniciar no `time` do construtor;
- criar `instanceId` próprio;
- consumir snapshot e geometria puros;
- reconstruir cache atomicamente somente quando a arena mudar;
- implementar `getDamageWindowKey()`;
- renderizar apenas atual + próximo;
- desenhar telegraph, dois painéis, abertura, materiais, nervuras e dissolução;
- manter vermelho exatamente durante dano ativo;
- falhar seguro em perfil/arena inválidos;
- destruir um único `Graphics` sem listeners residuais.

### Direção visual

- lona `#DAC28A`, sombra `#8E744F`, nervuras `#604738`;
- perigo `#5B1719`;
- construção e abertura seguem ciano/marfim funcional da Janela;
- dissolução `#27484A`;
- sem partículas aleatórias, shaders ou preenchimento ciano da arena inteira;
- respeitar espessuras e densidade mobile da spec.

## Tarefa 4 — Integrar página e atuação do boss

**Modificar preferencialmente:**

- `src/game/rendering/LeonardoPortrait.ts`
- `src/game/scenes/LeonardoScene.ts`

Adicionar um estado explícito da página da Asa, sem inferir pelo tempo global da luta:

- ausente/emergindo/croqui V1;
- correções V2;
- projeto V3;
- seleção madura.

O retrato preserva identidade e muda somente pose, inclinação, gesto do Códice e página. A página usa violeta `#9A84C6/#514568`; essa cor não entra na hitbox ou semântica de perigo.

No fim do teste, congelar o estado final da página até `Repeat` ou `Lab`.

## Tarefa 5 — Generalizar o Lab por seleção discriminada

**Modificar:**

- `src/game/scenes/LeonardoScene.ts`

Substituir o estado exclusivo de Perspectiva por:

```ts
type LeonardoLabSelection =
  | { attack: "ponto"; profile: PerspectiveProfile }
  | { attack: "asa"; profile: WingProfile };
```

### Fluxo

1. seletor raiz `Janela | Asa`;
2. seletor `2×2` de perfis;
3. execução única com cronômetro e duração do módulo escolhido;
4. conclusão com `Repeat | Lab`;
5. `Repeat` preserva exatamente estudo e perfil;
6. `Lab` retorna ao seletor raiz;
7. botão durante execução aborta com cleanup completo.

Manter Janela sem mudança de duração, perfil ou comportamento. Zerar estabilidade continua restaurando o jogador sem limpar a tentativa.

## Tarefa 6 — Quarentenar o roteiro temporário

**Modificar e testar:**

- `src/game/scenes/leonardoSchedule.ts`
- `src/game/scenes/leonardoSchedule.test.ts`

### Regras

- entradas de Asa passam a declarar `WingProfile`;
- V1/V2 mapeiam diretamente;
- primeira V3 usa `v3-intro`, usos seguintes `v3-mature`;
- remover repetições internas que cortariam a nova duração;
- remover combinações legadas com Asa até o roteiro final ser redesenhado;
- validar duração/auto-overlap com `getWingDuration`;
- preservar todos os outros estudos e declarar em teste que a adaptação não aprova o roteiro.

## Tarefa 7 — Dano, lifecycle e regressões

**Modificar conforme necessário:**

- `src/game/attacks/AttackManager.test.ts`
- `src/game/mechanics/damageWindowLedger.test.ts`
- testes de fluxo específicos do Lab, se a cena permitir extração pura sem acoplamento a Phaser.

Cobrir:

- um dano máximo por passagem;
- próxima passagem com chave independente;
- iframe consumindo a janela sem dano atrasado;
- dano sem alterar timeline ou término;
- duas instâncias sem colisão de chaves;
- `clear()`/complete destruindo uma vez;
- resize sem reinício;
- Lab sem reset de posição ou ataque ao zerar estabilidade.

## Tarefa 8 — Validação automatizada

Executar:

```powershell
npm.cmd test -- --reporter=dot
npm.cmd run build
```

Corrigir somente regressões relacionadas. Confirmar por hash que arquivos de áudio não mudaram.

## Tarefa 9 — QA visual e funcional

Usar navegador local em:

- 390×844;
- 360×800.

Validar:

- quatro perfis em execução única e Repeat;
- atual + fantasma seguinte;
- esquerda → direita → centro;
- descida, subida e diagonal;
- quinas sem safezone acidental;
- dano sem interrupção;
- resize em wind-up, active, cadence e dissolve;
- leitura em grayscale e sem depender da página violeta;
- ausência de vermelho após a janela ativa;
- Janela preservada no Lab;
- retorno ao Lab/menu e console sem erros;
- frame time estável com três passagens.

## Ordem de execução

1. timeline e testes;
2. geometria e testes;
3. adaptador Phaser;
4. página/atuação;
5. Lab;
6. roteiro temporário;
7. regressões, suíte e build;
8. QA visual mobile;
9. handoff para teste físico no celular.
