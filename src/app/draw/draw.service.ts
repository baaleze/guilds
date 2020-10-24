import { Injectable, EventEmitter } from '@angular/core';
import { Feature, Map as OlMap, View } from 'ol';
import { Extent, getCenter } from 'ol/extent';
import ImageLayer from 'ol/layer/Image';
import Static from 'ol/source/ImageStatic';
import Projection from 'ol/proj/Projection';
import { City, TileType, World, Tile, Target, Position, Resource, Caravan } from '../model/models';
import { Util } from '../util';
import Layer from 'ol/layer/Layer';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Point from 'ol/geom/Point';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';

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
  cityLayer: VectorLayer;
  caravanLayer: VectorLayer;

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
    const extent: Extent = [0, 0, (this.worldSize + 1) * TILE_SIZE, (this.worldSize + 1) * TILE_SIZE];
    const projection = new Projection({
      code: 'static-image',
      units: 'pixels',
      extent,
    });

    this.map = new OlMap({
      layers: [
        new ImageLayer({
          source: new Static({
            url: this.cx.canvas.toDataURL(),
            projection,
            imageExtent: extent,
          }),
        }) ],
      target: 'map',
      view: new View({
        projection,
        center: getCenter(extent),
        zoom: 2,
        maxZoom: 8,
      }),
    });

    // cities
    this.createCityLayer(world);

    this.createCaravanLayer();
  }

  updateLayers(world: World): void {
    this.updateCaravans(world);
  }
  updateCaravans(world: World): void {
    if (this.caravanLayer) {
      const source = this.caravanLayer.getSource() as VectorSource<Point>;
      source.forEachFeature(f =>
        f.getGeometry().setCoordinates(
          this.toOlPosition(world.caravans.get(Number(f.getId())).position)
        )
      );
    }
  }

  addCaravan(caravan: Caravan): void {
    const f = new Feature(new Point(this.toOlPosition(caravan.position)));
    f.setId(caravan.id);
    this.caravanLayer.getSource().addFeature(f);
  }

  removeCaravan(caravan: Caravan): void {
    this.caravanLayer.getSource().removeFeature(
      this.caravanLayer.getSource().getFeatureById(caravan.id)
    );
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
        x * TILE_SIZE, h - y * TILE_SIZE,
        TILE_SIZE, TILE_SIZE
      );
    }));
    map.forEach((line, x) => line.forEach((tile, y) => {
      // roads
      this.cx.lineWidth = 5;
      this.cx.lineCap = 'round';
      if (tile.isRoad || tile.isSeaRoad || tile.type === TileType.CITY) {
        // check each neighbour
        Util.getNeighbors(map, tile.position).forEach(n => {
          if (n.isRoad && tile.isRoad || n.isSeaRoad && tile.isSeaRoad ||
            n.type === TileType.CITY && tile.isRoad || tile.type === TileType.CITY && n.isRoad) {
            this.cx.strokeStyle = tile.isSeaRoad ? 'red' : 'black';
            // draw a road in this direction!
            this.cx.beginPath();
            // middle of tile
            const start = [x * TILE_SIZE + TILE_SIZE / 2, (y - 1) * TILE_SIZE + TILE_SIZE / 2];
            const end = [start[0] + (n.position.x - x) * TILE_SIZE / 2, start[1] + (n.position.y - y) * TILE_SIZE / 2];
            this.cx.moveTo(start[0], h - start[1]);
            this.cx.lineTo(end[0], h - end[1]);
            this.cx.stroke();
          }
        });
      }
    }));
  }

  createCaravanLayer(): void {
    this.caravanLayer = new VectorLayer({
      source: new VectorSource<Point>(),
      style: new Style({
        image: new Icon({
          src: '/assets/icons/camel.png',
          scale: 0.03125
        })
      })
    });
    this.map.addLayer(this.caravanLayer);
  }

  createCityLayer(world: World): void {
    this.cityLayer = new VectorLayer({
      source: new VectorSource<Point>({
        features: world.cities.map(city => {
          const f = new Feature(
            new Point(this.toOlPosition(city.position)));
          f.set('city', city);
          return f;
        })
      }),
      style: feature => new Style({
        text: new Text({
          text: (feature.get('city') as City).name,
          fill: new Fill({color: Util.colorString((feature.get('city') as City).nation.color)}),
          stroke: new Stroke({color: '#000', width: 2}),
          font: 'bold 20px Yanone Kaffeesatz',
          offsetY: -20
        })
      })
    });
    this.map.addLayer(this.cityLayer);
  }

  toOlPosition(pos: Position): [number, number] {
    return [pos.x * TILE_SIZE + TILE_SIZE / 2, (pos.y - 1) * TILE_SIZE + TILE_SIZE / 2];
  }

  computeTileCoord(map: Tile[][], tile: Tile, x: number, y: number): [number, number] {
    switch (tile.type) {
      case TileType.PLAIN:
        return [0, 0];
      case TileType.MOUNTAIN:
        return [0, 1];
      case TileType.FOREST:
        return [0, 2];
      case TileType.ICE:
        return [0, 3];
      case TileType.SWAMP:
        return [0, 4];
      case TileType.SAND:
        return [0, 5];
      case TileType.CITY:
        return [0, 6];
      case TileType.SEA:
        return [0, 7];
      case TileType.RIVER:
        return [1, 0];
    }
  }
}
