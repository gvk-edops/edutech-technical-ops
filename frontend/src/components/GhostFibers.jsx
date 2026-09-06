import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";
import { usePreferences } from "@/contexts/PreferencesContext";

const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uLayers;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uLayerSpeed;
uniform float uTwist;
uniform float uTwistFrequency;
uniform float uTwistSpeed;
uniform float uLineFrequency;
uniform float uLineSpacing;
uniform float uLineSharpness;
uniform float uGlowFalloff;
uniform float uGlowIntensity;
uniform float uBrightness;
uniform float uBlueBoost;
uniform float uVignette;
uniform float uLightMode;
uniform vec3 uLineColor;
uniform vec3 uGlowColor;
out vec4 fragColor;
#define MAX_LAYERS 10
mat2 rotate2d(float angle) { float s = sin(angle); float c = cos(angle); return mat2(c, -s, s, c); }
void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime * uSpeed;
  vec2 p = rotate2d(radians(uRotation) + time * 0.08) * (uv / max(uScale, 0.05));
  vec3 color = vec3(0.0);
  float fiberField = 0.0;
  for (int index = 0; index < MAX_LAYERS; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;
    p += uWaveAmplitude * sin(p.yx * fi * uWaveFrequency + time * (uWaveSpeed + fi * uLayerSpeed));
    float radius = length(p);
    float polarAngle = atan(p.y, p.x) + sin(radius * uTwistFrequency - time * uTwistSpeed + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;
    float lines = abs(sin(p.x * (uLineFrequency + fi * uLineSpacing) + sin(p.y * 3.0 + time)));
    lines = pow(max(0.0, 1.0 - lines), uLineSharpness);
    fiberField += lines / fi;
    color += uLineColor * lines / fi;
    color += uGlowColor * exp(-uGlowFalloff * abs(sin(p.x * 3.0 + time + fi))) * uGlowIntensity / (fi * 2.0);
  }
  float center = exp(-2.2 * dot(uv, uv));
  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  color += (uLineColor * 0.85567 - uGlowColor * 0.06186) * center;
  color += (uLineColor * 0.19588 + uGlowColor * 0.2268) * cloud;
  float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
  color *= mix(1.0 - uVignette, 1.0, vignette);
  color = 1.0 - exp(-color * uBrightness);
  color.b *= uBlueBoost;
  vec3 backdrop = uLightMode > 0.5 ? vec3(1.0) : vec3(0.070588, 0.058824, 0.090196);
  vec3 outputColor = uLightMode > 0.5
    ? mix(backdrop, mix(backdrop, uLineColor, 0.52), pow(smoothstep(0.12, 1.05, fiberField) * vignette, 1.5) * 0.3)
    : backdrop + color;
  fragColor = vec4(clamp(outputColor, 0.0, 1.0), 1.0);
}
`;

const colorToRgb = (hex) => {
  const value = hex.replace(/^#/, "");
  const normalized =
    value.length === 3
      ? value.replace(/./g, (channel) => channel + channel)
      : value;
  const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return match
    ? match.slice(1).map((channel) => parseInt(channel, 16) / 255)
    : [1, 1, 1];
};

const contexts = new WeakMap();

export default function GhostFibers({ className = "" }) {
  const containerRef = useRef(null);
  const { preferences } = usePreferences();
  const lightMode =
    preferences.theme === "light" ||
    (preferences.theme === "system" &&
      !document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new Renderer({
      webgl: 2,
      alpha: false,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    });
    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.cssText = "width:100%;height:100%;display:block";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    const uniforms = {
      uResolution: { value: new Float32Array([1, 1]) },
      uTime: { value: 0 },
      uSpeed: { value: 0.2 },
      uScale: { value: 2 },
      uRotation: { value: 0 },
      uLayers: { value: 4 },
      uWaveAmplitude: { value: 0.015 },
      uWaveFrequency: { value: 3 },
      uWaveSpeed: { value: 0.15 },
      uLayerSpeed: { value: 0.08 },
      uTwist: { value: 0.1 },
      uTwistFrequency: { value: 5 },
      uTwistSpeed: { value: 1.2 },
      uLineFrequency: { value: 5 },
      uLineSpacing: { value: 2 },
      uLineSharpness: { value: 16 },
      uGlowFalloff: { value: 10 },
      uGlowIntensity: { value: 1.6 },
      uBrightness: { value: 2 },
      uBlueBoost: { value: 1.25 },
      uVignette: { value: 0.8 },
      uLightMode: {
        value: document.documentElement.classList.contains("dark") ? 0 : 1,
      },
      uLineColor: { value: new Float32Array(colorToRgb("#140E35")) },
      uGlowColor: { value: new Float32Array(colorToRgb("#3437A0")) },
    };
    const program = new Program(gl, { vertex, fragment, uniforms });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    let frameId = 0;
    let elapsed = 0;
    let previousTime = performance.now();
    let visible = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const render = () => renderer.render({ scene: mesh });
    const canAnimate = () =>
      visible &&
      !document.hidden &&
      !reducedMotion.matches &&
      !preferences.reduceMotion;
    const loop = (now) => {
      frameId = 0;
      if (!canAnimate()) return;
      elapsed += Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      uniforms.uTime.value = elapsed;
      render();
      frameId = requestAnimationFrame(loop);
    };
    const start = () => {
      if (canAnimate() && !frameId) frameId = requestAnimationFrame(loop);
    };
    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
      uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else cancelAnimationFrame(frameId);
    });
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frameId);
      else start();
    };
    const onMotion = () => {
      if (reducedMotion.matches) {
        cancelAnimationFrame(frameId);
        render();
      } else start();
    };

    contexts.set(container, {
      uniforms,
      render,
    });

    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotion);
    resize();
    start();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotion);
      contexts.delete(container);
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [preferences.reduceMotion]);

  useEffect(() => {
    const context = contexts.get(containerRef.current);
    if (context) {
      context.uniforms.uLightMode.value = lightMode ? 1 : 0;
      context.render();
    }
  }, [lightMode]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden opacity-80 ${className}`.trim()}
    />
  );
}
