# Criar conteúdo para o Terra

Crie um arquivo `*.pack.json` nesta pasta. Defina um `id` como `oficina:horta`, use `schemaVersion: 1` e declare apenas as coleções necessárias. Se o pacote usar conteúdo de outro pacote, liste os IDs em `dependencies`. Execute `pnpm content:check` após editar e reinicie o servidor de desenvolvimento para carregar o novo índice. O comando também é executado pelo build. O arquivo `generated.ts` é gerado automaticamente.

| Para criar | Declare | Exemplo jogável |
| --- | --- | --- |
| Planta com ciclo de vida | Blocos com estados visuais, item de plantio, distribuição, transformação e drops | `herbalism.pack.json` gera flores em grama de regiões úmidas. Replante as sementes sobre grama e mantenha o solo úmido e o céu aberto. |
| Estação e produto | Bloco, item colocável, receita de bancada, capacidades, fonte de energia e processos | Na bancada, fabrique o almofariz. Macere uma flor e combine a pasta com farinha para obter o cataplasma. |
| Habitat e animal | Variante de bioma, dieta, substratos, preferência de aparecimento, sprite e comportamentos em ordem de prioridade | O cervo de `meadow.pack.json` foge do lobo, descansa à noite e pasta durante o dia. |
| Equipamento hidráulico | Estação com `energy.type` igual a `hydraulic` e uma taxa de trabalho por volume | Fabrique o moinho de `watermill.pack.json` com o moinho manual, ferro e tábuas. Instale-o imediatamente acima do canal. Cada bloco de volume de água que sai da célula inferior para uma passagem livre fornece cinco unidades de trabalho. |

Os nomes usados em itens, processos e transformações são persistentes. Cada bloco também precisa de um ID numérico exclusivo entre 0 e 65535, usado nos saves. Ao publicar conteúdo, mantenha esses identificadores. A versão de geração delimita em quais mundos uma nova distribuição participa. As distribuições e variantes desta leva começam na geração 6.

O contrato TypeScript está em `src/business/content/ContentPack.ts`. Os sensores e operadores ambientais são compilados antes da simulação. O jogo resolve os materiais usados na geração e combina as receitas com as capacidades de cada estação. Para verificar uma mudança de conteúdo em jogo, use `pnpm test`. Os casos de aceitação estão em `tests/content-packs.test.ts`.
