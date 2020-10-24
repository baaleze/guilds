import { Component, AfterViewInit } from '@angular/core';
import { World, TileType, Position,Resource, allResources, City, Message, Task } from './model/models';
import { DrawService } from './draw/draw.service';
import { Util } from './util';
import { SEA_LEVEL, TICK_TIME, WORLD_SIZE } from './model/const';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  static taskId = 0;
  world: World;
  worldgen: Worker;
  tasks: Worker;
  picked: City;
  progress: { status: string, num: number};
  resourcesString = allResources.map(r => Resource[r]);

  taskCallBacks = new Map<number, (msg: Message) => void>();

  constructor(public draw: DrawService) {}

  ngAfterViewInit(): void {
    this.draw.init(document.getElementById('map'), WORLD_SIZE, SEA_LEVEL);
    // pick events
    this.draw.onClick.subscribe(p => this.onPick(p));
    this.worldgen = new Worker('./worldgen.worker', { type: 'module' });
    this.tasks = new Worker('./tasks.worker', { type: 'module' });
    this.worldgen.onmessage = ({ data }) => this.handleGenMessage(data);
    this.tasks.onmessage = ({data}) => this.onTaskMessage(data);
  }

  public generateWorld(): void {
    this.worldgen.postMessage({
      seaLevel: SEA_LEVEL,
      mountainLevel: 200,
      worldSize: WORLD_SIZE,
      nbNations: 5
    });
  }

  runTask(task: Task, callback: (msg: Message) => void): void {
    const id = AppComponent.taskId++;
    this.taskCallBacks.set(id, callback);
    this.tasks.postMessage({task, world: this.world, id});
  }

  onTaskMessage(message: Message): void {
    if (message.type === 'end') {
      // call callback
      const callback = this.taskCallBacks.get(message.id);
      if (callback) {
        console.log('GOT END MESSAGE', message);
        this.taskCallBacks.set(message.id, undefined);
        callback(message);
      }
    }
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
      // init cities and start looping
      this.runTask('init', msg => {
        this.world = msg.world;
        this.update();
      });
    }
  }

  update(): void {
    this.world.day = (this.world.day + TICK_TIME) % 70;
    // tick
    this.runTask('updateCity', msg => {
      // update cities
      if (this.world.day === 0) {
        this.world.cities = msg.cities;
      }

      this.runTask('spawnCaravans', msg => {
        // add caravan
        const caravan = msg.caravan;
        this.world.caravans.set(caravan.id, caravan);
        caravan.route.from.caravans.push(caravan);
        this.draw.addCaravan(caravan);

        this.runTask('moveCaravans', msg => {
          // DELETE caravans if needed
          this.world.caravans.forEach((c, id) => {
            if (!msg.caravans.has(id)) {
              this.draw.removeCaravan(c);
            }
          });
          this.world.caravans = msg.caravans;
          // update map display
          this.draw.updateLayers(this.world);

          // loop
          requestAnimationFrame(() => this.update());
        });
      });
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
