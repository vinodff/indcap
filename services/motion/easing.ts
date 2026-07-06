/**
 * Easing primitives. All take t in [0,1] and return eased value, usually in [0,1]
 * (springs and back curves can overshoot — intentional).
 */

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInCubic = (t: number): number => t * t * t;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export const easeOutBack = (t: number, overshoot = 1.70158): number => {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeOutElastic = (t: number): number => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/** Symmetric pulse: 0 -> 1 -> 0 over [0,1]. */
export const pulse = (t: number): number => Math.sin(t * Math.PI);

/** Linear interpolate scalar. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Clamp t into [0,1]. */
export const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/** Map t from [a,b] to [0,1], clamped. */
export const remap = (t: number, a: number, b: number): number => {
  if (b === a) return 0;
  return clamp01((t - a) / (b - a));
};
