import { Component } from '@angular/core';
import { StateService } from './state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  
  constructor(private state: StateService) {}

  public quest1Complete() {
    return this.state.gameState.quest1.isComplete();
  }

}
