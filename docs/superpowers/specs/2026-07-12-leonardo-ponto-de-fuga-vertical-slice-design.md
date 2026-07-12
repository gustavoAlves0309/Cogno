# Leonardo — Redesign visual e vertical slice de Ponto de Fuga

## Objetivo

Reconstruir a base visual e técnica da luta de Leonardo da Vinci por meio de uma única mecânica completa e testável. Esta vertical slice corrige os bugs sistêmicos já observados, estabelece a nova direção de arte do boss, substitui a mecânica Ponto de Fuga pela Janela de Perspectiva e cria um fluxo de Lab adequado à reconstrução mecânica por mecânica.

O resultado deve permitir validar leitura, justiça, identidade visual e ergonomia mobile antes de reescrever as demais mecânicas ou o roteiro completo da luta.

## Relação com o design anterior

Esta especificação substitui, para a implementação atual:

- o retrato e o ícone existentes de Leonardo;
- a gramática visual atual da arena de Leonardo;
- todas as versões atuais de Ponto de Fuga;
- o seletor de fases do Lab de Leonardo durante o período de reconstrução;
- o comportamento atual de dano repetido e de esgotamento de estabilidade no Lab;
- o retorno atual de Leonardo para a cena de menu.

O documento `2026-07-10-leonardo-codex-vivo-design.md` continua sendo referência narrativa e histórica, mas seu roteiro, seus timings e suas combinações não são referência de balanceamento enquanto as mecânicas estiverem em reconstrução.

## Escopo

Incluído nesta vertical slice:

- corrigir o travamento ao retornar de Leonardo para o menu;
- fazer o botão Lab aparecer na primeira abertura da luta em modo DEV;
- impedir que dano encerre ou reinicie prematuramente uma mecânica no Lab;
- introduzir dano identificado por janela ativa, com no máximo uma perda de estabilidade por pulso;
- colocar Ponte Salvadora V2 em quarentena;
- reconstruir Leonardo como um homem idoso, humano e reconhecível;
- derivar o ícone do menu da mesma âncora visual do retrato;
- reduzir o ruído decorativo da arena e reservar cores funcionais às mecânicas;
- substituir Ponto de Fuga por Janela de Perspectiva V1, V2 e V3;
- oferecer testes isolados de Ponto V1, V2 e V3 no Lab;
- encerrar cada teste com as ações `Repeat` e `Lab`;
- adicionar validações automatizadas da geometria da mecânica;
- validar a entrega no tamanho real de gameplay e em viewport mobile.

## Fora de escopo

- reescrever Asa em Estudo, Ponte Salvadora, Carro Blindado, Válvula do Coração ou Sfumato;
- criar o novo roteiro completo das fases ou da Ultimate;
- rebalancear combinações da Ultimate antiga;
- alterar a vitória por absorção de conhecimento;
- alterar arquivos, cues, volumes ou comportamento de áudio;
- criar um novo sistema de progressão ou mudar as regras de modo DEV;
- gerar ou integrar arte raster externa; a vertical slice continua no renderer vetorial/procedural já usado pelo jogo.

## Problemas confirmados

### Mecânica e comunicação

- A versão existente de Ponto de Fuga possui telegraph fraco, ativa rápido demais na primeira exposição e mostra várias formas futuras sem hierarquia temporal clara.
- As quinas superiores funcionam como abrigo permanente em parte relevante da fase inicial.
- Linhas decorativas e linhas funcionais usam valores e cores semelhantes, reduzindo a leitura no celular.
- A área real de colisão não é comunicada com precisão suficiente.

### Fluxo e ciclo de vida

- `LeonardoScene` retorna para `CleopatraScene`, mas a cena reutilizada calcula layout antes de reconstruir os GameObjects. Referências ainda truthy apontam para objetos destruídos e causam exceção/travamento.
- `LeonardoScene.rebuildButtons()` não cria o botão Lab durante `create()` porque exige que a cena já esteja ativa. O botão aparece somente após um ciclo posterior, como morte e retry.
- Ao zerar estabilidade no Lab, Leonardo limpa todos os ataques e chama o reset completo do jogador. Isso encerra a mecânica e muda a posição do jogador.
- Hazards persistentes podem aplicar dano novamente após o iframe global, mesmo dentro do mesmo pulso lógico.

### Arte

- O retrato existente tem rosto pouco humano, barba rígida, cabelo em massas cinzentas genéricas e anatomia de marionete.
- O ícone do menu é desenhado separadamente e não preserva uma âncora de identidade forte.
- O fundo acumula páginas, círculos, linhas e cores funcionais, competindo com telegraphs.

## Direção de arte aprovada

### Âncora do personagem

A linguagem escolhida é **Humanista cel-painted**, construída proceduralmente com formas limpas, volumes quentes, bordas controladas e poucos detalhes focais.

Leonardo é:

- idoso e historicamente reconhecível;
- humano, observador e nunca monstruoso;
- dotado de rosto alongado, boina vermelho-escura, cabelos e barba prateados;
- vestido com roupa renascentista simplificada, legível no enquadramento do jogo;
- inicialmente sereno, curioso e controlado.

A obsessão cresce progressivamente:

- **P1 — observador sereno:** postura aberta, olhar analítico, desenho limpo;
- **P2 — autor absorvido:** leve inclinação, olhos mais focados, primeiras manchas de tinta e correções;
- **P3 — mestre obsessivo:** postura mais projetada sobre o Codex, olhar intenso, tinta e diagramas acumulados;
- **Ultimate:** pode usar o máximo das camadas aprovadas, sem deformar o rosto nem transformar Leonardo em criatura.

### Construção por camadas

O renderer deve separar responsabilidades visuais em:

1. corpo e traje;
2. cabeça, boina, cabelo e barba;
3. rosto, olhos e expressão;
4. mãos e Codex;
5. manchas de tinta;
6. diagramas e correções;
7. estado de cast e progressão de fase.

Cabeça, rosto, proporções e traje formam a âncora imutável. Postura, olhar, tinta e diagramas são deltas de fase.

### Ícone do menu

O ícone deve reutilizar a mesma paleta e a mesma construção canônica de cabeça/rosto do retrato principal. Sua composição é simplificada para o tamanho do menu:

- boina como massa superior vermelho-escura;
- rosto alongado quente como foco central;
- cabelo e barba prateados formando a silhueta inferior;
- olhos escuros legíveis;
- no máximo um pequeno acento geométrico ciano;
- sem páginas, círculo decorativo complexo ou detalhes internos que desapareçam no tamanho real.

O ícone deve ser conferido em cor, em escala de cinza e no tamanho final de exibição.

## Gramática visual funcional

O ataque usa uma solução híbrida: uma invenção física explica **o que** está agindo e um diagrama simples explica **onde e quando** haverá dano.

| Elemento | Significado |
|---|---|
| madeira e latão | aparelho físico de Leonardo |
| linhas cianas finas | geometria futura ainda não perigosa |
| faixa clara com borda turquesa | espaço seguro |
| hachura vermelha | perigo anunciado |
| preenchimento vermelho-escuro | perigo ativo |
| sépia de baixo contraste | decoração sem função de gameplay |

Cor nunca é o único canal. Perigo anunciado usa hachura; perigo ativo usa massa preenchida; segurança usa área vazia/clara e borda contínua.

Durante os testes de Ponto de Fuga, o fundo da arena não usa vermelho ou ciano com contraste semelhante ao ataque. Linhas decorativas devem ficar em sépia e com opacidade baixa, criando áreas de descanso visual.

## Janela de Perspectiva

### Conceito

Leonardo instala uma moldura física em uma borda da arena. Linhas de construção partem da moldura e convergem para um ponto de fuga localizado fora da área jogável. A convergência forma um corredor trapezoidal que atravessa a arena sem fechar até largura zero.

Fora do corredor, a arena recebe hachura de aviso e depois preenchimento perigoso. Dentro do corredor, o piso permanece claro e contornado em turquesa.

### Estados visuais

Cada beat segue a mesma ordem:

1. **entrada:** moldura, pino e régua aparecem;
2. **construção:** linhas cianas desenham o corredor e a hachura vermelha ocupa o exterior;
3. **travamento:** linhas deixam de pulsar, a borda segura fica sólida e a moldura dá um pequeno encaixe visual;
4. **ativação:** o exterior recebe preenchimento vermelho-escuro e pode causar dano;
5. **dissipação:** preenchimento vira tinta rarefeita e desaparece.

Nenhum hitbox fica ativo nos estados de entrada, construção, travamento ou dissipação.

### Geometria e colisão

- O corredor é um quadrilátero convexo calculado em coordenadas normalizadas da arena.
- O ponto de fuga fica fora da arena para impedir que a faixa afine até zero dentro da área jogável.
- `arena.size` significa o lado do quadrado jogável em unidades lógicas de mundo.
- O raio canônico do jogador é calculado pela mesma função usada por `PlayerController`: `clamp(arena.size × 0,02, 5,3, 7,4)`.
- O corredor é construído a partir de uma linha central e de uma meia-largura em cada extremidade. Sua largura mínima é `2 × min(meiaLarguraInicial, meiaLarguraFinal)`.
- A largura interna mínima é o maior valor entre seis raios canônicos do jogador e `arena.size × 0,18`.
- A borda turquesa desenhada usa a mesma geometria consultada pela colisão.
- A colisão verifica o centro luminoso do jogador. Um ponto sobre a borda é seguro.
- A tolerância inicial é de 2 unidades lógicas de mundo para o lado seguro. O stroke da borda fica centralizado na fronteira e não pode ter mais de 4 unidades de espessura, mantendo stroke e tolerância visualmente coerentes.
- O corpo visual do jogador pode tangenciar a área vermelha sem dano enquanto seu centro ainda estiver dentro da faixa.
- Todas as quatro quinas ficam fora da faixa durante uma ativação V1; nenhuma quina é um abrigo.

### V1 — Composição

Uma faixa trapezoidal central e levemente diagonal atravessa a arena.

Timeline:

| Intervalo | Estado |
|---|---|
| 0–300 ms | entrada da moldura |
| 300–1.800 ms | construção e hachura |
| 1.800–2.100 ms | travamento |
| 2.100–2.750 ms | ativação única |
| 2.750–3.100 ms | dissipação |

V1 ensina a gramática completa em uma única leitura. A primeira exposição é deliberadamente longa.

### V2 — Revisão

V2 usa duas projeções determinísticas em diagonais opostas.

| Intervalo | Estado |
|---|---|
| 0–300 ms | entrada da moldura |
| 300–1.700 ms | construção da primeira faixa |
| 1.700–2.000 ms | primeiro travamento |
| 2.000–2.600 ms | primeira ativação; ghost da segunda faixa surge em 2.300 ms |
| 2.600–3.500 ms | reposicionamento sem dano e construção da segunda faixa |
| 3.500–3.800 ms | segundo travamento, ainda sem dano |
| 3.800–4.400 ms | segunda ativação |
| 4.400–4.750 ms | dissipação |

A janela completa entre ativações é de 1.200 ms. A velocidade máxima usada pelo teste vem da mesma função exportada para `PlayerController`: `clamp(arena.size × 0,78, 190, 270)` unidades por segundo. Para toda posição válida na primeira faixa, a distância até o ponto mais próximo da segunda deve obedecer `distância ≤ velocidadeMáxima × 1,05 s`, preservando 150 ms de margem no pior caso.

### V3 — Perspectiva múltipla

V3 usa três projeções determinísticas que formam um zigue-zague contínuo.

| Intervalo | Estado |
|---|---|
| 0–300 ms | entrada da moldura |
| 300–1.500 ms | construção da primeira faixa |
| 1.500–1.800 ms | primeiro travamento |
| 1.800–2.350 ms | primeira ativação; ghost da segunda faixa surge em 2.050 ms |
| 2.350–3.050 ms | reposicionamento e construção da segunda faixa |
| 3.050–3.350 ms | segundo travamento, sem dano |
| 3.350–3.900 ms | segunda ativação; ghost da terceira faixa surge em 3.600 ms |
| 3.900–4.600 ms | reposicionamento e construção da terceira faixa |
| 4.600–4.900 ms | terceiro travamento, sem dano |
| 4.900–5.450 ms | terceira ativação |
| 5.450–5.800 ms | dissipação |

Entre ativações existem exatamente 1.000 ms sem dano. Corredor atual e próximo possuem uma região sobreposta capaz de conter o centro do jogador com pelo menos dois raios de margem.

Para cada transição, toda posição válida na faixa atual deve alcançar a faixa seguinte em no máximo `velocidadeMáxima × 0,85 s`, preservando 150 ms de margem. A interseção comum das três faixas deve ser vazia; portanto, não existe um ponto capaz de sobreviver aos três beats sem movimento.

V3 aumenta leitura e planejamento, não velocidade de reação bruta.

## Contrato de dano por janela

A nova mecânica emite uma chave de dano estável por ativação, por exemplo `ponto:<instância>:<beat>`.

O fluxo é:

1. o ataque informa colisão e a chave da janela ativa;
2. a cena ignora uma chave já consumida;
3. a chave é consumida na primeira colisão daquele beat, antes da avaliação de invulnerabilidade;
4. `PlayerController.damage()` decide se a colisão retira estabilidade considerando o iframe atual;
5. sair e reentrar na mesma área ativa não cria um segundo dano;
6. uma nova projeção usa uma nova chave e pode causar um novo dano.

Consumir a chave mesmo quando o iframe bloqueia a perda evita dano atrasado: uma colisão protegida não fica enfileirada para disparar quando a invulnerabilidade terminar.

Ataques antigos continuam no comportamento legado até serem reconstruídos. A API deve ser opcional para permitir migração mecânica por mecânica sem alterar o balanceamento da Cleópatra.

## Correções de fluxo

### Retorno ao menu

`CleopatraScene` passa a aceitar um sinal explícito `openMenu` em seus dados de inicialização.

Na criação da cena:

1. referências transitórias e estado de UI são reinicializados;
2. todos os Graphics, imagens, textos, AttackManager e PlayerController são criados;
3. somente depois disso o layout é calculado e aplicado;
4. a cena chama `showMenu()` quando `openMenu` for verdadeiro ou `showTitle()` no boot normal.

No shutdown, listeners de resize, botões e ataques são limpos e referências transitórias deixam de ser reutilizadas.

`LeonardoScene.returnToMenu()` inicia `CleopatraScene` com `{ openMenu: true }`, preservando o modo DEV persistido pelo perfil.

### Lab disponível imediatamente

`rebuildButtons()` não deve depender de `scene.isActive()` durante o ciclo de `create()`. Os elementos necessários já precisam existir antes da chamada. Assim, a entrada `Lab` é criada na primeira abertura quando `allowLab` for verdadeiro.

### Esgotamento de estabilidade no Lab

Ao chegar a zero no Lab:

- não limpar ataques;
- não reiniciar a posição;
- restaurar imediatamente a estabilidade ao valor máximo;
- definir `invulnerableUntil` como o maior valor entre o iframe já existente e `tempoAtual + 700 ms`;
- manter controle, cronômetro e sequência em andamento.

O modo real conserva a derrota normal ao chegar a zero.

## Lab de reconstrução

Durante esta etapa, o Lab de Leonardo oferece apenas conteúdo já reconstruído:

- `Ponto V1`;
- `Ponto V2`;
- `Ponto V3`.

Os botões antigos de Phase I, Phase II, Phase III e Ultimate ficam temporariamente ocultos no Lab, pois representam o roteiro legado ainda não aprovado. A luta normal permanece acessível separadamente em modo DEV para regressão.

Fluxo de uma tentativa:

1. o jogador escolhe uma versão;
2. o jogador e a estabilidade são inicializados;
3. o cronômetro inicia em `0.0` e mostra tempo relativo à tentativa;
4. a mecânica executa exatamente uma vez;
5. dano nunca reinicia cronômetro, posição ou ataque;
6. ao terminar a dissipação, o ataque é limpo;
7. o cronômetro congela no frame de conclusão;
8. aparecem `Repeat` e `Lab`;
9. `Repeat` repete a mesma versão e zera o cronômetro;
10. `Lab` retorna ao seletor e zera o cronômetro.

Um botão `Menu` permanece disponível no seletor. Durante a execução, uma ação `Lab` pode abortar a tentativa e voltar ao seletor com cleanup completo. A luta normal continua disponível separadamente no menu em modo DEV, conforme o fluxo já aprovado do modo de desenvolvimento.

## Quarentena de Ponte V2

Enquanto Ponte Salvadora não for reconstruída:

- qualquer entrada do roteiro legado que solicite Ponte V2 instancia temporariamente Ponte V1;
- o Lab não oferece testes isolados de Ponte;
- nenhuma combinação ou timing antigo de Ponte é tratado como aprovado;
- a substituição deve estar centralizada no ponto de criação do ataque, para ser removida sem procurar múltiplos schedules.

## Limites de arquitetura

### Geometria pura

Um módulo sem dependência de Phaser deve possuir:

- definições normalizadas das faixas V1–V3;
- transformação de coordenadas normalizadas para a arena;
- teste de ponto dentro de quadrilátero convexo;
- cálculo de largura mínima;
- cálculo de interseção/margem entre corredores consecutivos;
- cálculo de distância de pior caso entre uma faixa e a seguinte;
- função compartilhada de raio e velocidade do jogador;
- máquina de estados temporal pura para entrada, construção, travamento, ativação e dissipação;
- seleção pura do beat atual e geração determinística da chave de dano.
- registro puro de chaves consumidas, incluindo o caso em que uma colisão é protegida por iframe.

### Ataque

`LeonardoPontoDeFugaAttack` é reescrito como Janela de Perspectiva e fica responsável apenas por:

- consultar a máquina de estados temporal pura;
- desenho da moldura, construção, aviso, ativação e dissipação;
- seleção da faixa ativa e da faixa ghost;
- encaminhamento da chave de dano calculada pela máquina pura;
- cleanup de seus GameObjects.

### Cena

`LeonardoScene` permanece responsável por:

- modo real ou Lab;
- tentativa selecionada;
- cronômetro;
- spawn e término da execução isolada;
- consumo das chaves de dano;
- restauração de estabilidade no Lab;
- ações `Repeat`, `Lab` e `Menu`.

O Lab isolado não reutiliza o schedule de 90 segundos das fases.

### Retrato, arena e ícone

- `LeonardoPortrait` contém a âncora humana e seus deltas de fase/cast.
- O ícone do menu reutiliza helpers internos da cabeça/rosto e a mesma paleta do retrato.
- `LeonardoArenaVisuals` contém somente o fundo silencioso; não desenha telegraph funcional de ataques.
- Cada ataque é dono de sua invenção física e de seus sinais de gameplay.

## Falhas, interrupções e cleanup

- Abort, retorno ao Lab, retorno ao menu, derrota e shutdown destroem Graphics e hitboxes da tentativa atual.
- Nenhuma chave de dano sobrevive ao ataque que a criou.
- Uma execução inválida ou versão desconhecida falha para o seletor do Lab sem deixar dano ativo.
- Resize preserva tentativa, beat, cronômetro e chaves já consumidas. Ele substitui atomicamente somente a geometria e os objetos visuais dependentes do tamanho antigo.
- Após resize, os corredores são recalculados a partir das definições normalizadas; coordenadas absolutas antigas não são reaproveitadas.
- O telegraph e a colisão consultam a mesma faixa transformada após resize.
- A conclusão da tentativa ocorre somente depois da dissipação, nunca por dano.

## Testes automatizados

Adicionar Vitest como infraestrutura limitada aos módulos puros e um script `npm test`. Timeline, beat e chave de dano fazem parte da máquina de estados pura; Phaser apenas consome o estado calculado e renderiza.

Os testes de geometria devem verificar:

- ponto dentro/fora nas bordas e com tolerância;
- quadriláteros V1–V3 convexos e não degenerados;
- largura mínima de cada corredor;
- todas as quinas fora do corredor ativo da V1;
- distância de pior caso da V2 alcançável com a função compartilhada de velocidade e a margem temporal definida;
- distância de pior caso e interseção/margem mínima entre corredores consecutivos da V3;
- interseção comum vazia entre as três faixas da V3;
- nenhuma janela de dano nos estados não ativos;
- uma chave diferente por beat e estabilidade da chave durante o mesmo beat;
- consumo de chave durante iframe sem dano atrasado posterior;
- transformação coerente após mudança de tamanho da arena.

## Validação manual

No navegador, testar no mínimo os viewports lógicos `360 × 800` e `390 × 844`; depois repetir no celular físico do usuário:

- abrir Leonardo em modo DEV e confirmar Lab na primeira tentativa;
- entrar e sair do Lab sem morrer ou dar retry;
- rodar V1, V2 e V3 individualmente;
- receber dano sem encerrar o ataque ou mover o jogador para o centro;
- permanecer na mesma área perigosa e perder no máximo uma estabilidade por beat;
- confirmar `Repeat` reiniciando cronômetro e mesma versão;
- confirmar `Lab` encerrando a tentativa sem deixar Graphics ou colisões;
- completar cinco ciclos Leonardo → menu → Leonardo sem travamento;
- redimensionar/orientar a viewport durante telegraph e ativação;
- confirmar que safe area, hitbox e borda visual permanecem alinhadas;
- avaliar retrato no enquadramento real e ícone em `44 × 44` e no tamanho real do nó de menu, em cor e em escala de cinza;
- confirmar, na primeira execução após reload, que o usuário identifica a faixa clara como segura antes da ativação sem depender de áudio;
- confirmar que nenhuma quina é abrigo durante V1;
- confirmar que V2 e V3 exigem movimento planejado, não precisão extrema.

## Marcos de implementação

Para reduzir a superfície de regressão, a entrega será construída e verificada nesta ordem:

1. ciclo de vida das cenas, retorno ao menu e Lab disponível imediatamente;
2. módulos puros de geometria, timeline, movimento e chaves, acompanhados de Vitest;
3. Janela de Perspectiva V1 e seu fluxo isolado `Repeat`/`Lab`;
4. V2 e V3 com testes de pior caso e ausência de ponto universalmente seguro;
5. novo retrato em camadas, ícone derivado e arena silenciosa;
6. quarentena de Ponte V2, build e regressão mobile completa.

Cada marco deve compilar e passar os testes existentes antes do seguinte. A aprovação final da vertical slice continua única e ocorre no celular depois do marco 6.

## Definição de pronto

A vertical slice está pronta quando:

- build TypeScript/Vite passa;
- testes automatizados de geometria passam;
- os quatro bugs relatados estão reproduzidos como testes/checklist e corrigidos;
- Ponte V2 está efetivamente substituída por V1 no roteiro legado;
- Leonardo e seu ícone compartilham a nova âncora visual aprovada;
- Ponto V1–V3 cumprem seus timings, largura e contratos de colisão/dano;
- o Lab executa uma tentativa por vez e oferece `Repeat` e `Lab` ao final;
- áudio não possui alterações no diff;
- o usuário valida a vertical slice no celular antes de qualquer nova mecânica ser redesenhada.

## Ordem posterior

Depois da aprovação mobile desta vertical slice:

1. escolher a próxima mecânica por potencial de recuperação;
2. repetir design, Lab isolado e validação mobile;
3. manter Ponte V2 em quarentena até sua reconstrução;
4. reconstruir um conjunto suficiente de mecânicas excelentes;
5. somente então escrever um novo roteiro de fases e Ultimate;
6. tratar áudio em uma etapa separada posterior.
