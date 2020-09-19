import { Injectable } from '@angular/core';
import { Tile, Position, TileType, City, Industry, Road, World, Nation } from '../model/models';
import HeightMap from './mapdisplacement';
import { PriorityQueue } from './priorityqueue';
import { AstarService } from './astar.service';
import { NotifyService } from '../notify.service';
import { Observable } from 'rxjs';
import { LanguageGenerator } from './language/language.generator';
import { Util } from '../util';

export const WORLD_SIZE = 512;
const NB_RIVERS = 50;
const NB_CITIES = 30;
const CITY_SCORE_RADIUS = 3;

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

@Injectable({
  providedIn: 'root'
})
export class WorldgenService {

  constructor(private astar: AstarService, private notify: NotifyService) {}

  generateTerrain(seaLevel: number, mountainLevel: number): Observable<Tile[][]> {
    return new Observable(obs => {
      // first get a height map
      const height = new HeightMap(WORLD_SIZE).map;
      // temperature and humidity maps
      const temp = new HeightMap(WORLD_SIZE).map;
      const humid = new HeightMap(WORLD_SIZE).map;

      this.notify.submitProgress('Generating terrain');
      const finalMap = height.map((line, x) => line.map((t, y) => {
        const h = Math.floor(t * 256);
        return new Tile(this.getTileType(h, seaLevel, mountainLevel, temp, humid, x, y), new Position(x, y), h);
      }));
      this.notify.submitProgress('Generating terrain DONE');

      // remove depressions (holes)
      this.notify.submitProgress('Removing holes');
      this.handleHoles(finalMap, seaLevel);
      this.notify.submitProgress('Removing holes DONE');

      // filter only high enough tiles
      const mountainLevelTiles = finalMap.reduce((acc, val) => acc.concat(val), []).filter(t => t.altitude >= mountainLevel);

      // make rivers
      for (let r = 0; r < NB_RIVERS; r++) {
        this.notify.submitProgress(`Making River ${r}`);
        this.makeRiver(finalMap, mountainLevelTiles, `${r}`);
      }
      this.notify.submitProgress('Making rivers DONE');

      obs.next(finalMap);
      obs.complete();
    });
  }

  buildRoads(world: World): Observable<void> {
    return new Observable(obs => {
      // land route
      this.buildRoadsRecursive(world.map, world.cities, false);
      // sea route
      this.buildRoadsRecursive(world.map,
        // only cities with SEA next to them
        world.cities.filter(c => c.port !== undefined),
        true);
      obs.next();
      obs.complete();
    });
  }

  buildRoadsRecursive(map: Tile[][], cities: City[], seaRoute: boolean): void {
    // build a road to each city (in a limit of distance)
    const city = cities[0];
    const citiesLeft = cities.slice(1);
    this.notify.submitProgress(`Building road for ${city.name}`);
    if (citiesLeft.length > 0) {
      citiesLeft.forEach(c => {
        if (Util.dist(city.position.x, city.position.y, c.position.x, c.position.y) < 150) {
          // is sea route, start and end point must be on sea
          if (seaRoute) {
            const path = this.astar.findPath(map, city.port, c.port, (p1, p2) => 
              Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]))
            , seaRoute);
            if (path) {
              path.forEach(p => map[p.x][p.y].isSeaRoad = true);
              city.roads.push(new Road(c, path, path[path.length - 1].g));
            }
          } else {
            const path = this.astar.findPath(map, city.position, c.position, (p1, p2) => 
              Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]))
            , seaRoute);
            if (path) {
              path.forEach(p => map[p.x][p.y].isRoad = true);
              city.roads.push(new Road(c, path, path[path.length - 1].g));
            }
          }
        }
      });
      // do the same for next city
      this.buildRoadsRecursive(map, citiesLeft, seaRoute);
    }
  }

  spawnCities(world: World): Observable<City[]> {
    const map = world.map;
    return new Observable(obs => {
      // spawn cities
      const cities: City[] = [];
      for (let r = 0; r < NB_CITIES; r++) {
        const nation = Util.randomInArray(world.nations);
        this.notify.submitProgress(`Creating city ${r}`);
        const pos = this.getCitySpot(map, cities);
        map[pos.x][pos.y].type = TileType.CITY;
        cities.push(this.createCityFromSpot(map, pos, '' + r, nation));
      }
      obs.next(cities);
      obs.complete();
    });
  }

  createCityFromSpot(map: Tile[][], pos: Position, name: string, nation: Nation): City {
    // generate industries from what's available
    const scan = this.scanAround(map, pos.x, pos.y, 5);
    const industries = this.generateIndustries(scan.biomes);
    const wealth = Util.randomIntBetween(1, 10) * 30;
    // split wealth into the industries
    industries.forEach(i => i.power = Math.floor(wealth / industries.length));
    // population is what is needed plus a little more
    const pop = wealth * 11;
    const c = new City([], name, pop, wealth, industries, pos, Util.randomInArray(cityColors));
    // start with enough resources for 3 ticks of production
    // and production from 2 ticks
    industries.forEach(i => i.needs.forEach(n => c.addResource(n.res, n.amount * i.power * 3)));
    industries.forEach(i => i.produces.forEach(n => c.addResource(n.res, n.amount * i.power * 2)));

    // add port if sea is close
    c.port = this.getClosestTileOfType(map, pos.x, pos.y, TileType.SEA, 3);
    // add rivers
    c.rivers = scan.rivers;

    return c;
  }

  buildRegions(world: World): Observable<void> {
    return new Observable(obs => {
      const queue = new PriorityQueue<{t: Tile, score: number}>((a, b) => a.score < b.score);
      // put the neighbors of all cities in the queue
      world.cities.forEach(city => {
        // init neighbours
        world.neighbours.set(city, []);
        this.getNeighbors(world.map, city.position).forEach(n => {
          n.region = city;
          queue.push({t: n, score: this.getMovementScore(world.map[city.position.x][city.position.y], n)});
        });
      });
      // until everything has been put in one region
      while (!queue.isEmpty()) {
        // next is one with lowest score
        const next = queue.pop();
        this.getNeighbors(world.map, next.t.position).forEach(n => {
          if (!n.region) { // not yet any region
            n.region = next.t.region;
            queue.push({t: n, score: next.score + this.getMovementScore(next.t, n)});
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
      // now choose nations for each
      const cityQueue = new PriorityQueue<City>((a, b) => a.wealth > b.wealth);
      world.nations.forEach(nation => {
        const city = Util.randomInArray(world.cities.filter(c => c.nation === undefined));
        if (city) {city.nation = nation;}
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
      world.cities.forEach(c => {
        c.name = c.nation.lang.generateName('city');
        c.rivers = c.rivers.map(r => this.nameRiver(r, c.nation.lang, world.map));
      });
      obs.next();
      obs.complete();
    });
  }

  getMovementScore(from: Tile, to: Tile): number {
    return 1 + (to.riverName ? 2 : 0) + (from.altitude - to.altitude) + (to.type === TileType.SEA ? 5 : 0);
  }

  nameRiver(riverId: string, lang: LanguageGenerator, map: Tile[][]): string {
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

  generateIndustries(biomes: TileType[]): Industry[] {
    const ind: Industry[] = [];
    biomes.forEach(b => {
      switch (b) {
        case TileType.FOREST:
          ind.push(Industry.Woodcutting());
          break;
        case TileType.MOUNTAIN:
          // random mining
          if (Math.random() < 0.3) {
            ind.push(Industry.Stone());
          }
          if (Math.random() < 0.3) {
            ind.push(Industry.Ore());
          }
          if (Math.random() < 0.3) {
            ind.push(Industry.Gold());
          }
          if (Math.random() < 0.3) {
            ind.push(Industry.Coal());
          }
          break;
        case TileType.PLAIN:
          if (Math.random() < 0.6) {
            ind.push(Industry.Grain());
          } else {
            ind.push(Industry.Meat());
          }
          break;
        case TileType.SAND:
          ind.push(Industry.Cotton());
          break;
        case TileType.SEA:
          ind.push(Industry.Fishing());
          break;
      }
    });
    if (Math.random() < 0.3) {
      ind.push(Industry.Blacksmith());
    }
    if (Math.random() < 0.3) {
      ind.push(Industry.Woodburning());
    }
    if (Math.random() < 0.3) {
      ind.push(Industry.Clothesmaking());
    }
    if (Math.random() < 0.3) {
      ind.push(Industry.Bakery());
    }
    return ind;
  }

  getCitySpot(map: Tile[][], cities: City[]): Position {
    const pos = new Position(0, 0);
    let maxScore = -10000;
    map.forEach((line, x) => line.forEach((t, y) => {
      const score = this.computeCityScore(map, x, y, cities);
      if (score > maxScore) {
        maxScore = score;
        pos.x = x;
        pos.y = y;
      }
    }));
    return pos;
  }

  computeCityScore(map: Tile[][], x: number, y: number, cities: City[]): number {
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
    const scan = this.scanAround(map, x, y, CITY_SCORE_RADIUS);
    // different biomes around
    // combine
    return minDist * 2 + scan.rivers.length * 10 + scan.biomes.length * 10;
  }

  scanAround(map: Tile[][], x: number, y: number, radius: number): {rivers: string[], biomes: TileType[]} {
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

  getClosestTileOfType(map: Tile[][], x: number, y: number, type: TileType, radius: number): Position {
    let pos: Position;
    let minDist = 1000;
    for (let i = x - radius; i < x + radius; i++) {
      for (let j = y - radius; j < y + radius; j++) {
        if ((i >= 0 && i < map.length && j >= 0 && j < map[x].length)) { // bounds
          // get tile
          if(map[i][j].type === type && Util.dist(x, y, i, j) < minDist) {
            pos = new Position(i, j);
            minDist = Util.dist(x, y, i, j);
          }
        }
      }
    }
    return pos;
  }

  getTileType(h: number, seaLevel: number, mountainLevel: number, temp: number[][], humid: number[][], x: number, y: number): TileType {
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

  makeRiver(map: Tile[][], mountainLevelTiles: Tile[], name: string): void {
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
      const next = this.getRandomLowerNeighbor(map, current);
      if (!next) {
        break;
      }
      current = next;
      finished = current.type === TileType.SEA;
    }
  }

  transformProtolake(map: Tile[][], tile: Tile, level = 0): void {
    tile.type = TileType.RIVER;
    const neigh = this.getNeighbors(map, tile.position).filter(n => n.wasHole && n.type !== TileType.RIVER);
    if (neigh.length > 0) {
      neigh.forEach(n => this.transformProtolake(map, n, level + 1));
    }
  }

  handleHoles(map: Tile[][], seaLevel: number): void {
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
      this.getNeighbors(map, current.position).forEach(n => {
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

  getNeighbors(map: Tile[][], pos: Position): Tile[] {
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

  getRandomLowerNeighbor(map: Tile[][], tile: Tile): Tile {
    const neigh = this.getNeighbors(map, tile.position);
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
}
