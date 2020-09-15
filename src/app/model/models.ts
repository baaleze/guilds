export class World {
    public cities: City[];
    public people: People[];
    public factions: Faction[];
    public map: Tile[][];

    constructor() {}
}

export class Tile {

    public wasHole = false;
    public waterFlow = 0;
    public riverName: string;

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

export class City {
    constructor(
        public resources: ResourceStock[],
        public name: string,
        public pop: number,
        public wealth: number,
        public industries: Industry[],
        public position: Position
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
            [new ResourceStock(Resource.WOOD, 100)],
            0);
    }
    static Cotton(): Industry {
        return new Industry(
            'Cotton',
            [],
            [new ResourceStock(Resource.COTTON, 100)],
            0);
    }
    static Ore(): Industry {
        return new Industry(
            'Ore',
            [],
            [new ResourceStock(Resource.ORE, 80)],
            0);
    }
    static Coal(): Industry {
        return new Industry(
            'Coal',
            [],
            [new ResourceStock(Resource.CHARCOAL, 60)],
            0);
    }
    static Stone(): Industry {
        return new Industry(
            'Stone',
            [],
            [new ResourceStock(Resource.STONE, 100)],
            0);
    }
    static Gold(): Industry {
        return new Industry(
            'Gold',
            [new ResourceStock(Resource.TOOLS, 5)],
            [new ResourceStock(Resource.GOLD, 30)],
            0);
    }
    static Grain(): Industry {
        return new Industry(
            'Grain',
            [],
            [new ResourceStock(Resource.GRAIN, 100)],
            0);
    }
    static Meat(): Industry {
        return new Industry(
            'Meat',
            [new ResourceStock(Resource.GRAIN, 100)],
            [new ResourceStock(Resource.MEAT, 50)],
            0);
    }
    static Woodburning(): Industry {
        return new Industry(
            'Woodburning',
            [new ResourceStock(Resource.WOOD, 100)],
            [new ResourceStock(Resource.CHARCOAL, 80)],
            0);
    }
    static Clothesmaking(): Industry {
        return new Industry(
            'Clothesmaking',
            [new ResourceStock(Resource.COTTON, 100)],
            [new ResourceStock(Resource.CLOTHES, 10)],
            0
        );
    }
    static Blacksmith(): Industry {
        return new Industry(
            'Blacksmith',
            [new ResourceStock(Resource.ORE, 60), new ResourceStock(Resource.CHARCOAL, 60)],
            [new ResourceStock(Resource.TOOLS, 10)],
            0
        );
    }
    static Bakery(): Industry {
        return new Industry(
            'Bakery',
            [new ResourceStock(Resource.GRAIN, 60)],
            [new ResourceStock(Resource.BREAD, 10)],
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
