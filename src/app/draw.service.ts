import { Injectable, EventEmitter } from '@angular/core';
import { City, TileType, World, Tile, Target, Position, Resource } from './model/models';
import * as PIXI from 'pixi.js';

const MAP_SCALE = 3;

@Injectable({
  providedIn: 'root'
})
export class DrawService {

  app: PIXI.Application;
  textStyle: PIXI.TextStyle;
  cityTexts = new Map<City, PIXI.Text>();
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
    [Resource.BREAD, [200, 150, 20]],
    [Resource.CHARCOAL, [30, 30, 30]],
    [Resource.CLOTHES, [200, 30, 230]],
    [Resource.COTTON, [255, 255, 255]],
    [Resource.GOLD, [200, 200, 0]],
    [Resource.GRAIN, [130, 130, 0]],
    [Resource.MEAT, [200, 0, 0]],
    [Resource.ORE, [100, 200, 0]],
    [Resource.STONE, [100, 100, 100]],
    [Resource.TOOLS, [0, 200, 30]],
    [Resource.WOOD, [100, 10, 0]]
  ]);

  constructor() { }

  init(parent: HTMLElement, worldSize: number): void {
    this.app = new PIXI.Application({
      antialias: true,
      width: worldSize * MAP_SCALE,
      height: worldSize * MAP_SCALE,
    });
    // Pointers normalize touch and mouse
    this.app.renderer.plugins.interaction.on('pointerup', e => this.click(e));
    parent.appendChild(this.app.view);
    this.textStyle = new PIXI.TextStyle({
      fill: '#fff',
      fontSize: '20px',
      fontWeight: 'bolder',
      fontFamily: '"Yanone Kaffeesatz", sans-serif',
      textBaseline: 'bottom',
      align: 'center',
      padding: 5
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = worldSize * MAP_SCALE;
    this.cx = canvas.getContext('2d');
  }

  click(e: PIXI.InteractionEvent): void {
    this.onClick.emit(new Position(Math.floor(e.data.global.x / MAP_SCALE), Math.floor(e.data.global.y / MAP_SCALE)));
  }

  drawMap(world: World): void {
    if (world) {
      // clear
      this.app.stage.removeChildren();
      this.cx.clearRect(0, 0, this.cx.canvas.width, this.cx.canvas.height);

      // render each tile terrain
      this.drawTerrain(world);

      // render each city
      if (this.showCities) {
        this.drawCities(world);
      }

      // render trade routes
      if (this.showTrade) {
        this.drawTradeRoutes(world, Number(this.showTrade));
      }

      // draw canvas on PIXI
      const base = new PIXI.BaseTexture(this.cx.canvas);
      const tex = new PIXI.Texture(base);
      this.app.stage.addChild(new PIXI.Sprite(tex));

      // draw text + UI
      this.drawUI(world);
    }
  }

  private drawTerrain(world: World): void {
    if (world.map) {
      world.map.forEach((line, x) => line.forEach((t, y) => {
        // draw each tile base
        this.cx.fillStyle = this.computeColor(t);
        this.cx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);

        // overlays
        if (this.showNations) {
          const color = t.region.nation.color;
          this.cx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.4)`;
          this.cx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);
        }
        if (this.showRegions && t.isFrontier) {
          const color = t.region.color;
          this.cx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]})`;
          this.cx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);
        }
      }));
    }
  }

  private drawTradeRoutes(world: World, res: Resource): void {
    world.tradeRoutes.filter(tr => tr.resource === res).forEach(tr => {
      const color = this.resourceColors.get(tr.resource);
      this.cx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      tr.road.path.forEach(n => this.cx.fillRect(n.x * MAP_SCALE, n.y * MAP_SCALE, MAP_SCALE, MAP_SCALE));
    });
  }

  private drawCities(world: World): void {
    this.cx.fillStyle = 'black';
    if (world.cities) {
      world.cities.forEach(c => {
        this.cx.fillRect((c.position.x - 1) * MAP_SCALE, (c.position.y - 1) * MAP_SCALE, MAP_SCALE * 2, MAP_SCALE * 2);
      });
    }
  }


  private drawUI(world: World): void {
    if (this.showCities && world.cities) {
      world.cities.forEach(c => {
        const text = new PIXI.Text(c.name, this.textStyle);
        text.position.set((c.position.x + 2) * MAP_SCALE, c.position.y * MAP_SCALE);
        this.app.stage.addChild(text);
      });
    }
  }


  computeColor(tile: Tile): string {
    // is it a city ?
    let color = [0, 0, 0];
    if (tile.type === TileType.CITY) {
      color = this.colors.get(tile.type);
    } else {
      if (this.showBiomes || tile.type === TileType.SEA || tile.type === TileType.RIVER) {
        color = this.colors.get(tile.type);
      } else {
        color = [200, 173, 127];
      }
      if (tile.isRoad && this.showRoads) {
        color = [70, 70, 70];
      } else if (tile.isSeaRoad && this.showRoads) {
        color = [220, 30, 0];
      }
    }

    // apply altitude ?
    if (this.showAltitude && tile.type !== TileType.SEA) {
      const dAlt = (tile.altitude - 255) * 200 / 255;
      color = color.map(c => c + dAlt);
    }

    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }
}
