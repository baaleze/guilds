import { LanguageGenerator } from '../generation/language/language.generator';

export class World {
    public cities: City[];
    public rivers: string[];
    public people: People[];
    public factions: Faction[];
    public map: Tile[][];
    public nations: Nation[];
    public neighbours = new Map<City, City[]>();

    constructor() {}
}

export class Tile {

    public wasHole = false;
    public isRoad = false;
    public isSeaRoad = false;
    public waterFlow = 0;
    public riverName: string;
    public region: City;
    public isFrontier = false;

    constructor(
        public type: TileType,
        public position: Position,
        public altitude: number
    ) {}
}

export enum TileType {
    PLAIN = 1,
    MOUNTAIN = 2,
    SEA = 3,
    FOREST = 4,
    SWAMP = 5,
    ICE = 6,
    SAND = 7,
    CITY = 8,
    RIVER = 9
}

export class Node {
    constructor(
      public x: number,
      public y: number,
      public f: number,
      public g: number,
      public h: number,
      public tile: Tile,
      public visited = false,
      public closed = false,
      public parent?: Node
    ) {}
  }
export class Nation {
    public lang = new LanguageGenerator();
    public name: string;

    constructor(
        public color: number[]
    ) {
        this.name = this.lang.generateName('city');
    }
}

export class City {
    private trades: number[];
    private previousWealth: number;
    public port: Position;
    public rivers: string[] = [];
    public roads: Road[] = [];
    public nation: Nation;

    constructor(
        public resources: ResourceStock[],
        public name: string,
        public pop: number,
        public wealth: number,
        public industries: Industry[],
        public position: Position,
        public color: number[]
    ) {
        this.trades = industries.map(_ => 0);
        this.previousWealth = wealth;
    }

    addResource(res: Resource, amount: number): void {
        const stock = this.resources.find(s => s.res === res);
        if (stock) {
            stock.amount = Math.max(0, stock.amount + amount);
        } else {
            this.resources.push(new ResourceStock(res, amount));
        }
    }

    getResource(res: Resource): number {
        const stock = this.resources.find(s => s.res === res);
        return stock ? stock.amount : 0;
    }

    tick(): void {
        // from the change in wealth, change industry power
        // the change is proportional to the trade ratio
        this.industries.forEach((i, index) => i.power = i.power + (this.wealth - this.previousWealth) / this.trades[index]);

        // change in population / food
        // is there enough food
        if (this.getResource(Resource.BREAD) + this.getResource(Resource.MEAT) > this.pop) {
            // consume
            const leftToFeed = Math.max(0, this.pop - this.getResource(Resource.MEAT));
            this.addResource(Resource.MEAT, this.pop);
            this.addResource(Resource.BREAD, leftToFeed);
            // population and city grows
            if (this.getResource(Resource.STONE) > this.pop * 0.1 &&
                (this.getResource(Resource.MEAT) + this.getResource(Resource.BREAD)) > this.pop * 0.1 ) {
                this.pop = Math.floor(this.pop * 1.1);
            }
        } else {
            // consume everything
            this.addResource(Resource.BREAD, this.pop);
            this.addResource(Resource.MEAT, this.pop);
            // TODO add famine
        }
    }
}

export class Road {
    constructor(
        public from: City,
        public to: City,
        public path: Node[],
        public cost: number
    ) {}
}

export class TradeRoute {
    constructor(
        public road: Road,
        public resource: Resource
    ) {}
}

export class Industry {
    constructor(
        public name: string,
        public needs: ResourceStock[],
        public produces: ResourceStock[],
        public power: number
    ) {}

    static Woodcutting(): Industry {
        return new Industry(
            'Woodcutting',
            [],
            [new ResourceStock(Resource.WOOD, 10)],
            0);
    }
    static Cotton(): Industry {
        return new Industry(
            'Cotton',
            [],
            [new ResourceStock(Resource.COTTON, 10)],
            0);
    }
    static Ore(): Industry {
        return new Industry(
            'Ore',
            [],
            [new ResourceStock(Resource.ORE, 8)],
            0);
    }
    static Coal(): Industry {
        return new Industry(
            'Coal',
            [],
            [new ResourceStock(Resource.CHARCOAL, 6)],
            0);
    }
    static Stone(): Industry {
        return new Industry(
            'Stone',
            [],
            [new ResourceStock(Resource.STONE, 10)],
            0);
    }
    static Gold(): Industry {
        return new Industry(
            'Gold',
            [new ResourceStock(Resource.TOOLS, 1)],
            [new ResourceStock(Resource.GOLD, 6)],
            0);
    }
    static Grain(): Industry {
        return new Industry(
            'Grain',
            [],
            [new ResourceStock(Resource.GRAIN, 10)],
            0);
    }
    static Meat(): Industry {
        return new Industry(
            'Meat',
            [new ResourceStock(Resource.GRAIN, 10)],
            [new ResourceStock(Resource.MEAT, 5)],
            0);
    }
    static Fishing(): Industry {
        return new Industry(
            'Fishing',
            [],
            [new ResourceStock(Resource.MEAT, 4)],
            0);
    }
    static Woodburning(): Industry {
        return new Industry(
            'Woodburning',
            [new ResourceStock(Resource.WOOD, 5)],
            [new ResourceStock(Resource.CHARCOAL, 4)],
            0);
    }
    static Clothesmaking(): Industry {
        return new Industry(
            'Clothesmaking',
            [new ResourceStock(Resource.COTTON, 6)],
            [new ResourceStock(Resource.CLOTHES, 1)],
            0
        );
    }
    static Blacksmith(): Industry {
        return new Industry(
            'Blacksmith',
            [new ResourceStock(Resource.ORE, 6), new ResourceStock(Resource.CHARCOAL, 6)],
            [new ResourceStock(Resource.TOOLS, 1)],
            0
        );
    }
    static Bakery(): Industry {
        return new Industry(
            'Bakery',
            [new ResourceStock(Resource.GRAIN, 6)],
            [new ResourceStock(Resource.BREAD, 1)],
            0
        );
    }
}

export class ResourceStock {
    constructor(
        public res: Resource,
        public amount: number,
        public stolen = false
    ) {}
}

export enum Resource {
    WOOD = 1,
    ORE = 2,
    TOOLS = 3,
    COTTON = 4,
    CLOTHES = 5,
    GRAIN = 6,
    CHARCOAL = 7,
    STONE = 8,
    GOLD = 9,
    BREAD = 10,
    MEAT = 11
}

export class TravellingGroup {
    constructor(
        public name: string,
        public members: People[],
        public resources: ResourceStock[],
        public mission: Mission,
        public position: Position
    ) {}
}

export class Mission {
    constructor(
        public faction: Faction,
        public targets: Target[]
    ) {}
}

export class People {
    constructor(
        public name: string,
        public trade: number,
        public guard: number,
        public stealth: number,
        public nbPeople: number,
        public reputation: Map<Faction, number>,
        public position: Position
    ) {}
}

export class Faction {
    constructor(
        public name: string,
        public reputation: Map<Faction, number>,
        public wealth: number,
        public members: number
    ) {}
}

export class Position {
    constructor(
        public x: number,
        public y: number
    ) {}
}

export type Target = People | City | Faction;
