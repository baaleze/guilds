import { Component, AfterViewInit } from '@angular/core';
import { World, TileType, Position,Resource, allResources, City, Message } from './model/models';
import { DrawService } from './draw/draw.service';
import { Util } from './util';
import { Observable } from 'rxjs';

const WORLD_SIZE = 128;
const SEA_LEVEL = 90;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  world: World;
  worldgen: Worker;
  tasks: Worker;
  picked: City;
  progress: { status: string, num: number};
  resourcesString = allResources.map(r => Resource[r]);

  constructor(public draw: DrawService) {}

  ngAfterViewInit(): void {
    this.draw.init(document.getElementById('map'), WORLD_SIZE, SEA_LEVEL);
    // pick events
    this.draw.onClick.subscribe(p => this.onPick(p));
  }

  public generateWorld(): void {
    this.worldgen = new Worker('./worldgen.worker', { type: 'module' });
    this.tasks = new Worker('./tasks.worker', { type: 'module' });
    this.worldgen.onmessage = ({ data }) => this.handleGenMessage(data);

    this.worldgen.postMessage({
      seaLevel: SEA_LEVEL,
      mountainLevel: 200,
      worldSize: WORLD_SIZE,
      nbNations: 5
    });
  }


  private handleGenMessage(message: Message): void {
    if (message.type === 'progress') {
      this.progress = {
        status: message.msg,
        num: message.progress
      };
    } else {
      // world has been generated
      this.progress = undefined;
      this.world = message.world;
      this.draw.drawMap(this.world);
      // init cities
      this.tasks.onmessage = ({ data: m }) => {
        if (m.type === 'initEnd') {
          this.world = m.world;
          this.tasks.onmessage = undefined;
          // begin looping
          this.update();
        }
      };
      this.tasks.postMessage({task: 'init', world: this.world});
    }
  }

  update(): void {
    // tick
    this.tick().subscribe(world => {
      // update layer contents (new feature has appeared)
      if (world.refreshLayer !== '') {
        this.draw.rebuildLayers(world.refreshLayer, world);
        world.refreshLayer = '';
      }
      // update map display
      this.draw.updateLayers(world);

      // loop
      setTimeout(() => requestAnimationFrame(() => this.update()), 1000);
    });
  }

  tick(): Observable<World> {
    return new Observable(obs => {
      this.tasks.onmessage = ({ data: message }) => {
        if (message.type === 'tickEnd') {
          this.world = message.world;
          obs.next(message.world);
          obs.complete();
          this.tasks.onmessage = undefined;
        }
      };
      this.tasks.postMessage({task: 'tick', world: this.world});
    });
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

  /*
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
  */
}
