# Cogno - Cleopatra Boss Script

## Fonte

Este arquivo traduz para `Cogno` as mecanicas do documento externo `Cleopatra_BossFight_Mecanicas.md`, vindo do prototipo `Heranca`. A fonte original descreve uma boss fight 2D com HP, plataformas, dano ao boss e transicoes por vida. Aqui a adaptacao e para mobile survival: arena quadrada, drag direto, sem atacar a boss, vencendo ao sobreviver ate o fim do script.

## Decisoes De Adaptacao

- HP da boss vira tempo de script.
- Fases por porcentagem de vida viram atos cronologicos.
- Ataques de plataforma viram padroes de arena.
- Mecanicas de DPS-check viram ondas de pressao ou leitura.
- Clones, orbes e hieroglifos viram sistemas de telegraph e variacao.
- O jogador nao bate na Cleopatra; ele atravessa a memoria simbolica dela.

## Arena Base

- Formato: quadrado central em tela mobile vertical.
- Controle: o dedo arrasta um nucleo pequeno.
- Dano: tocar ataque reduz vida/estabilidade, mas o prototipo pode usar 3 coracoes ou uma barra simples.
- Vitoria: sobreviver ao script completo.
- Duracao alvo do primeiro prototipo: 60 a 90 segundos.

## Vocabulario De Ataques

### Praga De Escaravelhos

Origem: `Scarab's Plague`.

Adaptacao:

- Salvas de 3 escaravelhos em linha reta.
- Cada escaravelho mira a posicao atual do nucleo no momento do disparo.
- Bom ataque introdutor: ensina que ficar parado e perigoso.
- Variante azul: dois escaravelhos extras mais rapidos apos breve pausa.
- Variante vermelha: escaravelhos maiores e mais lentos.

Uso no prototipo:

- Comecar com uma salva lateral simples.
- Depois combinar com Nilo ou Horus para forcar deslocamento planejado.

### Protecao De Wadjet

Origem: `Wadjet's Protection`.

Adaptacao:

- Cones triangulares surgem dos lados da arena.
- Telegraph amarelo por curto tempo antes do dano.
- A forma triangular deve parecer uma cobra abrindo guarda.
- Variante vermelha: cones mais longos, reduzindo a zona segura.
- Variante azul: cones extras de cima/baixo apos o ataque principal.

Uso no prototipo:

- Ensinar leitura de triangulos.
- Criar janelas no centro e depois quebrar essa seguranca com variante azul.

### Iteru Aur / Nilo Sobe

Origem: `Iteru Aur`.

Adaptacao:

- Uma faixa de agua ocupa parte inferior ou lateral da arena.
- A agua sobe, fica ativa e desce.
- Em arena quadrada, a agua pode ser horizontal, vertical ou diagonal em fases posteriores.
- O ataque cria pressao posicional, nao reflexo puro.

Uso no prototipo:

- Primeiro ato: faixa horizontal simples.
- Final: Nilo + escaravelhos para empurrar o jogador a atravessar corredores seguros.

### Guardas Thoraktais

Origem: `Spawn Thoraktais`.

Adaptacao:

- Dois guardas aparecem nas bordas esquerda/direita.
- Cada um projeta cone para dentro da arena.
- No padrao basico, existe zona segura central.
- Variante vermelha: cones maiores eliminam quase toda a zona central.
- Variante azul: segunda leva com cones diagonais e um retangulo horizontal central.

Uso no prototipo:

- Servir como ataque de "cerco" de Cleopatra.
- Bom para combinar com movimentos verticais do Nilo.

### Maldicao De Anubis

Origem: `Curse of Anubis`.

Adaptacao:

- Sarcofagos marcam posicoes preditivas baseadas na velocidade do nucleo.
- Telegraph circular claro.
- Explodem apos atraso curto.
- O ataque pune movimento automatico demais, mas deve manter tempo justo para corrigir rota.

Uso no prototipo:

- Segundo ato, apos o jogador ja entender movimento por drag.
- Excelente para criar uma leitura de "nao fuja em linha reta".

### Olho De Horus

Origem: `Horus' Eye`.

Adaptacao:

- Um olho aparece no centro ou em canto da arena.
- Raios radiais disparam em 12 direcoes.
- A cada rodada, o conjunto rotaciona alguns passos.
- Variante vermelha: raios mais largos.
- Variante azul: segunda salva sem wind-up longo, criando ritmo duplo.

Uso no prototipo:

- Ataque visual assinatura.
- Pode funcionar como mini-relogio: o jogador aprende o intervalo e atravessa entre raios.

### Falcao Em Mergulho

Origem: `Swooping Falcon`.

Adaptacao:

- Falcoes cruzam lanes da arena.
- Primeiro aparecem como sombra/linha de entrada sem dano.
- Depois mergulham rapido com hitbox ativa.
- Variante vermelha: lanes mais largas.
- Variante azul: tres falcoes fazem duas passadas.

Uso no prototipo:

- Bom ataque de ritmo e leitura de faixas.
- Funciona melhor quando as lanes sao poucas e muito legiveis.

### Balanca De Ma'at

Origem: `Sacred Balance`.

Adaptacao:

- A arena e dividida em duas metades.
- Uma balanca visual indica qual lado sera julgado.
- Uma laje/placa ocupa metade da arena apos telegraph.
- Variante vermelha: a area julgada cresce para dentro.
- Variante azul: o lado inicialmente seguro tambem recebe segunda queda com atraso.

Uso no prototipo:

- Ataque de decisao grande: esquerda ou direita.
- Deve ser raro e marcante, nao spamado.

### Hieroglifos E Orbes

Origem: `Sphinx's Riddle`, `Mark Hieroglyphs`.

Adaptacao:

- Seis hieroglifos ficam em volta da arena.
- Antes de uma onda, alguns acendem.
- Orbe vermelho significa "maior/mais forte".
- Orbe azul significa "extra/segunda camada".
- O jogador aprende a prever como o ataque mudara antes dele acontecer.

Uso no prototipo:

- Introduzir no ato 2.
- Comecar com apenas 2 ou 3 hieroglifos para nao sobrecarregar.

### Veu De Isis

Origem: `Isis Veil`.

Adaptacao:

- Um clone espelhado da Cleopatra aparece.
- Boss e clone executam ataques simultaneos de familias diferentes.
- Em `Cogno`, o clone nao precisa ser alvo; ele so duplica a linguagem de ataque.

Uso no prototipo:

- Ato 3.
- Combinar um ataque de borda com um ataque radial, nunca dois padroes caoticos no inicio.

### Areias Do Tempo

Origem: `Sands of Time`.

Adaptacao:

- A arena marca a posicao atual do nucleo com um selo dourado.
- Alguns segundos depois, o nucleo e puxado ou teleportado de volta para aquele selo.
- O jogador precisa lembrar onde estava e evitar que a posicao antiga vire armadilha.

Uso no prototipo:

- Ataque especial de meio/fim de fase.
- Deve ter telegraph muito claro para parecer justo.

### Exercito De Ilusoes

Origem: Fase 3 de clones.

Adaptacao:

- Varias silhuetas de Cleopatra aparecem nas bordas.
- Todas somem, trocam de lugar e reaparecem.
- Apenas uma tem marcador dourado, indicando a "verdadeira" fonte do proximo padrao.
- O jogador nao ataca a verdadeira; ele usa o marcador para prever a origem correta do ataque.

Uso no prototipo:

- Final da fase.
- Bom climax visual, mas deve usar poucos elementos no primeiro teste.

## Script Recomendado Para Primeiro Prototipo

Duracao alvo: 75 segundos.

### Ato 1 - Corte Do Nilo (0s a 20s)

Objetivo: ensinar ataques isolados.

1. Escaravelhos: 3 tiros mirando a posicao atual.
2. Nilo: faixa horizontal sobe e desce.
3. Wadjet: cones laterais com zona segura central.
4. Falcao: uma passada por lane.

### Ato 2 - Enigma Da Esfinge (20s a 45s)

Objetivo: introduzir modificadores.

1. Dois hieroglifos acendem.
2. Orbe vermelho modifica Wadjet: cones maiores.
3. Orbe azul modifica Scarab: tiros extras.
4. Horus aparece com raios radiais simples.
5. Balanca de Ma'at divide a arena uma vez.

### Ato 3 - Veu De Isis (45s a 65s)

Objetivo: combinar sistemas sem virar ruido.

1. Clone espelhado aparece.
2. Cleopatra real usa Horus.
3. Clone usa Wadjet simplificado.
4. Sarcofagos de Anubis marcam duas posicoes preditivas.
5. Areias do Tempo marca uma posicao e puxa o nucleo de volta.

### Final - Silencio Do Trono (65s a 75s)

Objetivo: encerrar com beleza e leitura.

1. Nilo cria uma faixa segura estreita.
2. Horus gira uma ultima vez.
3. Ma'at julga metade da arena.
4. Todos os ataques cessam; a arena escurece; o jogador venceu se ainda esta estavel.

## Prioridade Para Prototipo

Para a primeira versao jogavel de `Cogno`, implementar apenas:

1. Drag do nucleo dentro da arena.
2. Escaravelhos mirando o jogador.
3. Nilo como faixa que sobe.
4. Wadjet como cones laterais.
5. Horus como raios radiais.
6. Um mini-script de 45 a 60 segundos.

Depois adicionar:

1. Hieroglifos/orbes.
2. Balanca de Ma'at.
3. Clone de Isis.
4. Areias do Tempo.
5. Exercito de Ilusoes.

## Riscos

- Muitas referencias podem virar ruido visual se entrarem cedo demais.
- O jogador precisa entender o ataque pelo desenho, nao por texto.
- O survival precisa ter satisfacao de progresso, ja que nao ha dano ao boss.
- Telegraphs precisam ser bonitos e justos.
- O tema historico deve inspirar mecanica, nao apenas decorar padroes genericos.
