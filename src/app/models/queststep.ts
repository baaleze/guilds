import { QuestStepEnum } from './queststepenum';
import { GameState } from './gamestate';

export class QuestStep {
    constructor(
        public step: QuestStepEnum,
        public onComplete: (s: GameState, ...params: any[]) => void,
        public isComplete: (s: GameState) => boolean
    ) {}
}
