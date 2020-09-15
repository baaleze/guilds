import { Injectable } from '@angular/core';
import { Tile, Position, TileType, City } from '../model/models';
import HeightMap from './mapdisplacement';
import { PriorityQueue } from './priorityqueue';

const WORLD_SIZE = 256;
const NB_RIVERS = 50;
const NB_CITIES = 30;
const CITY_SCORE_WATER_RADIUS = 1;
const CITY_SCORE_RADIUS = 3;

@Injectable({
  providedIn: 'root'
})
export class WorldgenService {

  constructor() { }

  generateTerrain(seaLevel: number, mountainLevel: number): Tile[][] {
    // first get a height map
    const height = new HeightMap(WORLD_SIZE).map;
    // temperature and humidity maps
    const temp = new HeightMap(WORLD_SIZE).map;
    const humid = new HeightMap(WORLD_SIZE).map;

    console.log('GENERATING TERRAIN');
    const finalMap = height.map((line, x) => line.map((t, y) => {
      const h = Math.floor(t * 256);
      return new Tile(this.getTileType(h, seaLevel, mountainLevel, temp, humid, x, y), new Position(x, y), h);
    }));
    console.log('GENERATED TERRAIN');

    // remove depressions (holes)
    this.handleHoles(finalMap, seaLevel);
    console.log('REMOVED HOLES');

    // filter only high enough tiles
    const mountainLevelTiles = finalMap.reduce((acc, val) => acc.concat(val), []).filter(t => t.altitude >= mountainLevel);

    // make rivers
    for (let r = 0; r < NB_RIVERS; r++) {
      this.makeRiver(finalMap, mountainLevelTiles, `river ${r}`);
      console.log(`MADE RIVER N°${r}`);
    }

    return finalMap;
  }

  spawnCities(map: Tile[][]): City[] {
    // spawn cities
    const cities: City[] = [];
    for (let r = 0; r < NB_CITIES; r++) {
      const pos = this.getCitySpot(map, cities);
      map[pos.x][pos.y].type = TileType.CITY;
      cities.push(this.createCityFromSpot(map, pos, `City ${r}`));
    }
    return cities;
  }

  createCityFromSpot(map: Tile[][], pos: Position, name: string): City {
    // generate industries from what's available
    
    const c = new City([], name,
      this.randomIntBetween(1, 10) * 1000,
      this.randomIntBetween(1, 10) * 5000,
      [], pos);
    return c;
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
    console.log(`PUT CITY WITH SCORE ${maxScore} in ${pos.x}/${pos.y}`);
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
      const d = this.dist(x, y, c.position.x, c.position.y);
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
    for (let i = x - CITY_SCORE_RADIUS; i < x + CITY_SCORE_RADIUS; i++) {
      for (let j = y - CITY_SCORE_RADIUS; j < y + CITY_SCORE_RADIUS; j++) {
        if ((i >= 0 && i < map.length && j >= 0 && j < map[x].length)) { // bounds
          // get tile
          const tile = map[i][j];
          if (biomes.indexOf(tile.type) === -1) {
            biomes.push(tile.type);
          }
          if (rivers.indexOf(tile.riverName) === -1) {
            rivers.push(tile.riverName);
          }
        }
      }
    }
    return { rivers, biomes };
  }

  getTileType(h: number, seaLevel: number, mountainLevel: number, temp: number[][], humid: number[][], x: number, y: number): TileType {
    let type = TileType.PLAIN;
    if (h > mountainLevel) {
      type = TileType.MOUNTAIN;
    } else if (h < seaLevel) {
      type = TileType.SEA;
    } else if (h < seaLevel + 3) {
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
    const t = this.randomInArray(mountainLevelTiles);
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
    const lower = neigh.filter(t => t.altitude < tile.altitude);
    let t: Tile;
    if (lower.length > 0) {
      // take in priority the one aligned with the river current direction
        t = this.randomInArray(lower);
    } else {
      // else check in same alt
      const same = neigh.filter(n => n.altitude === tile.altitude);
      t = this.randomInArray(same);
    }
    return t;
  }

  randomInArray<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * (arr.length))];
  }

  randomIntBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  }
}
