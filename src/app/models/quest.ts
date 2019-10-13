import { QuestStep } from './queststep';

export class Quest {


    public steps: QuestStep[];
    public progress: number;

    public constructor(...s: QuestStep[]) {
        this.steps = s;
        this.progress = 0;
    }

    public get currentStep(): QuestStep {
        return this.steps[this.progress];
    }

    public nextStep() {
        if (this.progress < this.steps.length-1) {
            this.progress++;
        }
    }

    public advanceTo(step: QuestStep): void {
        const i = this.steps.indexOf(step);
        if (i != -1) {
            this.progress = i; 
        } else {
            console.error(`Step ${step} not found in this quest!`);
        }
    }
}

