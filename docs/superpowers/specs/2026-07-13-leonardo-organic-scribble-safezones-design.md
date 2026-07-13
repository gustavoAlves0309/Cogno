# Leonardo — safezones orgânicas em croqui

## Status

Design aprovado em conversa em 13 de julho de 2026. Este documento altera somente a apresentação geométrica de `Janela de Perspectiva` e o wind-up da V3 madura. Ele complementa e, nos pontos explicitamente indicados, substitui `2026-07-13-leonardo-closed-perspective-windows-design.md`.

## Motivação

O redesign para figuras fechadas melhorou a leitura e o deslocamento da mecânica, mas as safezones ainda parecem polígonos genéricos. Seus lados, quinas e pinos comunicam geometria técnica, porém não a identidade de Leonardo como autor que rabisca, observa e corrige seus próprios estudos.

A V3 madura também permite tempo demais depois que a linguagem da mecânica já foi aprendida. Seu desafio deve crescer pela velocidade, sem trocar posições, introduzir aleatoriedade ou sacrificar a correspondência entre o que é desenhado e o que causa dano.

## Objetivos

- transformar A, B e C em contornos abstratos, contínuos e organicamente irregulares;
- dar à mecânica a aparência de um croqui corrigido por Leonardo;
- eliminar vértices e pinos visíveis sem perder legibilidade espacial;
- manter desenho, safezone e colisão perfeitamente coincidentes;
- reduzir para 1,4 s o wind-up de cada beat da V3 madura;
- preservar determinismo, posições fixas, separação total, justiça e desempenho mobile.

## Fora de escopo

- alterar V1, V2 ou os wind-ups da primeira V3;
- mover as safezones para outras regiões ou mudar sua ordem;
- reconstruir qualquer outra mecânica de Leonardo;
- alterar o roteiro completo da luta, combinações ou Ultimate;
- alterar retrato, ícone, arena base, player ou HUD;
- adicionar aleatoriedade, geração procedural por tentativa ou adaptação ao jogador;
- criar ou modificar música, SFX, mixagem ou qualquer arquivo de áudio.

## Direção artística: croqui corrigido

A linguagem aprovada é a de um estudo desenhado e corrigido à mão:

1. dois traços preliminares muito suaves sugerem tentativas anteriores;
2. um traço turquesa forte percorre a solução definitiva;
3. o fechamento desse traço transforma o exterior em perigo;
4. os estudos desaparecem, deixando uma única borda funcional inequívoca.

Os três contornos são totalmente abstratos. Eles não devem formar símbolos, anatomia, asas, máquinas, letras ou ícones reconhecíveis. A identidade vem do gesto e do processo de revisão, não de uma ilustração temática literal.

### Silhuetas

| ID | Intenção visual | Região preservada |
|---|---|---|
| A | gesto recolhido, compacto e levemente assimétrico | quadrante superior esquerdo |
| B | gesto aberto, mais largo e horizontal | quadrante inferior direito |
| C | gesto suspenso, alongado e de leitura diagonal suave | quadrante superior direito |

As regiões, separações e áreas aproximadas da implementação atual permanecem canônicas. A bounding box anterior, expandida em `0,03 × arena.size` em cada eixo, forma o envelope máximo de autoria da nova curva. O centroide pode se deslocar no máximo `0,035 × arena.size`, e a área deve ficar em até ±10% da área anterior. Esses limites permitem um gesto orgânico sem mover funcionalmente a safezone. Nenhuma safezone pode tocar ou compartilhar área com outra.

Os contornos precisam parecer suaves no tamanho real de celular. Não podem apresentar quinas aparentes, segmentos retos longos, auto-interseções, gargalos, reentrâncias enganosas ou detalhes estreitos demais para acomodar o player.

## Comportamento visual de um beat

### Wind-up

- Os dois estudos aparecem rapidamente, atingindo sua opacidade de trabalho nos primeiros 180 ms.
- O primeiro é um arco aberto e irregular que cobre de 55% a 70% do percurso. O segundo é um guia tracejado quase completo, cobre de 90% a 95% e deixa aberta a região do fechamento.
- Eles são decorativos e não definem colisão. Devem permanecer próximos da solução final e, juntos, tornar o destino legível aos 180 ms sem formar outro contorno fechado convincente.
- O traço turquesa principal começa em um ponto fixo e percorre continuamente todo o contorno canônico.
- Um pequeno ponto luminoso de tinta acompanha a cabeça do traço.
- O progresso ocorre por comprimento de arco, mantendo velocidade visual contínua; a desaceleração final já existente continua sinalizando o fechamento.
- A hachura exterior de aviso permanece não letal durante todo o wind-up.
- Não existem vértices, pinos de latão ou encaixes de arestas visíveis.

### Fechamento e estado ativo

- O encontro da cabeça do traço com seu início produz um pulso curto de tinta.
- No mesmo frame, os estudos somem, a borda definitiva fica sólida e o exterior passa a causar dano.
- A borda forte é a única autoridade visual da safezone.
- O exterior perigoso continua sendo o complemento real do contorno dentro da arena; nenhum vermelho pode contaminar o interior seguro.
- O estado ativo continua durando 650 ms.

### Dissipação

- A massa perigosa e a borda se desfazem durante 250 ms.
- Não existe dano durante a dissipação.
- O beat seguinte começa somente depois que essa dissipação termina.

## Geometria canônica

### Dados autorais

Cada figura é definida por um pequeno conjunto fixo de pontos de controle normalizados e invisíveis. Esses pontos são dados autorais determinísticos: não mudam entre execuções, retries, modos ou viewports.

Cada conjunto deve:

- possuir exatamente 8 pontos de controle;
- estar ordenado ao redor do contorno;
- formar uma base simples e convexa;
- preservar os contratos espaciais e de alcançabilidade da especificação anterior.

### Suavização e amostragem

Uma função pura aplica exatamente duas passadas de Chaikin fechado. Para cada aresta `P → N`, cada passada produz, nesta ordem, `0,75P + 0,25N` e `0,25P + 0,75N`. O contorno suavizado é então reamostrado uniformemente por comprimento de arco em exatamente 40 pontos. O primeiro ponto e a direção de percurso são fixos nos dados autorais.

O resultado amostrado é a única geometria canônica consumida pelo restante do jogo. A mesma lista de pontos transformados deve alimentar:

- o traço preliminar próximo ao contorno;
- a borda turquesa definitiva e seu progresso;
- o preenchimento e a hachura do exterior;
- o teste de ponto seguro;
- a tolerância de borda;
- os cálculos de separação, área e alcançabilidade.

Não é permitido manter uma curva visual e um polígono de colisão independentes. A curva que o jogador vê e a fronteira que o jogo avalia são a mesma amostragem.

### Contratos espaciais preservados

- O gap entre qualquer par de figuras deve ser maior ou igual a um diâmetro canônico do player mais duas tolerâncias de borda: `2 × playerRadiusForArena + 4` unidades lógicas.
- A expansão de cada figura pela tolerância segura de 2 unidades não pode tocar a expansão de outra.
- O centroide de cada figura deve preservar clearance mínimo de cinco raios canônicos do player.
- Nenhuma posição pode ser segura em dois beats consecutivos, mesmo considerando a tolerância favorável ao jogador.
- As quatro quinas da arena permanecem perigosas em A, B e C.
- No wind-up maduro de 1,4 s, qualquer ponto válido da arena deve alcançar A, qualquer ponto seguro de A deve alcançar B e qualquer ponto seguro de B deve alcançar C, sempre com pelo menos 250 ms de margem.

### Estudos decorativos

Os dois estudos são derivados deterministicamente do contorno canônico por pequenos offsets suaves e limitados. Eles não entram na colisão, não mudam a área funcional e nunca podem cruzar de modo a formar uma segunda região fechada convincente. Sua opacidade e espessura devem ficar claramente abaixo do traço principal.

### Resize e cache

- Pontos normalizados são transformados para a arena atual como uma operação atômica.
- Contorno, exterior e segmentos de hachura são pré-calculados por ataque e reutilizados durante os frames seguintes.
- Um resize reconstrói todos os dados derivados em conjunto; renderização e colisão nunca observam versões diferentes da geometria.
- A suavização e o recorte do exterior não devem ser refeitos a cada frame.

## Timings e progressão

| Perfil | Sequência | Wind-ups | Duração total |
|---|---|---|---:|
| V1 | A | A = 2,5 s | 3,4 s |
| V2 | A → B | A = 1,8 s; B = 2,2 s | 5,8 s |
| V3 — estreia | A → B → C | A = 1,8 s; B = 1,8 s; C = 2,2 s | 8,5 s |
| V3 — madura | A → B → C | A = 1,4 s; B = 1,4 s; C = 1,4 s | 6,9 s |

Cada beat soma ao wind-up 650 ms ativos e 250 ms de dissipação. A primeira V3 de cada tentativa usa o perfil de estreia; todos os casts posteriores daquela tentativa usam V3 madura. Retry reinicia essa progressão. Posições, formas, ordem e direção de desenho permanecem fixas.

Arena → A, A → B e B → C precisam continuar alcançáveis com pelo menos 250 ms de margem usando a velocidade máxima canônica do player. A redução para 1,4 s não autoriza violar os limites de envelope, centroide, área ou separação das safezones.

## Lab e roteiro

O Lab mantém quatro opções isoladas:

- `Ponto V1`;
- `Ponto V2`;
- `Ponto V3 — estreia`;
- `Ponto V3 — madura`.

Cada seleção executa uma única instância. `Repeat` repete exatamente o perfil escolhido, inclusive quando for a estreia. O cronômetro continua relativo à tentativa.

O agendamento da luta deve consumir a duração calculada pelo perfil. Uma V3 madura ocupa 6,9 s completos, e nenhuma ação posterior pode abortá-la ou sobrepô-la por usar um offset legado.

## Dano e lifecycle preservados

- A colisão continua consultando o centro luminoso do player, com tolerância de 2 unidades a favor do lado seguro.
- Cada beat remove no máximo uma estabilidade usando sua chave determinística.
- Tomar dano não encerra, limpa, reinicia nem avança a mecânica prematuramente.
- Restauração de estabilidade no Lab também não interrompe desenho, timeline, player ou cronômetro.
- Abort, retorno ao Lab/menu, retry e shutdown continuam destruindo todos os objetos próprios.

## Validação automatizada

### Geometria

- resultado determinístico para A, B e C;
- exatamente 8 controles, duas passadas de Chaikin e 40 amostras uniformes por contorno;
- fechamento, orientação e convexidade válidos;
- ausência de auto-interseção e pontos não finitos;
- contornos integralmente dentro da arena;
- áreas dentro da tolerância aprovada;
- deslocamento de centroide e envelope dentro dos limites aprovados;
- gap mínimo de `2 × raio + 4`, expansões pela tolerância disjuntas e ausência de ponto seguro comum;
- clearance interno mínimo de cinco raios ao redor do centroide;
- quinas da arena perigosas em todos os beats;
- mesmo conjunto amostrado usado por renderização e colisão;
- alcance de arena → A, A → B e B → C em 1,4 s com margem mínima de 250 ms.

### Timeline, Lab e cena

- V3 madura com três wind-ups de 1.400 ms e duração total de 6.900 ms;
- demais perfis e durações inalterados;
- fechamento e ativação no mesmo frame lógico;
- 650 ms ativos e 250 ms de dissipação por beat;
- primeira V3 de uma tentativa como estreia e posteriores como maduras;
- `Repeat` preservando exatamente o perfil selecionado;
- schedule respeitando a duração completa;
- dano e restauração de estabilidade sem interrupção do ataque;
- resize atômico e cleanup idempotente.

## Validação manual no celular

- distinguir estudos decorativos da borda funcional na primeira exposição;
- reconhecer a safezone antes do fechamento sem depender apenas de cor;
- confirmar ausência perceptível de quinas e segmentos poligonais;
- verificar que nenhum canto ou posição estacionária resolve beats consecutivos;
- alcançar A → B → C na V3 madura sem exigir movimento anterior ao telegraph;
- confirmar que o contorno visível coincide com o limite de dano, inclusive nas bordas;
- repetir continuamente as quatro versões no Lab;
- sofrer dano durante cada estado e confirmar que a mecânica continua;
- observar estabilidade de frame e nitidez nos tamanhos mobile suportados.

## Critérios de aceite

O redesign está aceito quando:

1. A, B e C parecem três rabiscos abstratos distintos, e não polígonos arredondados genéricos;
2. não há vértices ou pinos visíveis;
3. os dois estudos enriquecem o processo sem competir com a borda real;
4. fechar o traço e ativar o exterior constituem um único evento inequívoco;
5. desenho, preenchimento e colisão compartilham a mesma geometria amostrada;
6. a V3 madura dura 6,9 s e continua justa em A → B → C;
7. dano, resize, Repeat, cleanup e schedule preservam seus contratos;
8. testes, build e verificação manual mobile passam;
9. nenhum arquivo ou comportamento de áudio é alterado.
