import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { Target, IndustryName, Industry, City, Resource, allResources } from '../model/models';
import { Util } from '../util';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit, OnChanges {

  @Input() city: City;
  res = allResources;

  constructor() { }

  ngOnInit(): void {}

  ngOnChanges(changes: any): void{}

  getIndustry(name: IndustryName): Industry {
    return Industry.industries.get(name);
  }

  getResourceName(r: Resource): string {
    return Resource[r];
  }

  getMag(): number {
    return Util.getMag(this.city.population);
  }

}
