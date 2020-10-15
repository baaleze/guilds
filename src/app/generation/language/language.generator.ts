import { Util } from 'src/app/util';

// const allConsonants = 'bcdfghjklmnpqrstvwxyz'.split('');
const allConsonants = 'bbccccdddfffghhjkllllllmmmmnnnnnpppqrrrrrrsssssstttttvwwxz'.split('');
const diacConsonants = 'čçšž'.split('');
// const allVowels = 'aeiouyàéèâêôîûëäïöüòìùỳŷÿãåøæœ'.split('');
const allVowels = 'aaaeeeiiooouy'.split('');
const diacVowels = 'àéèâêôîûëäïöüòìùỳŷÿãåøæœ'.split('');
const syllabePatterns = [
    'v', 'cv', 'cvc', 'cvc', 'cvc', 'ccv', 'ckv', 'vv'
];
const wordPatterns = [
    'w', 'w w', 'w w w', 'w w', 'w', 'w-w', 'w-w', 'w w', 'w\'w', 'w\'w', 'w-w', 'w\'w', 'w-w-w', 'ww', 'ww\'w'
];
const NUM_MAX_DIAC_VOWELS = 5;
const NUM_COMMON_SYLLABE = 15;
const NUM_WORD_PATTERNS = 3;
const NUM_WORD_BASE = 100;

export class LanguageGenerator {

    public types: ('city'| 'river' | 'firstName' | 'lastName')[] = [
        'city', 'river', 'firstName', 'lastName'
    ];
    public consonantProbas = new Map<string, number>();
    public vowelProbas = new Map<string, number>();
    public syllabes: Map<string, number>[];
    public wordPatterns: string[][];

    constructor() {
        this.chooseLettersProbas();
        this.syllabes = this.generateCommonSyllabes(this.types);
        this.wordPatterns = this.types.map(t => this.generateWordPatterns());
    }

    chooseLettersProbas(): void {
        let con = allConsonants.map(c => c);
        const vow = allVowels.map(c => c);
        // do we use special consonants ?
        if (Math.random() < 0.1) {
            con = con.concat(diacConsonants);
        }
        // use som diacritics vowels
        const nbDiacVowels = Math.floor(Math.random() * NUM_MAX_DIAC_VOWELS);
        for (let n = 0; n < nbDiacVowels; n++) {
            vow.push(Util.randomInArray(diacVowels));
        }

        // only use 80% of consonents
        for (let n = 0; n < allConsonants.length - 6; n++) {
            const c = Util.randomInArray(con);
            con.splice(con.indexOf(c), 1);
            this.consonantProbas.set(c, n * 3);
        }
        // only use 50% of vowels
        for (let n = 0; n < allVowels.length - 2; n++) {
            const v = Util.randomInArray(vow);
            vow.splice(vow.indexOf(v), 1);
            this.vowelProbas.set(v, n * 3);
        }
    }

    generateCommonSyllabes(types: string[]): Map<string, number>[] {
        const syll: string[] = [];
        for (let n = 0; n < NUM_COMMON_SYLLABE; n++) {
            let s = '';
            // choose one pattern at random
            const pattern = Util.randomInArray(syllabePatterns);
            pattern.split('').forEach(l => {
                if (l === 'c') {
                    s += Util.randomInWeightedMap(this.consonantProbas);
                } else {
                    s += Util.randomInWeightedMap(this.vowelProbas);
                }
            });
            syll.push(s);
        }
        // choose some at random in each type
        return types.map(t => {
            const s = new Map<string, number>();
            for (let n = 0; n < NUM_COMMON_SYLLABE * 3 / 4; n++) {
                s.set(Util.randomInArray(syll), n);
            }
            return s;
        });
    }

    generateWordPatterns(): string[] {
        const pat: string[] = [];
        for (let n = 0; n < NUM_WORD_PATTERNS; n++) {
            pat.push(Util.randomInArray(wordPatterns));
        }
        return pat;
    }

    generateName(type: 'city' | 'river' | 'firstName' | 'lastName'): string {
        const wp = this.wordPatterns[this.types.indexOf(type)];
        const sy = this.syllabes[this.types.indexOf(type)];
        const pattern = Util.randomInArray(wp);
        return this.capitalize(pattern.split('').map(s => {
            if (s === 'w') {
                // a word is 1-4 syllabes
                const nbSyl = Math.floor(Math.random() * 2) + 1;
                let group = '';
                for (let ns = 0; ns < nbSyl; ns++) {
                    group += Util.randomInWeightedMap(sy);
                }
                return group;
            } else {
                return s;
            }
        }).join(''));
    }

    capitalize(str: string): string {
        return str.replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
    }

}
