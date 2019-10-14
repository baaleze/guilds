import { Vis } from './vis';
import { Quest } from './quest';
import { Unlocks } from './unlocks';

export class GameState {

    public vis: Vis;

    // unlocks
    public unlocks: Unlocks;

    // progress
    public quest1: Quest;

    public constructor() {
        this.vis = new Vis();
        this.unlocks = new Unlocks();
        this.quest1 = Quest.quest1();

        // TEST
        this.vis.creo += 5;
        Vis.allVis.forEach(v => this.unlocks[v+'Access'] = true);
        this.addProd(5, 'perdo');
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
