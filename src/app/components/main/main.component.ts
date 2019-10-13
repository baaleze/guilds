import { Component, OnInit } from '@angular/core';
import { StateService } from 'src/app/state.service';
import { Quest } from 'src/app/models/quest';
import * as steps from 'src/app/models/queststep';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  QuestStep = steps.QuestStep;
  quest: Quest;

  constructor(private state: StateService) {
    this.quest = state.gameState.currentQuest;
  }

  ngOnInit() {
  }

}
