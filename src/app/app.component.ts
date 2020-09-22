import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { World, TileType, Position, Target } from './model/models';
import { DrawService } from './draw.service';
import { Util } from './util';

const WORLD_SIZE = 256;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  world: World;
  worldgen: Worker;
  picked: Target;
  log: string[] = [];

  constructor(public draw: DrawService) {}

  ngAfterViewInit(): void {
    this.draw.init(document.getElementById('map'), WORLD_SIZE);
    this.worldgen = new Worker('./worldgen.worker', { type: 'module' });
    this.worldgen.onmessage = ({ data }) => this.handleGenMessage(data);

    this.worldgen.postMessage({
      seaLevel: 90,
      mountainLevel: 200,
      worldSize: WORLD_SIZE,
      nbNations: 5
    });
    // pick events
    this.draw.onClick.subscribe(p => this.onPick(p));
  }


  private handleGenMessage(message: {
    type: 'progress' | 'end', msg?: string, data?: World
  }): void {
    if (message.type === 'progress') {
      this.log.push(message.msg);
    } else {
      this.log = ['READY'];
      this.world = message.data;
    }
    if (message.data) {
      this.draw.drawMap(message.data);
    }
  }

  onPick(p: Position): void {
    if (this.world) {
      // find nearest city in range
      const found = Util.getClosestTileOfType(this.world.map, p.x, p.y, TileType.CITY, 5);
      if (found) {
        this.picked = this.world.cities.find(c => c.position.x === found.x && c.position.y === found.y);
      }
    }
  }

  public showBiomes(show: boolean): void {
    this.draw.showBiomes = show;
    this.draw.drawMap(this.world);
  }
  public showAltitude(show: boolean): void {
    this.draw.showAltitude = show;
    this.draw.drawMap(this.world);
  }
  public showCities(show: boolean): void {
    this.draw.showCities = show;
    this.draw.drawMap(this.world);
  }
  public showNations(show: boolean): void {
    this.draw.showNations = show;
    this.draw.drawMap(this.world);
  }
  public showRegions(show: boolean): void {
    this.draw.showRegions = show;
    this.draw.drawMap(this.world);
  }
  public showRoads(show: boolean): void {
    this.draw.showRoads = show;
    this.draw.drawMap(this.world);
  }
}
