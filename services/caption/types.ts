import { Caption, StyleConfig, RendererState } from '../../types';

export interface RenderHelpers {
  setFont(ctx: CanvasRenderingContext2D, fontStr: string): void;
  getMixedTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number): number;
  drawMixedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    fill: string | CanvasGradient,
    x: number,
    y: number,
    isStroke?: boolean
  ): void;
  getOrLoadImage(url: string): HTMLImageElement;
  applyGradientFill(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    colors: string[]
  ): CanvasGradient;
  applyShadow(
    ctx: CanvasRenderingContext2D,
    style: { shadowColor?: string; shadowBlur?: number; shadowOffsetX?: number; shadowOffsetY?: number },
    scaleFactor: number
  ): void;
  applyStroke(
    ctx: CanvasRenderingContext2D,
    style: { strokeColor?: string; strokeWidth?: number },
    scaleFactor: number,
    text: string,
    fontSize: number
  ): void;
}
