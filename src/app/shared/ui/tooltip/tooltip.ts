import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

let nextTooltipId = 0;

type TooltipWidth = 'auto' | 'narrow';

@Component({
  selector: 'gd-tooltip',
  templateUrl: './tooltip.html',
  host: {
    class: 'group relative inline-flex overflow-visible hover:z-[1000] focus-within:z-[1000]',
    tabindex: '0',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-describedby]': 'tooltipId',
    '(mouseenter)': 'showOverlay()',
    '(mouseleave)': 'hideOverlay()',
    '(focusin)': 'showOverlay()',
    '(focusout)': 'handleFocusOut($event)',
    '(pointerdown)': 'handlePointerDown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tooltip {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly tooltipTemplate = viewChild.required<TemplateRef<unknown>>('tooltipTemplate');
  private overlayRef: OverlayRef | null = null;

  readonly ariaLabel = input.required<string>();
  readonly content = input.required<string>();
  readonly width = input<TooltipWidth>('auto');
  readonly useOverlay = input(false);

  protected readonly tooltipId = `gd-tooltip-${nextTooltipId++}`;
  protected readonly tooltipClasses = computed(() => {
    const base = 'pointer-events-none rounded-app border border-border bg-surface px-3 py-2 text-center text-xs font-medium leading-5 text-text-primary shadow-soft';
    const width = this.width() === 'narrow'
      ? 'w-64 max-w-[calc(100vw-2rem)] whitespace-normal'
      : 'w-max max-w-[calc(100vw-2rem)] whitespace-pre-line';

    if (this.useOverlay()) {
      return `${base} ${width}`;
    }

    return [
      'invisible absolute bottom-full left-1/2 z-[1000] mb-2 -translate-x-1/2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100',
      base,
      width,
    ].join(' ');
  });

  protected showOverlay(): void {
    if (!this.useOverlay() || this.overlayRef?.hasAttached()) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -8,
        },
        {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: 8,
        },
        {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
          offsetY: -8,
        },
        {
          originX: 'end',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'bottom',
          offsetY: -8,
        },
      ])
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(8);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: 'gd-tooltip-overlay-pane',
    });
    this.overlayRef.attach(new TemplatePortal(this.tooltipTemplate(), this.viewContainerRef));
  }

  protected hideOverlay(): void {
    if (!this.useOverlay()) return;

    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  protected handleFocusOut(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !this.elementRef.nativeElement.contains(relatedTarget)) {
      this.hideOverlay();
    }
  }

  protected handlePointerDown(event: PointerEvent): void {
    if (!this.useOverlay() || event.pointerType !== 'touch') return;

    if (this.overlayRef?.hasAttached()) {
      this.hideOverlay();
    } else {
      this.showOverlay();
    }
  }

  ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }
}
