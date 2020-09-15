import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { Target, City, Faction } from '../model/models';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit, OnChanges {

  @Input() target: Target;
  type: 'city' | 'faction' | 'people';

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: any): void{
    if (changes.target) {
      this.type =
        (this.target instanceof City) ? 'city' :
        (this.target instanceof Faction) ? 'faction' :
        'people';
    }
  }

}
