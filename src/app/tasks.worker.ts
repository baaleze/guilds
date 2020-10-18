/// <reference lib="webworker" />

import { World, Resource, City, allResources, Industry, TileType, Message } from './model/models';
import { Util } from './util';


addEventListener('message', ({ data }) => {
  console.log('GOT MESSAGE', data);
  postMessage(handleMessage(data));
});

function handleMessage(data): Message {
  switch (data.task) {
    case 'tick':
      return tick(data.world);
    default:
      return {type: 'error', msg: `Unknown task ${data.task}`, progress: 100};
  }
}

function tick(world: World): Message {
  world.day = (world.day + 1) % 7;
  // update cities every week
  if (world.day === 0) {
    // Update access for every city
    world.cities.forEach(city => city.access = computeAccess(city, world));

    // get best production for each resource
    const bestProd = getBestProd(world.cities);
    world.cities.forEach(city => {
      // check for needs
      const deficits = new Map<Resource, number>();
      city.needs = sumAllNeeds(city);
      city.needs.forEach((need, res) => {
        // is global demand met ?
        if (need > city.access || need > bestProd.get(res)) {
          // Access or prod in the world are not enough
          deficits.set(res, need - Math.min(city.access, bestProd.get(res)));
        } else {
          deficits.set(res, 0);
        }
      });

      city.deficits = deficits;

      // recompute stability
      city.stability = computeStability(deficits);

      // compute growth
      city.growth = computeGrowth(deficits, city, world);

      // update city population
      city.population = Math.floor(city.population * (1 + city.growth / 10));

      // update productions and fill stocks
      city.industries.forEach(ind => {
        const industry = Industry.industries.get(ind);
        // get the biggest shortage for this industry
        let short = 0;
        industry.needs.forEach(need => {
          if (deficits.get(need.resource) > short) {
            short = deficits.get(need.resource);
          }
        });

        industry.produces.forEach(prod => {
          // update production, removing shortage
          const newProd = Math.max(0, prod.mag(Util.getMag(city.population)) - short);
          city.production.set(prod.resource, newProd);
          // update stocks
          city.resources.set(prod.resource, newProd * 100);
        });
      });
    });
  }

  // update movement of every one
  return {type: 'tickEnd', world, progress: 100};
}

function computeGrowth(deficits: Map<Resource, number>, city: City, world: World): number {
  let g = 0;
  // apply consequences for lack of food
  g += (deficits.get(Resource.FOOD) > 0) ? -1 : 1;
  // bonus from access
  g += Math.max(0, city.access - 2);
  // bonus/malus from stability
  g += Math.floor((city.stability - 5) / 2);
  // biomes
  const scan = Util.scanAround(world.map, city.position.x, city.position.y, 2);
  if (scan.biomes.some(b => b === TileType.SWAMP)) {
    g--;
  }
  if (scan.biomes.some(b =>  b === TileType.ICE)) {
    g--;
  }
  if (scan.biomes.some(b =>  b === TileType.RIVER)) {
    g++;
  }
  return g;
}

function computeAccess(city: City, world: World): number {
  let a = 5; // base for city with market
  // size
  a += Math.max(0, Util.getMag(city.population) - 4);
  // number of cities near
  const nbCloseCities = city.roads.filter(r => r.path.length < 100).length;
  a += Math.min(5, nbCloseCities - 3);
  return a;
}

function computeStability(deficits: Map<Resource, number>): number {
  let stab = 5; // base
  if (deficits.get(Resource.GOODS) === 0) {
    stab++;
  }
  if (deficits.get(Resource.FOOD)) {
    stab--;
  }
  if (deficits.get(Resource.METAL)) {
    stab--;
  }
  if (deficits.get(Resource.WOOD)) {
    stab--;
  }
  if (deficits.get(Resource.TOOLS)) {
    stab--;
  }
  if (deficits.get(Resource.MACHINE)) {
    stab--;
  }
  // TODO add other bonus/malus from upgrades / raids
  return stab;
}

function getBestProd(cities: City[]): Map<Resource, number> {
  const bestProd = new Map<Resource, number>();
  allResources.forEach(r => {
    let best = 0;
    cities.forEach(c => {
      // get prod for the city
      let prod = 0;
      // use resolved prod (includes shortage impact)
      if (c.production.has(r)) {
        prod = Math.min(c.access, c.production.get(r));
      } else {
        // if not get normal prod
        c.industries.forEach(i => {
          Industry.industries.get(i).produces.forEach(p => {
            if (p.resource === r) {
              // we're producing this
              prod = Math.min(c.access, p.mag(Util.getMag(c.population)));
            }
          });
        });
      }
      if (prod > best) {
        best = prod;
      }
    });
    bestProd.set(r, best);
  });
  return bestProd;
}

function sumAllNeeds(city: City): Map<Resource, number> {
  const needs = new Map<Resource, number>();

  // base needs from population
  needs.set(Resource.FOOD, Util.getMag(city.population));
  needs.set(Resource.GOODS, Math.max(0, Util.getMag(city.population) - 3));

  city.industries.forEach(indus => {
    Industry.industries.get(indus).needs.forEach(need => {
      if (needs.has(need.resource)) {
        needs.set(need.resource, Math.max(needs.get(need.resource), need.mag(Util.getMag(city.population))));
      } else {
        needs.set(need.resource, need.mag(Util.getMag(city.population)));
      }
    });
  });
  return needs;
}


