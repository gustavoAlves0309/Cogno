# Cogno - App Factory Review

Data da revisao: 2026-07-09

## Resumo para ClickUp

Cogno e um jogo survival mobile/web em arena curta, feito em Phaser + TypeScript, em que o jogador desvia de ataques teatrais de bosses historicos. O prototipo atual foca na boss Cleopatra, com arena pequena, controle por drag, fases de dificuldade, ataques inspirados em simbolos egipcios e um Lab para testar/refinar cada ataque antes de integrar na luta completa. O objetivo imediato e validar legibilidade, ritmo e impacto visual dos VFX no celular, preparando uma base reutilizavel para novos bosses como da Vinci e Genghis Khan.

## Nome provisorio

Cogno

## Descricao expandida

Cogno e um jogo arcade/survival de sessoes curtas para mobile e web. O jogador controla um pequeno avatar dentro de uma arena quadrada enquanto uma figura historica fora da arena executa padroes de ataque visualmente tematicos. A primeira experiencia jogavel e a luta contra Cleopatra, com ataques como escaravelhos, cheia do Nilo, cobra Wadjet, Olho de Horus, Sands of Time, Ma'at, Glyph e Army of Illusions. O produto busca combinar aprendizado estetico/cultural leve, boss fights memoraveis e loop rapido de tentativa, derrota e melhoria.

## Premissas assumidas

- Plataforma inicial: web/PWA jogavel em navegador mobile, com possibilidade futura de empacotar para iOS/Android.
- Stack atual: Phaser + TypeScript + Vite.
- MVP inicial: uma boss fight completa da Cleopatra, menu de bosses e estrutura para novos bosses bloqueados.
- Monetizacao futura: ads/rewarded ads e possivel compra unica para remover ads ou desbloquear cosmeticos/conteudo.
- Sem login obrigatorio no MVP.
- Sem backend obrigatorio no MVP, exceto analytics/ads no futuro.
- Sem coleta de dados sensiveis.
- Conteudo historico sera usado de forma estilizada, com assets proprios.

## Publico-alvo

Primario: jogadores casuais mobile que gostam de desafios curtos, boss fights, reflexo e progressao de habilidade.

Secundario: pessoas atraidas por temas historicos/mitologicos, estudantes ou curiosos que aceitam uma experiencia mais estilizada do que educativa formal.

## Nota final

7,2 / 10

## Veredito

Candidata mediana com bom potencial estrategico.

Pela matriz app-factory, Cogno nao e automaticamente uma excelente candidata porque jogos dependem muito de retencao, polimento e aquisicao organica. Ainda assim, o projeto tem pontos fortes: MVP web barato, backend minimo, loop de gameplay recorrente, baixo risco LGPD e uma engine de bosses que pode ser reaproveitada.

## Notas por bloco

| Bloco | Nota |
|---|---:|
| Retorno rapido, monetizacao e recorrencia | 6,7 |
| Facilidade de desenvolvimento e lancamento | 7,7 |
| Risco, aprovacao e manutencao | 7,4 |

## Notas criticas

| Criterio | Nota | Motivo |
|---|---:|---|
| Recorrencia natural | 7,5 | Loop curto de tentativa e melhoria pode gerar uso semanal/diario se a luta ficar justa e viciante. |
| Payback 30-90 dias | 5,5 | Receita por ads/IAP e plausivel, mas depende de retencao e distribuicao; jogos casuais sofrem com descoberta. |
| Complexidade tecnica | 7,5 | Phaser e arquitetura atual favorecem iteracao rapida, mas polimento de VFX, balanceamento e mobile QA ainda consomem tempo. |
| Risco juridico/LGPD | 8,5 | Baixo risco se ficar sem login, sem dados sensiveis e com assets proprios/licenciados. |

## Tetos aplicados

Nenhum teto rigido aplicado.

Observacao: se o app passar a usar marcas, imagens historicas protegidas, UGC, ranking com perfil publico, dados pessoais ou publicidade comportamental sem cuidado, a nota deve ser reavaliada.

## Principais motivos da nota

1. Boa recorrencia potencial: jogos de reflexo com fases curtas podem criar repeticao natural.
2. MVP tecnico ja esta em andamento e roda localmente no browser mobile.
3. Backend minimo reduz custo variavel e risco operacional.
4. A linguagem de bosses historicos pode virar uma engine reutilizavel para varias lutas.
5. A aquisicao organica e o payback ainda sao incertos, especialmente em mercado de jogos mobile concorrido.
6. O produto depende fortemente de polimento visual, feedback, balanceamento e feeling no celular.

## Principal ponto de atencao

Validar retencao antes de pensar em monetizacao pesada. O risco principal nao e tecnico; e descobrir se a luta fica divertida o bastante para o jogador repetir, compartilhar e aceitar ads/rewarded ads sem abandonar.

## Como aumentar a nota

1. Validar no iPhone a boss fight completa da Cleopatra, com metricas simples de tempo de sessao, mortes, tentativas e taxa de retry.
2. Criar um loop claro de progresso: fases desbloqueadas, bosses bloqueados, feedback de vitoria/derrota e historico de melhor tentativa.
3. Definir um ponto natural para rewarded ad, como revive limitado ou retry com beneficio pequeno, sem parecer punitivo.
4. Reaproveitar a engine de ataques para um segundo boss rapidamente, provando que o conceito escala.
5. Preparar privacidade/ads desde cedo: minimo de dados, consentimento quando necessario e politica de privacidade antes de loja.

## Recomendacao

Prosseguir, mas como validacao de jogo/prototipo com foco em retencao, nao como app pronto para monetizacao imediata. A melhor proxima etapa e finalizar a boss Cleopatra com VFX legiveis, testar em dispositivo real e medir se o loop de retry e forte.

## Fontes verificadas no runtime

Consulta feita em 2026-07-09.

| Fonte | Link | Tema | Impacto no Cogno |
|---|---|---|---|
| Apple App Review Guidelines | https://developer.apple.com/app-store/review/guidelines/ | Regras de review, seguranca, performance, metadados e responsabilidade por SDKs | Antes de iOS, testar crashes, metadados, conteudo e SDKs de ads/analytics. |
| Google Play - Data safety | https://support.google.com/googleplay/android-developer/answer/10787469 | Declaracao de coleta/compartilhamento de dados | Se usar ads/analytics, declarar praticas de dados e SDKs. |
| Google Play - Inappropriate Content | https://support.google.com/googleplay/android-developer/answer/9878810 | Conteudo violento/sensivel e restricoes de loja | Manter violencia estilizada e evitar conteudo ofensivo ligado a grupos reais. |
| Google AdMob privacy | https://developers.google.com/admob/android/privacy | Consentimento e privacidade para ads | Planejar UMP/consentimento se AdMob entrar no build mobile. |
| LGPD - Lei 13.709/2018 | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm | Tratamento de dados pessoais no Brasil | Preferir dados minimos, sem login obrigatorio e politica de privacidade se houver analytics/ads. |

## Gate app-factory

Esta e uma avaliacao inicial. A geracao de documentacao completa de implementacao, PRD, arquitetura detalhada e backlog GitHub-ready deve acontecer apenas se houver confirmacao explicita para prosseguir.
