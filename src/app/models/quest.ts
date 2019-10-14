import { QuestStepEnum } from './queststepenum';
import { GameState } from './gamestate';
import { QuestStep } from './queststep';

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
                (s, p) => s.initStartZone(p[0]),
                s => true),
            new QuestStep(QuestStepEnum.START_3,
                (s, p) => s.initStartZone(p[0]),
                s => true)
        );
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

