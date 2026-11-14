"use client";
import { useEffect, useRef, useState } from "react";

// Palette in normalized RGB. One 54-second fold loop contains six glow breaths.
export const LINEN = {
  foldScale: 4.5,
  foldSpeed: 3,
  glowBreathPeriod: 9,
  glowStrength: 1,
  highlight: [1, 1, 1],
  mid: [250 / 255, 246 / 255, 244 / 255],
  shadow: [237 / 255, 229 / 255, 225 / 255],
};

const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float phase, breath, foldScale, glowStrength;
uniform vec3 highlight, mid, shadow;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  return .72*noise(p)+.28*noise(p*1.9+7.1);
}
void main() {
  vec2 uv=gl_FragCoord.xy/resolution;
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
  vec2 orbit=vec2(cos(phase),sin(phase));
  vec2 cloth=vec2(p.x*foldScale,p.y*.7)+orbit*1.25;
  float folds=fbm(cloth+vec2(fbm(cloth*.6+orbit*.3),0.));
  float softness=smoothstep(.32,.64,folds);
  vec3 deepShadow=mix(shadow,vec3(.84,.78,.76),.45);
  vec3 color=mix(deepShadow,mid,softness);
  float glow=exp(-pow((p.x*.65+p.y*.25-1.1*sin(phase))/.38,2.));
  color=mix(color,highlight,glow*glowStrength*(.12+.88*breath));
  gl_FragColor=vec4(color,1.);
}`;

export function HeroBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [path, setPath] = useState("initializing");
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
    const report = (path: string, detail?: string) => {
      console.info("[Elya linen]", path, detail ?? "");
      canvas.dataset.renderPath = path;
      setPath(path);
    };
    if (!gl) { report("fallback", "WebGL unavailable"); return; }
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        report("fallback", gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
        return null;
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, "attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}");
    const pixel = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vertex || !pixel || !program) {
      shaders.forEach(s => gl.deleteShader(s));
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.attachShader(program, vertex); gl.attachShader(program, pixel); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      report("fallback", gl.getProgramInfoLog(program) ?? "Shader linking failed");
      gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for (const [key,value] of Object.entries(LINEN)) {
      if (key === "foldSpeed" || key === "glowBreathPeriod") continue;
      const location = gl.getUniformLocation(program,key);
      if (Array.isArray(value)) gl.uniform3fv(location,value);
      else if (typeof value === "number") gl.uniform1f(location,value);
    }
    const timeUniform = gl.getUniformLocation(program,"phase");
    const breathUniform = gl.getUniformLocation(program,"breath");
    const sizeUniform = gl.getUniformLocation(program,"resolution");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, last = 0, elapsed = 0;
    const draw = () => {
      // Integer orbit count keeps both fold and glow cycles seamless when tuned.
      const phase = elapsed / (LINEN.glowBreathPeriod * 6000) * Math.PI * 2;
      gl.uniform1f(timeUniform, phase * Math.max(1, Math.round(LINEN.foldSpeed)));
      gl.uniform1f(breathUniform, reduced.matches ? 0.5 : .5-.5*Math.cos(phase*6));
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.style.opacity = "1";
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1,Math.round(bounds.width*.6));
      canvas.height = Math.max(1,Math.round(bounds.height*.6));
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(sizeUniform,canvas.width,canvas.height); draw();
    };
    const tick = (now: number) => {
      if (now-last >= 1000/30) {
        elapsed += last ? Math.min(now-last,100) : 0;
        last = now; draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frame); last=0;
      report(reduced.matches ? "reduced-motion static" : "WebGL");
      if (reduced.matches) { elapsed=0; draw(); }
      else if (!document.hidden) frame=requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize(); update();
    document.addEventListener("visibilitychange",update);
    reduced.addEventListener("change",update);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener("visibilitychange",update);
      reduced.removeEventListener("change",update);
      gl.deleteBuffer(buffer); gl.deleteProgram(program);
      shaders.forEach(s => gl.deleteShader(s));
    };
  }, []);
  return <div className="hero-background" aria-hidden="true" style={{
    background: "linear-gradient(125deg, #ffffff, #faf6f4 60%, #ede5e1)",
  }}><canvas ref={ref} style={{ width: "100%", height: "100%", display: "block", opacity: 0, filter: "blur(2px)", transform: "scale(1.015)" }} />
    {process.env.NODE_ENV === "development" && <span style={{ position: "absolute", top: 12, right: 12, padding: "3px 8px", background: "#fff8ed", color: "#3a2e2a", fontSize: 11 }}>{path}</span>}
  </div>;
}
