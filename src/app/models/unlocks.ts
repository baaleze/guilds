export class Unlocks {
    public perdoAccess = false;
    public creoAccess = false;
    public mutoAccess = false;
    public regoAccess = false;
    public intellegoAccess = false;

    public terramAccess = false;
    public auramAccess = false;
    public ignemAccess = false;
    public aquamAccess = false;
    public corpusAccess = false;
    public herbamAccess = false;
    public animalAccess = false;
    public mentemAccess = false;
    public imaginemAccess = false;
    public vimAccess = false;

    public verbAccess(): boolean {
        return this.perdoAccess || this.creoAccess || this.mutoAccess || this.regoAccess || this.intellegoAccess;
    }

    public formAccess(): boolean {
        return this.terramAccess || this.auramAccess || this.ignemAccess || this.aquamAccess || this.animalAccess 
            || this.corpusAccess || this.herbamAccess || this.mentemAccess || this.imaginemAccess || this.vimAccess;
    }
}
