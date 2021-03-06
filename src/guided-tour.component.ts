import { AfterViewInit, Component, ElementRef, ViewChild, ViewEncapsulation, Input, OnDestroy } from '@angular/core';
import { Orientation, TourStep } from './guided-tour.constants';
import { GuidedTourService } from './guided-tour.service';
import { fromEvent, Subscription } from 'rxjs';

@Component({
    selector: 'ngx-guided-tour',
    template: `
        <div *ngIf="currentTourStep && selectedElementRect && isOrbShowing"
                (mouseenter)="handleOrb()"
                class="tour-orb tour-{{ currentTourStep.orientation }}"
                [style.top.px]="orbTopPosition"
                [style.left.px]="orbLeftPosition"
                [style.transform]="orbTransform">
                <div class="tour-orb-ring"></div>
        </div>
        <div *ngIf="currentTourStep && !isOrbShowing">
            <div class="guided-tour-user-input-mask" (click)="preventBackdropClick($event)"></div>
            <div class="guided-tour-spotlight-overlay"
                [style.top.px]="overlayTop"
                [style.left.px]="overlayLeft"
                [style.height.px]="overlayHeight"
                [style.width.px]="overlayWidth">
            </div>
        </div>
        <div *ngIf="currentTourStep && !isOrbShowing">
            <div #tourStep *ngIf="currentTourStep"
                class="tour-step tour-{{ currentTourStep.orientation }}"
                [ngClass]="{
                    'page-tour-step': !currentTourStep.selector
                }"
                [style.top.px]="(currentTourStep.selector && selectedElementRect ? topPosition : null)"
                [style.left.px]="(currentTourStep.selector && selectedElementRect ? leftPosition : null)"
                [style.width.px]="(currentTourStep.selector && selectedElementRect ? tourStepWidth : null)"
                [style.transform]="(currentTourStep.selector && selectedElementRect ? transform : null)">
                <div *ngIf="currentTourStep.selector" class="tour-arrow"></div>
                <div class="tour-block">
                    <h3 class="tour-title" *ngIf="currentTourStep.title && currentTourStep.selector">
                        {{ currentTourStep.title }}
                    </h3>
                    <h2 class="tour-title" *ngIf="currentTourStep.title && !currentTourStep.selector">
                        {{ currentTourStep.title }}
                    </h2>
                    <div class="tour-content" [innerHTML]="currentTourStep.content"></div>
                    <div class="tour-buttons">
                        <button (click)="guidedTourService.skipTour()"
                            class="skip-button link-button">
                            Skip
                        </button>
                        <button *ngIf="!guidedTourService.onLastStep"
                            class="next-button"
                            (click)="guidedTourService.nextStep()">
                            Next&nbsp;&nbsp;{{ guidedTourService.currentTourStepDisplay }}/{{ guidedTourService.currentTourStepCount }}
                        </button>
                        <button *ngIf="guidedTourService.onLastStep"
                            class="next-button"
                            (click)="guidedTourService.nextStep()">
                            Done
                        </button>
                        <button *ngIf="!guidedTourService.onFirstStep"
                            class="back-button link-button"
                            (click)="guidedTourService.backStep()">
                            Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styleUrls: ['./guided-tour.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class GuidedTourComponent implements AfterViewInit, OnDestroy {
    @Input() public topOfPageAdjustment? = 0;
    @Input() public tourStepWidth? = 300;
    @ViewChild('tourStep') public tourStep: ElementRef;
    public highlightPadding = 4;
    public currentTourStep: TourStep = null;
    public selectedElementRect: DOMRect = null;
    public isOrbShowing = false;

    private _announcementsCount = 0;
    private resizeSubscription: Subscription;
    private scrollSubscription: Subscription;

    constructor(
        public guidedTourService: GuidedTourService
    ) { }

    public ngAfterViewInit(): void {
        this.guidedTourService.guidedTourCurrentStepStream.subscribe((step: TourStep) => {
            this.currentTourStep = step;
            if (step && step.selector) {
                const selectedElement = document.querySelector(step.selector);
                if (selectedElement) {
                    this.scrollToAndSetElement();
                } else {
                    this.selectedElementRect = null;
                }
            } else {
                this.selectedElementRect = null;
            }
        });

        this.guidedTourService.guidedTourOrbShowingStream.subscribe((value: boolean) => {
            this.isOrbShowing = value;
        });

        this.resizeSubscription = fromEvent(window, 'resize').subscribe(() => {
            this.updateStepLocation();
        });

        this.scrollSubscription = fromEvent(window, 'scroll').subscribe(() => {
            this.updateStepLocation();
        });
    }

    public ngOnDestroy(): void {
        this.resizeSubscription.unsubscribe();
        this.scrollSubscription.unsubscribe();
    }

    public scrollToAndSetElement(): void {
        this.updateStepLocation();
        // Allow things to render to scroll to the correct location
        setTimeout(() => {
            if (!this.isOrbShowing && !this.isTourOnScreen()) {
                if (this.selectedElementRect && this.isBottom()) {
                    // Scroll so the element is on the top of the screen.
                    window.scrollTo({
                        left: null,
                        top: ((window.scrollY + this.selectedElementRect.top) - this.topOfPageAdjustment)
                        - (this.currentTourStep.scrollAdjustment ? this.currentTourStep.scrollAdjustment : 0),
                        behavior: 'smooth'
                    });
                } else {
                    // Scroll so the element is on the bottom of the screen.
                    window.scrollTo({
                        left: null,
                        top: (window.scrollY + this.selectedElementRect.top + this.selectedElementRect.height)
                        - window.innerHeight
                        + (this.currentTourStep.scrollAdjustment ? this.currentTourStep.scrollAdjustment : 0),
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    public handleOrb(): void {
        this.guidedTourService.activateOrb();
        if (this.currentTourStep && this.currentTourStep.selector) {
            this.scrollToAndSetElement();
        }
    }

    private isTourOnScreen(): boolean {
        return this.tourStep
            && this.elementInViewport(document.querySelector(this.currentTourStep.selector))
            && this.elementInViewport(this.tourStep.nativeElement);
    }

    // Modified from https://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
    private elementInViewport(element: HTMLElement): boolean {
        let top = element.offsetTop;
        const height = element.offsetHeight;

        while (element.offsetParent) {
            element = (element.offsetParent as HTMLElement);
            top += element.offsetTop;
        }
        if (this.isBottom()) {
            return (
                top >= (window.pageYOffset + this.topOfPageAdjustment + (this.currentTourStep.scrollAdjustment ? this.currentTourStep.scrollAdjustment : 0))
                && (top + height) <= (window.pageYOffset + window.innerHeight)
            );
        } else {
            return (
                top >= (window.pageYOffset + this.topOfPageAdjustment)
                && (top + height + (this.currentTourStep.scrollAdjustment ? this.currentTourStep.scrollAdjustment : 0)) <= (window.pageYOffset + window.innerHeight)
            );
        }
    }

    public preventBackdropClick(event: Event): void {
        event.stopPropagation();
    }

    public updateStepLocation(): void {
        if (this.currentTourStep && this.currentTourStep.selector) {
            const selectedElement = document.querySelector(this.currentTourStep.selector);
            if (selectedElement) {
                this.selectedElementRect = (selectedElement.getBoundingClientRect() as DOMRect);
            } else {
                this.selectedElementRect = null;
            }
        } else {
            this.selectedElementRect = null;
        }
    }

    private isBottom(): boolean {
        return this.currentTourStep.orientation
            && (this.currentTourStep.orientation === Orientation.Bottom
            || this.currentTourStep.orientation === Orientation.BottomLeft
            || this.currentTourStep.orientation === Orientation.BottomRight);
    }

    public get topPosition(): number {
        const paddingAdjustment = this.currentTourStep.useHighlightPadding ? this.highlightPadding : 0;
        if (this.isBottom()) {
            return this.selectedElementRect.top + this.selectedElementRect.height + paddingAdjustment;
        }

        return this.selectedElementRect.top - paddingAdjustment;
    }

    public get orbTopPosition(): number {
        if (this.isBottom()) {
            return this.selectedElementRect.top + this.selectedElementRect.height;
        }

        if (
            this.currentTourStep.orientation === Orientation.Right
            || this.currentTourStep.orientation === Orientation.Left
        ) {
            return (this.selectedElementRect.top + (this.selectedElementRect.height / 2));
        }

        return this.selectedElementRect.top;
    }

    public get leftPosition(): number {
        const paddingAdjustment = this.currentTourStep.useHighlightPadding ? this.highlightPadding : 0;
        if (
            this.currentTourStep.orientation === Orientation.TopRight
            || this.currentTourStep.orientation === Orientation.BottomRight
        ) {
            return (this.selectedElementRect.right - this.tourStepWidth);
        }

        if (
            this.currentTourStep.orientation === Orientation.TopLeft
            || this.currentTourStep.orientation === Orientation.BottomLeft
        ) {
            return (this.selectedElementRect.left);
        }

        if (this.currentTourStep.orientation === Orientation.Left) {
            return (this.selectedElementRect.left - this.tourStepWidth - paddingAdjustment);
        }

        if (this.currentTourStep.orientation === Orientation.Right) {
            return (this.selectedElementRect.left + this.selectedElementRect.width + paddingAdjustment);
        }

        return (this.selectedElementRect.right - (this.selectedElementRect.width / 2) - (this.tourStepWidth / 2));
    }

    public get orbLeftPosition(): number {
        if (
            this.currentTourStep.orientation === Orientation.TopRight
            || this.currentTourStep.orientation === Orientation.BottomRight
        ) {
            return this.selectedElementRect.right;
        }

        if (
            this.currentTourStep.orientation === Orientation.TopLeft
            || this.currentTourStep.orientation === Orientation.BottomLeft
        ) {
            return this.selectedElementRect.left;
        }

        if (this.currentTourStep.orientation === Orientation.Left) {
            return this.selectedElementRect.left;
        }

        if (this.currentTourStep.orientation === Orientation.Right) {
            return (this.selectedElementRect.left + this.selectedElementRect.width);
        }

        return (this.selectedElementRect.right - (this.selectedElementRect.width / 2));
    }

    public get transform(): string {
        if (
            !this.currentTourStep.orientation
            || this.currentTourStep.orientation === Orientation.Top
            || this.currentTourStep.orientation === Orientation.TopRight
            || this.currentTourStep.orientation === Orientation.TopLeft
        ) {
            return 'translateY(-100%)';
        }
        return null;
    }

    public get orbTransform(): string {
        if (
            !this.currentTourStep.orientation
            || this.currentTourStep.orientation === Orientation.Top
            || this.currentTourStep.orientation === Orientation.Bottom
            || this.currentTourStep.orientation === Orientation.TopLeft
            || this.currentTourStep.orientation === Orientation.BottomLeft
        ) {
            return 'translateY(-50%)';
        }

        if (
            this.currentTourStep.orientation === Orientation.TopRight
            || this.currentTourStep.orientation === Orientation.BottomRight
        ) {
            return 'translate(-100%, -50%)';
        }

        if (
            this.currentTourStep.orientation === Orientation.Right
            || this.currentTourStep.orientation === Orientation.Left
        ) {
            return 'translate(-50%, -50%)';
        }

        return null;
    }

    public get overlayTop(): number {
        if (this.selectedElementRect) {
            return this.currentTourStep.useHighlightPadding ? this.selectedElementRect.top - this.highlightPadding : this.selectedElementRect.top;
        }
        return 0;
    }

    public get overlayLeft(): number {
        if (this.selectedElementRect) {
            return this.currentTourStep.useHighlightPadding ? this.selectedElementRect.left - this.highlightPadding : this.selectedElementRect.left;
        }
        return 0;
    }

    public get overlayHeight(): number {
        if (this.selectedElementRect) {
            return this.currentTourStep.useHighlightPadding ? this.selectedElementRect.height + (this.highlightPadding * 2) : this.selectedElementRect.height;
        }
        return 0;
    }

    public get overlayWidth(): number {
        if (this.selectedElementRect) {
            return this.currentTourStep.useHighlightPadding ? this.selectedElementRect.width + (this.highlightPadding * 2) : this.selectedElementRect.width;
        }
        return 0;
    }
}
