import { Component, OnInit, Input } from '@angular/core';
import { Vis } from 'src/app/models/vis';
import { StateService } from 'src/app/state.service';
import { Unlocks } from 'src/app/models/unlocks';

@Component({
  selector: 'app-vis',
  templateUrl: './vis.component.html',
  styleUrls: ['./vis.component.scss']
})
export class VisComponent implements OnInit {

  // for template access
  public allVis = Vis.allVis;
  public vis: Vis;
  public unlocks: Unlocks;
  public productions;

  constructor(state: StateService) {
    this.vis = state.gameState.vis;
    this.unlocks = state.gameState.unlocks;
    this.productions = state.gameState.vis.productions;
  }

  ngOnInit() {
  }

}
