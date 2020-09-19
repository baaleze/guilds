import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { World, TileType, Tile, Nation, City } from './model/models';
import { WorldgenService, WORLD_SIZE } from './generation/worldgen.service';
import * as PIXI from 'pixi.js';
import { Util } from './util';

const MAP_SCALE = 2;
const NB_NATIONS = 5;
const nationColors = [
  [30, 255, 30],
  [255, 255, 30],
  [30, 255, 255],
  [255, 30, 255],
  [255, 30, 30],
  [30, 30, 255]
];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  app: PIXI.Application;
  textStyle: PIXI.TextStyle;
  cityTexts = new Map<City, PIXI.Text>();
  cx: CanvasRenderingContext2D;

  world: World;
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

  languages: {
    nationName: string
    cons: string,
    vowels: string,
    infos: {
      type: string,
      syllabes: string,
      patterns: string,
      words: string
    }[]
  }[] = [];

  constructor(private gen: WorldgenService) {}

  ngAfterViewInit(): void {
    this.app = new PIXI.Application({
      antialias: true,
      width: WORLD_SIZE * MAP_SCALE,
      height: WORLD_SIZE * MAP_SCALE,
    });
    document.getElementById('map').appendChild(this.app.view);
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
    canvas.width = canvas.height = WORLD_SIZE * MAP_SCALE;
    this.cx = canvas.getContext('2d');
    this.createWorld();
  }

  createWorld(): void {
    this.world = new World();
    this.world.nations = [];

    // generate nations
    for (let n = 0; n < NB_NATIONS; n++) {
      const nation = new Nation(nationColors[n]);
      this.world.nations.push(nation);
    }

    // Generate the world map
    this.gen.generateTerrain(90, 200).subscribe(map => {
      this.world.map = map;
      this.drawMap();
      // create cities
      setTimeout( () => this.gen.spawnCities(this.world).subscribe(cities => {
        this.world.cities = cities;
        this.drawMap();

        // build roads
        setTimeout(() => this.gen.buildRoads(this.world).subscribe(() => {
          this.drawMap();
          // build territories
          setTimeout(() => this.gen.buildRegions(this.world).subscribe(() => {
            this.drawMap(true);
          }), 200);
        }), 200);
      }), 200);

    });
  }

  drawMap(regionMode = false): void {
    // clear
    this.app.stage.removeChildren();
    // build a texture on the canvas
    this.cx.clearRect(0, 0, this.cx.canvas.width, this.cx.canvas.height);
    this.world.map.forEach((line, x) => line.forEach((t, y) => {
      // draw each tile
      if (regionMode && t.isFrontier && t.region.nation) {
        const color = t.region.nation.color;
        this.cx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        this.cx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);
      } else {
        this.cx.fillStyle = this.computeColor(this.colors.get(t.type), t);
        this.cx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);
      }
      // fill region color with transparency
      if (t.region && t.region.nation) {
        const color = t.region.nation.color;
        this.cx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`;
        this.cx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);
      }
    }));
    this.cx.fillStyle = 'black';
    if (this.world.cities) {
      this.world.cities.forEach(c => {
        this.cx.fillRect((c.position.x - 2) * MAP_SCALE, (c.position.y - 2) * MAP_SCALE, MAP_SCALE * 4, MAP_SCALE * 4);
      });
    }

    const base = new PIXI.BaseTexture(this.cx.canvas);
    const tex = new PIXI.Texture(base);
    this.app.stage.addChild(new PIXI.Sprite(tex));

    // draw text
    if (this.world.cities && this.cityTexts.size === 0) {
      this.world.cities.forEach(c => {
        const text = new PIXI.Text(c.name, this.textStyle);
        text.position.set((c.position.x + 2) * MAP_SCALE, c.position.y * MAP_SCALE);
        this.app.stage.addChild(text);
        this.cityTexts.set(c, text);
      });
    } else if (this.world.cities && this.cityTexts.size > 0) {
      this.world.cities.forEach(c => {
        this.cityTexts.get(c).text = c.name;
        this.app.stage.addChild(this.cityTexts.get(c));
      });
    }
  }

  computeColor(color: number[], tile: Tile): string {
    const dAlt = (tile.altitude - 255) * 100 / 255;
    if (tile.isRoad && tile.type !== TileType.CITY) {
      color = [70, 70, 70];
    } else if (tile.isSeaRoad && tile.type !== TileType.CITY) {
      color = [220, 30, 0];
    }
    return `rgb(${color[0] + dAlt}, ${color[1] + dAlt}, ${color[2] + dAlt})`;
  }

  debugLanguages() {
    this.world.nations.forEach(nation => {
      this.languages.push({
        nationName: nation.name,
        cons: Array.from(nation.lang.consonantProbas.keys()).reverse().join(''),
        vowels: Array.from(nation.lang.vowelProbas.keys()).reverse().join(''),
        infos: nation.lang.types.map((_, i) => {
          const words = [];
          for (let w = 0; w < 30; w++) {
            words.push(nation.lang.generateName(nation.lang.types[i]));
          }
          return {
            type: nation.lang.types[i],
            patterns: Array.from(nation.lang.syllabes[i].keys()).reverse().join(' '),
            syllabes: nation.lang.wordPatterns[i].join(' '),
            words: words.map(w => `[${w}]`).join(' ')
          };
        })
      });
    });
  }
}
