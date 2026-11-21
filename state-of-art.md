Essa decisão muda significativamente a forma como devemos pensar a arquitetura do Terra.

Você não está querendo apenas desenvolver um jogo extensível. Está querendo construir **uma plataforma de desenvolvimento de jogos orientada a conteúdo**, na qual a própria evolução do Terra aconteça, em grande parte, sem a necessidade de modificar a engine.

A equipe de desenvolvimento seria responsável por construir as capacidades fundamentais do universo. A equipe de produto seria responsável por definir como essas capacidades se manifestam dentro do jogo.

O princípio arquitetural seria:

> A engine define o que é possível acontecer. Os assets definem o que acontece, quando acontece e sob quais condições.

Esse modelo é conhecido como **Data-Driven Game Architecture**, combinado com sistemas de regras declarativas, composição de comportamentos e extensibilidade orientada a conteúdo.

## **1. A divisão de responsabilidades**

## **Engenharia**

Responsável pela engine

- Física
- Renderização
- Sistema de eventos
- Interpretador de regras
- Geração procedural
- Sistema de energia
- Sistema de comportamentos
- Persistência
- Agendamento da simulação

## **Produto e conteúdo**

Responsável pelos assets

- Blocos e materiais
- Criaturas
- Biomas
- Ferramentas
- Receitas
- Estruturas
- Comportamentos
- Transformações
- Progressão tecnológica

O contrato entre essas equipes passa a ser tão importante quanto a própria engine.

A equipe de produto não deveria precisar conhecer `Expedition.ts`, `World.ts` ou `Hydrology.ts` para criar um novo vegetal, uma criatura, um minério ou uma estação de trabalho.

E a equipe de desenvolvimento não deveria precisar conhecer todas as espécies, receitas ou materiais específicos para implementar os sistemas fundamentais.

## **2. O que precisa mudar na arquitetura atual**

O Terra já está parcialmente orientado a dados. Entretanto, existe uma diferença importante entre uma engine **configurável por assets** e uma engine **governada por assets**.

Hoje, parte das regras ainda está implementada diretamente no código.

| Sistema        | Situação atual                      | Arquitetura desejada                         |
| -------------- | ----------------------------------- | -------------------------------------------- |
| Blocos         | JSON + scripts TypeScript           | Composição de propriedades e capacidades     |
| Entidades      | Classes e brains especializados     | Composição declarativa de comportamentos     |
| Geração        | Classes de geradores especializados | Pipelines configuráveis por assets           |
| Transformações | Regras declarativas                 | Expandir o sistema existente                 |
| Estações       | Registry e configurações JSON       | Composição de processos e fontes de energia  |
| Receitas       | Configurações JSON                  | Regras declarativas de transformação         |
| Biomas         | Parcialmente definidos no código    | Definições independentes nos assets          |
| Interações     | Métodos da `Expedition`             | Ações, condições e efeitos registrados       |
| Renderização   | Scripts individuais                 | Composição visual por estados e propriedades |

Por exemplo, atualmente existe uma classe `Cow`, uma classe `Wolf` e uma classe `Slime`.

Idealmente, a engine não deveria conhecer o conceito de vaca, lobo ou slime. Deveria conhecer conceitos como organismo, movimento terrestre, predação, reprodução, nutrição, percepção e agressividade.

A vaca seria apenas uma composição dessas capacidades.

O mesmo princípio se aplica a todos os demais elementos do mundo.

## **3. Arquitetura proposta: Content-Driven Engine**

Eu organizaria a engine em cinco camadas fundamentais.

## **01 — Content Layer**

Domínio da equipe de produto

Blocks

Entities

Biomes

Recipes

Structures

Behaviors

Rules

Stations

Technologies

### **02 — Content Compiler**

Carregamento, validação, dependências e resolução de referências

### **03 — Runtime Registry**

Definições compiladas, imutáveis e prontas para execução

### **04 — Simulation Kernel**

Domínio da engenharia

Sensors

Conditions

Actions

Effects

Events

Scheduler

Physics

Worldgen

Persistence

### **05 — Runtime World**

Resultado da interação entre conteúdo, engine e jogador

A camada mais importante dessa proposta é o `ContentCompiler`.

Não devemos permitir que a engine fique interpretando arquivos JSON, resolvendo referências textuais e validando definições repetidamente durante o game loop.

Os assets devem ser carregados e compilados antes da execução. O resultado será um catálogo otimizado de definições que a engine consiga processar com eficiência.

## **4. A nova organização do projeto**

Eu evoluiria progressivamente a estrutura atual para algo assim:

**terra/**

&#x20;**engine/**

Engenharia

core/

physics/

simulation/

worldgen/

entities/

behaviors/

rules/

energy/

inventory/

rendering/

persistence/

content/

&#x20;**assets/**

Produto e conteúdo

blocks/

items/

entities/

biomes/

behaviors/

structures/

generation/

transformations/

stations/

recipes/

technologies/

textures/

&#x20;**schemas/**&#x20;

Contrato entre equipes



&#x20;**sdk/**&#x20;

Ferramentas de extensão



&#x20;**tools/**&#x20;

Editor e validador de conteúdo



&#x20;**tests/**&#x20;

Qualidade e regressão



O ponto não é simplesmente reorganizar pastas. É estabelecer uma fronteira de dependência.

**A engine nunca deveria importar diretamente um asset concreto de conteúdo.**

Atualmente, por exemplo, o `StationRegistry.ts` importa diretamente os arquivos do moinho, forno e bancada.

No futuro, ele deveria receber definições carregadas pelo sistema de conteúdo, independentemente de quais estações existem.

## **5. O vocabulário universal da engine**

Para que a equipe de produtos consiga criar funcionalidades complexas, precisamos oferecer um conjunto de primitivas reutilizáveis.

| Primitiva | Responsabilidade                  | Exemplos                        |
| --------- | --------------------------------- | ------------------------------- |
| Property  | Característica de um recurso      | Dureza, massa, permeabilidade   |
| State     | Informação mutável                | Umidade, temperatura, idade     |
| Component | Capacidade de um objeto           | Movimento, inventário, nutrição |
| Sensor    | Leitura do mundo                  | Água próxima, luz, temperatura  |
| Condition | Avaliação lógica                  | Solo saturado acima de 60%      |
| Action    | Execução de comportamento         | Mover, consumir, atacar         |
| Effect    | Modificação do estado             | Alterar bloco, produzir item    |
| Event     | Comunicação de acontecimentos     | Chuva, mineração, morte         |
| Selector  | Seleção de alvos                  | Vizinho, presa, recipiente      |
| Rule      | Combinação de condições e efeitos | Crescimento vegetal             |
| Strategy  | Algoritmo especializado           | Distribuição de minérios        |
| Modifier  | Alteração de uma propriedade      | Aumento de velocidade           |

Esses elementos formam uma espécie de linguagem de domínio do Terra.

A equipe de engenharia desenvolve seu vocabulário. A equipe de produto utiliza esse vocabulário para escrever as regras do universo.

## **6. Exemplo prático: criando um novo material**

Imagine que a equipe de produtos decida adicionar argila ao jogo.

[Pixel ground seamless pattern. Pixelart computer block texture. Digital brown ground pattern. Game style squared background. Vector illustration isolated on white background](https://images.openai.com/static-rsc-4/5CIaKLbOy02p1Db9vxkmbR24gavLZpsbqC9w7HUemfCx_5G8iqMp-i7l2bOrE3AiouSXqGoRRP33qy3RZ-9EYYU4dZleFbcHUVQeE6z36n-p5i3W5m64qV48KVIK2ruvdLtlmNipmHY4A7DS2YXC2Il0E7nGIBvR777Tpc_ckSXmm4ZPHtBNlngtmVNchEt7?purpose=inline)

## **Argila**

Material mineral encontrado próximo a corpos de água, com capacidade de retenção hídrica e utilidade na produção de cerâmica.

Exemplo conceitual de um novo asset.

O asset poderia ser definido em `assets/blocks/clay/block.json`.

```
{
  "id": "terra:clay",
  "name": "Argila",
  "tags": [
    "mineral",
    "soil",
    "ceramic_material"
  ],
  "components": {
    "collision": {
      "solid": true
    },
    "mining": {
      "hardness": 0.8,
      "requiredTier": 1,
      "drop": "terra:clay"
    },
    "hydrology": {
      "capacity": 1.5,
      "permeability": 0.015
    }
  },
  "visual": {
    "texture": "./clay.png",
    "variants": 4
  }
}
```

A equipe de produto não escreve nenhuma lógica de colisão, mineração ou hidrologia.

Cada sistema da engine reconhece o componente que lhe compete e aplica suas regras genéricas.

Esse modelo é baseado em **composição**, não em herança.

Não precisamos criar uma classe `ClayBlock extends Block`.

## **7. A geração procedural também deve ser um asset**

Não basta definir o material. Produto precisa controlar onde ele aparece.

O mesmo diretório poderia conter um arquivo `generation.json`.

```
{
  "id": "terra:clay_deposits",
  "stage": "mineral_deposits",
  "strategy": "cluster",
  "placement": {
    "replaceTags": ["soil", "sediment"],
    "depth": {
      "min": 1,
      "max": 12
    },
    "conditions": {
      "all": [
        {
          "sensor": "climate.humidity",
          "operator": "gte",
          "value": 0.65
        },
        {
          "sensor": "terrain.distanceToWater",
          "operator": "lte",
          "value": 8
        }
      ]
    }
  },
  "distribution": {
    "probability": 0.12,
    "radius": {
      "min": 2,
      "max": 5
    }
  },
  "result": {
    "block": "terra:clay"
  }
}
```

Nesse modelo, a engine oferece algoritmos genéricos de distribuição.

Cluster

Depósitos concentrados

Vein

Veios minerais

Scatter

Distribuição dispersa

Layer

Camadas geológicas

Noise mask

Campos de ocorrência

Structure

Estruturas planejadas

A equipe de desenvolvimento implementa `ClusterStrategy` uma única vez.

A partir daí, a equipe de produto consegue utilizá-la para gerar argila, cristais, vegetação, depósitos de sal ou outros recursos, desde que suas necessidades sejam compatíveis com a estratégia.

O pipeline e seus estágios também poderiam ser configurados no conteúdo, enquanto a engine valida dependências e garante que a ordem de execução seja consistente.

## **8. O sistema universal de regras**

Considero essa a peça central de toda a arquitetura.

O Terra já possui uma fundação interessante no `WorldEvolutionSystem`. Eu generalizaria essa capacidade para outros domínios do jogo.

Toda regra seria composta de:

1

**Trigger**

Quando a regra deve ser avaliada?

A cada ciclo ambiental

2

**Scope**

Sobre quais objetos?

Blocos com a tag soil

3

**Sensors**

Quais informações consultar?

Saturação, temperatura

4

**Conditions**

O que precisa ser verdadeiro?

Saturação acima de 80%

5

**Effects**

O que deve acontecer?

Transformar o material

6

**Policy**

Como controlar a execução?

Duração, probabilidade, cooldown

### **Exemplo: transformação de argila em argila seca**

```
{
  "id": "terra:clay_drying",
  "trigger": {
    "type": "simulation.environment"
  },
  "scope": {
    "block": "terra:clay"
  },
  "conditions": {
    "all": [
      {
        "sensor": "cell.waterSaturation",
        "operator": "lt",
        "value": 0.15
      },
      {
        "sensor": "cell.skyExposure",
        "operator": "eq",
        "value": true
      }
    ]
  },
  "execution": {
    "continuousDuration": "2 game_days",
    "probability": 0.8
  },
  "effects": [
    {
      "type": "world.transformBlock",
      "target": "self",
      "block": "terra:dry_clay"
    }
  ]
}
```

Com essa estrutura, a equipe de produto pode definir inúmeros fenômenos utilizando o mesmo motor.

| Fenômeno     | Condições                       | Efeito                          |
| ------------ | ------------------------------- | ------------------------------- |
| Oxidação     | Metal + umidade                 | Transformar material            |
| Congelamento | Água + baixa temperatura        | Produzir gelo                   |
| Derretimento | Gelo + calor                    | Produzir água                   |
| Erosão       | Solo + correnteza               | Remover ou transportar material |
| Germinação   | Semente + umidade + temperatura | Gerar vegetal                   |
| Decomposição | Matéria orgânica + tempo        | Alterar nutrientes              |
| Incêndio     | Combustível + fonte térmica     | Queimar e propagar calor        |
| Corrosão     | Material + substância corrosiva | Reduzir integridade             |

Esses exemplos pressupõem que a engine já ofereça os sensores e efeitos correspondentes. Produto pode combiná-los livremente, mas não inventar uma capacidade física que ainda não existe no motor.

### **Um simulador conceitual de regra**

## **Interpretador ambiental**

Regra: terra:clay_drying

Umidade do material

12%

Duração contínua das condições

2.0 dias

Exposto ao céu

Sorteio determinístico (demonstrativo)

45/100

Saturação inferior a 15%

Exposição ao céu

Duração mínima de 2 dias

Sorteio inferior a 80

Resultado do interpretador

# **Argila seca**

Todas as condições foram satisfeitas e o efeito foi autorizado.Restaurar exemplo

Esse é o comportamento que queremos generalizar: um interpretador que não precisa conhecer a argila especificamente, apenas saber interpretar e executar os contratos declarados.

## **9. Entidades orientadas a composição**

[2D Pixel Art Deer Sprites by Azdner](https://images.openai.com/static-rsc-4/NxrkpJn9QvcJQHiaMKVhpM_WJVZk_oY95whppp2qs_3_1hLVeHWPom_ygAba2OlB5WioZZQwwf97RGV2zpTHdl4qDenT5BSDJ_xjKH_6DfcK_bW70JQT3uz7BYMGCfUB8M_JlQtxKUuH-P1u3EAQG_bRp6tSveYNJBwuRMfFPYs?purpose=inline)

## **Exemplo: cervo**

Uma nova espécie herbívora que pode ser introduzida sem criar uma classe `Deer.ts`, desde que as capacidades necessárias estejam disponíveis.

```
{
  "id": "terra:deer",
  "name": "Cervo",
  "components": {
    "health": {
      "max": 40
    },
    "locomotion": {
      "type": "terrestrial",
      "walkSpeed": 45,
      "runSpeed": 90
    },
    "metabolism": {
      "hungerRate": 0.004,
      "thirstRate": 0.006
    },
    "perception": {
      "radius": 12
    },
    "diet": {
      "foodTags": ["grass", "leaves"]
    },
    "reproduction": {
      "type": "sexual",
      "maturity": "10 game_days",
      "gestation": "3 game_days"
    }
  },
  "behaviors": [
    "core:flee_predator",
    "core:seek_water",
    "core:seek_food",
    "core:reproduce",
    "core:wander"
  ],
  "habitat": {
    "biomes": ["terra:forest", "terra:grassland"]
  }
}
```

A riqueza do sistema estaria nas combinações.

Composição de capacidades por espécie

| Capacidade          | Vaca | Lobo | Cervo | Peixe | Ave |
| ------------------- | ---- | ---- | ----- | ----- | --- |
| Nutrição            |      |      |       |       |     |
| Hidratação          |      |      |       |       |     |
| Movimento terrestre |      |      |       |       |     |
| Natação             |      |      |       |       |     |
| Voo                 |      |      |       |       |     |
| Predação            |      |      |       |       |     |
| Herbivoria          |      |      |       |       |     |
| Reprodução          |      |      |       |       |     |
| Fuga                |      |      |       |       |     |

Exemplo hipotético de composição. Não representa todas as capacidades das espécies atualmente implementadas.

### **Os próprios comportamentos também devem ser assets**

Não quero limitar produto a escolher comportamentos predefinidos.

Produto também deveria conseguir criar novos comportamentos combinando sensores e ações.

Por exemplo, `assets/behaviors/flee_predator.json`:

```
{
  "id": "core:flee_predator",
  "selection": {
    "sensor": "entities.nearby",
    "filter": {
      "relationship": "predator"
    },
    "sort": "nearest"
  },
  "utility": {
    "sensor": "target.distance",
    "curve": [
      [0, 1.0],
      [4, 0.9],
      [8, 0.5],
      [12, 0.0]
    ]
  },
  "action": {
    "type": "movement.flee",
    "target": "selected",
    "speed": "run"
  }
}
```

O motor de Utility AI avalia as necessidades e escolhe o comportamento mais relevante.

## **Simulação de Utility AI**

Altere o estado da criatura e observe a seleção do comportamento.

Fome

65%

Sede

35%

Distância do predador

9 blocos



Fugir do predador

38

**Buscar alimento**

62

Buscar água

35

Explorar

20

Descansar

15

Comportamento selecionado

# **Buscar alimento**

Na implementação real, a engine também precisaria tratar interrupções, cooldowns, duração mínima de ações, navegação e comportamentos de contingência para evitar que as criaturas alternem incessantemente entre decisões.

## **10. Estações de trabalho como composição de capacidades**

Essa mesma filosofia deve ser aplicada à evolução que acabamos de realizar nas estações.

Uma estação não deveria ser programada como um equipamento específico. Ela deveria ser definida como uma composição de capacidades produtivas, interfaces e fontes energéticas.

[Wooden Grain Mill 3d Model: Wooden Hand-cranked Grain Mill With Large Flywheel | Tripo AI](https://images.openai.com/static-rsc-4/xrplvHGm91By1VXPBp3ZHhCgD4Gjq-OdWHG8FR2RvMpvdOdBN5ZzTRj4ZUBnHcdFSB6x8r1Ph2L1ah-2E8TeywZOgFD1yW53qiwxBu1Yashm6b1ana5J-XnL3pVHds2ig4ux9L4TY3kPhiV_IzpwsQ7xDdVQLkmj2Fb0BFpt8NY?purpose=inline)

**Moinho manual**

Moagem + trabalho humano

[Land of Prosperity](https://images.openai.com/static-rsc-4/TnGwjrkXJLjOl_CH4T0f2bs3x-YvoLL0z-612IVv7_p9tMQfNMrmtMqBwSUFU53felA_vumHxuXG42olXjJCKGKuES6kTkft3qZiQko5r79Ta0LrbMWGpM6n6M0FMaDHNF3ezCGDIfyZCTKO9gmU9CpRrHgM57vSOLBhNF8OAa0?purpose=inline)

**Moinho hidráulico**

Moagem + energia mecânica

[Update 0.4.4 - New Exterior · Travellers Rest update for 14 October 2021 · SteamDB](https://images.openai.com/static-rsc-4/eOr2voBwQwFKDH06A59WlaztzpoH_c7Bi7CLhgSMTPoJRxLL8aZRsSVUHirBG_q-3a3ZRtHCEx2GOsmnW-t895hnR6woPZCuOYD0EDg_NzGWUL0XS0E5JWI81LkqrjN75bBG8BZeJFxYO0qBWG-HmcympvnS5ZgwiNU--wRlWXI?purpose=inline)

**Forno**

Processamento + energia térmica

Uma máquina hipotética poderia ser declarada assim:

```
{
  "id": "terra:watermill",
  "name": "Moinho hidráulico",
  "components": {
    "inventory": {
      "inputSlots": 4,
      "outputSlots": 4
    },
    "processor": {
      "capabilities": [
        "grinding",
        "crushing"
      ],
      "efficiency": 1.5
    },
    "energyConsumer": {
      "type": "mechanical",
      "minimumPower": 20
    }
  },
  "visual": {
    "states": {
      "idle": "./idle.png",
      "working": "./working.png"
    }
  }
}
```

A máquina não precisa conhecer trigo, farinha ou minérios.

As receitas especificam quais capacidades são necessárias. E o motor identifica quais máquinas são compatíveis.

```
{
  "id": "terra:ore_crushing",
  "requires": ["crushing"],
  "inputs": [
    {
      "item": "terra:copper_ore",
      "amount": 2
    }
  ],
  "outputs": [
    {
      "item": "terra:copper_powder",
      "amount": 2
    }
  ],
  "work": 25
}
```

O moinho hidráulico poderia executar essa receita sem nenhuma alteração em sua definição.

Esse é o tipo de relação que devemos buscar: **sistemas extensíveis por composição e compatibilidade, e não por conhecimento explícito entre objetos.**

## **11. O Game Loop passa a executar sistemas, não funcionalidades**

O game loop não deveria conter verificações como:

```
if (entity.kind === "cow") {
  // Comportamento da vaca
}

if (block === B.WHEAT) {
  // Crescimento do trigo
}
```

Ele deveria executar sistemas genéricos, que processam os objetos elegíveis.

```
class Engine {
  constructor(
    private readonly scheduler: Scheduler,
    private readonly content: RuntimeRegistry,
    private readonly world: World
  ) {}

  tick(delta: number) {
    this.scheduler.execute({
      delta,
      world: this.world,
      content: this.content
    });
  }
}
```

Cada sistema recebe uma responsabilidade específica.

```
interface SimulationSystem {
  readonly id: string;

  update(context: SimulationContext): void;
}
```

### **Ciclo conceitual da engine**

01

**Input & Commands**

Intenções do jogador

02

**Physics**

Movimento, colisão, gravidade

03

**Environment**

Água, clima, energia, temperatura

04

**Rule Evaluation**

Condições e transformações declaradas

05

**Behavior Evaluation**

Percepção e decisão das entidades

06

**Production**

Processamento e cadeias produtivas

07

**World Mutation**

Validação e aplicação dos efeitos

08

**Presentation**

Representação visual do estado

Ordem ilustrativa. Cada sistema pode possuir frequência e orçamento computacional próprios.

A vantagem é que novos conteúdos passam a utilizar automaticamente os sistemas existentes.

Isso também permite remover grande parte das responsabilidades específicas que atualmente estão concentradas na `Expedition`.

Não considero obrigatório migrar para um ECS completo agora. Podemos introduzir composição e processamento orientado a componentes mantendo partes importantes da arquitetura existente.

## **12. O Asset Compiler**

Esse seria um dos componentes mais importantes a desenvolver.

```
assets/
   │
   ▼
ContentLoader
   │
   ▼
SchemaValidator
   │
   ▼
DependencyResolver
   │
   ▼
SemanticValidator
   │
   ▼
ContentCompiler
   │
   ▼
RuntimeRegistry
```

| Componente            | Responsabilidade                              |
| --------------------- | --------------------------------------------- |
| ContentLoader         | Descobrir e carregar os recursos              |
| SchemaValidator       | Validar formatos, tipos e campos obrigatórios |
| DependencyResolver    | Resolver referências entre assets             |
| SemanticValidator     | Validar a coerência das regras                |
| ContentCompiler       | Transformar conteúdo em estruturas eficientes |
| RuntimeRegistry       | Disponibilizar definições compiladas          |
| ContentDiagnostics    | Informar erros à equipe de produto            |
| ContentVersionManager | Controlar versões e compatibilidade dos saves |

O compilador também deveria detectar problemas como referências a itens inexistentes, IDs duplicados, comportamentos desconhecidos, temperaturas inválidas, receitas incompatíveis e dependências circulares não permitidas.

Um asset inválido não deveria simplesmente provocar um erro durante a partida.

Terra Content Compiler — exemplo de saída

Scanning assets/...

32 block definitions

38 item definitions

10 entity definitions

14 behavior definitions

8 generation rules

6 station definitions

ERROR — Unknown effect

assets/blocks/clay/transformations.json

Effect "world.changeTemperature" is not registered.

Available: environment.setTemperature

Compilation failed: 1 error

Outro aspecto fundamental é utilizar identificadores estáveis, por exemplo `terra:clay`, em vez de depender da ordem em que os assets são registrados.

Internamente, o compilador pode convertê-los em identificadores numéricos eficientes. A persistência deve manter um mapeamento compatível com as versões do catálogo.

## **13. Conteúdo organizado em pacotes**

Eu iria além de uma única pasta de assets.

Criaria o conceito de **Content Pack**.

```
content/
├── core/
│   ├── manifest.json
│   ├── blocks/
│   ├── items/
│   └── behaviors/
│
├── agriculture/
│   ├── manifest.json
│   ├── crops/
│   ├── recipes/
│   └── transformations/
│
├── metallurgy/
│   ├── manifest.json
│   ├── ores/
│   ├── stations/
│   └── recipes/
│
└── ecology/
    ├── manifest.json
    ├── entities/
    ├── habitats/
    └── behaviors/
```

Cada pacote possui uma versão, dependências e requisitos da engine.

```
{
  "id": "terra:agriculture",
  "version": "1.2.0",
  "engine": ">=0.5.0",
  "dependencies": {
    "terra:core": "^1.0.0"
  }
}
```

Isso abre a possibilidade de distribuir expansões, experimentar conjuntos de regras, desenvolver conteúdos em paralelo e, futuramente, oferecer suporte a mods criados pela comunidade.

## **14. O Terra Studio: uma ferramenta para a equipe de produtos**

Se queremos realmente separar as equipes, não podemos exigir que todo designer seja especialista em JSON.

Em um segundo momento, criaria uma ferramenta visual de edição de conteúdo: o **Terra Studio**.

iframe

*Protótipo interativo conceitual. Altere os atributos, selecione diferentes materiais e observe a definição gerada.*

A ferramenta de produto poderia oferecer edição de propriedades, construção visual de regras, preview de criaturas, configuração de biomas, simulação de geração procedural, testes de receitas e inspeção de cadeias produtivas.

O Studio não seria dono das regras. Ele seria uma representação visual dos schemas e contratos disponibilizados pela engine.

Assim, quando engenharia disponibilizasse uma nova capacidade, ela poderia se tornar configurável também no editor.

## **15. O cuidado mais importante: não criar uma segunda linguagem de programação desnecessariamente**

Existe um risco nessa arquitetura.

Ao tentar tornar absolutamente tudo declarativo, podemos acabar construindo uma linguagem de programação inteira dentro de arquivos JSON.

Condições, loops, variáveis, funções, chamadas recursivas e controle arbitrário de execução podem tornar o conteúdo mais difícil de manter do que o próprio TypeScript.

Por isso, estabeleceria três níveis de extensibilidade.

**Nível 1 — Conteúdo declarativo**

Equipe de produto

Propriedades, blocos, receitas, criaturas, biomas, regras e estruturas configuradas por schemas.

**Nível 2 — Composição de comportamentos**

Game designers e technical designers

Regras compostas, árvores de decisão, condições, sequências de ações e processos produtivos.

**Nível 3 — Extensão do motor**

Equipe de desenvolvimento

Novos algoritmos, sensores, ações, componentes, estratégias de geração e sistemas físicos.

Por exemplo:

| Solicitação de produto                        | Necessita desenvolvimento?                      |
| --------------------------------------------- | ----------------------------------------------- |
| Adicionar um novo minério                     | Não                                             |
| Adicionar uma espécie herbívora               | Não, com as capacidades existentes              |
| Criar uma nova receita                        | Não                                             |
| Criar uma estação movida a energia térmica    | Não, após generalização                         |
| Criar um novo bioma                           | Não, com os geradores disponíveis               |
| Criar uma criatura voadora                    | Não, se o movimento aéreo existir               |
| Implementar movimento aéreo pela primeira vez | Sim                                             |
| Criar uma nova lei de propagação de calor     | Sim                                             |
| Implementar eletricidade                      | Sim                                             |
| Criar máquinas elétricas                      | Não, após implementar o sistema de eletricidade |

Essa fronteira é essencial. Engenharia continua sendo necessária, mas seu trabalho passa a ampliar as possibilidades de criação de conteúdo.

## **16. Consistência, performance e segurança**

A liberdade de criação precisa ser acompanhada por mecanismos de proteção.

| Princípio         | Implementação necessária                                           |
| ----------------- | ------------------------------------------------------------------ |
| Determinismo      | Sorteios baseados em seed, tick, coordenadas e identidade da regra |
| Execução limitada | Orçamento de operações por sistema e região                        |
| Atomicidade       | Efeitos compostos validados antes de modificar o mundo             |
| Isolamento        | Assets não acessam diretamente objetos mutáveis da engine          |
| Segurança         | Sem `eval` ou execução arbitrária de código externo                |
| Previsibilidade   | Ordem de avaliação, prioridades e resolução de conflitos definidas |
| Persistência      | Versionamento de schemas, conteúdo e migrações de estado           |
| Observabilidade   | Rastreamento das regras que provocaram alterações                  |
| Performance       | Índices por componentes, tags, eventos e regiões                   |

Por exemplo, se uma regra consome água, altera o solo e gera uma planta, sua execução precisa ser tratada como uma operação consistente.

Caso a geração da planta seja impossível, o sistema não deve consumir os recursos parcialmente, salvo quando essa perda for intencionalmente especificada.

Também não devemos avaliar todas as regras de todos os assets em todas as células a cada frame. Isso destruiria as vantagens de desempenho que já construímos no Terra.

O compilador deve indexar as regras por eventos, componentes, tags e condições de elegibilidade, permitindo que o scheduler avalie somente aquilo que realmente necessita de processamento.

## **17. Como implementar isso no Terra sem reescrever o projeto**

Eu faria uma migração incremental, preservando os sistemas atuais.

## **01**

**Content Kernel**

Construir o loader, schemas, identificadores, compilador de conteúdo e registries independentes.

Critério de entrega: Adicionar um bloco completo sem modificar nenhum arquivo da engine.

## **02**

**Rule Engine**

Generalizar o TransformationRegistry e o TransformationEvaluator. Criar registries de sensores, condições, seletores e efeitos.

Critério de entrega: Adicionar novas transformações ambientais exclusivamente por assets.

## **03**

**World Generation**

Transformar estratégias existentes em capacidades registradas. Migrar depósitos, árvores, biomas e regras de distribuição.

Critério de entrega: Criar um bioma e seus recursos sem código novo.

## **04**

**Entity Composition**

Migrar progressivamente as classes específicas para componentes genéricos e comportamentos declarativos.

Critério de entrega: Criar uma nova espécie funcional apenas adicionando assets.

## **05**

**Production & Energy**

Generalizar as estações de trabalho, fontes energéticas, capacidades e processos produtivos.

Critério de entrega: Criar equipamentos e cadeias produtivas sem modificar ProcessingSystem.

## **06**

**Content Packs & Studio**

Versionamento de pacotes, ferramentas de desenvolvimento de conteúdo e editor visual.

Critério de entrega: Equipe de produto independente para produzir conteúdo validado.

## **18. O próximo commit que eu proporia**

`feat: introduce data-driven content kernel`

Não começaria criando novas criaturas ou estações. Começaria estabelecendo as fundações do contrato de conteúdo.

A estrutura inicial seria:

```
src/business/content/
├── ContentLoader.ts
├── ContentCompiler.ts
├── ContentRegistry.ts
├── ContentValidator.ts
├── ContentDiagnostics.ts
├── ContentPack.ts
├── ContentId.ts
├── ContentResolver.ts
├── ComponentRegistry.ts
└── types.ts

src/business/rules/
├── RuleEngine.ts
├── SensorRegistry.ts
├── ConditionEvaluator.ts
├── EffectRegistry.ts
├── SelectorRegistry.ts
├── RuleCompiler.ts
└── types.ts
```

O primeiro teste de aceitação dessa arquitetura seria entregar à equipe de produtos uma tarefa completa.

## **Case de validação: Erva medicinal**

[vector pixel art isolated cartoon](https://images.openai.com/static-rsc-4/HZqaVb9taUatdhL1-e7nx8gGxr01kmwLyMlgs_cGQi4A73wOJjTRSNfl5MyPSVLBWBzlBMN85S6YC_mn4ifXD2T5n-w5mybN13njvFOOpjKG4DJAlczbhhh4_d1x9hn4dFpczohw4p5RpVP_Kkl7pjtVlTBFbvzkjo2n8usYehjVoI9n56ACd5jkeN_nzD5v?purpose=inline)

**Nova espécie vegetal**

Deve aparecer naturalmente em regiões úmidas, crescer quando houver condições adequadas, produzir sementes e servir como ingrediente na fabricação de um item medicinal.

Critérios de aceitação

Checklist de implementação

0/9

Criar a definição do vegetal

Criar sua regra de geração procedural

Definir condições de crescimento

Configurar seus estados visuais

Definir drops de colheita

Criar o item medicinal

Cadastrar a receita de fabricação

Validar a persistência e o comportamento

Nenhuma alteração no código da engine

Se a equipe de produtos conseguir entregar essa funcionalidade exclusivamente adicionando arquivos de conteúdo, teremos uma evidência concreta de que a arquitetura está caminhando na direção desejada.

## **19. A visão de longo prazo**

A consequência dessa decisão é que o Terra poderia passar a ser composto por dois produtos distintos.

# **Terra Engine**

Motor de simulação de mundos procedurais, baseado em regras, componentes e sistemas interdependentes.

Desenvolvido pela engenharia.

# **Terra Game**

Uma experiência sandbox específica, formada pelos conteúdos, sistemas de progressão e regras que definem seu universo.

Desenvolvido pela equipe de produto e conteúdo.

A mesma engine poderia, eventualmente, sustentar experiências diferentes.

[Roots of Pacha on Steam](https://images.openai.com/static-rsc-4/vh6iO7jCy18bTdeRZQMw3K-6eon_45X-Zj-3QgBqp9Uwbp86RANuYtkbWoccwY9mz85ftFyYoCOzVLJ0tBT6AVPHRBUxlYmk70oU4a22tl1YvM4c3sw-RV3n7G48sVqISYsEUJ1O9yMHUnd53hJ7NVkj3yXDgCADGhqnpPqKAoE?purpose=inline)

**Sobrevivência primitiva**

Natureza, coleta e desenvolvimento humano.

[Save 30% on AutoForge on Steam](https://images.openai.com/static-rsc-4/Z4IKYy8ST60ogBWXqjvqS4BAjHwd0w-Kjf1uWhh50STa9nypoawnPYq1Tb0tQOTxG2owT3EKKi54J8FTv9n1YW7GiRWBM8PizmOnp341A_5zgPq3wFNsWO6LE4BRC9t99MdeYGChd0Y7YfA9RyNh0zad_YOOQ0U9xZiN69P3oqE?purpose=inline)

**Industrialização**

Energia, logística e cadeias produtivas.

[Overgrown Cavern - The Noita Wiki](https://images.openai.com/static-rsc-4/V7d6QjmzWOtFkwd7rKSmZmSZJGKZ8eeNgqAqbh4Ftj4dgk5WeIvGkGdIkZrzYKN2hwc7U0O1t7alr5Ml7ElDXULv_gJ6FB_z4m5AliqfZtTIVB93HroQ1yU7YaH-3xqWll4umR6reXFWpQAFqCZRY_RIYJeIQZ-8Iq3X6DIt7GE?purpose=inline)

**Simulação ecológica**

Populações e interações ambientais.

[Roots of Pacha just became my favorite Stardew Valley-alike | PC Gamer](https://images.openai.com/static-rsc-4/B19os_JAesW7UtW52uDlyKbiRW8ao3Xl32f-jZ4OhyZZH6kBUTXWJwm0zFQNV6U7er2Onu81IC8bia527Dwo7Y80F1YNWJi3_u8SpUrD0C-NhSS1hdWSGafJ376XJlvsg-o41TYEFKLBVqO4HEBBaRCafeZVVy-mrb8mLC_D3Ac?purpose=inline)

**Agricultura**

Cultivo e engenharia ambiental.

Não adotaria agora o objetivo de atender qualquer gênero de jogo. Manteria a engine especializada no universo de simulação espacial e ambiental do Terra, evitando abstrações que não tenham utilidade comprovada.

Mas, dentro desse domínio, estabeleceria um novo princípio para toda decisão arquitetural:

**Nenhuma regra específica de conteúdo deve ser implementada diretamente na engine quando puder ser expressa pela composição de capacidades genéricas.**

E utilizaria uma nova métrica de qualidade do projeto: a proporção de novas funcionalidades de conteúdo que podem ser entregues sem alterações na engine.

O sucesso da arquitetura não será medido pela quantidade de registries, strategies ou design patterns que implementarmos. Será medido pela autonomia que conseguirmos entregar à equipe de produtos para criar experiências que a própria equipe de engenharia não precisou antecipar.