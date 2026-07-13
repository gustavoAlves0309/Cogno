# Leonardo — Janela de Perspectiva com figuras fechadas

## Status

Design aprovado em conversa em 13 de julho de 2026. Este documento consolida a revisão motivada pelo teste físico da primeira vertical slice; não autoriza mudanças de áudio nem a reconstrução das demais mecânicas.

## Objetivo

Substituir as faixas trapezoidais sobrepostas de Janela de Perspectiva por uma sequência cumulativa de safezones geométricas fechadas, menores e totalmente separadas. O desenho da figura deve ensinar o destino com antecedência; completar sua última aresta deve ser o instante inequívoco em que todo o exterior passa a causar dano.

O resultado precisa:

- impedir que uma posição estacionária resolva beats consecutivos;
- permanecer justo e legível na primeira exposição em celular;
- comunicar perigo por forma, movimento e preenchimento, não apenas por cor;
- oferecer uma V3 madura determinística que possa ser reutilizada posteriormente;
- preservar o Lab isolado, o contrato de dano por janela e as correções sistêmicas já aprovadas.

## Relação com a especificação anterior

Este documento substitui somente o design de Janela de Perspectiva descrito em `2026-07-12-leonardo-ponto-de-fuga-vertical-slice-design.md`, incluindo:

- o corredor que atravessava a arena;
- as composições e timelines antigas de V1, V2 e V3;
- a exigência antiga de sobreposição alcançável entre faixas consecutivas;
- a opção única de V3 no Lab;
- os intervalos legados incompatíveis com a nova duração.

Continuam válidos os demais contratos da vertical slice anterior: direção do personagem e da arena, lifecycle, retorno ao menu, Lab disponível imediatamente, restauração de estabilidade sem interrupção, ledger de dano, resize, cleanup, quarentena de Ponte V2 e proibição de alterações de áudio.

## Problema confirmado no celular

As três versões implementadas variavam principalmente pelo número de corredores largos. V2 e V3 possuíam forte sobreposição central; em particular, os testes automatizados exigiam uma região comum entre corredores consecutivos. Na prática, isso permitia resolver os dois primeiros beats sem se mover e fazia as versões parecerem visual e espacialmente iguais.

O redesign deve trocar “mais corredores parecidos” por “mais construções concluídas”:

- V1 conclui uma figura;
- V2 preserva a primeira e acrescenta uma segunda;
- V3 preserva as duas anteriores e acrescenta uma terceira;
- depois da estreia de V3, todos os usos posteriores empregam sua forma madura.

## Escopo

- substituir os corredores por três polígonos fechados e convexos;
- tornar a progressão V1 → V2 → V3 cumulativa;
- separar completamente as safezones;
- refazer telegraph, construção, fechamento, ativação e dissipação;
- introduzir perfis explícitos `V3 — estreia` e `V3 — madura`;
- ampliar o Lab para testar os quatro perfis isoladamente;
- adaptar somente os usos temporários desta mecânica para respeitar os novos perfis e durações;
- atualizar geometria, timeline, renderer e testes puros diretamente relacionados.

## Fora de escopo

- reconstruir outra mecânica de Leonardo;
- escrever o novo roteiro completo das fases ou da Ultimate;
- criar novas combinações;
- alterar retrato, ícone, arena base, player ou HUD sem necessidade direta desta mecânica;
- alterar música, SFX, mixagem ou qualquer arquivo de áudio;
- introduzir aleatoriedade, alvo oculto ou adaptação por desempenho;
- mudar a progressão normal/DEV fora das quatro opções do Lab.

## Regra central

Cada beat possui uma única figura segura fechada. A figura completa fica reconhecível desde o início como esboço-guia. Um traço forte percorre seu perímetro. Enquanto o perímetro estiver incompleto, não existe hitbox. No mesmo frame em que a última aresta se fecha, o contorno trava e todo o complemento da figura dentro da arena se torna perigoso.

Depois da janela ativa, o perigo se dissipa por completo. Somente então o esboço da figura seguinte aparece. Nunca há dois diagramas funcionais simultâneos.

## Progressão cumulativa

| Perfil | Sequência | Windups |
|---|---|---|
| V1 | A | A = 2,5 s |
| V2 | A → B | A = 1,8 s; B = 2,2 s |
| V3 — estreia | A → B → C | A = 1,8 s; B = 1,8 s; C = 2,2 s |
| V3 — madura | A → B → C | A = 1,8 s; B = 1,8 s; C = 1,8 s |

Em cada nova tentativa da luta real, V1 e V2 aparecem somente antes da primeira V3. A primeira V3 daquela tentativa usa o perfil de estreia. Todo cast posterior na mesma tentativa, inclusive reutilizações temporárias em fases posteriores e na Ultimate legada, usa V3 madura. Retry reinicia essa progressão junto da luta. Essa seleção é determinada pelo roteiro; posição, dano e habilidade do jogador não alteram o perfil.

As posições, formas, ordem e direção de desenho permanecem fixas em toda repetição. Não há espelhamento, rotação sorteada ou permutação.

## Geometria canônica

### Convenção

- Coordenadas normalizadas usam `(0, 0)` no canto superior esquerdo e `(1, 1)` no canto inferior direito da arena.
- Os vértices abaixo estão em ordem horária na tela.
- Os polígonos são convexos e ficam integralmente dentro da arena.
- A linha é percorrida na ordem declarada, começando no primeiro vértice.

### Figuras

| ID | Forma e posição | Vértices normalizados | Área da arena |
|---|---|---|---:|
| A | trapézio, quadrante superior esquerdo | `(0,05; 0,12)`, `(0,43; 0,16)`, `(0,39; 0,48)`, `(0,10; 0,46)` | 11,04% |
| B | pentágono convexo, quadrante inferior direito | `(0,58; 0,59)`, `(0,86; 0,61)`, `(0,93; 0,78)`, `(0,75; 0,94)`, `(0,50; 0,83)` | 10,26% |
| C | hexágono irregular convexo, quadrante superior direito | `(0,57; 0,08)`, `(0,78; 0,07)`, `(0,94; 0,18)`, `(0,90; 0,38)`, `(0,69; 0,46)`, `(0,52; 0,31)` | 11,94% |

As distâncias normalizadas mínimas derivadas dos vértices, arredondadas para quatro casas decimais, são:

- A ↔ B: `0,2195 × arena.size`;
- B ↔ C: `0,1375 × arena.size`;
- A ↔ C: `0,1079 × arena.size`.

Esses valores são dados canônicos, não sugestões de layout. Alterá-los exige nova validação de design.

### Contratos espaciais

- As três figuras são disjuntas duas a duas.
- A distância entre polígonos deve continuar maior ou igual a um diâmetro canônico do player mais duas tolerâncias de borda em todos os tamanhos mobile suportados.
- A expansão de cada polígono pela tolerância segura não pode tocar a expansão de outro.
- Cada figura precisa preservar, ao redor de seu centroide, um núcleo seguro com clearance mínimo de cinco raios canônicos do player nas viewports validadas.
- Nenhum ponto pode ser seguro em dois beats consecutivos.
- Todas as quatro quinas da arena ficam perigosas em toda ativação.
- A e B, e depois B e C, precisam ser alcançáveis no windup seguinte usando `playerMaxSpeedForArena` e mantendo pelo menos 250 ms de margem no pior caso.
- No início de qualquer perfil, qualquer ponto válido da arena precisa alcançar A dentro de seu windup com a mesma margem de 250 ms.

## Colisão e tolerância

- A colisão consulta o centro luminoso do player.
- Um centro dentro do polígono ou exatamente sobre sua borda é seguro.
- A tolerância existente de 2 unidades lógicas continua favorecendo o lado seguro.
- Durante `active`, qualquer centro fora do polígono e além da tolerância colide com o perigo exterior.
- Durante `windup` e `dissipation`, não existe colisão.
- Renderização, borda e colisão consomem os mesmos vértices transformados após resize.
- O corpo decorativo do player pode tangenciar o exterior enquanto seu centro continuar na área segura efetiva.

## Timeline de um beat

Cada beat contém exatamente três estados:

1. `windup`: o esboço completo já comunica o destino; o traço final percorre o perímetro; não há dano;
2. `active`: começa no mesmo frame em que o perímetro fecha; dura 650 ms;
3. `dissipation`: o perigo desaparece durante 250 ms; não há dano.

O próximo beat começa somente após a dissipação anterior.

O windup inclui toda a aparição do guia e toda a construção. A guia já deve ser legível no primeiro frame útil e atinge sua opacidade de trabalho nos primeiros 180 ms. O traço progride por comprimento de perímetro, não por quantidade de arestas, para manter velocidade visual uniforme. Os últimos 200 ms aplicam desaceleração ao trecho final e aumentam o pulso do ponto de desenho; concluir esse trecho é o hit frame.

### Durações totais

Cada beat acrescenta 900 ms ao seu windup: 650 ms ativos e 250 ms de dissipação.

| Perfil | Duração total |
|---|---:|
| V1 | 3,4 s |
| V2 | 5,8 s |
| V3 — estreia | 8,5 s |
| V3 — madura | 8,1 s |

Qualquer repetição temporária de Ponto deve começar somente depois que a instância anterior tiver terminado. Os offsets antigos de 4,3 s e 6 s não podem continuar cortando ou empilhando V3. A reconstrução futura do roteiro poderá mudar os espaços entre casts, mas não poderá sobrepor duas instâncias desta mecânica sem um novo design explícito.

## Gramática visual funcional

A antiga moldura lateral, o ponto de fuga externo e as linhas longitudinais do corredor deixam de existir nesta mecânica.

| Momento | Tratamento visual | Significado |
|---|---|---|
| esboço-guia | contorno ciano tracejado, baixa opacidade, pinos de latão nos vértices | destino futuro, sem dano |
| construção | ponto de desenho luminoso e linha turquesa contínua crescendo sobre o esboço | progresso até o fechamento |
| aviso exterior | hachura vermelho-escura que cresce fora da figura | região que ficará perigosa |
| fechamento | último trecho desacelera; vértices encaixam; contorno inteiro fica sólido | hit frame e início da ativação |
| ativo | massa vermelho-escura e hachura forte somente no exterior | perigo atual |
| interior ativo | marfim claro, sem contribuição vermelha, borda turquesa sólida | segurança atual |
| dissipação | vermelho perde massa e escorre como tinta absorvida pelo papel | fim do perigo |

Tracejado versus sólido, hachura versus massa e movimento do ponto de desenho carregam a informação junto das cores. A safezone não pode depender apenas de turquesa e o perigo não pode depender apenas de vermelho.

O exterior precisa ser renderizado como o complemento real da figura dentro do retângulo da arena. Não é aceitável pintar toda a arena de vermelho e deixar a safezone tingida por uma cobertura clara semitransparente. Os pixels do interior ativo não recebem contribuição do preenchimento perigoso.

No tamanho real de celular:

- o guia deve ser distinguível do contorno ativo;
- strokes sobrevivem ao downsample e ao movimento;
- pinos não podem competir com o núcleo do player;
- o ponto de desenho não pode ocultar a última aresta;
- a hachura precisa permanecer abaixo do contraste do contorno seguro até o fechamento.

## Contrato de dano

- Cada `active` emite uma chave estável `ponto:<instanceId>:<beatIndex>`.
- A chave é consumida na primeira colisão daquele beat antes da avaliação de iframe, preservando a ausência de dano atrasado.
- Cada beat remove no máximo uma estabilidade.
- Beats diferentes usam chaves diferentes.
- Perder estabilidade não encerra, limpa, reinicia ou reposiciona a tentativa.
- Ao chegar a zero no Lab, a estabilidade volta ao máximo com o iframe já aprovado; timeline, desenho, player e cronômetro continuam.
- As chaves da instância são retiradas do ledger quando o ataque termina ou é abortado.

## Lab

O Lab de reconstrução oferece quatro opções explícitas:

- `Ponto V1`;
- `Ponto V2`;
- `Ponto V3 — estreia`;
- `Ponto V3 — madura`.

Cada seleção executa uma única instância do perfil escolhido. O cronômetro é relativo à tentativa. `Repeat` repete exatamente o mesmo perfil; não transforma estreia em madura. `Lab` aborta com cleanup e retorna ao seletor. O modo normal continua sem Lab.

## Arquitetura

### Geometria pura

`leonardoPerspectiveGeometry.ts` continua como fonte única para:

- raio e velocidade canônicos usados também pelo `PlayerController`;
- definições normalizadas A, B e C;
- transformação para bounds atuais;
- convexidade, área, centroide e distância entre polígonos;
- teste de ponto dentro do polígono com tolerância;
- distância de pior caso entre uma região atual e a seguinte;
- dados necessários para desenhar somente o exterior.

Os conceitos antigos de linha central, `from`, `to` e meias-larguras deixam de ser o modelo público da mecânica.

### Timeline pura

`leonardoPerspectiveTimeline.ts` define:

- os quatro perfis;
- a sequência de figuras e windups de cada perfil;
- seleção de beat e estado;
- progresso de guia, perímetro, active e dissipação;
- duração total;
- chave determinística de dano.

O fechamento é a fronteira exata entre `windup` e `active`; não existe estado de lock sem dano depois de a figura estar visualmente fechada.

### Ataque e renderer

`LeonardoPontoDeFugaAttack` consome apenas o estado puro e a geometria transformada. Ele é responsável por:

- desenhar guia, pinos, linha crescente, hachura, exterior ativo e dissipação;
- manter o interior sem vermelho;
- informar colisão e chave somente no estado ativo;
- substituir atomicamente os dados derivados de bounds após resize;
- destruir todos os objetos próprios no término ou aborto.

### Cena, Lab e roteiro temporário

`LeonardoScene` e o schedule apenas selecionam o perfil. O roteiro temporário registra a progressão V1 → V2 → V3 estreia e converte todos os usos posteriores em V3 madura. Isso não equivale à aprovação do restante da luta.

## Resize, interrupções e falha segura

- Resize preserva perfil, beat, estado, progresso, posição do player, cronômetro e chaves já consumidas.
- Geometria e objetos visuais dependentes dos bounds são substituídos atomicamente.
- Retornar ao Lab ou menu remove desenho, hachura, máscaras, hitbox e chaves da instância.
- Se uma definição ficar não convexa, degenerada, fora da arena ou produzir complemento visual inválido, o ataque não ativa dano invisível: limpa a instância e registra o erro somente em DEV.
- Uma instância encerrada não deixa chave, máscara, listener ou GameObject residual.
- Nenhuma falha visual pode manter colisão ativa sem o exterior correspondente na tela.

## Testes automatizados

### Geometria

- A, B e C possuem exatamente 4, 5 e 6 vértices;
- os vértices correspondem aos dados canônicos;
- todos os polígonos são convexos, horários, não degenerados e internos à arena;
- áreas normalizadas correspondem a 11,04%, 10,26% e 11,94% dentro de tolerância numérica;
- polígonos e regiões expandidas pela tolerância são disjuntos;
- gaps respeitam um diâmetro do player mais duas tolerâncias nas viewports suportadas;
- cada safezone conserva o núcleo interno mínimo;
- quinas da arena ficam fora de A, B e C;
- centro, borda, vértices e tolerância possuem classificação consistente;
- complemento visual cobre toda a arena exterior e nenhum ponto interno.

### Alcance

- qualquer posição da arena alcança A no windup inicial de cada perfil com 250 ms de margem;
- qualquer posição segura de A alcança B em 1,8 s com 250 ms de margem;
- qualquer posição segura de B alcança C em 1,8 s com 250 ms de margem;
- não existe ponto seguro comum entre A/B, B/C ou A/C;
- nenhuma posição estacionária sobrevive a beats consecutivos.

### Timeline e dano

- sequências e windups dos quatro perfis são exatos;
- durações totais são 3,4 s, 5,8 s, 8,5 s e 8,1 s;
- nenhum estado anterior ao fechamento emite janela de dano;
- completar a última aresta e entrar em `active` ocorre no mesmo boundary temporal;
- active dura 650 ms e dissipação 250 ms;
- uma chave permanece estável no beat e muda no beat seguinte;
- terminar ou abortar remove as chaves da instância;
- schedule nunca volta a V1/V2/V3 estreia depois da primeira V3;
- nenhuma repetição de V3 começa antes do fim da anterior.

## Validação manual

Validar em 360×800 e 390×844, além do dispositivo físico:

1. abrir o Lab na primeira entrada em DEV;
2. executar os quatro perfis separadamente;
3. reconhecer o destino seguro antes de qualquer aresta final fechar, sem áudio;
4. confirmar que o fechamento visual e o início do perigo são simultâneos;
5. permanecer parado e confirmar dano em beats consecutivos;
6. executar A → B → C sem precisão extrema e observar a margem restante;
7. testar centro, bordas e vértices da safezone;
8. provocar dano em todos os beats e confirmar continuidade, posição e cronômetro;
9. zerar estabilidade e confirmar restauração sem limpar a mecânica;
10. redimensionar/orientar durante windup, active e dissipação;
11. testar `Repeat`, aborto por `Lab`, retorno ao menu e cinco ciclos de lifecycle;
12. confirmar que nenhum pixel vermelho tinge o interior ativo;
13. confirmar ausência de objetos, máscaras, colisões e chaves residuais;
14. validar que V3 estreia e madura diferem somente pelo windup de C;
15. verificar console e build sem erros.

## Restrições de regressão

- `npm.cmd test` e `npm.cmd run build` precisam passar;
- áudio não é usado para tornar o telegraph compreensível;
- `GameAudio.ts` e todos os arquivos de `public/audio/` devem manter seus hashes;
- Lab inicial, menu, iframe, restauração de estabilidade e ledger não podem regredir;
- Ponte V2 continua em quarentena;
- nenhuma mudança não relacionada entra no diff desta implementação.

## Definição de pronto

O redesign só é aprovado quando:

- os quatro perfis correspondem exatamente às sequências e timings deste documento;
- A, B e C são compactas, distintas, fixas, separadas e alcançáveis;
- nenhum ponto estacionário resolve beats consecutivos;
- a guia comunica o destino e o fechamento comunica o hit frame na primeira exposição;
- perigo visual e colisão usam a mesma fronteira, inclusive após resize;
- a V3 madura pode ser repetida sem corte ou autoempilhamento;
- dano, Lab, lifecycle e cleanup cumprem seus contratos;
- testes automatizados, build e QA mobile passam;
- o usuário aprova V1, V2, V3 estreia e V3 madura no celular;
- nenhum áudio é alterado.

Somente depois dessa aprovação a equipe escolhe a próxima mecânica de Leonardo para reconstrução. O novo roteiro completo continua bloqueado até existir um conjunto suficiente de mecânicas excelentes e aprovadas.
