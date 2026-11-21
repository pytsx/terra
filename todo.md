# **Plano de evolução do Terra**

A minha proposta é evoluir o Terra de um **jogo 2D procedural funcional para um sandbox com um mundo vivo, persistente e interessante de explorar**, sem reescrever a engine.

O foco não será simplesmente adicionar funcionalidades. Será fazer os sistemas existentes criarem experiências que o jogador consiga perceber.

## **1. Roadmap de evolução**

Etapas de implementação

6 PRs

1. **PR 01 — Fluidez e desempenho**

   Otimizar o carregamento de chunks, a geração de terreno e o scheduler de simulação. Introduzir métricas de FPS, tempo de frame e custo por sistema.

   Jogabilidade: exploração mais fluida, menos travamentos.
2. **PR 02 — Persistência do mundo vivo**

   Salvar criaturas, suas posições, saúde, crescimento e reprodução. Preservar árvores, alterações ambientais e progresso de transformações entre sessões.

   Jogabilidade: aquilo que o jogador constrói ou modifica continua existindo.
3. **PR 03 — Ecossistema e ciclos de vida**

   Criar identidade para árvores e estruturas naturais. Evoluir germinação, crescimento, reprodução, envelhecimento e decomposição utilizando regras nos assets.

   Jogabilidade: florestas crescem, a vegetação reage à água e o mundo muda sozinho.
4. **PR 04 — Exploração com propósito**

   Melhorar a diferenciação entre biomas, cavernas, recursos e estruturas. Criar motivos concretos para o jogador percorrer regiões e profundidades diferentes.

   Jogabilidade: explorar deixa de ser apenas caminhar e passa a oferecer descobertas e recompensas.
5. **PR 05 — Game Feel e imersão**

   Refinar animações de mineração, partículas, áudio, transições, movimento, respostas visuais dos blocos e interações com o ambiente.

   Jogabilidade: cada ação parece mais física, responsiva e satisfatória.
6. **PR 06 — Estabilidade de produção**

   Automatizar testes, validar assets, testar sessões longas, melhorar saves e verificar regressões de geração e física.

   Jogabilidade: menos bugs, menos perda de progresso e mais confiança no mundo.

## **2. Qual o impacto na experiência?**

| Evolução  | Antes                                         | Depois                                                |
| --------- | --------------------------------------------- | ----------------------------------------------------- |
| Chunks    | Exploração pode causar picos de processamento | Mundo carrega de forma mais suave                     |
| Criaturas | População pode desaparecer ao recarregar      | Animais persistentes continuam no mundo               |
| Árvores   | Crescimento e reprodução ainda são limitados  | Florestas podem regenerar-se naturalmente             |
| Água      | Simulação ambiental principalmente isolada    | Água influencia mais decisões de cultivo e exploração |
| Biomas    | Diferenciação sobretudo geográfica            | Cada região oferece recursos e desafios próprios      |
| Mineração | Quebra de blocos com feedback existente       | Interações com mais peso, animação e resposta sonora  |

## **3. Como isso muda a arquitetura?**

O caminho é **fortalecer os sistemas atuais**, mantendo as responsabilidades bem separadas.

\#chatgpt-mermaid-\_r_3mo\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_3mo\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_3mo\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_3mo\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_3mo\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_3mo\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_3mo\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_3mo\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_3mo\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_3mo\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3mo\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3mo\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_3mo\_ p{margin:0;}#chatgpt-mermaid-\_r_3mo\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_3mo\_ .label text,#chatgpt-mermaid-\_r_3mo\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ .node rect,#chatgpt-mermaid-\_r_3mo\_ .node circle,#chatgpt-mermaid-\_r_3mo\_ .node ellipse,#chatgpt-mermaid-\_r_3mo\_ .node polygon,#chatgpt-mermaid-\_r_3mo\_ .node path{fill:rgb(19, 33, 54);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ .rough-node .label text,#chatgpt-mermaid-\_r_3mo\_ .node .label text,#chatgpt-mermaid-\_r_3mo\_ .image-shape .label,#chatgpt-mermaid-\_r_3mo\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_3mo\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ .rough-node .label,#chatgpt-mermaid-\_r_3mo\_ .node .label,#chatgpt-mermaid-\_r_3mo\_ .image-shape .label,#chatgpt-mermaid-\_r_3mo\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_3mo\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_3mo\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3mo\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3mo\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_3mo\_ .edgeLabel{background-color:rgb(14, 14, 14);text-align:center;}#chatgpt-mermaid-\_r_3mo\_ .edgeLabel p{background-color:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_3mo\_ .edgeLabel rect{opacity:0.5;background-color:rgb(14, 14, 14);fill:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_3mo\_ .labelBkg{background-color:rgba(14, 14, 14, 0.5);}#chatgpt-mermaid-\_r_3mo\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_3mo\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_3mo\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_3mo\_ .icon-shape,#chatgpt-mermaid-\_r_3mo\_ .image-shape{background-color:rgb(14, 14, 14);text-align:center;}#chatgpt-mermaid-\_r_3mo\_ .icon-shape p,#chatgpt-mermaid-\_r_3mo\_ .image-shape p{background-color:rgb(14, 14, 14);padding:2px;}#chatgpt-mermaid-\_r_3mo\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_3mo\_ .image-shape .label rect{opacity:0.5;background-color:rgb(14, 14, 14);fill:rgb(14, 14, 14);}#chatgpt-mermaid-\_r_3mo\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_3mo\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_3mo\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_3mo\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_3mo\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_3mo\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_3mo\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3mo\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_3mo\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_3mo\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_3mo\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_3mo\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_3mo\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_3mo\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ .node rect,#chatgpt-mermaid-\_r_3mo\_ .node circle,#chatgpt-mermaid-\_r_3mo\_ .node ellipse,#chatgpt-mermaid-\_r_3mo\_ .node polygon,#chatgpt-mermaid-\_r_3mo\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_3mo\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_3mo\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_3mo\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_3mo\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_3mo\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Game LoopSimulation SchedulerWorldChunksHydrologyWorld EvolutionEntitiesAssets / RegrasWorld GenerationSave / LoadRenderer

Cada PR deve preservar essa divisão: os assets definem o conteúdo, os sistemas aplicam suas regras e o World mantém a consistência.

## **4. Como vamos medir se o jogo melhorou?**

Não basta o PR compilar. Precisamos testar situações reais do jogador.

| Cenário                                     | Critério de sucesso                                           |
| ------------------------------------------- | ------------------------------------------------------------- |
| Correr continuamente por regiões novas      | Sem travamentos perceptíveis nas condições de referência      |
| Plantar uma muda e guardar o jogo           | A muda continua seu crescimento após carregar                 |
| Alimentar e reproduzir animais              | Criaturas persistentes mantêm seus estados                    |
| Voltar a uma floresta depois de vários dias | As alterações ambientais esperadas continuam coerentes        |
| Minerar e construir durante vários minutos  | Resposta imediata e feedback consistente                      |
| Jogar, salvar e recarregar repetidamente    | Sem perda de inventário, construções e entidades persistentes |

## **5. A ordem que eu seguiria**

PRIMEIRA ENTREGA

## **Performance + Persistência**

Garantir que o mundo pode crescer e manter seu estado sem comprometer a fluidez.

SEGUNDA ENTREGA

## **Ecossistema + Exploração**

Tornar o mundo dinâmico e dar ao jogador razões para interagir com ele.

TERCEIRA ENTREGA

## **Imersão + Polimento**

Melhorar a sensação de jogar, mantendo a estabilidade.

**Uma recomendação importante:** não deixaria toda a melhoria visual para o final. Cada PR deve incluir o feedback de jogabilidade necessário para que sua funcionalidade seja perceptível. Por exemplo, ao implementar o crescimento de árvores, o jogador deve conseguir observar esse crescimento, não apenas encontrar uma árvore completa depois de algum tempo.

## **Minha prioridade**

Eu começaria pelo **PR 01 — Fluidez e desempenho**, mas com uma regra: não vamos otimizar indiscriminadamente.

Primeiro medimos onde estão os custos, depois corrigimos os gargalos comprovados. Em paralelo, mantemos como objetivo principal o PR 03, porque **o ecossistema é uma das características que pode dar identidade própria ao Terra**.

A meta é que o jogador não esteja apenas explorando um mapa procedural: ele esteja participando de um mundo que reage às suas ações e continua evoluindo.