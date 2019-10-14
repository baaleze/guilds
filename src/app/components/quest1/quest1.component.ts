import { Component, OnInit } from '@angular/core';
import { Quest } from 'src/app/models/quest';
import * as steps from 'src/app/models/queststepenum';
import { StateService } from 'src/app/state.service';

@Component({
  selector: 'app-quest1',
  templateUrl: './quest1.component.html',
  styleUrls: ['./quest1.component.scss']
})
export class Quest1Component implements OnInit {

  QuestStep = steps.QuestStepEnum;
  quest: Quest;

  constructor(private state: StateService) {
    this.quest = state.gameState.quest1;
  }

  ngOnInit() {
  }

  public advance(...params: any[]) {
    this.quest.nextStep(this.state.gameState, params);
  }

}
