import { Tile, TileType, Position } from './model/models';

export class Util {
  static randomInArray<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * (arr.length))];
  }

  static randomIntBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  static dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  }

  static randomInWeightedMap<T>(map: Map<T, number>): T {
      // get sum
      let sum = 0;
      map.forEach(v => sum += v);
      const random = Math.floor(Math.random() * (sum));
      let cumul = 0;
      let res;
      map.forEach((v, k) => {
          cumul += v;
          if (!res && cumul > random) {
              res = k;
          }
      });
      return res;
  }

  static getClosestTileOfType(map: Tile[][], x: number, y: number, type: TileType, radius: number): Position {
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
}
