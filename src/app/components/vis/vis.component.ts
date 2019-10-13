import { Component, OnInit, Input } from '@angular/core';
import { Vis } from 'src/app/models/vis';
import { StateService } from 'src/app/state.service';

@Component({
  selector: 'app-vis',
  templateUrl: './vis.component.html',
  styleUrls: ['./vis.component.scss']
})
export class VisComponent implements OnInit {

  // for template access
  allVis = Vis.allVis;
  vis: Vis;

  constructor(state: StateService) {
    this.vis = state.gameState.vis;
  }

  ngOnInit() {
  }

}
