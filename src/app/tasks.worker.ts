/// <reference lib="webworker" />

import { World, Resource, City, allResources, Industry } from './model/models';


addEventListener('message', ({ data }) => {
  console.log('GOT MESSAGE', data);
  postMessage(handleMessage(data));
});

function handleMessage(data): {type: string, msg?: string, data?: any} {
  switch (data.task) {
    case 'tick':
    default:
      return {type: 'error', msg: `Unknown task ${data.task}`};
  }
}

function tick(world: World): {type: string, msg?: string} {
  world.day = (world.day + 1) % 7;
  // update cities every week
  if (world.day === 0) {
    // get best production for each resource
    const bestProd = getBestProd(world.cities);
    world.cities.forEach(city => {
      // check for needs
      const deficits = new Map<Resource, number>();
      sumAllNeeds(city).forEach((need, res) => {
        // is global demand met ?
        if (need > city.access || need > bestProd.get(res)) {
          // Access or prod in the world are not enough
          deficits.set(res, need - Math.min(city.access, bestProd.get(res)));
        } else {
          deficits.set(res, 0);
        }
      });

      // recompute stability
      city.stability = computeStability(deficits);

      // apply consequences for lack of food
      if (deficits.get(Resource.FOOD) > 0) {
        city.population = city.population * 0.9;
      }

      // productions
      city.industries.forEach(ind => {
        const bonus = getStabilityBonus(city.stability) + getShortageMalus(deficits, ind);
        // TODO
      });
    });
  }

  // update movement of every one

  return {type: 'end'};
}

function getStabilityBonus(stability: number): number {
  return (stability - 5) * 0.1;
}

function getShortageMalus(deficits: Map<Resource, number>, industry: Industry): number {
  let totalDeficit = 0;
  industry.needs.forEach(need => {
    totalDeficit += deficits.get(need.resource);
  });
  return -totalDeficit * 0.2;
}

function computeStability(deficits: Map<Resource, number>): number {
  let stab = 5; // base
  if (deficits.get(Resource.GOODS) === 0) {
    stab++;
  }
  if (deficits.get(Resource.FOOD)) {
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
      c.industries.forEach(i => {
        i.produces.forEach(p => {
          if (p.resource === r) {
            // we're producing this
            prod = Math.min(c.access, p.mag(c.getMag()));
          }
        });
      });
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
  city.industries.forEach(indus => {
    indus.needs.forEach(need => {
      if (needs.has(need.resource)) {
        needs.set(need.resource, needs.get(need.resource) + need.mag(city.getMag()));
      } else {
        needs.set(need.resource, need.mag(city.getMag()));
      }
    });
  });
  return needs;
}


