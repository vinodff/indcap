/**
 * Motion primitive type contracts.
 *
 * Every primitive is a pure function:
 *   (pc: PrimitiveContext, params: PrimitiveParams) => void
 *
 * It draws onto `pc.ctx` whatever it wants to show at progress `pc.t01` (0..1)
 * within a beat of total duration `pc.durationSec`. No state, no side effects,
 * no async work — the renderer calls it once per frame, time-driven.
 */

import type { PaletteColors } from './palettes';
import type { PrimitiveType, Palette } from '../motionGraphicsService';

export type Anchor = 'top' | 'center' | 'bottom' | 'left' | 'right';

export interface PrimitiveParams {
  text?: string;
  icon?: string;
  palette: Palette;
  customColors?: string[];
  anchor?: Anchor;
  intensity: 1 | 2 | 3;
}

export interface PrimitiveContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  t01: number;
  durationSec: number;
  palette: PaletteColors;
}

export type PrimitiveRenderer = (pc: PrimitiveContext, params: PrimitiveParams) => void;

export type PrimitivesRegistry = Record<PrimitiveType, PrimitiveRenderer>;
