# Cogno - Next Steps

Ultima atualizacao: 2026-07-08

## Estado atual aprovado

- Logo limpo sem linhas inferiores aprovado por enquanto.
- Menu de bosses em carousel horizontal, com pegada Geometry Dash + visual historico, aprovado por enquanto.
- Bosses do menu atuais:
  - Cleopatra: jogavel;
  - da Vinci: bloqueado;
  - Genghis Khan: bloqueado.
- Visual base da Cleopatra aprovado por enquanto no caminho hibrido/vetorial:
  - boss principal;
  - icone do menu;
  - retrato do modal;
  - clones do Army of Illusions.

## Proximo passo imediato

Polir os VFX dos ataques para combinarem com a nova linguagem visual da Cleopatra.

Ordem sugerida:

1. Wadjet
   - Prioridade maxima, pois ainda e o ataque visualmente mais estranho.
   - Transformar de "cone verde/cobra flutuando" para uma cobra mais teatral:
     - cobra surge da lateral;
     - wind-up aparece depois da cobra;
     - hitbox efetiva entra;
     - hitbox e wind-up somem;
     - cobra permanece brevemente;
     - cobra some.
   - Evitar telegraph residual depois que a hitbox acaba.

2. Sands of Time
   - Casar melhor com o tema de ampulheta/logo.
   - Manter a ideia aprovada:
     - ampulheta acima da Cleopatra, nao sobre o rosto;
     - areia saindo de baixo e subindo para simbolizar tempo voltando;
     - poder reverter Horus e as duas ultimas cargas de Scarabs ao mesmo tempo;
     - Scarabs reversos com mais wind-up e espacados para durarem perto do tempo de Horus reverso.

3. Ma'at e Glyph
   - Ma'at:
     - manter balanca caindo e bloqueando um lado da arena;
     - lado deve ser aleatorio;
     - balanca deve pender coerentemente para o lado afetado;
     - evitar linhas diagonais douradas e simbolos extras poluindo a safe area.
   - Glyph:
     - manter glifo radial;
     - tamanho deve continuar um pouco menor para permitir combinacoes justas.

4. Scarabs, Nile e Horus
   - Ja estao funcionando melhor, mas precisam de acabamento visual fino.
   - Scarabs:
     - manter 5 projeteis nas fases normais;
     - manter 3 projeteis na Ultimate/arena pequena.
   - Nile:
     - melhorar aviso de subida como enchimento progressivo ate o nivel final.
   - Horus:
     - manter como um dos ataques mais fortes visualmente;
     - polir raios/telegraph para ficar menos generico.

## Depois dos VFX

Retomar playtest das fases completas da boss fight da Cleopatra no iPhone.

Validar:

- Se o Phase Lab facilita testar Phase 1, Phase 2, Phase 3 e Ultimate separadamente.
- Se cada fase tem identidade propria e curva de dificuldade clara.
- Se a duracao de 1m30 nas tres primeiras fases e 1m15 na Ultimate fica boa no mobile.
- Se os ataques combinados continuam justos, legiveis e responsivos no iPhone.
- Se a Phase 1 apresenta todos os ataques core sem combinacoes.
- Se a Phase 2 introduz Sands of Time sem combinacoes completas.
- Se a Phase 3 combina tudo que ja foi apresentado, incluindo Sands completo.
- Se a Ultimate funciona como climax:
  - clones atacando com ritmo mais intenso;
  - Cleopatra principal entrando depois;
  - arena menor, mas ainda justa;
  - sem estrategias passivas obvias nas bordas.

## Pendencias posteriores

- Animacoes de morte e vitoria do player.
- Estados/animacoes mais claros da Cleopatra:
  - idle;
  - preparando ataque;
  - Sands of Time;
  - Ultimate;
  - vitoria/derrota.
- Melhorar musica/trilha sonora futuramente ou retirar se continuar repetitiva.
- Revisitar volumes de SFX e musica em device real.
- Refinar resultado final com progresso/feedback de fase e falas do boss.
- Preparar futura monetizacao por ads:
  - revive com reward ad;
  - cuidado para lutas longas nao parecerem punitivas sem opcao de recuperacao.
- Futuramente redesenhar e implementar os bosses seguintes, com da Vinci como proximo boss bloqueado no menu.
