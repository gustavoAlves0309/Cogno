---
titulo: Cogno
status: conceito
generos: [survival, bullet-hell, historico]
tags: [mobile, arena, boss-script, historia, drag]
plataformas: [mobile]
data_criacao: 2026-07-06
ultima_atualizacao: 2026-07-06
prototipo:
---

# Cogno

## Pitch

Um survival mobile em arena pequena onde cada fase coloca o jogador para sobreviver ao script de uma figura historica. O jogador arrasta um nucleo com o dedo dentro de uma arena quadrada e desvia de ataques inspirados por simbolos, feitos, epoca e contradicoes dessa pessoa.

## Direcao

A referencia importante e a ideia de uma arena compacta e ataques com personalidade, mas **Cogno nao deve ser uma batalha direta**. O jogador nao precisa derrotar a figura. Ele precisa sobreviver ao fluxo mental/simbolico dela ate o script terminar.

O jogo deve parecer uma travessia por mentes historicas: cada chefe e um retrato dramatizado, quase uma memoria hostil. A vitoria e resistir, compreender o ritmo e atravessar aquela interpretacao.

## Mobile Fit

- Tela em retrato.
- Arena quadrada no centro.
- Controle por drag direto: o dedo arrasta o nucleo do jogador.
- Fases curtas, com 45 a 120 segundos.
- Sem muitos botoes; o desafio esta em leitura, reflexo e posicionamento.

## Player Fantasy

Entrar em uma galeria viva da historia mundial e sobreviver ao imaginario de grandes figuras. Cada fase deve fazer o jogador sentir: "estou desviando de ideias, estrategias e mitos dessa pessoa", nao apenas de projeteis genericos.

## Core Loop

1. Escolher ou entrar em uma figura historica.
2. Ver uma curta introducao visual ao tema da fase.
3. Sobreviver a ondas de ataque dentro da arena quadrada.
4. Ler padroes que evoluem em fases do script.
5. Chegar ao fim do survival e desbloquear a proxima figura.

## Regras Base

- O jogador controla um nucleo pequeno e vulneravel.
- O nucleo perde vida, estabilidade ou memoria ao tocar ataques.
- A fase termina quando o script da figura chega ao fim.
- Ataques devem ser telegraficos, justos e tematicamente claros.
- A dificuldade cresce por combinacao de padroes, nao por poluicao visual gratuita.

## Filosofia De Ataques

Cada ataque precisa passar por dois filtros:

- **Tematico:** este padrao tem relacao com a figura?
- **Jogavel:** este padrao cria uma decisao espacial interessante?

Um bom ataque de Cogno nao e apenas uma referencia historica. Ele precisa transformar referencia em movimento: linhas, cerco, orbitas, mapas, simbolos, rios, formulas, tropas, fronteiras, espelhos, coroas, constelacoes.

## Primeira Boss: Cleopatra

Cleopatra e uma boa primeira boss porque mistura visual forte, politica, seducao, rio, dinastia, veneno, aliancas e queda imperial. A fase pode ser bonita e legivel sem depender de realismo historico pesado.

Referencia mecanica importada: `cleopatra-script.md`.

### Fantasia Da Fase

A arena vira uma camara egipcia abstrata. Cleopatra aparece como silhueta/regente acima da arena. O jogador nao luta contra ela: sobrevive a uma coreografia de poder, rio, serpentes e aliancas quebradas.

### Ideias De Ataques

- **Praga de Escaravelhos:** projeteis em linha miram a posicao atual do nucleo em salvas curtas.
- **Protecao de Wadjet:** cones de cobra atacam pelos lados, criando leitura de triangulos e zonas centrais.
- **Iteru Aur / Nilo Sobe:** faixas horizontais de agua atravessam a arena, deixando corredores seguros que mudam de altura.
- **Guardas Thoraktais:** sentinelas nas bordas projetam cones convergentes e depois variantes diagonais.
- **Maldicao de Anubis:** sarcofagos marcam posicoes futuras do jogador e explodem apos telegraph circular.
- **Olho de Horus:** raios radiais rotativos criam relogios de esquiva.
- **Falcao em Mergulho:** aves atravessam lanes da arena em passadas rapidas.
- **Balanca de Ma'at:** metade da arena e julgada/esmagada, forcando troca de lado.
- **Areias do Tempo:** a arena marca uma posicao antiga e puxa o nucleo de volta alguns segundos depois.
- **Coroa Dupla:** dois aneis giram em sentidos opostos, abrindo janelas ritmadas.
- **Espelhos De Alexandria:** projeteis aparecem em pares espelhados, ensinando simetria.
- **Enigma da Esfinge:** hieroglifos recebem orbes vermelhos/azuis que modificam o proximo ataque.
- **Veu de Isis:** clones espelhados executam ataques simultaneos, mantendo um sinal claro do perigo real.

### Estrutura Possivel Do Script

1. **Corte Do Nilo:** ataques isolados ensinam escaravelhos, Wadjet, Nilo e falcoes.
2. **Enigma Da Esfinge:** hieroglifos anunciam ataques modificados por orbes vermelhos/azuis.
3. **Veu De Isis:** clones espelhados combinam dois padroes ao mesmo tempo.
4. **Exercito De Ilusoes:** varias Cleopatras aparecem; o jogador sobrevive lendo qual sinal e verdadeiro.
5. **Silencio Do Trono:** padrao final curto, belo e preciso, com Nilo, Horus e Ma'at em sequencia.

## Bosses Futuras

- **Isaac Newton:** gravidade, inercia, macas, orbitas, prismas e decomposicao de luz.
- **Albert Einstein:** dilatacao, curvas no espaco, relatividade de velocidade e clones atrasados.
- **Gengis Khan:** cercos, cavalgadas em arco, flechas das bordas e conquista de territorios.
- **Simon Bolivar:** fronteiras moveis, mapas se partindo, rotas de libertacao e zonas de revolta.
- **Joana d'Arc:** estandartes, fogo, vozes, linhas de marcha e areas de fe.
- **Leonardo da Vinci:** maquinas, engrenagens, asas, desenhos tecnicos e anatomia geometrica.

## Visual / Mood

Arena limpa, quase teatral. Cada boss pode ter uma paleta propria, mas o sistema deve manter consistencia: fundo escuro, arena clara, ataques graficos e muito legiveis. As figuras historicas podem aparecer como retratos estilizados, silhuetas, mascaras ou gravuras vivas.

Cleopatra deve puxar para ouro envelhecido, azul do Nilo, preto profundo, verde veneno e linhas de hieroglifo. O visual precisa sugerir historia sem virar ilustracao escolar.

## Diferencial

O diferencial e usar historia como motor de design de fases. A figura nao e so tema visual; ela define o vocabulario de ataques, o ritmo e o tipo de decisao que o jogador toma.

## O Que Um Prototipo Deve Provar

- Se drag direto em arena pequena e preciso e confortavel.
- Se sobreviver a um script e satisfatorio mesmo sem atacar.
- Se Cleopatra gera ataques visualmente marcantes e mecanicamente variados.
- Se a fase consegue parecer inspirada historicamente sem depender de texto.
- Se o jogo cria vontade de ver "qual seria o ataque" de outras figuras.

## Avaliacao Do Conceito

Score rapido:

- Potencial:

Notas:

- Funcionou:
- Nao funcionou:
- Proximo teste:
