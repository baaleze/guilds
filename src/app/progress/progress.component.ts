import { Component, OnInit } from '@angular/core';
import { NotifyService } from '../notify.service';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class ProgressComponent implements OnInit {

  text: string;

  constructor(private notify: NotifyService) {
    this.notify.message.subscribe(s => this.text = s);
  }

  ngOnInit(): void {}

}
