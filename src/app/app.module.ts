import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WorldgenService } from './generation/worldgen.service';
import { InfoComponent } from './info/info.component';
import { StockComponent } from './stock/stock.component';
import { AstarService } from './generation/astar.service';
import { NotifyService } from './notify.service';
import { ProgressComponent } from './progress/progress.component';

@NgModule({
  declarations: [
    AppComponent,
    InfoComponent,
    StockComponent,
    ProgressComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    WorldgenService,
    AstarService,
    NotifyService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
