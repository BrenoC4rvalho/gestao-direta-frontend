import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DesktopSidebar } from '../desktop-sidebar/desktop-sidebar';
import { MobileHeader } from '../mobile-header/mobile-header';

@Component({
  selector: 'gd-app-layout',
  imports: [DesktopSidebar, MobileHeader, RouterOutlet],
  templateUrl: './app-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {}
