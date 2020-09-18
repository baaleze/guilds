import { Util } from 'src/app/util';

// const allConsonants = 'bcdfghjklmnpqrstvwxyz'.split('');
const allConsonants = 'bcdfghjklmnpqrstvwxz'.split('');
const diacConsonants = 'čçšž'.split('');
// const allVowels = 'aeiouyàéèâêôîûëäïöüòìùỳŷÿãåøæœ'.split('');
const allVowels = 'aeiouy'.split('');
const diacVowels = 'àéèâêôîûëäïöüòìùỳŷÿãåøæœ'.split('');
const syllabePatterns = [
    'v', 'v', 'v', 'cv', 'cv', 'cv', 'cvc', 'cvc', 'cvc', 'ccv', 'ccv',
];
const wordPatterns = [
    'w', 'w', 'w', 'w w', 'w w w', 'w w', 'w', 'w', 'w', 'w-w', 'w-w', 'w w', 'w\'w', 'w\'w', 'w\'w w', 'w-w', 'w-w w', 'w\'w-w', 'w\'w', 'w-w-w', 'ww', 'ww\'w'
];
const NUM_MAX_DIAC_VOWELS = 5;
const NUM_COMMON_SYLLABE = 10;
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
        let vow = allVowels.map(c => c);
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
        for (let n = 0; n < allConsonants.length; n++) {
            const c = Util.randomInArray(con);
            con = con.filter(letter => letter !== c);
            this.consonantProbas.set(c, n * 5);
        }
        // only use 50% of vowels
        for (let n = 0; n < allVowels.length; n++) {
            const v = Util.randomInArray(vow);
            vow = vow.filter(letter => letter !== v);
            this.vowelProbas.set(v, n * 5);
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
                const nbSyl = Math.floor(Math.random() * 3) + 1;
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
