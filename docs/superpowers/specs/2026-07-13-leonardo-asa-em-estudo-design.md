# Leonardo — redesign de Asa em Estudo

## Status e relação com o projeto

Design aprovado em conversa em 13 de julho de 2026. Esta especificação substitui somente a mecânica legada `Asa em Estudo` e amplia o Lab de reconstrução para testá-la de forma isolada. A luta completa, suas combinações e seu roteiro final continuam não aprovados.

Ela complementa as especificações da `Janela de Perspectiva` e preserva seus contratos já validados: geometria visual e colisão idênticas, dano sem interromper a timeline, execução única no Lab, `Repeat` exato e limpeza completa ao abortar.

## Objetivo

Transformar `Asa em Estudo` numa sequência determinística de asas que atravessam toda a arena. Cada passagem contém uma abertura segura; o jogador precisa mudar de posição entre aberturas sucessivas. Leonardo começa com um voo reto, aprende a inverter a aproximação e termina controlando uma passagem diagonal.

A mecânica deve:

- ser compreensível na primeira apresentação;
- impedir que um único ponto seguro resolva passagens consecutivas;
- desafiar leitura e movimentação, não precisão milimétrica;
- mostrar visualmente que Leonardo redesenha e aperfeiçoa a invenção;
- continuar até o fim mesmo quando o jogador recebe dano;
- funcionar em 360×800 e 390×844 sem depender de texto, áudio ou cor isoladamente.

## Escopo

Incluído:

- quatro perfis isoláveis: `v1`, `v2`, `v3-intro` e `v3-mature`;
- passagens retas descendentes, retas ascendentes e uma diagonal fixa;
- abertura segura larga e posições determinísticas;
- telegraph da passagem atual e prévia fantasma somente da passagem seguinte;
- render híbrido: esboço projetado, asa materializada e dissolução em traços;
- uma página de estudo da Asa, com estados visuais V1/V2/V3;
- atuação de Leonardo no wind-up da V3 madura;
- Lab com execução única, cronômetro, `Repeat` exato e retorno ao seletor;
- timeline, geometria, colisão, resize, cleanup e testes automatizados;
- adaptação temporária do roteiro legado apenas para impedir corte ou empilhamento da nova duração.

Fora de escopo:

- áudio, música ou novos cues;
- roteiro final das quatro fases de Leonardo;
- combinações entre Asa e outras mecânicas;
- órbita das seis páginas na fase final;
- páginas das quatro mecânicas ainda não reconstruídas;
- balanceamento definitivo da luta completa.

## Gramática futura de aprendizado

As páginas são a memória diegética da luta. Cada mecânica terá uma página, uma cor-identidade e um símbolo próprios. A cor nunca substitui forma ou movimento.

- Na V1, a página surge como estudo bruto depois que a mecânica é apresentada.
- Na V2, rasuras, setas e reforços corrigem o estudo anterior.
- Na V3, linhas firmes e partes animadas mostram o projeto consolidado.
- Depois da primeira V3, usos posteriores empregam somente a V3 madura.
- Na futura fase final, as seis páginas orbitarão Leonardo. As duas escolhidas pararão diante dele para comunicar **o que vem**; o telegraph da arena continuará comunicando **onde sobreviver**.

O protótipo desta especificação implementa apenas a página da Asa e os estados necessários para os quatro testes isolados. Ele não antecipa a órbita nem combinações.

## Contrato do jogador

Uma passagem é uma faixa móvel que atravessa a arena inteira. Ela é formada por dois painéis perigosos separados por uma abertura segura.

1. O traçado forte mostra a passagem atual e a posição exata da abertura.
2. Um segundo traçado, mais fraco, antecipa somente a próxima passagem.
3. A asa materializada entra pelo limite anunciado e cruza toda a arena.
4. O jogador sobrevive ao cruzamento permanecendo dentro da abertura.
5. A asa se desfaz enquanto o próximo estudo se consolida.
6. A sequência termina somente após todas as passagens e sua dissolução.

Nenhuma quina é segura por omissão: os painéis ultrapassam os limites da arena antes de entrar e depois de sair. Nenhuma posição do jogador pode sobreviver parada a duas passagens consecutivas.

## Perfis determinísticos

`diâmetro do jogador` significa `2 × playerRadiusForArena(arena.size)`. As aberturas são dimensionadas a partir desse valor, e não de pixels fixos.

| Perfil | Sequência | Centro das aberturas | Largura da abertura | Intervalo entre passagens |
|---|---|---|---:|---:|
| `v1` | descida, descida | esquerda `0,25`, direita `0,75` | `3,0` diâmetros | `1.100 ms` |
| `v2` | descida, subida, descida | esquerda `0,25`, direita `0,75`, centro `0,50` | `2,5` diâmetros | `900 ms` |
| `v3-intro` | descida, subida, diagonal | esquerda `0,25`, direita `0,75`, centro `0,50` | `2,2` diâmetros | `700 ms` |
| `v3-mature` | igual à estreia | igual à estreia | `2,2` diâmetros | `700 ms` |

Os centros são coordenadas normalizadas ao longo do eixo transversal da asa. A passagem diagonal é fixa, viaja do quadrante superior esquerdo para o inferior direito e usa um ângulo de `20°` em relação ao eixo vertical. O valor substitui os `28°` iniciais porque esse ângulo criava uma pequena interseção entre a abertura direita e a diagonal junto à borda inferior; a margem nova preserva a separação total das safezones até na arena mínima. Não há aleatoriedade, mira dinâmica nem adaptação à posição atual do jogador.

### Cadência inicial de protótipo

| Perfil | Wind-up inicial | Duração de cada travessia | Dissolução + registro | Duração total |
|---|---:|---:|---:|---:|
| `v1` | `1.800 ms` | `1.400 ms` | `1.300 ms` | `7.000 ms` |
| `v2` | `1.500 ms` | `1.150 ms` | `1.250 ms` | `8.000 ms` |
| `v3-intro` | `1.500 ms` | `1.000 ms` | `1.100 ms` | `7.000 ms` |
| `v3-mature` | `1.150 ms` | `1.000 ms` | `900 ms` | `6.450 ms` |

Na V3 madura, a seleção da página dura `650 ms`. O telegraph espacial começa em `300 ms`, portanto permanece visível por `850 ms` antes da primeira passagem. As duas animações se sobrepõem: a página comunica a categoria, mas nunca elimina a informação espacial da arena.

Esses números são os valores fechados para o primeiro protótipo. Ajustes posteriores dependem de teste físico no celular e não alteram a estrutura aprovada.

## Telegraph e sequência visual

Somente duas leituras podem coexistir:

- passagem atual: contorno principal forte, abertura com aro ciano/marfim e entrada pulsante;
- próxima passagem: desenho aberto a `18–24%` de alpha, sem preenchimento, vermelho ou colisão.

Nunca são mostradas três rotas simultâneas. A prévia fantasma se torna o traço forte durante o intervalo aprovado. A última passagem não cria fantasma adicional.

Estados temporais:

1. **boss/page cue:** Leonardo observa, corrige ou seleciona a página;
2. **sketch:** traçado funcional cresce sobre a arena;
3. **active:** lona, nervuras e bordo perigoso se materializam;
4. **dissolve:** a lona desaparece primeiro; nervuras e contorno viram traços de tinta;
5. **register:** Leonardo conclui uma microcorreção sem pausar ou reiniciar a mecânica.

O vermelho aparece somente na asa ativa e some no mesmo instante em que a janela de dano termina.

## Direção de arte

A arte é procedural em Phaser; este protótipo não exige bitmap gerado.

### Materiais e semântica

- lona: `#DAC28A`;
- sombra da lona: `#8E744F`;
- nervuras de madeira/tinta: `#604738`;
- perigo ativo: lavagem e bordo `#5B1719`;
- construção, abertura segura e futuro imediato: ciano/marfim já usado pela Janela;
- tinta de dissolução: `#27484A`;
- cor exclusiva da página da Asa: violeta `#9A84C6`, com sombra `#514568`.

O violeta aparece somente na borda/aba da página, no símbolo da Asa e no gesto do Códice durante o wind-up. Ele nunca representa segurança, dano ou hitbox.

### Evolução da invenção

- V1: asa assimétrica, lona irregular e poucas nervuras; leitura de protótipo instável.
- V2: reforços, juntas adicionais e correções visíveis sobre o desenho anterior.
- V3: painéis articulados, desenho limpo e capacidade de passagem diagonal.
- V3 madura: a invenção não ganha nova forma; Leonardo apenas a seleciona e aciona com mais segurança.

### Limites mobile

- contorno funcional: `2,4–3,0` unidades;
- nervuras: `1,1–1,5` unidades;
- fantasma: `1,0–1,3` unidades;
- no máximo `8–12` nervuras visíveis;
- espaçamento mínimo de `5` unidades entre detalhes internos;
- sem partículas aleatórias, shaders, filtros ou banho de cor sobre toda a arena.

A abertura deve permanecer reconhecível em grayscale e sem sua cor de aro.

## Página e atuação de Leonardo no Lab

Cada perfil começa no estado anterior necessário; o usuário não precisa executar os testes em ordem para enxergar a evolução.

- `v1`: a página não existe no início, emerge depois da primeira passagem e termina como croqui bruto.
- `v2`: o croqui V1 já está presente; rasuras e reforços acumulam durante as três passagens.
- `v3-intro`: a página começa corrigida e termina como projeto articulado consolidado.
- `v3-mature`: a página madura já existe, avança diante de Leonardo durante `650 ms`, pulsa e retorna à camada de estudos.

Leonardo preserva rosto, roupa e silhueta. A progressão vem de atuação:

- V1: postura ereta e observação calma;
- V2: inclinação sobre o Códice e gestos mais rápidos;
- V3: postura avançada e antecipatória;
- V3 madura: seleção curta, segura e sem a longa correção introdutória.

Ao concluir um teste, o último estado da página fica visível enquanto `Repeat` e `Lab` aparecem.

## Geometria e colisão canônicas

Cada passagem é descrita por uma base ortonormal determinística:

- eixo de viagem;
- eixo transversal;
- centro móvel da asa;
- dois painéis poligonais;
- intervalo negativo que forma a abertura.

O renderer e a colisão recebem os mesmos vértices transformados. Não existe uma aproximação visual separada da hitbox.

A colisão círculo-polígono considera o raio do jogador. Centro e tangência interna da abertura são seguros; ultrapassar sua borda por um epsilon entra no painel perigoso. A diagonal usa exatamente a mesma projeção local das passagens retas.

Os vértices, nervuras e segmentos de dissolução são pré-calculados por assinatura da arena. Em resize, o cache inteiro é substituído atomicamente, preservando perfil, passagem atual, progresso, chave de dano e relógio.

## Dano e continuidade

Cada passagem expõe uma chave própria:

`asa:<instanceId>:<passIndex>`

- Uma passagem pode consumir no máximo uma janela de dano.
- Permanecer dentro do painel por vários frames não causa dano repetido.
- A passagem seguinte possui outra chave e pode causar novo dano.
- Colisão durante iframe consome aquela passagem e não produz dano atrasado.
- Receber dano ou zerar estabilidade no Lab não altera timeline, preview, posição do jogador nem objetos do ataque.
- Restauração de estabilidade continua usando o fluxo existente da cena, sem `AttackManager.clear()`.

## Lab de reconstrução

O Lab passa a ter dois níveis para caber no viewport mobile:

1. seletor de estudos reconstruídos: `Janela` e `Asa`;
2. seletor `2×2` de perfis do estudo escolhido.

Para a Asa:

- `Asa V1`;
- `Asa V2`;
- `Asa V3 estreia`;
- `Asa V3 madura`.

Uma tentativa:

1. cria uma única instância;
2. zera o cronômetro relativo;
3. executa até `getWingDuration(profile)`;
4. mantém dano e restauração sem interromper a timeline;
5. conclui somente após dissolução e registro;
6. mostra `Repeat` e `Lab`;
7. `Repeat` repete o mesmo estudo e perfil;
8. `Lab` retorna ao seletor raiz;
9. abort, mudança de perfil, menu e shutdown fazem cleanup completo.

A Janela preserva seus quatro perfis, tempos e comportamento já aprovados.

## Arquitetura

### Tipos e módulos puros

Criar um tipo independente:

```ts
type WingProfile = "v1" | "v2" | "v3-intro" | "v3-mature";
```

`LeonardoVersion` continua representando `1 | 2 | 3` nas quatro mecânicas legadas restantes.

- `leonardoWingTimeline.ts`: perfis, passagens, estados, previews, chaves e duração.
- `leonardoWingGeometry.ts`: construção normalizada, transformação, painéis, abertura e testes de colisão.
- `LeonardoAsaEmEstudoAttack.ts`: adaptador Phaser fino; cache, render, colisão e cleanup.
- `LeonardoScene.ts`: seleção discriminada do Lab, cronômetro, atuação do boss, página e `Repeat`.
- `leonardoSchedule.ts`: somente adaptação temporária necessária para não cortar ou empilhar a nova Asa.

O estado do Lab deixa de presumir Perspectiva e passa a ser discriminado pelo estudo:

```ts
type LeonardoLabSelection =
  | { attack: "ponto"; profile: PerspectiveProfile }
  | { attack: "asa"; profile: WingProfile };
```

Timeline e Lab usam a mesma função de duração. O ataque começa no `time` recebido pelo construtor, sem atrasar o relógio até o primeiro `update`.

### Roteiro temporário

O novo ataque substitui a Asa legada também quando a luta normal é aberta para regressão. Por isso, eventos temporários de Asa devem respeitar `getWingDuration(profile)` e não podem usar os offsets legados de `4.300 ms`.

- V1 e V2 mapeiam diretamente para seus perfis.
- A primeira V3 de uma tentativa usa `v3-intro`; qualquer repetição posterior usa `v3-mature`.
- Repetições internas que não comportem a duração completa são removidas.
- Combinações legadas com Asa ficam desativadas até a fase final ser redesenhada.
- Essas alterações são quarentena técnica; não aprovam o roteiro da luta.

## Falha segura e cleanup

- Perfil, arena ou geometria inválidos encerram a instância sem dano.
- Uma falha limpa os gráficos próprios e não deixa chave de dano ativa.
- `complete`, `clear`, abort, `Repeat`, retorno ao Lab/menu, derrota e shutdown destroem os objetos uma única vez.
- Resize durante wind-up, active, intervalo ou dissolução não reinicia a sequência.
- O ataque não altera áudio nem registra listeners globais.

## Testes automatizados

### Timeline

- sequências, direções, posições, durações e cadências exatas dos quatro perfis;
- intervalos temporais `[start, end)` sem frame ambíguo;
- somente atual + próxima no preview;
- fantasma sem colisão ou chave;
- chaves estáveis e distintas por passagem/instância;
- V3 estreia e madura com mesma geometria, diferindo apenas no wind-up inicial;
- tempo negativo clampado em zero e duração exata em `complete`.

### Geometria

- arenas `212`, `260`, `274`, `280` e `330 px`, com offsets reais;
- entrada e saída além dos limites em descida, subida e diagonal;
- largura exata em diâmetros do jogador;
- centro e tangência interna seguros;
- epsilon fora da abertura perigoso;
- painéis cobrindo centro, extremidades e quinas interceptadas;
- nenhuma interseção segura entre passagens consecutivas;
- igualdade determinística e round-trip de resize `A → B → A`;
- render e colisão consumindo a mesma geometria.

### Dano, cena e Lab

- um dano máximo por passagem e novo dano possível na seguinte;
- iframe consumindo a chave sem dano atrasado;
- dano sem alterar relógio, índice, preview ou conclusão;
- estabilidade zerada restaurada sem limpar ataque ou mover jogador;
- `Repeat` exato para os quatro perfis;
- `Lab`, troca de perfil, menu e shutdown sem resíduos;
- Janela acessível e inalterada no mesmo Lab;
- schedule temporário sem corte, auto-overlap ou combinação legada de Asa.

## QA manual obrigatório

Validar em velocidade real, primeiro no navegador e depois no celular:

- 390×844 e 360×800;
- quatro perfis isolados;
- abertura esquerda → direita → centro;
- descida, reversão e diagonal;
- parada deliberada nas quinas;
- dano em todas as passagens sem encerramento prematuro;
- resize durante os quatro estados temporais;
- distinção entre atual, fantasma e perigo em grayscale e simulação de daltonismo;
- vermelho ausente assim que o dano termina;
- página violeta reconhecível sem competir com a arena;
- `Repeat`, abort, Lab e retorno ao menu;
- estabilidade visual e de frame time com três passagens.

## Critérios de aceite

A vertical slice está pronta para teste físico quando:

1. as quatro versões executam exatamente as sequências especificadas;
2. ficar parado não resolve duas passagens consecutivas;
3. a abertura desenhada e a abertura física são a mesma geometria;
4. o jogador entende atual e próxima sem ver todas as rotas;
5. V3 madura é mais rápida sem esconder posição segura;
6. dano não encerra, reinicia ou encurta a sequência;
7. cada passagem causa no máximo um dano;
8. página e asa mostram evolução V1 → V2 → V3 no target mobile;
9. Janela não sofre regressão no Lab;
10. testes, TypeScript e build passam;
11. nenhuma mudança de áudio é produzida;
12. o roteiro completo permanece explicitamente não aprovado.
