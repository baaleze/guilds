/// <reference lib="webworker" />

import { Tile, Position, World, City, Road, TileType, Nation, Industry, Node } from './model/models';
import HeightMap from './generation/mapdisplacement';
import { Util } from './util';
import { PriorityQueue } from './generation/priorityqueue';
import { LanguageGenerator } from './generation/language/language.generator';
import { Astar } from './generation/astar.service';

const CITY_SCORE_RADIUS = 3;

const nationColors = [
  [30, 255, 30],
  [255, 255, 30],
  [30, 255, 255],
  [255, 30, 255],
  [255, 30, 30],
  [30, 30, 255]
];

const cityColors = [
  [30, 255, 30],
  [255, 255, 30],
  [30, 255, 255],
  [255, 30, 255],
  [255, 30, 30],
  [30, 30, 255],
  [30, 30, 30],
  [200, 200, 200]
];

addEventListener('message', ({ data }) => {
  // build the world!!!
  const world = new World();
  world.nations = [];

  // generate nations
  for (let n = 0; n < data.nbNations; n++) {
    const nation = new Nation(nationColors[n]);
    world.nations.push(nation);
  }

  // terrain
  const nbRivers = Math.floor(data.worldSize / 15);
  const nbCities = Math.floor(data.worldSize / 12);
  generateTerrain(world, data.seaLevel, data.mountainLevel, data.worldSize, nbRivers);

  // cities
  spawnCities(nbCities, world);

  // roads
  buildRoads(world);

  // regions
  buildRegions(world);

  postMessage({ type: 'end', data: world});
});

function submitProgress(msg: string, world: World): void {
  postMessage({ type : 'progress', msg, data: world});
}

function generateTerrain(world: World, seaLevel: number, mountainLevel: number, worldSize: number, nbRivers: number): void {
  // first get a height map
  const height = new HeightMap(worldSize).map;
  // temperature and humidity maps
  const temp = new HeightMap(worldSize).map;
  const humid = new HeightMap(worldSize).map;

  submitProgress('Generating terrain', world);
  const finalMap = height.map((line, x) => line.map((t, y) => {
    const h = Math.floor(t * 256);
    return new Tile(getTileType(h, seaLevel, mountainLevel, temp, humid, x, y), new Position(x, y), h);
  }));
  submitProgress('Generating terrain DONE', world);

  // remove depressions (holes)
  submitProgress('Removing holes', world);
  handleHoles(finalMap, seaLevel);
  submitProgress('Removing holes DONE', world);

  // filter only high enough tiles
  const mountainLevelTiles = finalMap.reduce((acc, val) => acc.concat(val), []).filter(t => t.altitude >= mountainLevel);

  // make rivers
  for (let r = 0; r < nbRivers; r++) {
    submitProgress(`Making River ${r}`, world);
    makeRiver(finalMap, mountainLevelTiles, `${r}`);
  }

  world.map = finalMap;
  submitProgress('Making rivers DONE', world);
}

function buildRoads(world: World): void {
  // land route
  submitProgress(`Building land roads`, world);
  buildRoadsRecursive(world.map, world.cities, false);
  // sea route
  submitProgress(`Building sea roads`, world);
  buildRoadsRecursive(world.map,
    // only cities with SEA next to them
    world.cities.filter(c => c.port !== undefined),
    true);
}

function buildRoadsRecursive(map: Tile[][], cities: City[], seaRoute: boolean): void {
  // build a road to each city (in a limit of distance)
  const city = cities[0];
  const citiesLeft = cities.slice(1);
  if (citiesLeft.length > 0) {
    citiesLeft.forEach(c => {
      if (Util.dist(city.position.x, city.position.y, c.position.x, c.position.y) < 150) {
        // is sea route, start and end point must be on sea
        if (seaRoute) {
          const path = findPath(map, city.port, c.port, seaRoute);
          if (path) {
            path.forEach(p => map[p.x][p.y].isSeaRoad = true);
            city.roads.push(new Road(city, c, path, path[path.length - 1].g));
            c.roads.push(new Road(c, city, path.reverse(), path[path.length - 1].g));
          }
        } else {
          const path = findPath(map, city.position, c.position, seaRoute);
          if (path) {
            path.forEach(p => map[p.x][p.y].isRoad = true);
            city.roads.push(new Road(city, c, path, path[path.length - 1].g));
            c.roads.push(new Road(c, city, path.reverse(), path[path.length - 1].g));
          }
        }
      }
    });
    // do the same for next city
    buildRoadsRecursive(map, citiesLeft, seaRoute);
  }
}

function findPath(map: Tile[][], start: Position, end: Position, seaRoute: boolean): Node[] {
  const astar = new Astar(map);
  return astar.findPath(start, end, seaRoute);
}

function spawnCities(nbCities: number, world: World): void {
  const map = world.map;
  // spawn cities
  const cities: City[] = [];
  for (let r = 0; r < nbCities; r++) {
    submitProgress(`Creating city ${r}`, world);
    const pos = getCitySpot(map, cities);
    map[pos.x][pos.y].type = TileType.CITY;
    cities.push(createCityFromSpot(map, pos, '' + r));
  }
  world.cities = cities;
}

function createCityFromSpot(map: Tile[][], pos: Position, name: string): City {
  // generate industries from what's available
  const scan = scanAround(map, pos.x, pos.y, 5);

  // population is what is needed plus a little more
  const pop = Util.randomIntBetween(500, 10000);
  const industries = generateIndustries(scan.biomes, Math.floor(Math.log10(pop)));
  const c = new City([], name, pop, industries, pos, Util.randomInArray(cityColors));

  // add port if sea is close
  c.port = Util.getClosestTileOfType(map, pos.x, pos.y, TileType.SEA, 3);
  // add rivers
  c.rivers = scan.rivers;

  return c;
}

function buildRegions(world: World): void {
  submitProgress('Building Regions', world);
  const queue = new PriorityQueue<{t: Tile, score: number}>((a, b) => a.score < b.score);
  // put the neighbors of all cities in the queue
  world.cities.forEach(city => {
    // init neighbours
    world.neighbours.set(city, []);
    getNeighbors(world.map, city.position).forEach(n => {
      n.region = city;
      queue.push({t: n, score: getMovementScore(world.map[city.position.x][city.position.y], n)});
    });
  });
  // until everything has been put in one region
  while (!queue.isEmpty()) {
    // next is one with lowest score
    const next = queue.pop();
    getNeighbors(world.map, next.t.position).forEach(n => {
      if (!n.region) { // not yet any region
        n.region = next.t.region;
        queue.push({t: n, score: next.score + getMovementScore(next.t, n)});
      } else if (n.region !== next.t.region) {
        next.t.isFrontier = true;
        n.isFrontier = true;
        // mark the regions as neighbours
        if (world.neighbours.get(next.t.region).indexOf(n.region) === -1) {
          world.neighbours.get(next.t.region).push(n.region);
        }
        if (world.neighbours.get(n.region).indexOf(next.t.region) === -1) {
          world.neighbours.get(n.region).push(next.t.region);
        }
      }
    });
  }
  submitProgress('Associationg Nations with regions', world);
  // now choose nations for each
  const cityQueue = new PriorityQueue<City>((a, b) => a.population > b.population);
  world.nations.forEach(nation => {
    const city = Util.randomInArray(world.cities.filter(c => c.nation === undefined));
    if (city) {
      city.nation = nation;
    }
  });
  world.cities.filter(c => c.nation !== undefined).forEach(city => {
    world.neighbours.get(city).forEach(neigh => {
      if (!neigh.nation) {
        neigh.nation = city.nation;
        cityQueue.push(neigh);
      }
    });
  });
  while (!cityQueue.isEmpty()) {
    const nextCity = cityQueue.pop();
    world.neighbours.get(nextCity).forEach(neigh => {
      if (!neigh.nation) {
        neigh.nation = nextCity.nation;
        cityQueue.push(neigh);
      }
    });
  }
  submitProgress('Naming cities and rivers', world);
  world.cities.forEach(c => {
    c.name = c.nation.lang.generateName('city');
    c.rivers = c.rivers.map(r => nameRiver(r, c.nation.lang, world.map));
  });
  submitProgress('Building Regions DONE', world);
}

function getMovementScore(from: Tile, to: Tile): number {
  return 1 + (to.riverName ? 2 : 0) + (from.altitude - to.altitude) + (to.type === TileType.SEA ? 5 : 0);
}

function nameRiver(riverId: string, lang: LanguageGenerator, map: Tile[][]): string {
  if (!isNaN(Number(riverId))) {
    // river is a number, it needs a name
    const name = lang.generateName('river');
    // change the name everywhere
    map.forEach(line => line.forEach(t => {
      if (t.riverName === riverId) {
        t.riverName = name;
      }
    }));
    return name;
  } else {
    return riverId;
  }
}

function generateIndustries(biomes: TileType[], nbIndustry: number): Industry[] {
  let availableIndustries: Industry[] = [];
  biomes.forEach(b => {
    switch (b) {
      case TileType.FOREST:
        availableIndustries.push(Industry.Woodcutting);
        break;
      case TileType.MOUNTAIN:
        availableIndustries.push(Industry.Stone);
        availableIndustries.push(Industry.Metal);
        break;
      case TileType.PLAIN:
        availableIndustries.push(Industry.Farm);
        availableIndustries.push(Industry.Cattle);
        availableIndustries.push(Industry.Horse);
        availableIndustries.push(Industry.Cotton);
        break;
    }
  });
  availableIndustries.push(Industry.Blacksmith);
  availableIndustries.push(Industry.Goods);

  // get random industries from the available list
  const ind = [];
  while (ind.length < nbIndustry && availableIndustries.length > 0) {
    const random = Util.randomInArray(availableIndustries);
    availableIndustries = availableIndustries.filter(i => i !== random);
    ind.push(random);
  }

  return ind;
}

function getCitySpot(map: Tile[][], cities: City[]): Position {
  const pos = new Position(0, 0);
  let maxScore = -10000;
  map.forEach((line, x) => line.forEach((t, y) => {
    const score = computeCityScore(map, x, y, cities);
    if (score > maxScore) {
      maxScore = score;
      pos.x = x;
      pos.y = y;
    }
  }));
  return pos;
}

function computeCityScore(map: Tile[][], x: number, y: number, cities: City[]): number {
  // no city on already city, on the sea or on the border of the map
  if (map[x][y].type === TileType.CITY || map[x][y].type === TileType.SEA ||
    x < 10 || x > map.length - 10 || y < 10 || y > map[0].length) {
    return 0;
  }
  // get distance to nearest city
  let minDist = 100000;
  cities.forEach(c => {
    const d = Util.dist(x, y, c.position.x, c.position.y);
    if (d < minDist) {
      minDist = d;
    }
  });
  // get water flux in here
  const scan = scanAround(map, x, y, CITY_SCORE_RADIUS);
  // different biomes around
  // combine
  return minDist * 2 + scan.rivers.length * 10 + scan.biomes.length * 10;
}

function scanAround(map: Tile[][], x: number, y: number, radius: number): {rivers: string[], biomes: TileType[]} {
  const biomes: TileType[] = [];
  const rivers: string[] = [];
  for (let i = x - radius; i < x + radius; i++) {
    for (let j = y - radius; j < y + radius; j++) {
      if ((i >= 0 && i < map.length && j >= 0 && j < map[x].length)) { // bounds
        // get tile
        const tile = map[i][j];
        if (biomes.indexOf(tile.type) === -1) {
          biomes.push(tile.type);
        }
        if (rivers.indexOf(tile.riverName) === -1 && tile.riverName) {
          rivers.push(tile.riverName);
        }
      }
    }
  }
  return { rivers, biomes };
}

function getTileType(h: number, seaLevel: number, mountainLevel: number, temp: number[][], humid: number[][], x: number, y: number): TileType {
  let type = TileType.PLAIN;
  if (h > mountainLevel) {
    type = TileType.MOUNTAIN;
  } else if (h < seaLevel) {
    type = TileType.SEA;
  } else if (h < seaLevel + 6) {
    type = TileType.SAND;
  } else if (temp[x][y] > 0.7 && humid[x][y] > 0.5) {
    type = TileType.SWAMP;
  } else if (temp[x][y] > 0.7 && humid[x][y] <= 0.5) {
    type = TileType.SAND;
  } else if (temp[x][y] <= 0.7 && humid[x][y] > 0.5) {
    type = TileType.FOREST;
  } else if (temp[x][y] <= 0.3) {
    type = TileType.ICE;
  }
  return type;
}

function makeRiver(map: Tile[][], mountainLevelTiles: Tile[], name: string): void {
  // take one tile at random in mountainlevel tiles
  const t = Util.randomInArray(mountainLevelTiles);
  // flow until touching water level
  let finished = false;
  let current = t;
  let waterFlow = 1;
  let steps = 0;
  while (!finished && steps < 10000) {
    steps++;
    current.type = TileType.RIVER;
    if (!current.riverName) {
      current.riverName = name;
    }
    current.waterFlow += waterFlow++; // add flow to point's existing flow and increment flow
    const next = getRandomLowerNeighbor(map, current);
    if (!next) {
      break;
    }
    current = next;
    finished = current.type === TileType.SEA;
  }
}

function transformProtolake(map: Tile[][], tile: Tile, level = 0): void {
  tile.type = TileType.RIVER;
  const neigh = getNeighbors(map, tile.position).filter(n => n.wasHole && n.type !== TileType.RIVER);
  if (neigh.length > 0) {
    neigh.forEach(n => transformProtolake(map, n, level + 1));
  }
}

function handleHoles(map: Tile[][], seaLevel: number): void {
  // algorithm to remove holes from the map (but kkep track of them to put them in water for LAKES)
  const open = new PriorityQueue<Tile>((a, b) => a.altitude < b.altitude);
  const pit: Tile[] = [];
  const closed = map.map((line, x) => line.map((t, y) => false));

  // init the edges
  for (let i = 0; i < map.length; i++) {
    open.push(map[i][0]);
    closed[i][0] = true;
    open.push(map[i][map[i].length - 1]);
    closed[i][map[i].length - 1] = true;
  } // lines
  for (let j = 0; j < map.length; j++) {
    open.push(map[0][j]);
    closed[0][j] = true;
    open.push(map[map.length - 1][j]);
    closed[map.length - 1][j] = true;
  } // columns
  // DO IT
  while ((!open.isEmpty() || pit.length > 0)) {
    let current: Tile;
    if (pit.length > 0) {
      current = pit.shift();
    } else {
      current = open.pop();
    }
    getNeighbors(map, current.position).forEach(n => {
      if (!closed[n.position.x][n.position.y]) {
        // mark as done
        closed[n.position.x][n.position.y] = true;
        if (n.altitude <= current.altitude && current.altitude > seaLevel) {
          n.altitude = current.altitude;
          pit.push(n);
          // mark pit
          n.wasHole = true;
        } else {
          open.push(n);
        }
      }// else already done, continue...
    });
  }
}

function getNeighbors(map: Tile[][], pos: Position): Tile[] {
  const neigh: Tile[] = [];
  for (let x = pos.x - 1; x <= pos.x + 1; x++) {
    for (let y = pos.y - 1; y <= pos.y + 1; y++) {
      if ((x >= 0 && x < map.length && y >= 0 && y < map[x].length) // bounds
      && !(x === pos.x && y === pos.y)) { // do not include self
        neigh.push(map[x][y]);
      }
    }
  }
  return neigh;
}

function getRandomLowerNeighbor(map: Tile[][], tile: Tile): Tile {
  const neigh = getNeighbors(map, tile.position);
  // check in strictly lower
  const lower = neigh.filter(ti => ti.altitude < tile.altitude);
  let t: Tile;
  if (lower.length > 0) {
    // take in priority the one aligned with the river current direction
      t = Util.randomInArray(lower);
  } else {
    // else check in same alt
    const same = neigh.filter(n => n.altitude === tile.altitude);
    t = Util.randomInArray(same);
  }
  return t;
}
