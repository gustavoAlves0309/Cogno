# Cogno - Cronômetro por fase

Data: 2026-07-10

## Objetivo

Adicionar ao HUD um cronômetro pequeno que permita registrar o instante de trechos difíceis da luta. O tempo deve ser relativo ao estágio visual atual e reiniciar quando o indicador romano avançar.

## Comportamento

- Durante um combate ativo, o canto superior direito mostra apenas o tempo no formato `m:ss`.
- O cronômetro começa em `0:00` e conta segundos completos.
- O tempo reinicia nas entradas dos estágios I, II, III, IV e V.
- O estágio V corresponde ao início do Finale da Ultimate.
- No Lab, cada fase selecionada começa em `0:00`; a Ultimate também reinicia ao entrar no Finale.
- Nos menus principais e após vitória ou derrota, o cronômetro fica oculto. As mensagens de seleção e conclusão do Lab podem continuar usando o mesmo objeto de texto sem serem tratadas como tempo de combate.

## Implementação

O objeto Phaser `timerText` existente será reutilizado. Sua posição responsiva no canto superior direito e seu estilo atual serão preservados.

O tempo mostrado será calculado a partir do relógio do script e dos marcos já existentes da luta:

- I: início da Phase 1;
- II: `PHASE_TWO_AT_MS`;
- III: `PHASE_THREE_AT_MS`;
- IV: `ULTIMATE_AT_MS`;
- V: `ULTIMATE_AT_MS + ULTIMATE_FINALE_AUDIO_AT_MS`.

Um helper isolado retornará o tempo relativo ao estágio atual. Isso evita um segundo relógio mutável e mantém a exibição sincronizada com ataques, música e indicador romano.

## Escopo

A mudança não altera duração de fases, ordem ou timing de ataques, música, hitboxes, controles nem balanceamento. Nenhum novo elemento interativo será criado.

## Validação

- Executar `npm.cmd run build`.
- Confirmar em viewport mobile e desktop que o cronômetro não sobrepõe os selos de estabilidade nem o indicador romano.
- Confirmar início em `0:00` e avanço contínuo durante Phase 1.
- Confirmar reinício nos estágios II, III, IV e V.
- Confirmar o comportamento no Lab, incluindo a passagem da abertura da Ultimate para o Finale.
- Confirmar que menu, vitória e derrota não exibem o cronômetro e que não há erros no console.
