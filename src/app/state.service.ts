import { Injectable } from '@angular/core';
import { GameState } from './models/gamestate';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  gameState: GameState;

  constructor() {
    this.gameState = new GameState();
  }
}
