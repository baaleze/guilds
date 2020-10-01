import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { World, TileType, Position, Target, TradeRoute, Resource } from './model/models';
import { DrawService } from './draw.service';
import { Util } from './util';
import { Observable } from 'rxjs';
import { resources } from 'pixi.js';

const WORLD_SIZE = 256;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  world: World;
  worldgen: Worker;
  tasks: Worker;
  picked: Target;
  log: string[] = [];
  resources = [
    Resource.BREAD,
    Resource.CHARCOAL,
    Resource.CLOTHES,
    Resource.COTTON,
    Resource.GOLD,
    Resource.GRAIN,
    Resource.MEAT,
    Resource.ORE,
    Resource.STONE,
    Resource.TOOLS,
    Resource.WOOD
  ];
  resourcesString = this.resources.map(r => Resource[r]);
  trade: Resource;

  constructor(public draw: DrawService) {}

  ngAfterViewInit(): void {
    this.draw.init(document.getElementById('map'), WORLD_SIZE);
    this.worldgen = new Worker('./worldgen.worker', { type: 'module' });
    this.tasks = new Worker('./tasks.worker', { type: 'module' });
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
      // world has been generated
      this.log = ['WORLD GENERATED'];
      this.world = message.data;
      // generate trade routes for the first time
      this.log.push('Generating trade routes for the first time');
      this.refreshTradeRoutes().subscribe((tr) => {
        this.log.push('Generating trade routes FINISHED');
        this.world.tradeRoutes = tr;
        this.draw.drawMap(this.world);
      });
    }
    if (message.data) {
      this.draw.drawMap(message.data);
    }
  }

  refreshTradeRoutes(): Observable<TradeRoute[]> {
    return new Observable(obs => {
      this.tasks.onmessage = ({ data: message }) => {
        if (message.type === 'computeTradeRouteEnd') {
          obs.next(message.data);
          obs.complete();
          this.tasks.onmessage = undefined;
        }
      };
      this.tasks.postMessage({task: 'computeTradeRoute', world: this.world});
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
  public showTrade(): void {
    this.draw.showTrade = this.trade;
    if (this.trade) {
      this.showRoads(false);
      this.showBiomes(false);
    }
    this.draw.drawMap(this.world);
  }
}
