import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { World, TileType } from './model/models';
import { WorldgenService } from './generation/worldgen.service';

const MAP_SCALE = 3;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  @ViewChild('canvas', {static: false}) canvas: ElementRef<HTMLCanvasElement>;

  world: World;
  cx: CanvasRenderingContext2D;
  colors = new Map<TileType, number[]>([
    [TileType.SEA, [0, 50, 180]],
    [TileType.RIVER, [0, 250, 250]],
    [TileType.CITY, [255, 30, 30]],
    [TileType.FOREST, [50, 180, 40]],
    [TileType.ICE, [250, 250, 255]],
    [TileType.MOUNTAIN, [220, 220, 220]],
    [TileType.PLAIN, [170, 250, 150]],
    [TileType.SAND, [240, 240, 0]],
    [TileType.SWAMP, [160, 140, 30]],
  ]);

  constructor(private gen: WorldgenService) {}

  ngAfterViewInit(): void {
    this.cx = this.canvas.nativeElement.getContext('2d');
    this.createWorld();
    this.drawMap();
  }

  createWorld(): void {
    this.world = new World();
    // Generate the world map
    this.world.map = this.gen.generateTerrain(90, 200);

    // create cities
    this.world.cities = this.gen.spawnCities(this.world.map);
  }

  drawMap(): void {
    this.cx.canvas.width = this.world.map.length * MAP_SCALE;
    this.cx.canvas.height = this.world.map[0].length * MAP_SCALE;
    this.cx.clearRect(0, 0, this.cx.canvas.width, this.cx.canvas.height);
    this.world.map.forEach((line, x) => line.forEach((t, y) => {
      // draw each tile
      this.cx.fillStyle = this.computeColor(this.colors.get(t.type), t.altitude, t.waterFlow);
      this.cx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);
    }));
    // draw cities
    this.cx.fillStyle = 'black';
    this.cx.strokeStyle = 'white';
    this.cx.font = 'bolder 20px sans';
    this.cx.textBaseline = 'bottom';
    this.cx.textAlign = 'center';
    this.world.cities.forEach(c => {
      this.cx.fillText(c.name, c.position.x * MAP_SCALE, c.position.y * MAP_SCALE);
      this.cx.strokeText(c.name, c.position.x * MAP_SCALE, c.position.y * MAP_SCALE);
    });
  }

  computeColor(color: number[], altitude: number, flow: number): string {
    const dAlt = -altitude * 60 / 255;
    return `rgb(${color[0] + dAlt}, ${color[1] + dAlt}, ${color[2] + dAlt})`;
  }
}
