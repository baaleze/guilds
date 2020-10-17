import { Injectable, EventEmitter } from '@angular/core';
import { BackSide, Clock, DataTexture, DoubleSide, ImageUtils, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, PointLight, RepeatWrapping, RGBFormat, Scene, ShaderMaterial, Texture, TextureLoader, WebGLRenderer } from 'three';
import { City, TileType, World, Tile, Target, Position, Resource } from '../model/models';
import { OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

const MAP_SCALE = 3;

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
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  clock = new Clock();
  customUniforms;
  textureLoader: TextureLoader;
  worldSize = 256;
  seaLevel: number;
  scale = 10;

  constructor() { }

  init(parent: HTMLElement, worldSize: number, seaLevel: number): void {
    this.worldSize = worldSize;
    this.seaLevel = seaLevel;
    // SCENE
    this.scene = new Scene();
    // CAMERA
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
    this.camera = new PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.scene.add(this.camera);
    this.camera.position.set(0,100,400);
    this.camera.lookAt(this.scene.position);	
    // RENDERER
    this.renderer = new WebGLRenderer( {antialias:true} );
    this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.container = parent;
    this.container.appendChild( this.renderer.domElement );
    // texture loader
    this.textureLoader = new TextureLoader();
    // CONTROLS
    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    // LIGHT
    var light = new PointLight(0xffffff);
    light.position.set(100,250,100);
    this.scene.add(light);
    this.animate();
  }

  drawTerrain(world: World): void {
        ////////////
    // CUSTOM //
    ////////////
    
    // texture used to generate "bumpiness"
    var bumpTexture = this.getTerrainTexture(world.map);
    bumpTexture.wrapS = bumpTexture.wrapT = RepeatWrapping;
    
    var plainTex = this.textureLoader.load( 'assets/grass-512.jpg' );
    plainTex.wrapS = plainTex.wrapT = RepeatWrapping;
    var cityTex = this.textureLoader.load( 'assets/city-512.jpg' );
    cityTex.wrapS = cityTex.wrapT = RepeatWrapping;
    var dirtTex = this.textureLoader.load( 'assets/dirt-512.jpg' );
    dirtTex.wrapS = dirtTex.wrapT = RepeatWrapping;
    var forestTex = this.textureLoader.load( 'assets/forest-512.jpg' );
    forestTex.wrapS = forestTex.wrapT = RepeatWrapping;
    var riverTex = this.textureLoader.load( 'assets/river-512.jpg' );
    riverTex.wrapS = riverTex.wrapT = RepeatWrapping;
    var rockTex = this.textureLoader.load( 'assets/rock-512.jpg' );
    rockTex.wrapS = rockTex.wrapT = RepeatWrapping;
    var iceTex = this.textureLoader.load( 'assets/snow-512.jpg' );
    iceTex.wrapS = iceTex.wrapT = RepeatWrapping;
    var swampTex = this.textureLoader.load( 'assets/swamp-512.jpg' );
    swampTex.wrapS = swampTex.wrapT = RepeatWrapping;
    var sandTex = this.textureLoader.load( 'assets/sand-512.jpg' );
    sandTex.wrapS = sandTex.wrapT = RepeatWrapping;

    
    // use "this." to create global object
    this.customUniforms = {
      bumpTexture:	{ type: "t", value: bumpTexture },
      plainTex:	{ type: "t", value: plainTex },
      cityTex:	{ type: "t", value: cityTex },
      dirtTex:	{ type: "t", value: dirtTex },
      forestTex:	{ type: "t", value: forestTex },
      riverTex:	{ type: "t", value: riverTex },
      rockTex:	{ type: "t", value: rockTex },
      iceTex:	{ type: "t", value: iceTex },
      swampTex:	{ type: "t", value: swampTex },
    };
    
    // create custom material from the shader code above
    //   that is within specially labelled script tags
    var customMaterial = new ShaderMaterial( 
    {
        uniforms: this.customUniforms,
      vertexShader: `
uniform sampler2D bumpTexture;

varying float vAmount;
varying vec2 vUV;
varying float vBiome;

void main() 
{ 
	vUV = uv;
  vec4 bumpData = texture2D( bumpTexture, uv );
	
  vAmount = bumpData.r * 128.0; // assuming map is grayscale it doesn't matter if you use r, g, or b.
  vBiome = floor(bumpData.g * 256.0);
	
	// move the position along the normal
  vec3 newPosition = position + normal * vAmount;
	
	gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
}`,
      fragmentShader: `       
      uniform sampler2D plainTex;
      uniform sampler2D cityTex;
      uniform sampler2D dirtTex;
      uniform sampler2D forestTex;
      uniform sampler2D riverTex;
      uniform sampler2D rockTex;
      uniform sampler2D iceTex;
      uniform sampler2D swampTex;
      uniform sampler2D sandTex;

varying vec2 vUV;
varying float vBiome;

void main() 
{
  if (vBiome == 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(plainTex, vUV * 10.0);
  } else if (vBiome == 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(rockTex, vUV * 10.0);
  } else if (vBiome == 2.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(dirtTex, vUV * 10.0);
  } else if (vBiome == 3.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(forestTex, vUV * 10.0);
  } else if (vBiome == 4.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(swampTex, vUV * 10.0);
  } else if (vBiome == 5.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(iceTex, vUV * 10.0);
  } else if (vBiome == 6.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(sandTex, vUV * 10.0);
  } else if (vBiome == 7.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(cityTex, vUV * 10.0);
  } else if (vBiome == 8.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + texture2D(riverTex, vUV * 10.0);
  }
}  
`,
      // side: THREE.DoubleSide
    }   );
      
    var planeGeo = new PlaneGeometry( this.worldSize * 2 * this.scale, this.worldSize * 2 * this.scale, this.worldSize * 2, this.worldSize * 2 );
    var plane = new Mesh(	planeGeo, customMaterial );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    this.scene.add( plane );

    var waterTex = this.textureLoader.load( 'assets/water-512.jpg' );
    waterTex.wrapS = waterTex.wrapT = RepeatWrapping; 
    waterTex.repeat.set(5,5);
    var waterMat = new MeshBasicMaterial( {map: waterTex, transparent:true, opacity:0.40} );
    var water = new Mesh(	planeGeo, waterMat );
    water.rotation.x = -Math.PI / 2;
    water.position.y = this.seaLevel / 2 - 2;
    this.scene.add( water);
  }

  getTerrainTexture(map: Tile[][]): Texture {
    let size = map.length * map[0].length;
    let data = new Uint8Array( 3 * size );

    for ( let x = 0; x < map.length; x ++ ) {
      for ( let y = 0; y < map[x].length; y ++ ) {
        const stride = (x + y * map.length) * 3;
        data[ stride ] = map[x][y].altitude;
        data[ stride + 1 ] = <number>map[x][y].type;
        data[ stride + 2 ] = 0;
      }
    }

    // used the buffer to create a DataTexture
    return new DataTexture( data, map.length, map[0].length, RGBFormat );
  }

  animate(): void {
    requestAnimationFrame( () => this.animate() );
    this.render();
    this.controls.update();
  }


  render(): void
  {
    this.renderer.render( this.scene, this.camera );
  }

}
