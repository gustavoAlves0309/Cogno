# Cogno - Cleopatra Prototype Design

Data: 2026-07-06
Status: aprovado para planejamento de implementacao

## Contexto

`Cogno` e um survival mobile em arena pequena onde o jogador sobrevive ao script simbolico de uma figura historica. A primeira boss sera Cleopatra. Os documentos base sao:

- `ficha.md`
- `cleopatra-script.md`

A lista de ataques importada de outro jogo deve ser tratada como materia-prima, nao como backlog literal. Os ataques precisam ser adaptados ao formato real de `Cogno`: mobile, drag direto, boss fora da arena, palco livre e arena como limite do player.

## Objetivo Do Primeiro Prototipo

Criar uma vertical slice jogavel de 50 a 60 segundos que prove:

- se o drag direto em uma arena quadrada e confortavel no celular;
- se sobreviver a um script, sem atacar o boss, e satisfatorio;
- se Cleopatra fora da arena funciona como fonte dramatica dos ataques;
- se ataques vindos de fora da arena sao legiveis e justos;
- se a identidade historica do boss aparece pelo visual e pelas mecanicas.

## Decisao Tecnica

O prototipo sera feito em Web/HTML5 com Phaser e TypeScript.

Motivos:

- Codex consegue implementar e iterar todo o codigo localmente.
- Gustavo pode testar no iPhone pelo navegador usando o IP da maquina na rede local.
- O mesmo projeto pode virar PWA.
- Se a base for aprovada, o jogo pode ser empacotado depois para iOS e Android com Capacitor.

## Principio Central De Camadas

A tela inteira e o palco dramatico. A arena quadrada nao limita os ataques; ela limita apenas o movimento do player.

Camadas:

- `Stage Layer`: tela inteira, onde boss, clones, efeitos e ataques podem existir livremente.
- `Arena Boundary`: quadrado decorado que prende o nucleo do jogador.
- `Attack Layer`: ataques nascem do boss ou de fontes externas e atravessam o palco.
- `Collision Layer`: calcula dano quando hitboxes ativas intersectam o nucleo.
- `UI Layer`: vida/estabilidade, timer, menus de modo real e modo teste.

Esse principio permite ataques no estilo Undertale: o boss fica fora da arena, e alguns golpes podem ser vistos viajando pela tela antes de cruzar a zona onde o player esta preso.

## Modos Do Prototipo

### Modo Real

Uma fase curta da Cleopatra com:

- inicio, progressao e fim;
- vida/estabilidade do nucleo;
- derrota ao perder toda a estabilidade;
- vitoria ao sobreviver ao script;
- ataques agendados por tempo.

Esse modo responde se a experiencia ja parece um jogo.

### Modo Teste

Um laboratorio para testar ataques individualmente, no mesmo palco do modo real.

Controles esperados:

- voltar ao modo real;
- disparar cada ataque isoladamente;
- ativar loop do ataque selecionado;
- ajustar parametros basicos se couber no primeiro ciclo, como velocidade, duracao e tempo de telegraph.

No desktop, o modo teste pode ser acessado por teclado. No celular, deve existir um botao discreto em uma tela inicial ou menu simples.

## Ataques Iniciais

O primeiro prototipo deve ter poucos ataques, mas bem adaptados e legiveis. A variedade cresce depois.

### 1. Escaravelhos Da Coroa

Cleopatra dispara tres projeteis em sequencia a partir do corpo dela. Cada escaravelho mira a posicao do nucleo no momento do disparo e atravessa a tela ate cruzar a arena.

Funcao jogavel:

- ensinar que ficar parado e perigoso;
- deixar claro que ataques podem nascer fora da arena;
- criar pressao simples sem poluir a tela.

### 2. Nilo Ascendente

Uma faixa de agua nasce fora da arena e sobe atravessando o palco. Quando cruza a arena, ocupa uma faixa horizontal perigosa por alguns instantes.

Funcao jogavel:

- ensinar leitura de territorio;
- forcar reposicionamento;
- criar momentos de corredor seguro.

### 3. Wadjet Lateral

Um simbolo/cobra aparece em uma lateral externa do palco. Primeiro telegrafa um cone, depois projeta o ataque em direcao a arena.

Funcao jogavel:

- ensinar leitura de origem e angulo;
- fazer o jogador reagir ao palco inteiro, nao apenas as bordas do quadrado;
- criar zonas seguras claras.

### 4. Olho-Sol De Horus

Um olho solar aparece fora ou acima da arena. Ele tem raios como um sol e gira lentamente. Os raios alternam entre estados:

- apagado/inativo: linha fraca, sem dano;
- acendendo/telegraph: brilho crescente;
- aceso/ativo: raio com hitbox;
- apagando: perde forca e deixa de causar dano.

Funcao jogavel:

- criar ataque assinatura da Cleopatra;
- gerar ritmo e leitura musical;
- evitar uma parede radial permanente e injusta.

## Script Do Modo Real

Duracao alvo: 50 a 60 segundos.

Estrutura inicial:

- 0s a 10s: movimento e Escaravelhos Da Coroa.
- 10s a 22s: Nilo Ascendente sozinho, depois com escaravelhos leves.
- 22s a 36s: Wadjet Lateral alternando lados e angulos simples.
- 36s a 50s: Olho-Sol De Horus como ataque assinatura.
- 50s a 60s: final curto combinando dois padroes sem caos, provavelmente Nilo + escaravelhos ou Horus + Wadjet simplificado.

O objetivo desse script nao e dificuldade alta. Ele deve provar leitura, conforto e identidade.

## Visual E Identidade Historica

O visual e parte central do design. Ao fim do projeto, o jogador deve conseguir identificar qual figura historica esta enfrentando mesmo sem depender de texto explicativo.

Para cada boss, incluindo Cleopatra, a identificacao deve vir de:

- silhueta do boss;
- paleta propria;
- ornamentacao da arena;
- simbolos historicos e miticos;
- tipo de movimento dos ataques;
- ritmo da fase;
- animacoes de entrada, telegraph e impacto.

Direcao para Cleopatra:

- fundo escuro e teatral;
- arena quadrada ornamentada como camara ritual egipcia;
- Cleopatra como silhueta/regente fora da arena;
- ouro envelhecido para boss, coroa e escaravelhos;
- azul do Nilo para agua e energia solar/fria;
- verde para Wadjet e veneno;
- branco quente para o nucleo do player;
- telegraphs bonitos e muito claros.

A arte do prototipo nao precisa ser final, mas deve ter ambicao visual desde cedo. O jogo nao deve parecer um bullet-hell generico com tema colado por cima.

## Input E Mobile

O player controla um nucleo pequeno por drag direto.

Regras:

- no celular, o dedo arrasta o nucleo;
- no desktop, o mouse simula o dedo;
- o nucleo fica preso aos limites da arena quadrada;
- ataques podem atravessar a tela inteira;
- dano acontece quando uma hitbox ativa toca o nucleo.

O primeiro teste no iPhone deve calibrar:

- tamanho da arena;
- posicao vertical da arena na tela;
- velocidade/sensibilidade do drag;
- legibilidade do nucleo sob o dedo;
- espaco visual para ver ataques chegando de fora.

## Validacao

Antes de considerar o prototipo jogavel pronto:

- executar build TypeScript sem erro;
- testar modo real no desktop;
- testar modo teste no desktop;
- testar no iPhone via servidor local na mesma rede;
- verificar se o player nao sai da arena;
- verificar se ataques atravessam o palco antes de colidir;
- verificar se telegraphs sao legiveis antes do dano;
- capturar screenshot ou inspecao visual para checar enquadramento em desktop e mobile.

## Fora Do Escopo Inicial

Ficam para depois:

- hieroglifos e orbes;
- Balanca de Ma'at;
- Maldicao de Anubis;
- Areias do Tempo;
- clones do Veu de Isis;
- Exercito de Ilusoes;
- progressao entre multiplos bosses;
- empacotamento real para App Store e Play Store.

Esses sistemas dependem de uma linguagem visual mais madura e devem entrar depois que o nucleo de movimento, palco, arena e ataques iniciais estiver validado.
