import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InfoComponent } from './info/info.component';
import { NotifyService } from './notify.service';
import { ProgressComponent } from './progress/progress.component';
import { DrawService } from './draw.service';

@NgModule({
  declarations: [
    AppComponent,
    InfoComponent,
    ProgressComponent
  ],
  imports: [
    FormsModule,
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    NotifyService,
    DrawService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
