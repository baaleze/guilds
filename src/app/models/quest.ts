import { QuestStepEnum } from './queststepenum';
import { GameState } from './gamestate';
import { QuestStep } from './queststep';
import { Zone } from './zone';
import { PoI } from './poi';

export class Quest {

    public steps: QuestStep[];
    public progress: number;


    // Quests def
    public static quest1(): Quest {
        return new Quest(
            new QuestStep(QuestStepEnum.START_1,
                s => {},
                s => true),
            new QuestStep(QuestStepEnum.START_2,
                (s, p) => Quest.initStartZone(s, p[0]),
                s => true),
            new QuestStep(QuestStepEnum.START_FINAL, // TODO
                (s, p) => {},
                s => true)
        );
    }

    public static initStartZone(state: GameState, startingTerrain: 'WATER'|'CAVE'|'FOREST') {
        console.log('init zone', startingTerrain);
        const z = new Zone();
        state.zones[0] = [z]; // put it in 0,0
        switch (startingTerrain) {
            case 'CAVE':
                z.productions.push(new PoI('Crystals', {visType: 'terram', rate: 1}));
                state.unlocks.terramAccess = true;
                state.vis.terram += 5;
                break;
            case 'WATER':
                z.productions.push(new PoI('Waterfall', {visType: 'aquam', rate: 1}));
                state.unlocks.aquamAccess = true;
                state.vis.aquam += 5;
                break;
            case 'FOREST':
                z.productions.push(new PoI('Giant tree', {visType: 'herbam', rate: 1}));
                state.unlocks.herbamAccess = true;
                state.vis.herbam += 5;
                break;
        }
    }

    public constructor(...s: QuestStep[]) {
        this.steps = s;
        this.progress = 0;
    }

    public get currentStep(): QuestStep {
        return this.steps[this.progress];
    }

    public nextStep(state: GameState, ...params: any[]) {
        if (this.currentStep.isComplete(state) && this.progress < this.steps.length - 1) {
            this.currentStep.onComplete(state, params);
            this.progress++;
        }
    }

    public isComplete(): boolean {
        return this.progress === this.steps.length - 1;
    }

    public advanceTo(step: QuestStep, state: GameState): void {
        if (this.currentStep.isComplete(state)) {
            const i = this.steps.indexOf(step);
            if (i !== -1) {
                this.currentStep.onComplete(state);
                this.progress = i;
            } else {
                console.error(`Step ${step} not found in this quest!`);
            }
        } else {
            console.error(`Step ${step} not complete!`);
        }
    }

}

