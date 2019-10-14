import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { VisComponent } from './components/vis/vis.component';
import { MainComponent } from './components/main/main.component';
import { Quest1Component } from './components/quest1/quest1.component';

@NgModule({
  declarations: [
    AppComponent,
    VisComponent,
    MainComponent,
    Quest1Component
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
