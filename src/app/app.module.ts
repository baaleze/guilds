import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InfoComponent } from './info/info.component';
import { DrawService } from './draw/draw.service';

@NgModule({
  declarations: [
    AppComponent,
    InfoComponent
  ],
  imports: [
    FormsModule,
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    DrawService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
