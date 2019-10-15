import { Item } from './item';

export class ItemStack {
    constructor(
        public item: Item,
        public count = 0
    ) {}

    public addOrRemove(c: number): number {
        let delta = c;
        if (this.count + c > this.item.stackSize) { // overflow ?
            delta = this.item.stackSize - this.count;
        } else if (this.count + c < 0) { // remove too much
            delta = -this.count;
        }
        this.count += delta;
        // return the actual delta
        return delta;
    }

    public isFull(): boolean {
        return this.count === this.item.stackSize;
    }
}
