# **Revisão de engenharia do Terra — visão de um estúdio profissional**

REPOSITÓRIO ANALISADO

## **Terra / Matriz**

Branch `main` · Commit `07f5c784` · 21/11/2026

Protótipo avançado

Revisão do [repositório GitHub](https://github.com/pytsx/terra?utm_source=chatgpt.com), aplicando critérios de engenharia de jogos de mundo aberto, simulação e exploração.

## **1. Diagnóstico executivo**

**O Terra já ultrapassou a fase de demonstração técnica simples, mas ainda não tem a maturidade de uma engine de jogo pronta para produção.**

A principal qualidade do projeto é a sua direção arquitetural. Já existe uma tentativa consistente de separar definições de conteúdo, geração procedural, simulação, estado do mundo, comandos e renderização.

O principal risco é outro: **a complexidade da simulação está a crescer mais rapidamente do que a infraestrutura de execução, observabilidade e persistência**.

A arquitetura já suporta conceitos interessantes, como água com diferentes capacidades por material, evolução ambiental, árvores que crescem, entidades com comportamentos configuráveis e geração por seed. Mas falta garantir que esses sistemas continuam corretos e eficientes quando o jogador explora durante horas, regressa a regiões antigas e cria milhares de alterações no mundo.

### **Avaliação por dimensão**

Modularidade e arquitetura

7,5/10

Geração procedural

7,5/10

Simulação ambiental

6,5/10

Game Loop e atualização

6,5/10

Renderização e feedback

7,0/10

Escalabilidade e desempenho

5,0/10

Persistência e continuidade

4,5/10

Testabilidade e ferramentas

6,5/10

Avaliações qualitativas de engenharia, baseadas na inspeção estática do código. Não são benchmarks, testes de jogabilidade ou medições de FPS.

A nota mais importante não é a média. É o desequilíbrio entre uma arquitetura de conteúdo relativamente sofisticada e uma infraestrutura de execução que ainda precisa amadurecer.

## **2. O que considero bem implementado**

### **2.1. Separação entre conteúdo e mecanismos**

O Terra já permite declarar blocos, itens, entidades, regras de transformação e algumas Features através dos assets.

O fluxo aproxima-se do que esperamos de uma arquitetura orientada a dados:

\#chatgpt-mermaid-\_r_3v4\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_3v4\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_3v4\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_3v4\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_3v4\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_3v4\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_3v4\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_3v4\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_3v4\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_3v4\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3v4\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3v4\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_3v4\_ p{margin:0;}#chatgpt-mermaid-\_r_3v4\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_3v4\_ .label text,#chatgpt-mermaid-\_r_3v4\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ .node rect,#chatgpt-mermaid-\_r_3v4\_ .node circle,#chatgpt-mermaid-\_r_3v4\_ .node ellipse,#chatgpt-mermaid-\_r_3v4\_ .node polygon,#chatgpt-mermaid-\_r_3v4\_ .node path{fill:rgb(19, 33, 54);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ .rough-node .label text,#chatgpt-mermaid-\_r_3v4\_ .node .label text,#chatgpt-mermaid-\_r_3v4\_ .image-shape .label,#chatgpt-mermaid-\_r_3v4\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_3v4\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ .rough-node .label,#chatgpt-mermaid-\_r_3v4\_ .node .label,#chatgpt-mermaid-\_r_3v4\_ .image-shape .label,#chatgpt-mermaid-\_r_3v4\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_3v4\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_3v4\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3v4\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3v4\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_3v4\_ .edgeLabel{background-color:rgb(14, 14, 14);text-align:center;}#chatgpt-mermaid-\_r_3v4\_ .edgeLabel p{background-color:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_3v4\_ .edgeLabel rect{opacity:0.5;background-color:rgb(14, 14, 14);fill:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_3v4\_ .labelBkg{background-color:rgba(14, 14, 14, 0.5);}#chatgpt-mermaid-\_r_3v4\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_3v4\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3v4\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_3v4\_ .icon-shape,#chatgpt-mermaid-\_r_3v4\_ .image-shape{background-color:rgb(14, 14, 14);text-align:center;}#chatgpt-mermaid-\_r_3v4\_ .icon-shape p,#chatgpt-mermaid-\_r_3v4\_ .image-shape p{background-color:rgb(14, 14, 14);padding:2px;}#chatgpt-mermaid-\_r_3v4\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_3v4\_ .image-shape .label rect{opacity:0.5;background-color:rgb(14, 14, 14);fill:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_3v4\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_3v4\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_3v4\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_3v4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_3v4\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_3v4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_3v4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3v4\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_3v4\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3v4\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_3v4\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_3v4\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_3v4\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_3v4\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ .node rect,#chatgpt-mermaid-\_r_3v4\_ .node circle,#chatgpt-mermaid-\_r_3v4\_ .node ellipse,#chatgpt-mermaid-\_r_3v4\_ .node polygon,#chatgpt-mermaid-\_r_3v4\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_3v4\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_3v4\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_3v4\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_3v4\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3v4\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Assets e definiçõesRegistriesSistemas de domínioGame LoopWorld / ChunkStoreRenderizaçãoPersistência

Esta é uma base saudável. Adicionar conteúdo não deveria obrigar a criar uma subclasse ou um novo ramo de condicionais na engine.

### **2.2. Mundo baseado em dados compactos**

O uso de `Uint16Array` para armazenar os IDs dos blocos é uma decisão acertada. Os blocos do mundo não são milhões de objetos independentes; são posições que referenciam definições partilhadas.

Isso reduz o consumo de memória e favorece a organização por chunks.

### **2.3. Geração procedural determinística**

O gerador utiliza seeds, funções de ruído e contratos de geração. Existem também testes de regressão com checksums de mundos anteriores.

A preservação da geração v5 através de testes *golden master* é uma prática especialmente importante: alterar o algoritmo de geração não deve destruir silenciosamente a compatibilidade com mundos já criados.

### **2.4. Game Loop com simulação em passos fixos**

Em `src/app/Application.ts`, existe um acumulador temporal e a simulação avança em passos de `1/60` segundo. Isso já evita boa parte dos problemas comuns de física dependente da taxa de frames.

A abordagem segue o princípio difundido por Glenn Fiedler em *Fix Your Timestep!*.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://new.gafferongames.com\&sz=32)

Gaffer On Games



### **2.5. Renderização com algumas boas otimizações**

O `WorldRenderer` já utiliza recorte pela câmara, e o `Atlas` pré-renderiza quatro variações de cada bloco. As partículas também utilizam reutilização de objetos.

São decisões corretas para um jogo 2D em Canvas.

### **2.6. Testes orientados ao comportamento**

O repositório contém testes de geração, física, hidrologia, crafting, inventário, transformação, persistência e integração, além de testes com navegador.

A atualização mais recente acrescentou testes de exploração descontínua, crescimento de mudas e políticas de repetição.

Isto é mais valioso do que simplesmente ter testes de getters, construtores e classes isoladas.

**Eu preservaria todas essas decisões.** O próximo ciclo de desenvolvimento deve fortalecer essa arquitetura, não substituí-la por um framework inteiramente novo.

## **3. Problemas de engenharia que eu priorizaria**

Encontrei seis pontos que merecem atenção antes de aumentar significativamente o número de biomas, criaturas e regras do mundo.

### **3.1. O sistema de evolução ainda não escala bem**

P1 — Desempenho

**Código:** [WorldEvolutionSystem.ts](https://github.com/pytsx/terra/blob/07f5c78485f068b7883dac522ca236aa2f998bb1/src/business/simulation/WorldEvolutionSystem.ts?utm_source=chatgpt.com)

O problema anterior do retângulo de regiões visitadas foi corrigido com `scannedChunks`. Isso evita ignorar regiões intermediárias.

Entretanto, a implementação atual ainda possui três custos relevantes:

- Chunks parcialmente visíveis podem ser examinados repetidamente porque só são marcados como totalmente analisados quando a região ativa cobre toda a secção.
- O conjunto `candidates` guarda coordenadas globalmente, sem separação entre regiões ativas e inativas.
- A chamada `Array.from(this.candidates)` cria um novo array a cada execução do scheduler, incluindo candidatos que podem estar muito longe do jogador.

Isso significa que a quantidade de trabalho tende a crescer com a exploração, mesmo que a região visível permaneça do mesmo tamanho.

**Como eu resolveria:** manter índices de candidatos por secção, guardar apenas blocos que possuam regras e processar exclusivamente as secções ativas. O agendamento temporal deveria usar o tempo devido de cada candidato, e não exigir uma avaliação de todos os candidatos a cada atualização.

A arquitetura poderia evoluir de:

`Set global → Snapshot completo → Filtro por região → Avaliação`

para:

`Chunk ativo → Candidatos elegíveis → Fila temporal → Avaliação`

É uma aplicação dos princípios de *Spatial Partition*, *Dirty Flag* e *Data Locality*, descritos em Game Programming Patterns.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://gameprogrammingpatterns.com\&sz=32)

Game Programming Patterns



### **3.2. O carregamento de chunks executa trabalho desnecessário**

P1 — Desempenho

**Código:** [ChunkStore.ts](https://github.com/pytsx/terra/blob/07f5c78485f068b7883dac522ca236aa2f998bb1/src/business/world/ChunkStore.ts?utm_source=chatgpt.com) e [TerrainColumn.ts](https://github.com/pytsx/terra/blob/07f5c78485f068b7883dac522ca236aa2f998bb1/src/business/worldgen/TerrainColumn.ts?utm_source=chatgpt.com)

O mundo possui chunks de 64×32 blocos e altura total de 256 blocos.

Quando uma coluna é carregada pela primeira vez, o `ChunkStore` gera todas as suas secções verticais. Cada secção invoca novamente o pipeline de geração.

Uma coluna de terreno — representação simplificada

Secção 0

64×32

Secção 1

64×32

Secção 2

64×32

Secção 3

64×32

Secção 4

64×32

Secção 5

64×32

Secção 6

64×32

Secção 7

64×32

Comportamento atual

Uma única consulta pode materializar as oito secções da coluna.

Objetivo

Gerar ou carregar apenas o necessário, com pré-carregamento e orçamento controlado.

Isso pode ser particularmente caro quando a câmara avança rapidamente, porque a geração ocorre de forma síncrona na thread principal.

Além disso, o descarte das 64 colunas é feito pela ordem de inserção do `Map`, não por um verdadeiro LRU que atualize a prioridade das colunas consultadas. Isso pode provocar regenerações desnecessárias quando o jogador regressa a regiões recentes.

**Recomendação:** separar metadados de coluna, dados das secções e materialização; introduzir uma política LRU real e medir o custo de geração antes de decidir se vale a pena mover o trabalho para um Web Worker.

A utilização de Workers para trabalho intensivo é uma recomendação consolidada de desempenho web, sobretudo para evitar bloqueios da thread principal.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://web.dev\&sz=32)

web.dev+1



### **3.3. O estado das criaturas não é persistido**

P1 — Correção funcional

**Código:** [save.ts](https://github.com/pytsx/terra/blob/07f5c78485f068b7883dac522ca236aa2f998bb1/src/business/save.ts?utm_source=chatgpt.com) e [Expedition.save()](https://github.com/pytsx/terra/blob/07f5c78485f068b7883dac522ca236aa2f998bb1/src/business/Expedition.ts?utm_source=chatgpt.com#L709-L734)

Esta é uma das maiores lacunas para um jogo de mundo persistente.

O save atual contempla blocos alterados, água, clima, exploração, jogador, inventário, drops e estados de transformação.

Mas não contempla a população de criaturas.

O `Expedition` mantém as criaturas em `mobs` e cria uma nova população na inicialização. Portanto, criaturas individuais não preservam posição, saúde, idade, reprodução e outros estados entre sessões.

Para um mundo com ecossistema, isso compromete a continuidade da simulação.

**Recomendação:** criar persistência de entidades por região, com IDs estáveis, estado serializável por espécie e políticas distintas para criaturas persistentes e população ambiental temporária.

Não é necessário persistir cada animal passageiro para sempre. Mas uma criatura alimentada, criada ou domesticada pelo jogador deveria poder sobreviver a um save/load.

### **3.4. A reprodução das árvores ainda não representa uma árvore completa**

P2 — Modelo de domínio

**Código:** [tree-seed-production.json](https://github.com/pytsx/terra/blob/07f5c78485f068b7883dac522ca236aa2f998bb1/src/assets/transformations/tree-seed-production.json?utm_source=chatgpt.com)

A regra de produção de mudas agora existe, mas utiliza:

```
{
  "source": "WOOD",
  "conditions": {
    "all": [
      {
        "property": "environment.exposedToSky",
        "operator": "==",
        "value": true
      }
    ]
  }
}
```

O problema é conceptual e funcional: **um bloco de madeira não é uma árvore**.

Uma árvore com copa normalmente possui folhas acima do tronco. Por isso, blocos de madeira de uma árvore completa podem não satisfazer `exposedToSky`. Em contrapartida, um tronco isolado e exposto pode produzir mudas.

O teste atual constrói precisamente um bloco `WOOD` isolado, sem uma árvore completa. Portanto, não valida a reprodução de uma árvore real.

Eu introduziria uma identidade de instância para Features persistentes, com uma âncora e um ciclo de vida. A regra de produção de mudas passaria a atuar uma vez por árvore, não uma vez por bloco.

Isso também abre caminho para crescimento por fases, perda de folhas e decomposição.

### **3.5. Os testes possuem pelo menos um caso que pode passar sem verificar o requisito**

P2 — Qualidade

**Código:** [Teste de proveniência](https://github.com/pytsx/terra/blob/07f5c78485f068b7883dac522ca236aa2f998bb1/tests/world-evolution-scheduler.test.ts?utm_source=chatgpt.com#L370-L397)

No teste que declara verificar a preservação da origem de um bloco colocado pelo jogador, a verificação principal é executada apenas dentro de:

```
if (world.get(x, y) === B.GRASS) {
  // Verifica se a origem permaneceu correta
}
```

Entretanto, a regra `grass.growth` não autoriza por padrão a transformação de terra colocada pelo jogador.

Se a transformação não ocorrer, o teste pode terminar sem executar a validação principal.

Há ainda um problema real no domínio: `World.applyNaturalTransformation()` continua a chamar `writeBlock(..., { natural: true })`, o que pode mudar a classificação de origem de um bloco após uma transformação permitida.

**Recomendação:** corrigir a proveniência e substituir testes condicionais por cenários determinísticos nos quais a transformação seja obrigatória, com probabilidade de 100%.

### **3.6. O Game Loop é correto na base, mas precisa de maior independência entre subsistemas**

P2 — Arquitetura temporal

Atualmente, a simulação principal avança em passos fixos, mas `processBlockFrame` faz com que certos sistemas de blocos sejam processados apenas na primeira atualização de simulação de cada frame renderizado.

Isso mantém um custo menor, mas ainda liga parte da frequência efetiva do processamento ambiental à frequência de apresentação.

A recomendação é separar relógios de atualização:

| Sistema                    | Frequência sugerida para avaliar                       |
| -------------------------- | ------------------------------------------------------ |
| Movimento e colisões       | 60 Hz                                                  |
| IA e decisões de criaturas | 10–20 Hz                                               |
| Água em movimento          | Frequência própria, conforme a necessidade física      |
| Evolução ambiental         | Agendada por eventos e tempo devido                    |
| Renderização               | Frequência da tela, com interpolação quando necessário |
| Persistência               | Periódica e orientada a alterações                     |

Essas frequências são pontos de partida para testes, não obrigações universais.

O importante é que cada sistema consuma tempo de simulação de maneira previsível e não dependa implicitamente do número de frames desenhados.

## **4. Revisão das práticas de TypeScript**

O Terra usa TypeScript 5.9, Vite, `strict: true` e `noUnusedLocals`. É uma boa base. O projeto também aproveita unions tipadas, interfaces e `satisfies` em partes importantes.

No entanto, **usar TypeScript não garante por si só que os contratos da engine sejam seguros em tempo de execução**.

| Área                   | Estado atual                             | Recomendação                                                    |
| ---------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Tipagem rigorosa       | Boa                                      | Manter `strict` e avaliar `noUncheckedIndexedAccess`            |
| Configuração JSON      | Validação parcial no carregamento        | Adicionar validação completa de schemas                         |
| Registries             | Bem estabelecidos                        | Consolidar resolução e validação de referências                 |
| Organização de assets  | Modular, mas com registro manual extenso | Automatizar geração do catálogo no build                        |
| Comandos               | Centralizados                            | Distinguir comandos de jogador, ações internas e eventos        |
| Testes                 | Cobertura funcional relevante            | Adicionar testes de propriedades, performance e integração real |
| Qualidade automatizada | Sem configuração de CI identificada      | Adicionar pipeline de verificação                               |
| Profiling              | Sem benchmark automatizado identificado  | Medir custos de sistemas e chunks                               |

A documentação oficial do TypeScript recomenda diferentes níveis de rigor conforme os contratos do projeto; `noUncheckedIndexedAccess`, por exemplo, torna explícita a possibilidade de uma consulta por índice não encontrar um valor.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.typescriptlang.org\&sz=32)

The Basics+1



### **Outros dois ajustes de arquitetura que faria**

**Separar melhor o papel do Command Bus.** Em `CommandBus.ts`, `run()` executa imediatamente `command.execute()`. Isso é válido como implementação simples de Command, mas não representa uma fila temporal de comandos. Manteria a execução direta onde ela funciona, reservando uma fila explícita para ações que precisem de ordenação por tick, replay ou processamento diferido.

**Reduzir regras de conteúdo codificadas no World.** Em `World.solid()`, há uma exceção explícita para `WOOD` e `LEAF` naturais. Essa decisão deveria ser representada por propriedades de colisão e contexto declaradas no catálogo. A engine deveria perguntar quais são as propriedades físicas de um material, não reconhecer nominalmente madeira e folhas.

Também centralizaria totalmente o tempo. Embora `GAME_DAY_SECONDS` já exista, ainda há referências literais a `240` em `Lighting.ts` e `Organism.ts`.

## **5. O que falta para o jogo comportar-se como um produto profissional**

A engenharia de um jogo não termina quando seus sistemas estão desacoplados. Precisa garantir responsividade, continuidade e uma experiência de jogador consistente.

### **Renderização e fluidez**

O renderer já faz culling e usa um atlas. Isso é positivo, mas ainda redesenha o terreno visível a cada frame.

Eu avaliaria armazenar camadas estáticas em caches por chunk, reconstruindo-as quando as células forem modificadas. Água, iluminação, personagens e partículas continuariam dinâmicos.

A MDN recomenda pré-renderização de elementos repetitivos e camadas Canvas quando isso reduz trabalho redundante.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://developer.mozilla.org\&sz=32)

MDN



Antes de migrar para WebGL, PixiJS ou outra tecnologia, faria medições. Canvas 2D ainda é uma escolha legítima para o estágio atual do Terra.

### **Continuidade do mundo**

Hoje a persistência usa `localStorage` e um único save principal. Isso é suficiente para um protótipo, mas torna-se frágil com crescimento de dados, sessões longas e múltiplos mundos.

Eu manteria o contrato `SaveRepository`, substituindo gradualmente o adaptador por armazenamento estruturado, como IndexedDB, com saves separados, migrações explícitas e proteção contra corrupção.

### **Experiência do jogador**

O projeto já possui um ciclo básico de exploração, mineração, fabricação e combate. Mas ainda falta comprovar que esse ciclo permanece interessante com progressão.

As perguntas que um playtest deveria responder são concretas: o jogador percebe por que precisa de um minério novo? Há benefícios claros em explorar outras regiões? As transformações ambientais afetam decisões reais? A produção de árvores e a dinâmica da água criam oportunidades de jogo ou são apenas uma simulação em segundo plano?

Para mim, **o próximo grande avanço de design não é acrescentar dezenas de blocos, mas fazer os sistemas existentes interagirem de maneira significativa para o jogador**.

## **6. Arquitetura-alvo recomendada**

Não implementaria um ECS completo agora. A abordagem atual baseada em chunks, definições compartilhadas e entidades com composição limitada é suficiente enquanto não houver evidência de que o modelo atual seja um gargalo.

ECS é uma alternativa válida para grandes populações de entidades, especialmente quando organização dos dados e processamento por componentes trazem vantagens mensuráveis, mas não é um requisito universal.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://bitecs.dev\&sz=32)

bitECS 0.4



A arquitetura que eu perseguiria é esta:

\#chatgpt-mermaid-\_r_41h\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_41h\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_41h\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_41h\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_41h\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_41h\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_41h\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_41h\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_41h\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_41h\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_41h\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_41h\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_41h\_ p{margin:0;}#chatgpt-mermaid-\_r_41h\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_41h\_ .label text,#chatgpt-mermaid-\_r_41h\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ .node rect,#chatgpt-mermaid-\_r_41h\_ .node circle,#chatgpt-mermaid-\_r_41h\_ .node ellipse,#chatgpt-mermaid-\_r_41h\_ .node polygon,#chatgpt-mermaid-\_r_41h\_ .node path{fill:rgb(19, 33, 54);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ .rough-node .label text,#chatgpt-mermaid-\_r_41h\_ .node .label text,#chatgpt-mermaid-\_r_41h\_ .image-shape .label,#chatgpt-mermaid-\_r_41h\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_41h\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ .rough-node .label,#chatgpt-mermaid-\_r_41h\_ .node .label,#chatgpt-mermaid-\_r_41h\_ .image-shape .label,#chatgpt-mermaid-\_r_41h\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_41h\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_41h\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_41h\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_41h\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_41h\_ .edgeLabel{background-color:rgb(14, 14, 14);text-align:center;}#chatgpt-mermaid-\_r_41h\_ .edgeLabel p{background-color:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_41h\_ .edgeLabel rect{opacity:0.5;background-color:rgb(14, 14, 14);fill:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_41h\_ .labelBkg{background-color:rgba(14, 14, 14, 0.5);}#chatgpt-mermaid-\_r_41h\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_41h\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_41h\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_41h\_ .icon-shape,#chatgpt-mermaid-\_r_41h\_ .image-shape{background-color:rgb(14, 14, 14);text-align:center;}#chatgpt-mermaid-\_r_41h\_ .icon-shape p,#chatgpt-mermaid-\_r_41h\_ .image-shape p{background-color:rgb(14, 14, 14);padding:2px;}#chatgpt-mermaid-\_r_41h\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_41h\_ .image-shape .label rect{opacity:0.5;background-color:rgb(14, 14, 14);fill:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_41h\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_41h\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_41h\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_41h\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_41h\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_41h\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_41h\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_41h\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_41h\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_41h\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_41h\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_41h\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_41h\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_41h\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ .node rect,#chatgpt-mermaid-\_r_41h\_ .node circle,#chatgpt-mermaid-\_r_41h\_ .node ellipse,#chatgpt-mermaid-\_r_41h\_ .node polygon,#chatgpt-mermaid-\_r_41h\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_41h\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_41h\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_41h\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_41h\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_41h\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Input / Player CommandsSimulation SchedulerMovimento / FísicaIA / EntidadesWorld EvolutionHidrologiaAssets / RegistriesWorld GeneratorWorld StateChunk ManagerPersistência regionalRead Model / SnapshotRenderer 2D

Arquitetura-alvo. O Read Model deve expor apenas os dados necessários à apresentação; não precisa necessariamente copiar todos os blocos do mundo.

O que está em falta não é um novo conjunto de Design Patterns. São contratos mais rigorosos para **tempo, identidade, armazenamento, atualização e observabilidade**.

## **7. Plano de evolução que eu aprovaria**

Organizaria o trabalho em cinco PRs independentes, pequenos o suficiente para serem validados sem quebrar a engine.

**PR 1 — Observabilidade e performance**

Instrumentar Game Loop, geração, renderização, hidrologia e evolução. Corrigir o índice global de candidatos, o agendamento por secções e as alocações evitáveis.

Entregável: métricas reproduzíveis e benchmarks antes/depois.

**PR 2 — Streaming de chunks**

Melhorar a política de cache, evitar geração integral desnecessária, introduzir orçamentos e pré-carregamento. Preservar determinismo e todos os formatos anteriores.

Entregável: exploração com menores picos de latência e memória controlada.

**PR 3 — Persistência completa do mundo**

Evoluir o SaveRepository, persistir entidades relevantes, preservar proveniência e estado temporal, adicionar migrações e testes de recuperação.

Entregável: continuidade real de sessões longas e do ecossistema.

**PR 4 — Features naturais persistentes**

Definir identidade de estruturas, corrigir reprodução por árvore, padronizar suas interações com o World Evolution e eliminar exceções de material codificadas na engine.

Entregável: árvores com identidade, crescimento e reprodução coerentes.

**PR 5 — Qualidade de produção e testes**

Adicionar CI, lint, validação automatizada dos assets, testes de stress, cenários de longa duração, regressão de saves e playtests estruturados.

Entregável: critérios objetivos para aceitar novas funcionalidades com segurança.

### **Metas técnicas sugeridas**

| Métrica           | Meta inicial                                             |
| ----------------- | -------------------------------------------------------- |
| Taxa de frames    | 60 FPS estáveis em máquina de referência definida        |
| Tempo de frame    | P95 abaixo de 16,7 ms                                    |
| Picos de latência | Identificar e eliminar tarefas longas evitáveis          |
| Memória           | Estabilizar após exploração prolongada e descarregamento |
| Geração           | Mesma seed e versão, mesmo resultado                     |
| Saves             | Recuperação sem perda de entidades persistentes          |
| Testes            | CI obrigatório para build, simulação e regressões        |

Essas são metas de engenharia propostas, **não resultados já medidos**.

## **8. Conclusão da revisão**

**Manter a arquitetura e investir em sua robustez**

O Terra tem uma base promissora para um jogo sandbox procedural em TypeScript. Eu não recomendaria migrar de linguagem, substituir a engine nem introduzir um ECS completo neste momento.

O principal desafio agora é passar de **um conjunto de sistemas que funcionam em cenários controlados para um mundo que se mantém correto e responsivo em condições imprevisíveis**.

Isso exige disciplina em quatro frentes: medir antes de otimizar, persistir o estado que realmente importa, limitar o trabalho por atualização e validar comportamentos completos em vez de apenas funções isoladas.

A avaliação foi feita sobre o código do commit `07f5c784`. Não executei os testes, não abri o jogo num navegador e não medi FPS, memória ou experiência de jogo; por isso, os riscos de desempenho são inferidos do código e precisam ser confirmados com profiling.

**Minha prioridade imediata seria o PR 1, de observabilidade e performance.** Sem ele, os próximos sistemas de ecologia, fluidos e geração podem aumentar o custo da engine sem que tenhamos uma forma objetiva de identificar o motivo.