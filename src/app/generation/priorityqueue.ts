const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

export class PriorityQueue<T> {

    heap: T[];
    constructor(private comparator = (a: T, b: T) => a > b) {
        this.heap = [];
        this.comparator = comparator;
    }
    size(): number {
        return this.heap.length;
    }
    isEmpty(): boolean {
        return this.size() === 0;
    }
    peek(): T {
        return this.heap[top];
    }
    push(...values): number {
        values.forEach(value => {
            this.heap.push(value);
            this.siftUp();
        });
        return this.size();
    }
    pop(): T {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > top) {
            this.swap(top, bottom);
        }
        this.heap.pop();
        this.siftDown();
        return poppedValue;
    }
    replace(value): T {
        const replacedValue = this.peek();
        this.heap[top] = value;
        this.siftDown();
        return replacedValue;
    }
    greater(i, j): boolean {
        return this.comparator(this.heap[i], this.heap[j]);
    }
    swap(i, j): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    siftUp(): void {
        let node = this.size() - 1;
        while (node > top && this.greater(node, parent(node))) {
            this.swap(node, parent(node));
            node = parent(node);
        }
    }
    siftDown(): void {
        let node = top;
        while (
            (left(node) < this.size() && this.greater(left(node), node)) ||
            (right(node) < this.size() && this.greater(right(node), node))
        ) {
            const maxChild = (right(node) < this.size() && this.greater(right(node), left(node))) ? right(node) : left(node);
            this.swap(node, maxChild);
            node = maxChild;
        }
    }
}
