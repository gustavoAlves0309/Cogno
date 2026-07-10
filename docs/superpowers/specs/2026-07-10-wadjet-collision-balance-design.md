# Cogno - Correção de colisão e combinação do Wadjet

Data: 2026-07-10

## Objetivo

Corrigir o dano ocasional nas quinas realmente seguras do Wadjet e remover a sobreposição do último Wadjet da Phase 2 com o Horus reverso, mantendo a sequência intensa e com cerca de meio segundo para reposicionamento.

## Correção da colisão

No primeiro instante do estado ativo, `getActiveReach()` retorna zero. Isso gera um triângulo degenerado que `Phaser.Geom.Triangle.Contains` interpreta como contendo qualquer ponto.

`collides()` deve retornar `false` enquanto o alcance for zero, antes de construir ou consultar o triângulo. A duração, a expansão e a geometria final do Wadjet permanecem inalteradas.

## Retiming da Phase 2

O Wadjet será colocado entre o Horus normal e o Horus reverso:

- Horus normal: `71600` para `71000` ms;
- Wadjet final: `85200` para `78800` ms;
- Sands of Time permanece em `80600` ms.

As janelas danosas ficam assim, antes da soma comum da transição de fase:

- último raio do Horus normal: `79600` ms;
- Wadjet ativo: `80170–81370` ms;
- primeiro raio do Horus reverso: `81910` ms.

Isso deixa 570 ms antes do Wadjet e 540 ms depois dele. Mover somente o Wadjet criaria uma pequena sobreposição com o Horus normal; atrasar Sands empurraria o Horus reverso para dentro da Phase 3.

## Fora de escopo

- Não alterar as outras aparições de Wadjet.
- Não alterar duração, hitbox final ou visual do cone.
- Não alterar o combo Wadjet com Scarabs reversos.
- Não alterar o comportamento de resize nem a fresta visual das quinas opostas.

## Validação

- No instante `1369 ms`, todas as quinas devem permanecer sem colisão.
- No instante `1370 ms`, todas as quinas devem permanecer sem colisão.
- Com alcance completo, somente as duas quinas do lado da cobra devem permanecer seguras.
- A auditoria da Phase 2 deve confirmar as folgas de 570 e 540 ms.
- Executar `npm.cmd run build`.
- Fazer smoke test mobile no Lab e confirmar ausência de erros no console.
