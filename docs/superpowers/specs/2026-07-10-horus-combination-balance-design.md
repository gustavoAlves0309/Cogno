# Cogno - Balanceamento das combinações de Horus

Data: 2026-07-10

## Objetivo

Remover as situações em que Horus exige deslocamento horizontal enquanto Ma'at ou Glyph bloqueiam esse deslocamento. Cada ataque deve manter seu comportamento individual e as combinações devem continuar intensas, mas sempre oferecer uma rota viável.

## Regra de composição

- As janelas danosas de Horus e de Ma'at/Glyph devem ficar separadas por pelo menos 1 segundo.
- Telegraphs podem coexistir com outra janela ativa.
- Horus inclui o ataque normal, o Horus reverso produzido por Sands of Time e os ataques completos da Cleopatra no Finale.
- Mini Horus e mini Glyph da Army of Illusions ficam fora deste ajuste porque possuem hitboxes e funções diferentes.

## Abordagem

Retimar somente os eventos conflitantes nas timelines determinísticas. Não serão alterados duração, velocidade, colisão, telegraph ou dano dos ataques. Também não será criado um gate runtime no `AttackManager`, evitando filas de ataques e mudanças imprevisíveis na coreografia.

### Timeline principal

- Phase 1: Horus de `80000` para `76200` ms.
- Phase 3, primeiro bloco: Ma'at de `15400` para `20000` ms e Glyph de `17900` para `22200` ms.
- Phase 3, segundo bloco: Ma'at de `44800` para `49800` ms e Glyph de `47600` para `52000` ms.
- Phase 3, terceiro bloco: Ma'at de `69000` para `74000` ms e Glyph de `72400` para `76200` ms.

Os três Ma'at da Phase 3 passam a ativar 1,28 segundos depois do último raio danoso do Horus reverso.

### Finale da Ultimate

- Ma'at de `47200` para `49500` ms.
- Ma'at de `62400` para `53000` ms.
- Horus de `59000` para `59400` ms.
- Glyph de `67600` para `68200` ms.

Esses ajustes produzem folgas de 1,14 segundos após o primeiro Horus e de 1,08 segundos antes e depois do segundo Horus.

## Validação

- Auditar matematicamente todas as janelas de Horus contra Ma'at/Glyph e exigir separação mínima de 1000 ms.
- Executar `npm.cmd run build`.
- Validar no Lab a Phase 1, a Phase 3 e o Finale da Ultimate em viewport mobile.
- Confirmar que os telegraphs continuam legíveis, nenhuma janela danosa conflitante coincide e não há erros no console.
- Manter o servidor de desenvolvimento acessível no celular durante o playtest.
