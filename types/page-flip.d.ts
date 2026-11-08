// page-flip 2.0.7 ships no declarations; narrow contract used by this reader.
declare module "page-flip" {
  export class PageFlip {
    constructor(element: HTMLElement, settings: {
      width: number; height: number; size: "fixed"; usePortrait: boolean;
      showCover: boolean; autoSize: boolean; flippingTime: number;
      maxShadowOpacity: number; mobileScrollSupport: boolean;
      useMouseEvents: boolean; clickEventForward: boolean;
      disableFlipByClick: boolean; swipeDistance: number; startPage: number;
    });
    on(event: "flip", callback: (event: { data: number }) => void): void;
    on(event: "changeState", callback: (event: { data: string }) => void): void;
    loadFromHTML(elements: HTMLElement[]): void;
    turnToPage(index: number): void;
    flipNext(): void;
    flipPrev(): void;
    destroy(): void;
  }
}
