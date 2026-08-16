import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'gd-registrations-page',
  imports: [RouterOutlet],
  templateUrl: './registrations-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationsPage {}
