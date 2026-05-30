/**
 * iconRenderer — synchronous Lucide icon → canvas via Path2D.
 *
 * Each icon's __iconNode array (SVG path d-strings + element types) is
 * imported from the individual icon file — NOT the barrel export — so
 * tree-shaking keeps the bundle to only the 15 icons we actually use.
 *
 * Path2D objects are built ONCE at module-load time and stored in
 * PATH2D_CACHE. NEVER call buildIconPaths() inside a render function
 * — that would reconstruct Path2D at 60fps and cause frame drops.
 */

// Named imports from individual files — never import from 'lucide-react' barrel
// @ts-ignore — lucide internal dist files, not in public types
import { __iconNode as _zapNode }      from 'lucide-react/dist/esm/icons/zap.js';
// @ts-ignore
import { __iconNode as _starNode }     from 'lucide-react/dist/esm/icons/star.js';
// @ts-ignore
import { __iconNode as _flameNode }    from 'lucide-react/dist/esm/icons/flame.js';
// @ts-ignore
import { __iconNode as _sparklesNode } from 'lucide-react/dist/esm/icons/sparkles.js';
// @ts-ignore
import { __iconNode as _rocketNode }   from 'lucide-react/dist/esm/icons/rocket.js';
// @ts-ignore
import { __iconNode as _terminalNode } from 'lucide-react/dist/esm/icons/terminal.js';
// @ts-ignore
import { __iconNode as _musicNode }    from 'lucide-react/dist/esm/icons/music-2.js';
// @ts-ignore
import { __iconNode as _activityNode } from 'lucide-react/dist/esm/icons/activity.js';
// @ts-ignore
import { __iconNode as _hexagonNode }  from 'lucide-react/dist/esm/icons/hexagon.js';
// @ts-ignore
import { __iconNode as _zapOffNode }   from 'lucide-react/dist/esm/icons/zap-off.js';
// @ts-ignore
import { __iconNode as _diamondNode }  from 'lucide-react/dist/esm/icons/diamond.js';
// @ts-ignore
import { __iconNode as _radioNode }    from 'lucide-react/dist/esm/icons/radio.js';
// @ts-ignore
import { __iconNode as _wifiOffNode }  from 'lucide-react/dist/esm/icons/wifi-off.js';
// @ts-ignore
import { __iconNode as _tvNode }       from 'lucide-react/dist/esm/icons/tv.js';
// @ts-ignore
import { __iconNode as _alertNode }    from 'lucide-react/dist/esm/icons/triangle-alert.js';
// @ts-ignore
import { __iconNode as _checkNode }    from 'lucide-react/dist/esm/icons/check.js';

type IconNodeEntry = [string, Record<string, string>];
type IconNodes = IconNodeEntry[];

const ICON_REGISTRY: Record<string, IconNodes> = {
  zap:       _zapNode,
  star:      _starNode,
  flame:     _flameNode,
  sparkles:  _sparklesNode,
  rocket:    _rocketNode,
  terminal:  _terminalNode,
  music:     _musicNode,
  activity:  _activityNode,
  hexagon:   _hexagonNode,
  'zap-off': _zapOffNode,
  diamond:   _diamondNode,
  radio:     _radioNode,
  'wifi-off':_wifiOffNode,
  tv:        _tvNode,
  alert:     _alertNode,
  check:     _checkNode,
};

// ── Build Path2D at module import (ONCE, synchronous) ────────────────
// These live forever in module scope. Primitives read them each frame — O(1).
const PATH2D_CACHE: Record<string, Path2D[]> = {};

function buildIconPaths(nodes: IconNodes): Path2D[] {
  const paths: Path2D[] = [];
  for (const [tag, attrs] of nodes) {
    try {
      if (tag === 'path' && attrs.d) {
        paths.push(new Path2D(attrs.d));
      } else if (tag === 'circle') {
        const p = new Path2D();
        p.arc(+(attrs.cx ?? 12), +(attrs.cy ?? 12), +(attrs.r ?? 4), 0, Math.PI * 2);
        paths.push(p);
      } else if (tag === 'line') {
        const p = new Path2D();
        p.moveTo(+(attrs.x1 ?? 0), +(attrs.y1 ?? 0));
        p.lineTo(+(attrs.x2 ?? 0), +(attrs.y2 ?? 0));
        paths.push(p);
      } else if (tag === 'polyline' && attrs.points) {
        const p = new Path2D();
        const pts = attrs.points.trim().split(/[\s,]+/).map(Number);
        for (let i = 0; i < pts.length; i += 2) {
          if (i === 0) p.moveTo(pts[0], pts[1]);
          else p.lineTo(pts[i], pts[i + 1]);
        }
        paths.push(p);
      } else if (tag === 'rect') {
        const p = new Path2D();
        const x = +(attrs.x ?? 0), y = +(attrs.y ?? 0);
        const w = +(attrs.width ?? 0), h = +(attrs.height ?? 0);
        p.rect(x, y, w, h);
        paths.push(p);
      }
    } catch (_) { /* skip malformed node */ }
  }
  return paths;
}

// Safe init — if Path2D isn't available (old env), silently skip
try {
  for (const [name, nodes] of Object.entries(ICON_REGISTRY)) {
    PATH2D_CACHE[name] = buildIconPaths(nodes);
  }
} catch (_) { /* Path2D unavailable — drawLucideIcon becomes a no-op */ }

// ── Public draw API ──────────────────────────────────────────────────

export interface IconDrawOpts {
  /** Fill the paths (default: false — icons are stroked) */
  fill?: boolean;
  /** Stroke the paths (default: true) */
  stroke?: boolean;
  /** Stroke width in 24px viewBox units (default: 2) */
  strokeWidth?: number;
  /** Composite alpha (default: 1) */
  alpha?: number;
  /** Glow shadow color */
  glowColor?: string;
  /** Glow shadow blur in 24px viewBox units */
  glowBlur?: number;
}

/**
 * Draw a Lucide icon centered at (cx, cy) at the given pixel size.
 * Synchronous. Safe to call at 60fps — reads pre-built Path2D from cache.
 * Unknown iconName → silent no-op, never throws.
 */
export function drawLucideIcon(
  ctx: CanvasRenderingContext2D,
  iconName: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
  opts: IconDrawOpts = {},
): void {
  const paths = PATH2D_CACHE[iconName];
  if (!paths || paths.length === 0) return;

  const {
    fill = false,
    stroke = true,
    strokeWidth = 2,
    alpha = 1,
    glowColor,
    glowBlur,
  } = opts;

  ctx.save();
  ctx.globalAlpha = alpha;
  // Transform: move origin to top-left of icon, scale 24px viewBox → size px
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = strokeWidth; // already in viewBox space

  if (glowColor && glowBlur) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }

  for (const path of paths) {
    if (stroke) { ctx.strokeStyle = color; ctx.stroke(path); }
    if (fill)   { ctx.fillStyle = color;   ctx.fill(path); }
  }

  ctx.restore();
}

export const AVAILABLE_ICONS = Object.keys(ICON_REGISTRY);
