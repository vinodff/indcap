/**
 * math3d.ts — Lightweight software 3D engine for Canvas 2D rendering.
 *
 * Provides Vec3, Mat4 (row-major), perspective & lookAt matrices,
 * point projection, and a CameraState helper used by all 3D primitives.
 *
 * Coordinate system: right-handed, Y-up.
 * Camera looks down the -Z axis.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vec3 { x: number; y: number; z: number; }
export interface Vec4 { x: number; y: number; z: number; w: number; }

/** Row-major 4×4 matrix (index [row*4 + col]). */
export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export interface ScreenPoint {
  x: number;     // screen X
  y: number;     // screen Y
  depth: number; // view-space Z (negative = in front of camera)
  scale: number; // perspective scale = 1 / (-depth); use for size scaling
}

export interface CameraState {
  eye: Vec3;
  target: Vec3;
  up: Vec3;
  fovRad: number;
  near: number;
  far: number;
  roll: number; // roll angle in radians (dutch tilt)
}

// ─── Vec3 Operations ──────────────────────────────────────────────────────────

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const v3Add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const v3Sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const v3Scale = (v: Vec3, s: number): Vec3 => ({ x: v.x * s, y: v.y * s, z: v.z * s });
export const v3Dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const v3Cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const v3Length = (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
export const v3Normalize = (v: Vec3): Vec3 => {
  const l = v3Length(v);
  return l > 1e-9 ? v3Scale(v, 1 / l) : { x: 0, y: 0, z: 0 };
};
export const v3Lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
  v3Add(v3Scale(a, 1 - t), v3Scale(b, t));

/** Rotate v around the Y axis by angle (radians). */
export const v3RotateY = (v: Vec3, angle: number): Vec3 => ({
  x:  v.x * Math.cos(angle) + v.z * Math.sin(angle),
  y:  v.y,
  z: -v.x * Math.sin(angle) + v.z * Math.cos(angle),
});

// ─── Mat4 Operations ─────────────────────────────────────────────────────────

export const mat4Identity = (): Mat4 => [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

/** Multiply two row-major 4×4 matrices: result = a × b. */
export const mat4Mul = (a: Mat4, b: Mat4): Mat4 => {
  const r: Mat4 = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      r[row * 4 + col] =
        a[row * 4 + 0] * b[0 * 4 + col] +
        a[row * 4 + 1] * b[1 * 4 + col] +
        a[row * 4 + 2] * b[2 * 4 + col] +
        a[row * 4 + 3] * b[3 * 4 + col];
    }
  }
  return r;
};

/** Transform a point (w=1) through a row-major Mat4. Returns Vec4. */
export const transformPoint = (m: Mat4, v: Vec3): Vec4 => ({
  x: m[0]*v.x + m[1]*v.y + m[2]*v.z + m[3],
  y: m[4]*v.x + m[5]*v.y + m[6]*v.z + m[7],
  z: m[8]*v.x + m[9]*v.y + m[10]*v.z + m[11],
  w: m[12]*v.x + m[13]*v.y + m[14]*v.z + m[15],
});

// ─── Camera Matrices ──────────────────────────────────────────────────────────

/**
 * Perspective projection matrix (row-major, right-handed, maps to NDC [-1,1]).
 * Clip.w = -viewZ, so objects with viewZ < 0 (in front) have w > 0.
 */
export const perspectiveMatrix = (
  fovRad: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 => {
  const f = 1.0 / Math.tan(fovRad * 0.5);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0,                         0,
    0,          f, 0,                         0,
    0,          0, (far + near) * nf,          (2 * far * near) * nf,
    0,          0, -1,                        0,
  ];
};

/**
 * View matrix: lookAt(eye, center, up) — row-major.
 * Transforms world coordinates into camera (view) space.
 */
export const lookAtMatrix = (eye: Vec3, center: Vec3, up: Vec3): Mat4 => {
  const f = v3Normalize(v3Sub(center, eye));       // forward
  const s = v3Normalize(v3Cross(f, up));           // right
  const u = v3Cross(s, f);                         // true up

  return [
     s.x,  s.y,  s.z, -v3Dot(s, eye),
     u.x,  u.y,  u.z, -v3Dot(u, eye),
    -f.x, -f.y, -f.z,  v3Dot(f, eye),
    0,    0,    0,    1,
  ];
};

/** Apply a roll rotation (around local Z / forward axis) to a camera's up vector. */
export const applyRoll = (eye: Vec3, center: Vec3, roll: number): Vec3 => {
  const forward = v3Normalize(v3Sub(center, eye));
  const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
  const right = v3Normalize(v3Cross(forward, worldUp));
  const camUp = v3Cross(right, forward);
  // Rotate camUp around forward by roll
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  return v3Add(v3Scale(camUp, cosR), v3Scale(right, sinR));
};

// ─── Projection ───────────────────────────────────────────────────────────────

/**
 * Project a single world-space point to 2D screen space.
 * Returns null if the point is behind the camera or outside clip space.
 */
export const projectPoint = (
  worldPt: Vec3,
  viewMat: Mat4,
  projMat: Mat4,
  screenW: number,
  screenH: number,
): ScreenPoint | null => {
  // World → view space
  const view = transformPoint(viewMat, worldPt);
  if (view.z >= -0.001) return null; // behind camera or too close

  // View → clip space (perspective divide)
  const w = -view.z; // always positive in front
  // projMat[0] = f/aspect, projMat[5] = f
  const ndcX = (view.x * projMat[0]) / w;
  const ndcY = (view.y * projMat[5]) / w;

  // Discard off-screen points (with a little margin)
  if (ndcX < -1.5 || ndcX > 1.5 || ndcY < -1.5 || ndcY > 1.5) return null;

  // NDC → screen
  const sx = (ndcX * 0.5 + 0.5) * screenW;
  const sy = (1 - (ndcY * 0.5 + 0.5)) * screenH;

  return { x: sx, y: sy, depth: view.z, scale: 1 / w };
};

/**
 * Build a complete camera (view + projection) from a CameraState.
 * Returns { viewMat, projMat } ready for projectPoint().
 */
export const buildCamera = (
  cam: CameraState,
  screenW: number,
  screenH: number,
): { viewMat: Mat4; projMat: Mat4 } => {
  const up = cam.roll !== 0 ? applyRoll(cam.eye, cam.target, cam.roll) : { x: 0, y: 1, z: 0 };
  const viewMat = lookAtMatrix(cam.eye, cam.target, up);
  const aspect = screenW / screenH;
  const projMat = perspectiveMatrix(cam.fovRad, aspect, cam.near, cam.far);
  return { viewMat, projMat };
};

// ─── Default Camera ───────────────────────────────────────────────────────────

export const defaultCamera = (
  eyeZ = 8,
  eyeY = 2.5,
  fovDeg = 60,
): CameraState => ({
  eye:    { x: 0, y: eyeY, z: eyeZ },
  target: { x: 0, y: 0,   z: 0    },
  up:     { x: 0, y: 1,   z: 0    },
  fovRad: (fovDeg * Math.PI) / 180,
  near:   0.1,
  far:    200,
  roll:   0,
});

// ─── Polygon Helpers ─────────────────────────────────────────────────────────

/**
 * Project a triangle of world points, returning screen-space points sorted by depth.
 * Returns null if any point is behind the camera.
 */
export interface Triangle2D {
  pts: [ScreenPoint, ScreenPoint, ScreenPoint];
  avgDepth: number;
}

export const projectTriangle = (
  world: [Vec3, Vec3, Vec3],
  viewMat: Mat4,
  projMat: Mat4,
  sw: number,
  sh: number,
): Triangle2D | null => {
  const a = projectPoint(world[0], viewMat, projMat, sw, sh);
  const b = projectPoint(world[1], viewMat, projMat, sw, sh);
  const c = projectPoint(world[2], viewMat, projMat, sw, sh);
  if (!a || !b || !c) return null;
  return { pts: [a, b, c], avgDepth: (a.depth + b.depth + c.depth) / 3 };
};

/**
 * Compute flat shading brightness for a triangle face.
 * lightDir should be normalized. Returns [0,1].
 */
export const flatShade = (v0: Vec3, v1: Vec3, v2: Vec3, lightDir: Vec3): number => {
  const e1 = v3Sub(v1, v0);
  const e2 = v3Sub(v2, v0);
  const normal = v3Normalize(v3Cross(e1, e2));
  const dot = Math.max(0, v3Dot(normal, lightDir));
  return 0.3 + 0.7 * dot; // ambient 0.3 + diffuse 0.7
};
