import { Vis } from './vis';
import { Quest } from './quest';

export class GameState {

    public vis: Vis;

    // progress
    public currentQuest: Quest;

    public constructor() {
        this.vis = new Vis();
    }
}