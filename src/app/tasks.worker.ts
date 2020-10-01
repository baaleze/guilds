/// <reference lib="webworker" />

import { World, TradeRoute, Resource } from './model/models';


addEventListener('message', ({ data }) => {
  console.log('GOT MESSAGE', data);
  postMessage(handleMessage(data));
});

function handleMessage(data): {type: string, msg?: string, data?: any} {
  switch (data.task) {
    case 'computeTradeRoute':
      console.log('DATA', data);
      return computeTradeRoutes(data.world);
    default:
      return {type: 'error', msg: `Unknown task ${data.task}`};
  }
}

function computeTradeRoutes(world: World): {type: string, msg?: string, data: TradeRoute[]} {
  const routes: TradeRoute[] = [];
  // for each city
  world.cities.forEach(c => {
    // for each resource they need, in addition to basic needs
    const res = [
      Resource.BREAD, Resource.WOOD, Resource.STONE, Resource.MEAT, Resource.TOOLS
    ];
    c.industries.forEach(i => i.needs.forEach(n => {
      if (res.indexOf(n.res) === -1) {
        res.push(n.res);
      }
    }));
    res.forEach(r => {
      // find any city with a road to here that produces this resource
      let roadTarget;
      c.roads.forEach(road => {
        if (road.to.industries.some(i => i.produces.some(p => p.res === r))) {
          roadTarget = road;
        }
      });
      if (roadTarget) {
        routes.push(new TradeRoute(roadTarget, r));
      }
    });
  });
  return {type: 'computeTradeRouteEnd', data: routes};
}

