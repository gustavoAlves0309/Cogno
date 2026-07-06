# Cogno - Cleopatra Prototype Implementation Plan

Data: 2026-07-06
Base: `2026-07-06-cleopatra-prototype-design.md`

## Objetivo

Construir o primeiro prototipo jogavel da fase Cleopatra em Web/HTML5 com Phaser e TypeScript, incluindo modo real, modo teste, player por drag, arena como limite do player e ataques que nascem fora da arena.

## Fase 1 - Scaffold Do Projeto

- Criar projeto Vite + TypeScript na raiz do repositorio `Cogno`.
- Instalar Phaser.
- Configurar scripts `dev`, `build` e `preview`.
- Criar estrutura inicial de pastas:
  - `src/main.ts`
  - `src/game/`
  - `src/game/scenes/`
  - `src/game/attacks/`
  - `src/game/ui/`
  - `src/game/config/`
- Garantir que o servidor rode em host acessivel pela rede local para teste no iPhone.

Critério de pronto:

- `npm run build` passa.
- Tela inicial abre no navegador desktop.

## Fase 2 - Base Jogavel

- Criar cena principal.
- Implementar canvas responsivo em retrato.
- Desenhar palco escuro, boss fora da arena e arena quadrada decorada.
- Implementar nucleo do player.
- Implementar drag por mouse/touch.
- Restringir o nucleo aos limites da arena.
- Adicionar vida/estabilidade simples.

Critério de pronto:

- Player arrasta bem no desktop.
- Player nao sai da arena.
- Layout continua legivel em proporcao mobile.

## Fase 3 - Sistema De Ataques

- Criar interface/base para ataques com ciclo:
  - telegraph;
  - ativacao;
  - hitbox;
  - cleanup.
- Separar desenho visual de dano sempre que fizer sentido.
- Criar manager para atualizar ataques ativos.
- Criar utilitarios para colisao do nucleo com hitboxes.

Critério de pronto:

- Um ataque dummy consegue aparecer, ativar colisao e sumir.
- Dano respeita estado ativo, nao apenas visual.

## Fase 4 - Ataques Da Cleopatra

Implementar os quatro ataques iniciais:

- Escaravelhos Da Coroa: projeteis vindos da Cleopatra mirando o player.
- Nilo Ascendente: faixa horizontal de agua atravessando palco e arena.
- Wadjet Lateral: cone vindo de uma lateral externa com telegraph claro.
- Olho-Sol De Horus: sol/olho rotativo com raios que apagam, telegrafam, acendem e apagam.

Critério de pronto:

- Cada ataque funciona isoladamente.
- Cada ataque deixa clara sua origem fora da arena.
- Telegraph precede dano de forma justa.

## Fase 5 - Modo Teste

- Criar menu/laboratorio de ataques.
- Permitir disparar cada ataque isoladamente.
- Permitir loop do ataque selecionado.
- Adicionar forma simples de voltar ao modo real.
- Manter player e arena iguais ao modo real.

Critério de pronto:

- Gustavo consegue testar ataques individualmente no desktop e no iPhone.

## Fase 6 - Modo Real

- Criar script runner por tempo.
- Montar fase de 50 a 60 segundos:
  - introducao com escaravelhos;
  - Nilo;
  - Wadjet;
  - Horus;
  - final leve combinando dois padroes.
- Adicionar vitoria ao sobreviver.
- Adicionar derrota ao perder estabilidade.
- Adicionar reset/restart.

Critério de pronto:

- A fase tem começo, meio e fim.
- E possivel vencer ou perder.
- O script comunica progressao sem depender de texto longo.

## Fase 7 - Polimento Visual Inicial

- Melhorar silhueta da Cleopatra.
- Melhorar ornamentacao da arena.
- Ajustar paleta de Cleopatra: ouro, azul do Nilo, verde Wadjet, fundo escuro.
- Melhorar telegraphs e feedback de dano.
- Ajustar hierarquia visual para o player reconhecer boss, arena, ataque e nucleo.

Critério de pronto:

- A tela ja sugere Cleopatra antes de qualquer texto explicativo.
- Ataques parecem parte da identidade da boss.

## Fase 8 - Validacao

- Rodar `npm run build`.
- Testar no desktop com mouse.
- Testar no iPhone pela rede local.
- Verificar:
  - conforto do drag;
  - tamanho/posicao da arena;
  - legibilidade do nucleo sob o dedo;
  - ataques entrando de fora da arena;
  - telegraph justo;
  - vitoria/derrota;
  - modo teste.

Critério de pronto:

- Gustavo consegue jogar a fase no iPhone.
- O modo teste permite iterar ataques sem repetir a fase inteira.

## Ordem De Commits Sugerida

1. Scaffold Phaser/TypeScript.
2. Add player drag and arena boundary.
3. Add attack system foundation.
4. Add Cleopatra attacks.
5. Add real mode script.
6. Add attack test mode.
7. Polish Cleopatra visuals and mobile layout.
