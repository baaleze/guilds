import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotifyService {

  public message = new EventEmitter<string>();

  constructor() { }

  submitProgress(text: string): void {
    console.log(text);
    this.message.emit(text);
  }

}
