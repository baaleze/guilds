import { Component, OnInit, Input } from '@angular/core';
import { ResourceStock, Resource } from '../model/models';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent implements OnInit {

  @Input() resources: ResourceStock[];

  constructor() { }

  ngOnInit(): void {
  }

  getResourceName(r: Resource): string {
    return Resource[r];
  }

}
