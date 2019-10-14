import { Injectable } from '@angular/core';
import { GameState } from './models/gamestate';
import { interval } from 'rxjs';


/**
 * Service that provides/maintains/updates the state of the game.
 */
@Injectable({
  providedIn: 'root'
})
export class StateService {

  gameState: GameState;

  constructor() {
    this.gameState = new GameState();

    // init tick
    interval(10000).subscribe(
      () => this.gameState.tick()
    );
  }
}
