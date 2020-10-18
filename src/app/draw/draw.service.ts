import { Injectable, EventEmitter } from '@angular/core';
import { Map as OlMap, View } from 'ol';
import { Extent, getCenter } from 'ol/extent';
import ImageLayer from 'ol/layer/Image';
import Static from 'ol/source/ImageStatic';
import Projection from 'ol/proj/Projection';
import { City, TileType, World, Tile, Target, Position, Resource } from '../model/models';
import { Util } from '../util';

const TILE_SIZE = 16;

@Injectable({
  providedIn: 'root'
})
export class DrawService {

  cx: CanvasRenderingContext2D;

  // drawing modes
  showBiomes = true;
  showRegions = false;
  showAltitude = false;
  showNations = false;
  showCities = true;
  showRoads = true;
  showTrade: Resource = undefined;

  // events
  public onClick = new EventEmitter<Position>();

  // selection
  target: Target;

  colors = new Map<TileType, number[]>([
    [TileType.SEA, [0, 50, 180]],
    [TileType.RIVER, [0, 220, 220]],
    [TileType.CITY, [255, 30, 30]],
    [TileType.FOREST, [50, 180, 40]],
    [TileType.ICE, [200, 200, 200]],
    [TileType.MOUNTAIN, [130, 130, 130]],
    [TileType.PLAIN, [120, 230, 100]],
    [TileType.SAND, [200, 200, 0]],
    [TileType.SWAMP, [160, 140, 30]]
  ]);

  resourceColors = new Map<Resource, number[]>([
    [Resource.CATTLE, [200, 150, 20]],
    [Resource.METAL, [30, 30, 30]],
    [Resource.MACHINE, [200, 30, 230]],
    [Resource.COTTON, [255, 255, 255]],
    [Resource.GOODS, [200, 200, 0]],
    [Resource.FOOD, [130, 130, 0]],
    [Resource.HORSE, [200, 0, 0]],
    [Resource.STONE, [100, 100, 100]],
    [Resource.TOOLS, [0, 200, 30]],
    [Resource.WOOD, [100, 10, 0]]
  ]);

  // engine vars
  // standard global variables
  container: HTMLElement;
  worldSize: number;
  map: OlMap;

  // resources
  tileset: HTMLImageElement;

  constructor() {
    this.loadResources();
  }

  init(parent: HTMLElement, worldSize: number, seaLevel: number): void {
    this.container = parent;
    this.worldSize = worldSize;
  }

  drawMap(world: World): void {
    this.drawMapFromTiles(world.map);

    // Map views always need a projection.  Here we just want to map image
    // coordinates directly to map coordinates, so we create a projection that uses
    // the image extent in pixels.
    var extent: Extent = [0, 0, this.worldSize * TILE_SIZE, this.worldSize * TILE_SIZE];
    var projection = new Projection({
      code: 'static-image',
      units: 'pixels',
      extent: extent,
    });

    this.map = new OlMap({
      layers: [
        new ImageLayer({
          source: new Static({
            url: this.cx.canvas.toDataURL(),
            projection: projection,
            imageExtent: extent,
          }),
        }) ],
      target: 'map',
      view: new View({
        projection: projection,
        center: getCenter(extent),
        zoom: 2,
        maxZoom: 8,
      }),
    });
  }
  

  loadResources(): void {
    const tileSetImg = document.createElement('img');
    tileSetImg.onload = () => {
      this.tileset = tileSetImg;
    };
    tileSetImg.src = '/assets/tileset.png';
  }

  drawMapFromTiles(map: Tile[][]): void {
    // create virtual canvas
    const canvas = document.createElement('canvas');
    this.cx = canvas.getContext('2d');
    // set dimensions
    const w = map.length * TILE_SIZE;
    const h = map[0].length * TILE_SIZE;
    canvas.width = w;
    canvas.height = h;
    // begin to draw!!
    map.forEach((line, x) => line.forEach((tile, y) => {
      const tileCoord = this.computeTileCoord(map, tile, x, y);
      this.cx.drawImage(this.tileset,
        tileCoord[1] * TILE_SIZE, tileCoord[0] * TILE_SIZE,
        TILE_SIZE, TILE_SIZE,
        x * TILE_SIZE, y * TILE_SIZE,
        TILE_SIZE, TILE_SIZE
      );
    }));
    map.forEach((line,x) => line.forEach((tile, y) => {
      // roads
      this.cx.strokeStyle = 'black';
      this.cx.lineWidth = 5;
      this.cx.lineCap = 'round';
      if (tile.isRoad) {
        // check each neighbour
        Util.getNeighbors(map, tile.position).forEach(n => {
          if (n.isRoad || n.type === TileType.CITY) {
            // draw a road in this direction!
            this.cx.beginPath();
            // middle of tile
            const start = [x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2];
            const end = [start[0] + (n.position.x - x) * TILE_SIZE / 2, start[1] + (n.position.y - y) * TILE_SIZE / 2];
            this.cx.moveTo(start[0], start[1]);
            this.cx.lineTo(end[0] ,end[1]);
            this.cx.stroke();
          }
        });
      }
    }));
  }
  computeTileCoord(map: Tile[][], tile: Tile, x: number, y: number): [number, number] {
    switch(tile.type) {
      case TileType.PLAIN:
        return [0,0];
      case TileType.MOUNTAIN:
        return [0,1];
      case TileType.FOREST:
        return [0,2];
      case TileType.ICE:
        return [0,3];
      case TileType.SWAMP:
        return [0,4];
      case TileType.SAND:
        return [0,5];
      case TileType.CITY:
        return [0,6];
      case TileType.SEA:
        return [0,7];
      case TileType.RIVER:
        return [1,0];
    }
  }
}
