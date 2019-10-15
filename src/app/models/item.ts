import { VisType } from './vis';

export class Item {
    constructor(
        public name: string,
        public tags: Tag[],
        public stackSize = 1,
        public cost = 0
    ) {}

    // item definitions
    public static pureVis(visType: VisType): Item {
        return new Item(visType + ' vis', [visType, 'vis'], 32);
    }

}
export type Properties = 'flammable' | 'heavy' | 'small' ;
export type Material = 'wood' | 'iron' | 'gold' | 'silver' | 'cloth' | 'plant' | 'flesh';
export type Category = 'weapon' | 'hat' | 'armor' | 'boot' | 'clothes' | 'tool' | 'wand' | 'trash' | 'food' | 'liquid' | 'vis';
export type Tag = VisType | Properties | Material | Category;
