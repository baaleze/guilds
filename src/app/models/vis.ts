export class Vis {

    public static allVis = [ 'perdo', 'creo', 'muto', 'rego', 'intellego',
        'aquam', 'ignem', 'terram', 'auram', 'herbam', 'corpus', 'animal', 'imaginem', 'mentem', 'vim'];

    public perdo = 0;
    public creo = 0;
    public muto = 0;
    public rego = 0;
    public intellego = 0;

    public aquam = 0;
    public ignem = 0;
    public terram = 0;
    public auram = 0;
    public herbam = 0;
    public corpus = 0;
    public animal = 0;
    public imaginem = 0;
    public mentem = 0;
    public vim = 0;

    public productions = {};

    public constructor() {
    }

    public addProd(byTick: number, visType: string) {
        if (this.productions[visType]) {
            this.productions[visType] += byTick;
        } else {
            this.productions[visType] = byTick;
        }
    }

    public tick() {
        Vis.allVis.forEach(v => this[v] += this.productions[v] ? this.productions[v] : 0);
    }
}

export type VisType = 'perdo'|'creo'|'muto'|'rego'|'intellego'|
    'aquam'|'ignem'|'terram'|'auram'|'herbam'|'corpus'|'animal'|'imaginem'|'mentem'|'vim';
