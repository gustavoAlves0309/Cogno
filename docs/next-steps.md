# Cogno - Next Steps

Última atualização: 2026-07-13

## Estado atual

- A boss fight da Cleopatra está implementada, aprovada em dispositivo real e considerada encerrada, salvo regressões pontuais.
- A Janela de Perspectiva foi aceita como a primeira mecânica reconstruída de Leonardo.
- A Asa em Estudo foi reconstruída com quatro perfis determinísticos, passagens descendentes/ascendentes/diagonal, página de evolução própria e integração completa ao Lab. Ela ainda não foi aprovada em dispositivo real.
- O modo normal mantém progressão persistente; o modo DEV libera as lutas implementadas e oferece o Lab sem contaminar o progresso real.
- A arquitetura futura da luta usa quatro estágios: V1, V2, V3 e combinações de V3 maduras. O roteiro completo continua bloqueado até termos mecânicas suficientes aprovadas no celular.
- A implementação atual segue `docs/superpowers/specs/2026-07-13-leonardo-asa-em-estudo-design.md` e passou em 78 testes, build e QA visual automatizado em 360×800 e 390×844.
- Nenhum arquivo ou comportamento de áudio mudou durante a implementação.

## Próximo passo imediato

**Validar e testar minuciosamente no celular os quatro perfis da nova Asa em Estudo — V1, V2, V3 estreia e V3 madura — antes de reconstruir outra mecânica.**

Prioridades do teste físico:

1. confirmar se a primeira exposição da V1 comunica claramente a direção da asa, a abertura segura e a necessidade de mudar da esquerda para a direita;
2. verificar se o traço forte da passagem atual e o fantasma tracejado da próxima são distinguíveis sem criar a impressão de três rotas simultâneas;
3. validar as sequências da V2 — descida/esquerda, subida/direita e descida/centro — e decidir se 900 ms entre passagens é desafiador sem ser injusto;
4. validar a transição direita → diagonal central das duas V3 e confirmar que não existe posição estacionária capaz de sobreviver às duas passagens;
5. avaliar se as aberturas de 3, 2,5 e 2,2 diâmetros produzem progressão perceptível sem exigir precisão excessiva no celular;
6. comparar a V3 estreia com a madura, especialmente o cue de página de 650 ms, o telegraph espacial de 850 ms e a cadência de 700 ms;
7. provocar dano em cada passagem e verificar que a sequência continua, o jogador não é recentralizado e cada passagem retira no máximo uma estabilidade;
8. observar a evolução da página violeta: surgimento na V1, correções na V2, articulação na V3 e seleção curta na V3 madura;
9. confirmar que `Repeat` preserva exatamente o perfil concluído e validar `Lab`, abort, resize/orientação e retorno ao menu;
10. avaliar no tamanho real do aparelho se V1, V2 e V3 parecem respectivamente um protótipo assimétrico, uma asa reforçada e um projeto articulado.

## Gate de aprovação da Asa em Estudo

- Lab aparece desde a primeira entrada em Leonardo no modo DEV.
- Dano não interrompe a tentativa, não reinicia o cronômetro e não reposiciona o jogador.
- Cada passagem causa no máximo uma perda de estabilidade e não deixa dano atrasado após iframe.
- V1 é compreensível na primeira exposição e nenhuma quina funciona como safezone acidental.
- Nenhuma safezone coincide entre passagens consecutivas; todas as mudanças permanecem alcançáveis no celular.
- Somente a passagem atual e o fantasma da próxima coexistem; o fantasma nunca possui colisão ou vermelho ativo.
- A diagonal de 20° é reconhecível e força a saída da abertura direita sem parecer um salto arbitrário.
- A V3 madura é mais rápida que a estreia, mas o gesto da página e o telegraph ainda comunicam a primeira passagem.
- A evolução visual da asa e da página é reconhecível em V1 → V2 → V3 no tamanho real do celular.
- `Repeat`, `Lab`, resize e cleanup não deixam objetos ou colisões residuais.
- Retornar ao menu funciona sem travamento.
- Vitest e `npm.cmd run build` passam.
- Nenhum arquivo ou comportamento de áudio muda no diff.

## Depois da validação da Asa

- Se algum perfil falhar no teste físico, ajustar a mecânica isoladamente e repetir o gate antes de avançar.
- Se os quatro perfis forem aprovados, registrar a Asa como segunda mecânica reconstruída e escolher o próximo estudo de Leonardo.
- Escolher a próxima mecânica de Leonardo pelo potencial de recuperação e repetir o ciclo design → Lab isolado → teste mobile.
- Não escrever o novo roteiro das fases ou da Ultimate até existir um conjunto suficiente de mecânicas excelentes e aprovadas.
- Tratar áudio apenas em uma etapa posterior separada.
- Não iniciar o próximo boss enquanto Leonardo estiver em reconstrução.
