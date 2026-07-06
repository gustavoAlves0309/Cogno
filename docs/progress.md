# Cogno - Progress

Última atualização: 2026-07-06

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

## Decisões importantes

- O visual é parte central do jogo: cada boss deve ser reconhecível pela silhueta, paleta, arena, símbolos e linguagem dos ataques.
- O primeiro protótipo deve priorizar poucos ataques bem adaptados em vez de muita variedade rasa.
- O modo teste é parte fixa do fluxo de desenvolvimento para validar ataques individualmente antes de colocá-los no modo real.
