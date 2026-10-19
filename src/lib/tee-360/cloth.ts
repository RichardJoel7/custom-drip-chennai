// The 360° tee's "breeze": draws a frame with WebGL, letting ripples run through the cloth (from
// the mouse or a finger), the cloth under the pointer get pushed along, and light catch the folds.
// The frame's edges stay put, so it still meets the backdrop with no seam. Settings: TEE_360.waves.

/** At most this many ripples at once (the oldest gives way to the newest). */
export const CLOTH_WAVES = 12;

export interface ClothWave {
  /** Where it started, in picture heights from the frame's top-left corner. */
  x: number;
  y: number;
  /** Seconds since it started. */
  age: number;
  /** 0 (none) to 1. */
  strength: number;
  /** The direction it was sent in (a unit vector), or 0, 0 for a ring all round. */
  dx: number;
  dy: number;
}

export interface ClothSettings {
  size: number;
  sheen: number;
  speed: number;
  wavelength: number;
  fade: number;
  trail: number;
}

export interface Cloth {
  /** The part of the frame (fractions of it) the canvas shows. */
  setRegion(x0: number, y0: number, x1: number, y1: number): void;
  setBackdrop(image: HTMLImageElement, rect: { x: number; y: number; w: number; h: number }): void;
  /** `push`: where the cloth is pushed (picture heights) and by how much; still when `waves` is empty and the push is 0. */
  draw(frame: HTMLImageElement, waves: ClothWave[], push: { x: number; y: number; dx: number; dy: number }): void;
  dispose(): void;
}

const VERTEX = `
attribute vec2 a_pos;
uniform vec4 u_region;
varying vec2 v_uv;
void main() {
  v_uv = mix(u_region.xy, u_region.zw, vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5));
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define WAVES ${CLOTH_WAVES}
varying vec2 v_uv;
uniform sampler2D u_frame;
uniform sampler2D u_backdrop;
uniform vec4 u_backdropRect;
uniform float u_aspect;
uniform float u_active;
uniform vec4 u_waves[WAVES];
uniform vec2 u_dirs[WAVES];
uniform vec4 u_push;
uniform vec4 u_shape;
uniform vec2 u_amount;

void main() {
  if (u_active < 0.5) {
    gl_FragColor = vec4(texture2D(u_frame, v_uv).rgb, 1.0);
    return;
  }
  vec2 p = vec2(v_uv.x * u_aspect, v_uv.y);
  vec2 shift = vec2(0.0);
  float light = 0.0;
  for (int i = 0; i < WAVES; i++) {
    vec4 w = u_waves[i];
    if (w.w <= 0.0) continue;
    vec2 d = p - w.xy;
    vec2 dir = u_dirs[i];
    float gust = step(0.01, dot(dir, dir));
    // a tap's ring travels outwards; a gust sweeps on in the direction it was sent, a band of
    // soft crests across its path
    float r = length(d);
    vec2 n = mix(d / max(r, 0.0001), dir, gust);
    float along = mix(r, dot(d, dir), gust);
    float across = gust * dot(d, vec2(-dir.y, dir.x));
    // how far the leading edge has passed this point: crests just behind it, calmer further back
    float behind = w.z * u_shape.x - along;
    float env = w.w * exp(-w.z / u_shape.z) * smoothstep(-0.05, 0.0, behind) * exp(-max(behind, 0.0) / u_shape.w);
    env *= exp(-across * across / 0.09) * mix(1.0, smoothstep(-0.1, 0.05, along), gust);
    float phase = behind * u_shape.y;
    // gusts sway the cloth mostly across their path, like a flag; rings push it outwards
    vec2 sway = mix(n, vec2(-n.y, n.x), 0.65 * gust);
    shift += sway * (env * sin(phase));
    light += env * cos(phase);
  }
  // the cloth under the pointer, pushed along with it
  vec2 q = p - u_push.xy;
  vec2 push = u_push.zw * exp(-dot(q, q) / 0.034);
  // nothing moves at the frame's edges, where it meets the backdrop
  float still = smoothstep(0.0, 0.08, v_uv.x) * smoothstep(1.0, 0.92, v_uv.x) * smoothstep(0.0, 0.06, v_uv.y) * smoothstep(1.0, 0.975, v_uv.y);
  vec2 offset = (shift * u_amount.x + push) * still;
  vec2 uv = v_uv - vec2(offset.x / u_aspect, offset.y);
  vec3 color = texture2D(u_frame, uv).rgb;
  // light only on the cloth (wherever the picture isn't the plain backdrop)
  vec3 behindCloth = texture2D(u_backdrop, (uv - u_backdropRect.xy) / u_backdropRect.zw).rgb;
  float cloth = smoothstep(0.05, 0.16, distance(color, behindCloth));
  color += clamp(light, -1.4, 1.4) * u_amount.y * cloth * still;
  gl_FragColor = vec4(color, 1.0);
}`;

/** A WebGL cloth renderer for `canvas`, or null if this device can't do it (then draw the plain frame). */
export function createCloth(canvas: HTMLCanvasElement, aspect: number, settings: ClothSettings, onLost: () => void): Cloth | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  function shader(type: number, source: string) {
    const s = gl!.createShader(type);
    if (!s) return null;
    gl!.shaderSource(s, source);
    gl!.compileShader(s);
    return gl!.getShaderParameter(s, gl!.COMPILE_STATUS) ? s : null;
  }
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const at = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    region: at("u_region"),
    backdropRect: at("u_backdropRect"),
    active: at("u_active"),
    waves: at("u_waves"),
    dirs: at("u_dirs"),
    push: at("u_push"),
  };
  gl.uniform1i(at("u_frame"), 0);
  gl.uniform1i(at("u_backdrop"), 1);
  gl.uniform1f(at("u_aspect"), aspect);
  gl.uniform4f(at("u_shape"), settings.speed, (2 * Math.PI) / settings.wavelength, settings.fade, settings.trail);
  gl.uniform2f(at("u_amount"), settings.size, settings.sheen);
  gl.uniform4f(u.region, 0, 0, 1, 1);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  function texture(unit: number) {
    const t = gl!.createTexture();
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return t;
  }
  const frameTexture = texture(0);
  const backdropTexture = texture(1);
  let uploaded: HTMLImageElement | null = null;
  let uploadedSize = "";

  const waveData = new Float32Array(CLOTH_WAVES * 4);
  const dirData = new Float32Array(CLOTH_WAVES * 2);

  const lost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);

  return {
    setRegion(x0, y0, x1, y1) {
      gl.uniform4f(u.region, x0, y0, x1, y1);
    },
    setBackdrop(image, rect) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, backdropTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      gl.uniform4f(u.backdropRect, rect.x, rect.y, rect.w, rect.h);
    },
    draw(frame, waves, push) {
      if (frame !== uploaded) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, frameTexture);
        const size = `${frame.naturalWidth}x${frame.naturalHeight}`;
        if (size === uploadedSize) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGB, gl.UNSIGNED_BYTE, frame);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, frame);
        uploaded = frame;
        uploadedSize = size;
      }
      waveData.fill(0);
      dirData.fill(0);
      waves.slice(0, CLOTH_WAVES).forEach((w, i) => {
        waveData.set([w.x, w.y, w.age, w.strength], i * 4);
        dirData.set([w.dx, w.dy], i * 2);
      });
      const moving = waves.length > 0 || push.dx !== 0 || push.dy !== 0;
      gl.uniform1f(u.active, moving ? 1 : 0);
      gl.uniform4fv(u.waves, waveData);
      gl.uniform2fv(u.dirs, dirData);
      gl.uniform4f(u.push, push.x, push.y, push.dx, push.dy);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", lost);
      gl.deleteTexture(frameTexture);
      gl.deleteTexture(backdropTexture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
