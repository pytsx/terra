# Terra / Matriz

Jogo de exploração 2D em TypeScript, com terreno procedural, mineração, construção, combate e fabricação.

## Executar

O projeto foi testado com Node.js 24.16 e pnpm 12.8.1. Na raiz do projeto, execute

```sh
pnpm install
pnpm dev
```

Abra o endereço exibido pelo Vite. `pnpm test` executa os testes da simulação e da persistência. `pnpm build` verifica os tipos e gera a versão de produção em `dist/`. Use `pnpm preview` para servi-la localmente.

## Organização

O teste de interação da bancada usa Chromium em uma sessão isolada. Instale o navegador de teste uma vez com `pnpm exec playwright install chromium` e execute `pnpm test:browser`.

| Módulo | Responsabilidade |
| --- | --- |
| `src/assets` | Cada bloco e ferramenta possui seu próprio diretório, com `config.json` e `index.ts`. Os módulos definem mundo colocado, inventário/mochila e estado dropado; ferramentas também definem estado na mão. |
| `src/assets/entities` | Entidades possuem `config.json`, estados, renderer e `brain.ts`. O `brain` recebe sensores do motor e decide movimentos por meio do SDK em `src/assets/entity-sdk.ts`. |
| `src/render` | Desenha o mundo e a interface a partir dos dados de leitura. O atlas gera as mesmas texturas para o mapa, a barra rápida e a mochila. |
| `src/app` | Interpreta comandos, controla pausa e janelas, transforma dados para a interface e avança a simulação em passos fixos de 1/60 s. |
| `src/business` | Define as regras e o contrato `SaveRepository`. A expedição coordena terreno, criaturas, explorador e inventário. |
| `src/store` | Implementa o repositório com `localStorage` e decodifica as versões do save. |
| `src/main.ts` | Conecta o provedor ao serviço de jogo e inicia a aplicação. |

A aplicação envia movimentos entre slots e pedidos para recolher o resultado. O inventário é dono das pilhas. O módulo `business/craft` interpreta a disposição dos ingredientes e identifica a receita. Recolher o resultado consome uma unidade de cada célula ocupada e entrega a quantidade indicada no JSON, em uma única operação.

Os comandos do jogador chegam à `Expedition` pelo `CommandBus`. Ao minerar, a expedição valida o alcance e a ferramenta, e o `World` aplica o dano. Quando o bloco quebra, o mundo grava a edição, limpa o dano da célula e publica suas coordenadas e os IDs anterior e atual. A hidrologia, a gravidade e o mapa acompanham essas edições por `onBlockEdited`. A inscrição devolve uma função para cancelar a escuta. O salvamento lê um snapshot do mundo.

Nos mundos infinitos, o `ChunkStore` mantém até 64 colunas. Ao carregar uma coluna, ele materializa suas seções por toda a altura do mapa. A hidrologia simula toda essa altura dentro da faixa horizontal ativa, permitindo que a água alcance aquíferos profundos. As células armazenam IDs que apontam para definições imutáveis compartilhadas. O atlas e as interações consultam o script do bloco pelo mesmo ID. O renderer reutiliza partículas de impacto depois que o efeito termina.

A fábrica `EntityRegistry.create` constrói as criaturas a partir da espécie. Cada criatura tem sua própria vida no componente `Health`. Vacas, lobos e slimes usam o contrato `EntityBrain` para tomar decisões a partir dos sensores de `Mob`. Nas vacas, `BreedingCycle` controla o crescimento, o período amoroso e a recuperação após o acasalamento. Um bezerro conserva a idade quando entra em dormência.

Para adotar outro provedor, implemente `load` e `write` de `SaveRepository` em `store` e retorne esse adaptador em `createSaveRepository`. O contrato assíncrono permite provedores remotos e o serviço ordena as gravações de cada sessão.

## Fabricar e organizar a mochila

Abra a mochila com **E**. Os nove slots da barra rápida usam os atalhos **1–9**. Clique em uma pilha para carregá-la no cursor. Outro clique deposita, combina itens iguais ou troca a pilha com o slot ocupado. Com uma pilha no cursor, pressione e percorra dois ou mais slots para visualizar uma divisão uniforme. Nada muda durante a prévia. Ao soltar, cada slot recebe a parte inteira e o resto permanece no cursor.

A pilha no cursor existe como uma transação temporária da janela. Fechar a mochila cancela essa transação e tenta devolver a pilha ao slot de origem. Se ele estiver ocupado, usa o primeiro slot vazio. Quando todos os slots estão ocupados, a pilha é solta no mundo junto ao explorador. Nenhum estado de cursor permanece depois que a janela fecha.

Para fazer uma bancada, distribua tábuas pelas quatro casas da grade **2×2**. Clique no resultado para enviá-lo ao primeiro slot livre da barra rápida, depois da mochila ou, se ambos estiverem cheios, ao cursor. Se o cursor também estiver ocupado por um item incompatível, os ingredientes ficam na grade. Selecione a bancada na barra e use o **botão direito** junto ao solo para colocá-la. Clique com o botão direito na bancada ao alcance do personagem para abrir a grade **3×3**.

O livro ao lado da grade mostra somente receitas compatíveis com a estação atual e que podem ser produzidas com os itens disponíveis. Clicar em um resultado devolve os ingredientes pendentes, retira os materiais necessários do inventário e monta a fórmula automaticamente. Receitas menores cabem em qualquer posição da grade maior. Ingredientes que ficaram na grade voltam ao inventário ao fechar a janela ou restaurar um save.

### Armaduras e durabilidade

O painel superior da mochila possui slots exclusivos para capacete, peitoral, calças e botas. Uma peça somente pode ser colocada no encaixe declarado pelo campo `armor.slot` do seu asset. As quatro armaduras de couro são fabricadas na bancada 3×3 e aumentam a vida máxima enquanto estiverem equipadas.

Armaduras perdem um ponto de durabilidade a cada golpe efetivamente recebido. Ferramentas perdem um ponto ao concluir a mineração de um bloco ou acertar uma criatura. A barra abaixo do ícone mostra a vida útil restante e fica vermelha abaixo de 20%. Ao chegar a zero, o item quebra e é removido. O desgaste acompanha a peça no inventário, equipada, no chão e ao recarregar a partida.

Para criar equipamentos adicionais, use `tool.durability` ou `armor` com `slot`, `bonusLife` e `durability` no `config.json` do item. As regras genéricas de desgaste não precisam ser duplicadas no script do asset.

## Adicionar conteúdo pelos assets

| Arquivo | O que define |
| --- | --- |
| `src/assets/blocks/<CHAVE>/config.json` | ID estável, nome, cor, solidez, dureza, item coletado e textura do bloco colocado. |
| `src/assets/blocks/<CHAVE>/index.ts` | Estados colocado, inventário e dropado, renderização pixelada e interações específicas do bloco. |
| `src/assets/items/<CHAVE>/config.json` | Identificador usado nas fórmulas, nome, referência opcional ao bloco colocado e propriedades da pilha. |
| `src/assets/items/<CHAVE>/index.ts` | Estados inventário e dropado; ferramentas também implementam o estado segurado na mão. |
| `src/assets/recipes.json` | Desenho em linhas e colunas e pilha de saída. O caderno e as duas grades leem esse arquivo. |

Por exemplo, para acrescentar um bloco de ladrilhos, crie `src/assets/blocks/TILE_BRICK/config.json` com um ID livre. O campo `drop` aponta para o identificador do item coletado.

```json
{
  "TILE_BRICK": {
    "id": 17, "name": "Ladrilhos", "color": "#a87d61",
    "solid": true, "hardness": 0.6, "drop": "tileBrick"
  }
}
```

Em `src/assets/items/tileBrick/config.json`, associe o item ao bloco com `"block": "TILE_BRICK"`. Crie `src/assets/items/tileBrick/index.ts` e registre o novo bloco/item no agregador `src/assets/index.ts`. Para fabricar dois ladrilhos com dois tijolos lado a lado, acrescente este objeto à lista de receitas.

```json
{
  "pattern": [["brick", "brick"]],
  "output": {"item": "tileBrick", "amount": 2}
}
```

Cada linha do padrão tem a mesma largura. Use `null` para uma casa vazia. A orientação e os espaços internos fazem parte da fórmula. Preserve os IDs dos blocos e as chaves dos itens já publicados para que mundos salvos continuem apontando para os mesmos recursos.

## Pipeline de geração do mundo

Mundos novos possuem 256 blocos de altura. O relevo e o clima são calculados por coluna de 64 blocos. As seções de terreno de 64×32 são materializadas conforme a exploração, a simulação ou a câmera precisam delas. Até 64 colunas ficam em memória. Ao revisitar uma coluna descartada, o jogo regenera cada seção pela seed e reaplica as edições daquela região.

Os geradores especializados ficam em `src/business/worldgen`. Cada estágio recebe o mesmo contexto, incluindo a origem global do chunk, e modifica somente a parte do terreno sob sua responsabilidade. Os campos climáticos usam frequências mais baixas para permitir biomas e formações maiores que um chunk sem criar emendas visíveis.

As definições declarativas em `worldgen/features` descrevem materiais, profundidade, raridade, biomas e blocos substituíveis. O `FeatureRegistry` valida essas definições e resolve nomes pelo catálogo; as estratégias recebem somente contratos resolvidos e cuidam da distribuição espacial. Assim, novos depósitos e estruturas vegetais reutilizam algoritmos existentes sem acoplar blocos concretos ao gerador. `Landscape` permanece restrito a relevo, clima e classificação de biomas.

| Estágio | Responsabilidade |
| --- | --- |
| Multi-noise, fBm e splines | Produzir continentalidade, erosão, estranheza, picos e vales, temperatura e umidade, transformando esses campos em relevo controlado. |
| Densidade do terreno | Construir uma crosta contínua, com pelo menos 26 blocos antes da primeira caverna. |
| Veias de cascalho | Criar canais permeáveis que partem da camada de solo, serpenteiam pela rocha e terminam em profundidades determinísticas. |
| Cavernas | Combinar campos de queijo, espaguete e macarrão em profundidades diferentes. |
| Aquíferos | Preencher cavidades com níveis locais de água e reservar lava para as maiores profundidades. |
| Veios minerais | Distribuir recursos raros por faixa de profundidade, região geológica, curva de ocorrência e rocha hospedeira. |
| Ilhas flutuantes | Criar massas de terra raras acima da faixa principal do relevo. |
| Superfície e spawn | Escolher vegetação pelo clima e preparar um ponto inicial seguro. |

A ordem fica declarada em `src/business/worldgen/index.ts`, portanto um gerador pode ser trocado sem incorporar suas regras à classe `World`. O campo `generationVersion` preserva a topologia de saves existentes. Mundos antigos continuam usando as gerações finitas v1 e v2, enquanto novos mundos usam chunks na geração v3.

Alterações v3 são salvas por coordenadas globais `[x, y, bloco]`, inclusive para valores negativos de `x`. Somente diferenças produzidas pelo jogador ou pela simulação são persistidas. O terreno procedural original não é duplicado no `localStorage`.

O minimapa usa a leitura cartográfica passiva `World.mapPeek`. Diferentemente de `World.get`, essa operação nunca cria um chunk nem revela seu conteúdo. A miniatura acompanha uma janela próxima de 52×42 blocos ao redor do jogador.

A descoberta é subdividida em seções de 64×32 blocos. O movimento revela uma área circular de 40 blocos, lateralmente e em profundidade. Assim, cavernas, aquíferos e minérios subterrâneos permanecem ocultos até o jogador se aproximar deles. O modal ampliado calcula seus limites a partir das células descobertas e usa uma única escala para os dois eixos, com margens quando necessário, evitando distorção do terreno.

As seções descobertas são comprimidas por RLE no save. Restaurar o histórico do minimapa não gera chunks nem consulta terreno ainda desconhecido. O modal mostra todo o percurso registrado e adapta a amostragem quando a expedição atravessa uma distância maior que a resolução do canvas.

O relevo de superfície combina continentalidade, erosão e picos/vales para formar cadeias montanhosas extensas, planaltos e transições suaves. Carvão, cobre e ferro possuem faixas mais próximas da superfície e frequências maiores. Ouro e cristal permanecem raros e concentrados nas maiores profundidades.

O cascalho aparece principalmente sob a terra, atravessando a transição para a pedra, com afloramentos ocasionais. Ele retém até duas unidades de água por célula, atrai rapidamente a umidade dos materiais vizinhos e a conduz para baixo ao longo de veias conectadas. Mundos criados antes da geração v5 preservam sua topologia original.

A arquitetura adapta ao jogo 2D as ideias de cavernas de ruído, aquíferos locais e roteamento de funções de densidade apresentadas na geração moderna do Minecraft. As ilhas flutuantes são uma extensão própria do projeto.

## Entidades, drops e reprodução

Entidades ficam em `src/assets/entities/<id>/` e têm configuração, estados e um `brain.ts` modular. A vaca é pacífica, o lobo é agressivo e o slime é hostil. Somente entidades próximas ao jogador executam seu brain.

Ao morrer, cada entidade lê seu loot da configuração e cria pilhas dropadas no mundo. A vaca aceita trigo no botão direito para entrar em modo amoroso; duas vacas próximas geram um bezerro, que cresce após o tempo definido no asset.

Itens de loot como couro, carne crua, carne assada e gosma possuem estados de inventário e drop no próprio asset. Itens consumíveis definem um efeito `use`, como cura. **R** consome o item selecionado. Itens que podem ser colocados continuam associados a um bloco; ferramentas continuam associadas ao estado segurado.

O botão esquerdo usa o item da mão: blocos e itens comuns batem com nível 1, picaretas possuem nível maior e espadas têm maior dano e alcance. Não há ataque por tecla fixa; todas as pancadas são executadas pelo slot selecionado.

Cada bloco declara `mineTier`. A mão usa tier 1, picaretas podem declarar tiers maiores e só podem quebrar blocos com tier menor ou igual ao limite da ferramenta.

A progressão atual usa seis tiers. A mão, tier 1, remove somente materiais fracos como terra, grama e areia. A picareta de madeira, tier 2, alcança pedra. A picareta de pedra, tier 3, alcança carvão e cobre. A picareta de cobre, tier 4, alcança ferro e ouro. A picareta de ferro, tier 5, alcança cristal. A picareta de cristal, tier 6, quebra todo bloco minerável. Rocha matriz possui dureza nula e nunca recebe dano, independentemente do tier.

## Engine orientada a assets

Os módulos em `src/business` implementam capacidades genéricas: colisão, inventário, persistência, mineração, colocação, IA ativa e renderização. Regras específicas ficam nos assets. Um bloco informa solidez, dano, drop, iluminação e decorações; um item informa colocação, ferramentas e estados; uma entidade informa dimensão, vida, raio ativo, spawn, loot, reprodução e brain.

Cada bloco implementa sua própria textura em `src/assets/blocks/<CHAVE>/index.ts`, incluindo paleta, variação e detalhes do material. O atlas somente cria as quatro variações em cache e delega o desenho ao asset.

## Exploração e salvamento

Use **A/D** para andar, **Shift** para correr e **Espaço** para pular. Segure o botão esquerdo para atingir o primeiro bloco ou criatura à frente do explorador. O cursor ajusta a inclinação do golpe e o equipamento define o alcance. As rachaduras mostram a fração já minerada e permanecem ao interromper a ação ou recarregar o mundo. Use **Q** para soltar uma unidade do item selecionado. Abra o mapa completo clicando no minimapa ou pressionando **G**.

A colocação começa no modo por aproximação, que encontra o próximo espaço livre apoiado na direção da mira. A tecla **M** alterna para o modo livre, que usa a célula sob o cursor. O terminal também aceita `/placement livre` e `/placement aproximacao`. Use **P** ou **Esc** para abrir o menu.

Blocos quebrados e criaturas deixam recursos físicos. Ao se aproximar, o explorador recolhe toda a pilha. Itens lançados com **Q** mantêm o movimento e têm um breve intervalo antes de poderem ser recolhidos. O menu permite ativar os sons de impacto durante a sessão.

Troncos e folhas gerados com o terreno podem ser atravessados pelo explorador e pelas criaturas, mas continuam recebendo golpes e produzindo drops. Madeira colocada pelo jogador permanece sólida. A chuva acompanha somente a área visível ao redor do explorador, com uma margem curta fora da tela e uma quantidade limitada de gotas.

Blocos com `gravity: true`, como a areia, caem quando perdem o apoio. A posição final e o dano acompanham o bloco no save.

O jogo salva a cada 18 segundos de exploração, ao ocultar ou sair da página e pelo menu. O formato v4 registra a posição de cada pilha, a seleção da barra e as bancadas colocadas no terreno. Saves v2 e v3 na mesma origem são convertidos na leitura e gravados em uma chave v4 no próximo salvamento. O navegador separa os dados por origem, incluindo a porta.
