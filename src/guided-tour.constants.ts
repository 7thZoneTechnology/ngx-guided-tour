
export interface TourStep {
    /** Selector for element that will be highlighted */
    selector?: string;
    /** Tour title text */
    title?: string;
    /** Tour step text */
    content: string;
    /** Where the tour step will appear next to the selected element */
    orientation?: Orientation;
    /** Action that happens when the step is opened */
    action?: () => void;
    /** Action that happens when the step is closed */
    closeAction?: () => void;
    /** Adds some padding for things like sticky headers when scrolling to an element */
    scrollAdjustment?: number;
    /** Adds default padding around tour highlighting */
    useHighlightPadding?: boolean;
}

export interface GuidedTour {
    /** Identifier for tour */
    tourId: string;
    /** Use orb to start tour */
    useOrb?: boolean;
    /** Steps fo the tour */
    steps: TourStep[];
    /** Function will be called when tour is skipped */
    skipCallback?: (stepSkippedOn: number) => void;
    /** Function will be called when tour is completed */
    completeCallback?: () => void;
}

export class Orientation {
    public static readonly Bottom = 'bottom';
    public static readonly BottomLeft = 'bottom-left';
    public static readonly BottomRight = 'bottom-right';
    public static readonly Center = 'center';
    public static readonly Left = 'left';
    public static readonly Right = 'right';
    public static readonly Top = 'top';
    public static readonly TopLeft = 'top-left';
    public static readonly TopRight = 'top-right';
}
