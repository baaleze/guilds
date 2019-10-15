import { VisType } from './vis';

export class PoI {
    constructor(
        public name: string,
        public production: {visType: VisType, rate: number}
        ) {}
}
