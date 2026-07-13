# Cogno - Progress

Última atualização: 2026-07-12

## Feito até aqui

- Lemos e alinhamos os documentos base `ficha.md` e `cleopatra-script.md`.
- Definimos que `Cogno` será um survival mobile em arena pequena, com drag direto e fases curtas baseadas em figuras históricas.
- Confirmamos o princípio central do protótipo: a tela inteira é o palco livre para boss e ataques; a arena quadrada limita apenas o movimento do player.
- Registramos que Cleopatra fica fora da arena, estilo boss teatral, e seus ataques podem viajar pela tela antes de cruzar a arena.
- Alinhamos que a lista inicial de ataques veio de outro jogo e será tratada como inspiração, não como backlog literal.
- Escolhemos Web/HTML5 com Phaser + TypeScript para permitir implementação rápida por Codex e teste no iPhone pelo navegador.
- Escrevemos e commitamos o design do protótipo em `docs/superpowers/specs/2026-07-06-cleopatra-prototype-design.md`.
- Escrevemos e commitamos o plano de implementação em `docs/superpowers/specs/2026-07-06-cleopatra-prototype-implementation-plan.md`.
- Implementamos o primeiro protótipo jogável com:
  - menu inicial;
  - modo real;
  - modo teste;
  - player por drag preso à arena;
  - boss Cleopatra fora da arena;
  - sistema modular de ataques;
  - Escaravelhos da Coroa;
  - Nilo Ascendente;
  - Wadjet Lateral;
  - Olho-Sol de Horus com raios rotativos que apagam, telegrafam, acendem e apagam;
  - vida/estabilidade;
  - vitória e derrota.
- Rodamos `npm run build` com sucesso.
- Testamos visualmente com Playwright em viewport mobile e verificamos os quatro ataques sem erro JavaScript.
- Paramos o servidor local que estava rodando o protótipo.

## Atualizacao 2026-07-09 - VFX da Cleopatra

- Reabrimos o app localmente e mantivemos o fluxo de desenvolvimento pelo Lab.
- O Lab voltou para o formato de selecao direta de ataques, com botoes para Scarabs, Nile, Wadjet, Horus, Sands, Ma'at, Glyph e Army.
- Refatoramos Wadjet para ficar mais teatral e coerente com a Cleopatra:
  - cobra surge da lateral;
  - wind-up e hitbox entram em momentos separados;
  - telegraph residual foi removido depois da janela ativa.
- Refatoramos Sands of Time:
  - ampulheta fica acima da Cleopatra;
  - areia sobe da parte inferior para representar o tempo voltando;
  - Sands consegue reverter Horus e memorias de Scarabs;
  - scarabs reversos ganharam mais wind-up e melhor espacamento temporal.
- Refatoramos Scarabs:
  - criamos um renderer compartilhado para scarabs normais e reversos;
  - o projetil passou a ter silhueta mais clara de escaravelho, com cabeca, casco segmentado e pernas;
  - Scarabs normais e Scarabs reversos do Sands agora usam a mesma linguagem visual.
- Refatoramos Horus:
  - criamos um renderer compartilhado para o olho e os raios;
  - Horus normal e Horus reverso do Sands usam o mesmo visual base;
  - o olho foi reposicionado acima da coroa da Cleopatra;
  - testamos aumentar a densidade dos raios, mas voltamos a mecanica anterior por ficar rapida demais para a velocidade do player.
- Refatoramos Nile:
  - o telegraph agora comunica a cheia como preenchimento progressivo ate o nivel final;
  - adicionamos superficie ondulada, marcacoes laterais tipo nilometro, particulas e agua ativa mais legivel.
- Criamos `docs/reports/cogno-app-factory-review.md` e `docs/reports/cogno-app-factory-review.pdf` com uma avaliacao inicial sucinta pelo app-factory.
- Rodamos `npm.cmd run build` apos as principais mudancas e validamos os ataques com Playwright no Lab.

## Atualizacao 2026-07-09 - Fechamento visual da Cleopatra

- Refatoramos Ma'at:
  - a balanca agora cai sobre metade da arena;
  - o lado condenado fica mais claro e a safe area menos poluida;
  - a balanca ganhou base/pedestal inspirado em balancas egipcias tradicionais;
  - mecanica, timing e hitbox foram preservados.
- Refatoramos Glyph:
  - o ataque virou um selo hieroglifico circular;
  - adicionamos aneis inscritos, marcas orbitais e simbolo central mais egipcio;
  - a borda de dano continua legivel durante expansao e hold.
- Refatoramos a Ultimate/Army of Illusions:
  - mini Scarabs usam o renderer compartilhado dos escaravelhos novos;
  - mini Glyphs usam uma versao compacta do selo refatorado;
  - mini Nile/edge agora parecem mini-inundacoes com ondas e marcas de nilometro;
  - mini Horus virou feixe de Horus com olho no clone;
  - os seis circulos laterais foram substituidos por cartuchos/espelhos rituais.
- Ajustamos o Lab novamente para modo de fases:
  - Phase 1;
  - Phase 2;
  - Phase 3;
  - Ultimate.
- Ajustamos a Phase 1:
  - mantem dois ciclos completos das mecanicas basicas;
  - a segunda repeticao agora usa outra ordem para reduzir previsibilidade.
- Ajustamos o feeling de controle:
  - aumentamos levemente a velocidade do player;
  - aumentamos a area de controle durante fases rodando no Lab.
- Rodamos `npm.cmd run build` apos os ajustes principais e validamos os fluxos no Lab com browser local.
- Paramos o servidor local ao encerrar a sessao.

## Atualização 2026-07-10 - Áudio e acabamento final da Cleopatra

- Polimos a mixagem geral da luta:
  - aumentamos o volume percebido para funcionar melhor nos alto-falantes de celular;
  - mantivemos os SFX legíveis sem encobrir a trilha;
  - revisamos os cues dos ataques e o feedback de dano e troca de fase.
- Refatoramos as transições entre fases:
  - a Cleopatra agora recebe maior destaque visual durante a mudança;
  - o banner e os pulsos de transição ficaram mais claros;
  - a fase concede um breve tempo de leitura antes do próximo ataque, evitando entradas repentinas.
- Criamos e comparamos diferentes trilhas não procedurais para a boss fight:
  - produzimos as versões A, B e C;
  - refinamos A e B em versões mais épicas, A2 e B2;
  - escolhemos a B2 como tema oficial da Cleopatra.
- Integramos a B2 ao jogo em cinco trechos musicais de 15 segundos:
  - Phase 1;
  - Phase 2;
  - Phase 3;
  - abertura da Ultimate;
  - Finale da Ultimate, iniciada quando a Cleopatra entra na luta após cerca de 30 segundos.
- Cada trecho musical agora repete durante sua respectiva fase, com loops tratados e crossfades entre faixas para evitar silêncio, estalos ou quebras perceptíveis.
- Aumentamos a visibilidade do wind-up e da trajetória do mini Scarab durante a Ultimate.

## Atualização 2026-07-10 - Personagens

- Refatoramos o player como uma centelha de memória:
  - núcleo claro com glifo de memória derivado do losango do COGNO;
  - casca luminosa, motes orbitais e leve deformação na direção do movimento;
  - fragmentos destacados acompanham o movimento sem formar uma cauda contínua;
  - dano ganhou rachaduras e pulso de impacto;
  - invulnerabilidade ganhou ecos posicionais sem perder a leitura do núcleo.
- Refinamos o retrato cerimonial da Cleopatra sem alterar sua área ocupada:
  - respiração, piscadas, olhar acompanhando o player e movimento sutil do adorno no idle;
  - respostas próprias para casts de summon, solar e temporal;
  - poses e halos específicos para transições, abertura da Ultimate e Finale;
  - silhueta, posição e lógica de gameplay foram preservadas.

## Atualização 2026-07-10 - Arena e HUD

- Substituímos a grade técnica da arena por uma câmara de memória egípcia:
  - grandes placas de pedra e incrustações geométricas;
  - cartucho central quase apagado;
  - moldura em camadas com laje externa, canal dourado e canal interno ciano;
  - selos espaciais nos cantos e centros das bordas.
- Removemos os quatro triângulos vermelhos internos que pareciam telegraphs de perigo.
- A arena agora reage visualmente aos cinco estados da luta, de I a V, e pulsa nas transições sem alterar bounds, hitboxes ou o estreitamento existente da Ultimate.
- Substituímos os corações por três selos de estabilidade:
  - núcleo pálido, contorno dourado e linha interna ciano quando ativos;
  - contorno apagado quando vazios;
  - rachadura e fragmentos breves quando o player perde estabilidade.
- Adicionamos um indicador romano persistente no topo para os estados I, II, III, IV e V.
- Refizemos o comando do Lab com moldura cerimonial reta e glifo de memória, preservando posição, ação e área de toque.
- Extraímos os novos elementos para renderers dedicados em `ArenaVisuals.ts`, `CombatHudVisuals.ts` e `PlayerVisuals.ts`.
- Validamos o resultado com Playwright em mobile e desktop, incluindo Phase 1, Phase 2, abertura e Finale da Ultimate e o fluxo do Lab.
- `npm.cmd run build` passou sem erros; o servidor local respondeu normalmente e os testes de página não registraram exceções.

## Atualização 2026-07-10 - Fechamento de balanceamento e vitória

- Adicionamos um cronômetro por fase no modo real e no Lab para apoiar os testes de dificuldade.
- Ajustamos as combinações mais injustas envolvendo Horus, especialmente com Ma'at e Glyph.
- Corrigimos o dano falso do Wadjet no primeiro frame ativo e aumentamos levemente a janela de fuga de Wadjet + Horus reverso.
- A luta completa foi aprovada em dispositivo real após os ajustes finais.
- Substituímos a explosão dourada de vitória por uma sequência de absorção de conhecimento de 2,5 segundos:
  - a Cleopatra entra em colapso e se dissolve em fragmentos dourados e ciano;
  - os fragmentos percorrem trajetórias curvas até o núcleo do player;
  - um selo próprio da Cleopatra confirma a integração antes do modal.
- Extraímos a transferência para `MemoryAbsorptionVisuals.ts`, com paleta e selo configuráveis para ser reutilizada pelos próximos bosses.
- Mantivemos a derrota com sua duração e animação anteriores.
- `npm.cmd run build` passou; validamos os momentos-chave em viewport mobile, resize durante a transferência, delays dos dois finais e ausência de erros de console.

## Atualização 2026-07-10 - Ultimate do Lab com vitória isolada

- A Ultimate agora encerra o teste de fase entrando na mesma animação de absorção da vitória real.
- O modal identifica a origem do teste e oferece `Retry Ultimate` e `Lab`.
- `Retry Ultimate` reinicia apenas a Ultimate; `Lab` retorna ao seletor das quatro fases.
- As fases I, II e III continuam retornando ao seletor ao terminar.
- Validamos o fluxo Ultimate → absorção → modal → Retry Ultimate, o retorno por Lab, a conclusão da Phase 1 e a preservação dos botões `Retry`/`Menu` da vitória real.
- O build passou e o navegador não registrou erros de console.

## Atualização 2026-07-10 - Leonardo da Vinci: Codex Vivo

- Implementamos o segundo boss jogável, Leonardo da Vinci, como um autor humano e observador que revisa obsessivamente seus próprios estudos.
- Criamos uma luta determinística com três fases de 90 segundos e uma Ultimate de 75 segundos:
  - Phase I — Geometria do voo: `Ponto de Fuga` e `Asa em Estudo`;
  - Phase II — Máquinas e passagem: `Ponte Salvadora` e `Carro Blindado`;
  - Phase III — Corpo e percepção: `Válvula do Coração` e `Sfumato`;
  - Ultimate — pares conhecidos, revisões do códice e finale reduzido.
- Cada estudo possui versões graduais, telegraphs próprios e agenda fixa; as combinações da Ultimate permanecem legíveis e sem alvo ou aleatoriedade oculta.
- Criamos cenário de códice em perspectiva, HUD de selos/olhos, retrato humano do Leonardo e a linguagem visual de tinta, carvão, ciano de medição e luz segura do Sfumato.
- A vitória real e a Ultimate isolada do Lab usam a absorção de conhecimento compartilhada, agora com paleta e selo de Leonardo.
- Adicionamos cues sonoros procedurais discretos para tinta, asa, ponte, engrenagem, pulso e Sfumato.
- Integramos Leonardo ao menu e corrigimos a transição de áudio para impedir que a trilha da Cleopatra continue tocando ao trocar de boss.
- Validamos TypeScript, build de produção, telas de fase/Ultimate/vitória e ausência de erros de console no navegador.

## Atualização 2026-07-10 - Modo DEV e progressão normal

- Criamos um perfil local versionado em `localStorage` para separar o progresso real do ambiente de teste.
- O menu agora possui um botão persistente `DEV`:
  - no modo normal, somente Cleopatra começa disponível e o Lab fica oculto;
  - vencer um boss em luta real libera o próximo boss implementado;
  - no modo DEV, todas as lutas implementadas ficam liberadas e o Lab volta a aparecer como acesso adicional;
  - vitórias no DEV não alteram a progressão normal.
- Genghis Khan continua indisponível até ter uma luta implementada, evitando uma seleção sem destino.
- Validamos persistência do DEV após reload, bloqueio normal de Leonardo, desbloqueio do DEV, isolamento de vitórias e recuperação segura de perfil corrompido.

## Atualização 2026-07-12 — Auditoria e redesign de Leonardo

- O Leonardo implementado foi testado em dispositivo real e a luta não foi aprovada em seu estado atual:
  - a Phase I ficava trivial depois da primeira leitura e permitia permanecer nas quinas superiores;
  - a primeira exposição de algumas mecânicas era rápida e pouco visível;
  - a Phase II, especialmente Ponte Salvadora, era difícil de compreender e continha situações injustas;
  - telegraphs, decoração e perigos competiam visualmente;
  - o retrato e o ícone de Leonardo não transmitiam uma figura humana convincente.
- Foram confirmados quatro bugs sistêmicos:
  - retornar de Leonardo para o menu podia travar o jogo;
  - o botão Lab só aparecia depois de morrer e usar Retry;
  - perder estabilidade no Lab limpava o ataque em andamento;
  - hazards persistentes podiam causar dano repetido dentro da mesma ativação lógica.
- A investigação identificou as causas principais:
  - `CleopatraScene.create()` aplicava layout antes de recriar seus GameObjects, reutilizando referências destruídas ao reiniciar a cena;
  - `LeonardoScene.rebuildButtons()` exigia uma cena já ativa, embora fosse chamado durante `create()`;
  - o caminho de zero estabilidade no Lab chamava `attacks.clear()` e `player.reset()`;
  - o sistema atual retorna apenas colisão booleana por frame e não distingue janelas de dano;
  - Ponte V2 deslocava sua faixa segura sem uma conexão atravessável e foi classificada como matematicamente injusta.
- A reconstrução foi decomposta em mecânicas isoladas. O roteiro completo só será refeito depois de existir um conjunto suficiente de mecânicas aprovadas no celular.
- A direção de arte de Leonardo foi revisada com o `game-art-director` e aprovada:
  - estilo **Humanista cel-painted**;
  - Leonardo idoso, humano e historicamente reconhecível;
  - boina vermelho-escura, rosto alongado, cabelos e barba prateados;
  - progressão por camadas: observador sereno → autor absorvido → mestre obsessivo;
  - retrato e ícone derivados da mesma âncora visual.
- A gramática das mecânicas será híbrida:
  - invenções físicas comunicam o que atacará;
  - diagramas simples comunicam onde e quando;
  - sépia fica reservada ao fundo;
  - ciano indica construção futura;
  - faixa clara/turquesa indica segurança;
  - hachura e preenchimento vermelho indicam aviso e perigo ativo.
- Ponto de Fuga foi redesenhado como **Janela de Perspectiva**:
  - V1 ensina uma única faixa trapezoidal, com todas as quinas perigosas;
  - V2 usa duas projeções determinísticas e uma janela segura de reposicionamento;
  - V3 usa três projeções em zigue-zague, com previews antecipados, sobreposição alcançável e nenhum ponto seguro comum aos três beats;
  - a borda visual e a colisão usam a mesma geometria e o centro do jogador como referência;
  - cada beat pode retirar no máximo uma estabilidade.
- O Lab de reconstrução foi definido com `Ponto V1`, `Ponto V2` e `Ponto V3`, uma execução por tentativa, cronômetro relativo e ações `Repeat`/`Lab` ao final.
- A fundação técnica aprovada também inclui:
  - retorno seguro e direto ao menu;
  - Lab visível na primeira abertura em DEV;
  - estabilidade restaurada sem limpar ataque ou mover o jogador no Lab;
  - dano identificado por janela, sem dano atrasado depois de iframe;
  - Ponte V2 temporariamente substituída por V1 no roteiro legado;
  - geometria, timeline e chaves de dano extraídas para módulos puros com Vitest;
  - nenhuma alteração de áudio nesta etapa.
- A especificação completa foi escrita, revisada e aprovada em `docs/superpowers/specs/2026-07-12-leonardo-ponto-de-fuga-vertical-slice-design.md`.
- A especificação foi commitada isoladamente no commit `28e30a1` (`docs: define Leonardo perspective vertical slice`).
- Nenhum código de gameplay ou arte do jogo foi alterado durante esta etapa de design.

## Atualização 2026-07-13 — Vertical slice de Janela de Perspectiva implementada

- Corrigimos o ciclo de vida de `CleopatraScene` e o retorno de Leonardo com `{ openMenu: true }`; cinco ciclos Leonardo → Lab → menu passaram sem travamento ou objetos residuais.
- O Lab agora aparece na primeira abertura em DEV e oferece somente `Ponto V1`, `Ponto V2` e `Ponto V3` durante a reconstrução.
- Cada tentativa executa uma única versão, usa cronômetro relativo, pode ser abortada com `Lab` e termina com `Repeat`/`Lab`.
- Reescrevemos Ponto de Fuga como **Janela de Perspectiva**:
  - faixas trapezoidais determinísticas e recalculadas após resize;
  - moldura de madeira/latão, construção ciana, exterior hachurado no aviso, massa vermelho-escura durante perigo e faixa clara com borda turquesa para segurança;
  - V2 antecipa a segunda faixa; V3 antecipa as faixas seguintes e não possui interseção segura comum aos três beats.
- Extraímos geometria, timeline e registro de dano para módulos puros em `src/game/mechanics/`; o raio e a velocidade canônicos agora também são consumidos por `PlayerController`.
- O dano usa uma chave por janela ativa. A primeira colisão consome a chave mesmo sob iframe, impedindo dano atrasado e limitando cada beat a uma perda de estabilidade.
- Ao zerar estabilidade no Lab, a tentativa continua e a estabilidade volta ao máximo com iframe de 700 ms, sem limpar o ataque nem mover o jogador.
- Ponte Salvadora V2 ficou em quarentena no ponto central de criação e instancia temporariamente V1.
- Reconstruímos Leonardo como um idoso humano reconhecível, com boina vinho, rosto alongado, cabelo/barba prateados, Codex e progressão de obsessão por camadas; o ícone do menu deriva da mesma âncora.
- A arena de Leonardo foi reduzida a sépia de baixo contraste, reservando ciano e vermelho para informação funcional das mecânicas.
- Validação concluída:
  - `npm.cmd test`: 3 suítes, 21 testes aprovados;
  - `npm.cmd run build`: aprovado;
  - regressão visual em 390×844 e 360×800, inclusive resize durante V2;
  - `Repeat`, abort para o Lab, Lab na primeira abertura e cinco ciclos de menu aprovados;
  - V3 forçada no canto confirmou 2 → 1 → restauração para 3 estabilidades nos três beats, sem recentralização ou encerramento prematuro;
  - navegador sem erros de console;
  - hashes de `GameAudio.ts` e de todos os arquivos em `public/audio/` permaneceram idênticos ao início da implementação.
- A vertical slice agora aguarda validação minuciosa no celular antes da escolha da próxima mecânica de Leonardo.

## Atualização 2026-07-13 — Janela de Perspectiva com figuras fechadas

- Após o primeiro teste físico da vertical slice, substituímos integralmente as faixas sobrepostas por três safezones fechadas, menores, fixas e totalmente separadas:
  - A é um trapézio no quadrante superior esquerdo;
  - B é um pentágono convexo no quadrante inferior direito;
  - C é um hexágono irregular convexo no quadrante superior direito.
- A mecânica agora desenha o perímetro da safezone antes de ativar o perigo:
  - guia ciano tracejado e pinos de latão aparecem desde o início;
  - um ponto luminoso percorre o perímetro em turquesa;
  - os 200 ms finais desaceleram e pulsam para enfatizar o fechamento;
  - exatamente no fechamento, o exterior troca da hachura de aviso para massa vermelho-escura e passa a causar dano;
  - a dissipação remove a colisão e dissolve o diagrama como tinta.
- Os quatro perfis determinísticos ficaram explícitos:
  - `v1`: A com 2,5 s de windup;
  - `v2`: A com 1,8 s e B com 2,2 s;
  - `v3-intro`: A/B com 1,8 s e C com 2,2 s;
  - `v3-mature`: A/B/C com 1,8 s.
- Cada beat mantém 650 ms ativos e 250 ms de dissipação. Não existe ghost da próxima figura: B ou C só aparece depois da dissipação completa da anterior.
- O Lab agora usa uma grade 2×2 com `Ponto V1`, `Ponto V2`, `Ponto V3 — estreia` e `Ponto V3 — madura`; `Repeat` repete exatamente o perfil concluído.
- O roteiro temporário passou a declarar perfis e política de limpeza explicitamente:
  - os três primeiros Ponto da tentativa real são `v1 → v2 → v3-intro`;
  - todos os Ponto posteriores usam `v3-mature`;
  - na Ultimate, Ponto maduro ocorre em +8 s e +17 s sem cortar Asa V2 em +8/+14/+20 s;
  - não há mais inferência de cleanup pelo número de ataques do evento.
- Desenho e colisão consomem o mesmo polígono transformado. O resize recompõe figura e exterior de forma atômica no próprio relayout; geometria inválida encerra a instância sem dano residual.
- A chave de dano continua sendo independente por instância e beat; cleanup, iframe e coexistência foram cobertos por regressões de `AttackManager` e do ledger.
- Validação concluída nesta etapa:
  - `npm.cmd test`: 5 suítes, 43 testes aprovados;
  - `npm.cmd run build`: aprovado, restando somente o aviso já conhecido de chunk grande;
  - QA visual em 390×844 e 360×800 para windup, fechamento, active, A/B/C, `Repeat` e resize durante windup/active;
  - navegador sem erros de aplicação no console;
  - `GameAudio.ts` e os 15 arquivos em `public/audio/` mantiveram hashes idênticos ao baseline.
- A implementação segue `docs/superpowers/specs/2026-07-13-leonardo-closed-perspective-windows-design.md` e o plano correspondente. O balanceamento ainda depende de aprovação minuciosa no celular.

## Atualização 2026-07-13 — Arquitetura da luta e Asa em Estudo implementada

- A Janela de Perspectiva foi aceita como a primeira mecânica reconstruída de Leonardo.
- A estrutura futura da luta foi alinhada em quatro estágios de aprendizado:
  - apresentação das mecânicas em V1, com aproximadamente 7–10 s para cada estudo;
  - uma fase mais ativa formada pelas V2;
  - uma fase formada pelas V3;
  - uma fase final mais longa combinando apenas versões V3 maduras.
- As transições deverão comunicar explicitamente que Leonardo está observando, corrigindo e dominando suas invenções.
- Foi aprovada a gramática diegética das páginas de estudo:
  - cada mecânica recebe uma página e uma cor-identidade próprias;
  - a página surge na primeira apresentação V1, recebe correções na V2 e se consolida na V3;
  - na futura fase final, as páginas orbitarão Leonardo e as duas mecânicas escolhidas avançarão diante dele antes da combinação;
  - parte do wind-up das versões maduras será comunicada pela atuação de Leonardo e pela seleção da página.
- A segunda mecânica reconstruída foi definida como **Asa em Estudo**, baseada em atravessar aberturas entre passagens sucessivas de uma asa de lona e madeira.
- Quatro perfis determinísticos foram implementados:
  - `v1`: duas descidas, aberturas esquerda → direita, largura de 3 diâmetros, cadência de 1,1 s e duração total de 7 s;
  - `v2`: descida → subida → descida, aberturas esquerda → direita → centro, largura de 2,5 diâmetros, cadência de 900 ms e duração total de 8 s;
  - `v3-intro`: descida → subida → diagonal, aberturas esquerda → direita → centro, largura de 2,2 diâmetros, cadência de 700 ms e duração total de 7 s;
  - `v3-mature`: mesma geometria da estreia, wind-up menor e duração total de 6,45 s.
- A diagonal foi ajustada de 28° para 20° após uma auditoria detectar que o ângulo inicial permitia permanecer parado na interseção das safezones direita e diagonal. Um teste analítico agora garante separação integral em todas as arenas suportadas.
- O contrato visual da Asa foi implementado com direção do `game-art-director`:
  - traço funcional forte para a passagem atual e fantasma tracejado de baixo contraste somente para a próxima;
  - materialização em lona, nervuras de madeira, juntas e bordo vermelho ativo;
  - V1 assimétrica e instável, V2 reforçada e V3 articulada;
  - clipping exclusivamente visual ao redor da arena, impedindo que a diagonal atravesse o retrato de Leonardo sem alterar a hitbox canônica;
  - dissolução em traços de tinta sem salto espacial ao fim da passagem;
  - leitura preservada em escala de cinza.
- A página violeta da Asa foi integrada ao retrato:
  - não existe no início da V1, emerge depois da primeira passagem e termina como croqui bruto;
  - acumula rasuras e reforços durante as passagens da V2;
  - transforma-se em projeto articulado durante a V3 estreia;
  - na V3 madura, avança diante de Leonardo por 650 ms, pulsa e retorna à camada de estudos.
- O Lab foi generalizado para um seletor `Janela | Asa`; a Asa possui grade 2×2 com os quatro perfis, execução única, cronômetro compacto, `Repeat` exato e retorno direto ao Lab.
- Cada passagem usa uma chave de dano independente `asa:<instância>:<passagem>`. Receber dano ou zerar estabilidade no Lab não encerra, reinicia ou encurta a sequência.
- O roteiro temporário apresenta a Asa somente uma vez em cada estágio da Phase I, em 15 s (`v1`), 45 s (`v2`) e 76 s (`v3-intro`). As ocorrências antigas da Asa foram removidas da Ultimate até as combinações serem redesenhadas.
- Especificação e plano de implementação:
  - `docs/superpowers/specs/2026-07-13-leonardo-asa-em-estudo-design.md`;
  - `docs/superpowers/specs/2026-07-13-leonardo-asa-em-estudo-implementation-plan.md`.
- Validação automatizada concluída:
  - `npm.cmd test`: 8 suítes e 78 testes aprovados;
  - `npm.cmd run build`: aprovado, restando somente o aviso conhecido de chunk grande;
  - QA visual em 360×800 e 390×844, resize durante a V3, estados de página, `Repeat`, abort e escala de cinza;
  - servidor Vite confirmado em `0.0.0.0:5173` para teste contínuo no celular;
  - nenhum arquivo ou comportamento de áudio foi alterado.
- A Asa em Estudo ainda aguarda validação física minuciosa no celular antes de ser considerada aprovada ou de iniciarmos a reconstrução da próxima mecânica.

## Decisões importantes

- O visual é parte central do jogo: cada boss deve ser reconhecível pela silhueta, paleta, arena, símbolos e linguagem dos ataques.
- O primeiro protótipo deve priorizar poucos ataques bem adaptados em vez de muita variedade rasa.
- O modo teste é parte fixa do fluxo de desenvolvimento para validar ataques individualmente antes de colocá-los no modo real.
- A vitória de cada boss representa a absorção de seu conhecimento: o sistema de transferência é compartilhado, mas paleta, selo e colapso visual são específicos de cada personagem.
