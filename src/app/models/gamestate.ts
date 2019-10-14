import { Vis } from './vis';
import { Quest } from './quest';
import { Unlocks } from './unlocks';
import { Zone } from './zone';

export class GameState {

    public vis: Vis;

    // unlocks
    public unlocks: Unlocks;

    // progress
    public quest1: Quest;

    // map resources
    public zones: Zone[][] = [];

    public constructor() {
        this.vis = new Vis();
        this.unlocks = new Unlocks();
        this.quest1 = Quest.quest1();
    }

    public initStartZone(startingTerrain: 'WATER'|'CAVE'|'FOREST') {
        const z = new Zone();
        this.zones[0] = [z]; // put it in 0,0
        switch(startingTerrain) {
            case 'CAVE':
                z.productions['terram'] = 1;
                this.unlocks.terramAccess = true;
                break;
            case 'WATER':
                z.productions['aquam'] = 1;
                this.unlocks.aquamAccess = true;
                break;
            case 'FOREST':
                z.productions['herbam'] = 1;
                this.unlocks.herbamAccess = true;
                break;
        }
    }


    public addProd(byTick: number, visType: string) {
        this.vis.addProd(byTick, visType);
        this.saveState();
    }

    public tick(): void {
        this.vis.tick();
        this.saveState();
    }

    /**
     * Save everytime the state changes
     */
    private saveState(): void {
        localStorage.setItem('arcana_save', JSON.stringify(this));
    }
}
