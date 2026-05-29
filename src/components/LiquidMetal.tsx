import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, Palette, Settings2, Sliders, Code, Copy, Check, Info, Layout, RefreshCw, Layers } from 'lucide-react';

interface LiquidMetalProps {
  preset?: 'chrome' | 'gold' | 'dark' | 'holo' | 'rose';
  speed?: number; // 0.1 to 3.0
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Map string presets to shader floats
const presetMap = {
  chrome: 0.0,
  gold: 1.0,
  dark: 2.0,
  holo: 3.0,
  rose: 4.0,
};

export function LiquidMetalCanvas({
  preset = 'chrome',
  speed = 1.0,
  interactive = true,
  className = '',
  children,
}: LiquidMetalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glError, setGlError] = useState<string | null>(null);

  // We save mouse position in normalized container units, defaults to center
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      setGlError('WebGL não suportado por seu navegador. Fallback de CSS ativado.');
      return;
    }

    // Shaders sources
    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_preset;
      uniform float u_speed;
      uniform float u_interactive;

      // Generates procedural fluid flow height map via warped 4-octave sine wave FBM
      float height(vec2 p, float t) {
        float h = 0.0;
        float scale = 1.2;
        float weight = 0.6;
        
        for (int i = 0; i < 4; i++) {
          vec2 warp = vec2(
            sin(p.y * 1.5 + t * 0.22 + float(i) * 1.4),
            cos(p.x * 1.3 + t * 0.18 + float(i) * 1.1)
          );
          p += warp * 0.38;
          h += sin(p.x * scale + p.y * scale + t * 0.25) * weight;
          scale *= 1.8;
          weight *= 0.55;
        }
        return h;
      }

      // Compute normal derivative of procedural heights
      vec3 getNormal(vec2 p, float t) {
        float eps = 0.012;
        float h = height(p, t);
        float h_dx = height(p + vec2(eps, 0.0), t) - h;
        float h_dy = height(p + vec2(0.0, eps), t) - h;
        return normalize(vec3(-h_dx, -h_dy, eps * 11.5));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        
        // Dynamic mouse warp
        vec2 m = (u_mouse.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        float mouseDist = length(p - m);
        if (u_interactive > 0.1 && mouseDist < 1.1) {
          float force = (1.1 - mouseDist) * u_interactive;
          p += normalize(p - m) * force * 0.28;
        }

        // Animated variable time
        float t = u_time * u_speed;
        vec3 n = getNormal(p, t);
        
        // Simple Specular Phong reflection
        vec3 lightDir = normalize(vec3(0.5, 0.5, 1.25));
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 halfDir = normalize(lightDir + viewDir);
        
        float diffuse = max(0.0, dot(n, lightDir));
        float specular = pow(max(0.0, dot(n, halfDir)), 32.0);
        
        // Map normal Y value into index of metallic reflection gradient
        float reflectIdx = n.y * 0.5 + 0.5;
        vec3 finalColor = vec3(0.0);
        
        if (u_preset < 0.5) {
          // Preset 0: Chrome / Liquid Silver / Mercury
          vec3 colDark = vec3(0.07, 0.08, 0.11);
          vec3 colMid = vec3(0.60, 0.65, 0.73);
          vec3 colLight = vec3(0.98, 0.99, 1.0);
          
          vec3 reflectCol = mix(colDark, colMid, smoothstep(0.0, 0.42, reflectIdx));
          reflectCol = mix(reflectCol, colLight, smoothstep(0.42, 0.80, reflectIdx));
          reflectCol = mix(reflectCol, colMid * 1.15, smoothstep(0.80, 1.0, reflectIdx));
          
          finalColor = reflectCol * (0.42 + diffuse * 0.58) + vec3(specular * 1.4);
          
        } else if (u_preset < 1.5) {
          // Preset 1: Imperial Gold / Yellow Brass
          vec3 colDark = vec3(0.25, 0.12, 0.01);
          vec3 colMid = vec3(0.88, 0.63, 0.12);
          vec3 colLight = vec3(1.0, 0.96, 0.70);
          vec3 colGold = vec3(0.95, 0.78, 0.18);
          
          vec3 reflectCol = mix(colDark, colMid, smoothstep(0.0, 0.40, reflectIdx));
          reflectCol = mix(reflectCol, colLight, smoothstep(0.40, 0.78, reflectIdx));
          reflectCol = mix(reflectCol, colGold, smoothstep(0.78, 1.0, reflectIdx));
          
          finalColor = reflectCol * (0.38 + diffuse * 0.62) + vec3(specular * 1.35);
          
        } else if (u_preset < 2.5) {
          // Preset 2: Dark Steel / Iridescent Gunmetal
          vec3 colDark = vec3(0.01, 0.02, 0.04);
          vec3 colMid = vec3(0.18, 0.20, 0.24);
          vec3 colLight = vec3(0.58, 0.60, 0.65);
          
          vec3 iridescentColor = vec3(
            0.50 + 0.45 * sin(reflectIdx * 6.283 + 0.0),
            0.50 + 0.45 * sin(reflectIdx * 6.283 + 2.1),
            0.50 + 0.45 * sin(reflectIdx * 6.283 + 4.2)
          );
          
          vec3 reflectCol = mix(colDark, colMid, smoothstep(0.0, 0.45, reflectIdx));
          reflectCol = mix(reflectCol, colLight, smoothstep(0.45, 0.82, reflectIdx));
          reflectCol = mix(reflectCol, colDark, smoothstep(0.82, 1.0, reflectIdx));
          reflectCol = mix(reflectCol, iridescentColor, 0.25);
          
          finalColor = reflectCol * (0.45 + diffuse * 0.55) + vec3(specular * 0.85);
          
        } else if (u_preset < 3.5) {
          // Preset 3: Neon Indigo/Pink/Cyan Holographic Gate7
          vec3 colDark = vec3(0.12, 0.01, 0.26);
          vec3 colMid = vec3(0.50, 0.10, 0.85); // Purple Gate7 brand
          vec3 colLight = vec3(0.00, 0.94, 1.00); // Aqua Cyan
          
          vec3 holoRainbow = vec3(
            0.6 + 0.4 * sin(reflectIdx * 8.0 + t),
            0.35 + 0.65 * sin(reflectIdx * 4.5 + t + 2.0),
            0.85 + 0.15 * cos(reflectIdx * 3.5 + t * 0.5)
          );
          
          vec3 reflectCol = mix(colDark, colMid, smoothstep(0.0, 0.48, reflectIdx));
          reflectCol = mix(reflectCol, colLight, smoothstep(0.48, 0.86, reflectIdx));
          reflectCol = mix(reflectCol, holoRainbow, 0.40);
          
          finalColor = reflectCol * (0.45 + diffuse * 0.55) + vec3(specular * 1.3);
          
        } else {
          // Preset 4: Rose Copper / Rose Gold
          vec3 colDark = vec3(0.24, 0.08, 0.07);
          vec3 colMid = vec3(0.72, 0.44, 0.38);
          vec3 colLight = vec3(0.97, 0.82, 0.77);
          
          vec3 reflectCol = mix(colDark, colMid, smoothstep(0.0, 0.45, reflectIdx));
          reflectCol = mix(reflectCol, colLight, smoothstep(0.45, 0.84, reflectIdx));
          reflectCol = mix(reflectCol, colMid * 1.15, smoothstep(0.84, 1.0, reflectIdx));
          
          finalColor = reflectCol * (0.40 + diffuse * 0.60) + vec3(specular * 1.3);
        }
        
        // Edge vignetting glow
        float vignGlow = smoothstep(1.22, 0.50, length(uv - 0.5));
        finalColor = mix(finalColor * 0.03, finalColor, vignGlow);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Helper functions for WebGL compiling
    function compileShader(source: string, type: number): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Erro compilando shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) {
      setGlError('Erro ao compilar shaders WebGL.');
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Erro ao linkar programa de shaders:', gl.getProgramInfoLog(program));
      setGlError('Erro ao carregar o pipeline gráfico do WebGL.');
      return;
    }

    gl.useProgram(program);

    // Quad geometry (cover full screen)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const presetLoc = gl.getUniformLocation(program, 'u_preset');
    const speedLoc = gl.getUniformLocation(program, 'u_speed');
    const interactiveLoc = gl.getUniformLocation(program, 'u_interactive');

    let animationFrameId: number;
    let startTime = Date.now();

    // Mouse positions init to canvas center
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    mouseRef.current = { x: width / 2, y: height / 2 };
    targetMouseRef.current = { x: width / 2, y: height / 2 };

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // Caps DPI at 1.5 for ultra peak-smooth frame rates
      const rect = container.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth * dpr;
        canvas.height = newHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    // Responsive Canvas Resizer Observer
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    resizeCanvas();

    let isVisible = true;
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.01 });

    if (canvas) {
      intersectionObserver.observe(canvas);
    }

    const renderLoop = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }

      // Linear interpolation to make mouse reaction very organic
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.08;

      const elapsed = (Date.now() - startTime) / 1000.0;

      gl.useProgram(program);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, elapsed);
      
      // Compute correct WebGL coordinate space mouse values
      const scaleX = canvas.width / (canvas.clientWidth || 1);
      const scaleY = canvas.height / (canvas.clientHeight || 1);
      
      // Invert Y coordinate space for WebGL fragment
      const webGlMouseY = canvas.height - (mouseRef.current.y * scaleY);
      gl.uniform2f(mouseLoc, mouseRef.current.x * scaleX, webGlMouseY);

      gl.uniform1f(presetLoc, presetMap[preset] || 0.0);
      gl.uniform1f(speedLoc, speed);
      gl.uniform1f(interactiveLoc, interactive ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [preset, speed, interactive]);

  // Handle Mousemovements over container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    targetMouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseLeave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    targetMouseRef.current = {
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full overflow-hidden select-none bg-black ${className}`}
    >
      {glError ? (
        // Peak performance fallbacks if WebGL is unavailable
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-purple-950 to-slate-900 border border-slate-800 text-center text-sm font-semibold text-text-secondary">
          <span>{glError}</span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none"
        />
      )}
      {children && (
        <div className="relative z-10 w-full h-full pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------
// EXCLUSIVE METAL BUTTON COMPONENT
// Premium, WebGL-shader backplated buttons with fluid hover distortion
// -----------------------------------------
interface LiquidMetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  preset?: 'chrome' | 'gold' | 'dark' | 'holo' | 'rose';
  speed?: number;
  interactive?: boolean;
}

export function LiquidMetalButton({
  preset = 'holo',
  speed = 1.2,
  interactive = true,
  className = '',
  children,
  ...props
}: LiquidMetalButtonProps) {
  return (
    <button
      className={`relative overflow-hidden group rounded-lg active:scale-95 transition-all outline-none border border-white/20 select-none shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_rgba(167,139,250,0.3)] hover:border-white/30 cursor-pointer ${className}`}
      {...props}
    >
      {/* Background metal shader */}
      <div className="absolute inset-0 z-0 pointer-events-none transition-transform duration-500 scale-105 group-hover:scale-100">
        <LiquidMetalCanvas
          preset={preset}
          speed={speed}
          interactive={interactive}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Surface reflection glossy glare */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none transition-opacity duration-300 opacity-90 group-hover:opacity-100" />
      
      {/* Dark premium obsidian glaze to elevate text reading contrast against shiny metal highlights */}
      <div className="absolute inset-0 z-[2] bg-black/35 group-hover:bg-black/25 transition-colors duration-300 pointer-events-none" />

      {/* Dynamic neon glow color based on preset */}
      <div className={`absolute -inset-1 blur-md rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none z-0 ${
        preset === 'gold' ? 'bg-amber-400' :
        preset === 'holo' ? 'bg-purple-500' :
        preset === 'rose' ? 'bg-rose-400' :
        preset === 'dark' ? 'bg-slate-500' : 'bg-slate-300'
      }`} />

      {/* Button content centering perfectly with robust typography and strong visual contrast */}
      <div className="relative z-10 flex items-center justify-center gap-2 font-heading font-extrabold text-sm select-none tracking-tight">
        <span className="flex items-center gap-2 drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] text-white font-black">
          {children}
        </span>
      </div>
    </button>
  );
}

// -----------------------------------------
// EXCLUSIVE METAL PLAYGROUND COMPONENT
// Beautiful emulation of 'metal.jakubantalik.com' 
// -----------------------------------------
export function LiquidMetalPlayground() {
  const [activePreset, setActivePreset] = useState<'chrome' | 'gold' | 'dark' | 'holo' | 'rose'>('chrome');
  const [speed, setSpeed] = useState<number>(1.0);
  const [interactive, setInteractive] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const codeString = `<LiquidMetalCanvas\n  preset="${activePreset}"\n  speed={${speed.toFixed(1)}}\n  interactive={${interactive}}\n/>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeString);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const presetCatalog = [
    { id: 'chrome', label: 'Chrome Prateado', description: 'Prata líquido polido com reflexos de alta fidelidade e brilho cromado.', colorTheme: 'from-slate-200 to-slate-400 text-slate-800' },
    { id: 'gold', label: 'Ouro Imperial', description: 'Latão e ouro puro 24k com brilho de metal nobre e reflexos quentes.', colorTheme: 'from-amber-200 to-yellow-500 text-amber-950' },
    { id: 'dark', label: 'Aço Titânio Iridescente', description: 'Liga de titânio acetinado com finos reflexos de oxidação furta-cor.', colorTheme: 'from-slate-700 to-slate-900 text-slate-100' },
    { id: 'holo', label: 'Holográfico Gate7', description: 'Metal psicodélico neon combinando as cores violeta e ciano do Gate7.', colorTheme: 'from-fuchsia-400 to-cyan-400 text-purple-950' },
    { id: 'rose', label: 'Cobre / Ouro Rosé', description: 'Efeito cobre cintilante escovado, refinado e com contrastes suaves.', colorTheme: 'from-rose-300 to-amber-400 text-rose-950' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-main pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand">
            <Palette className="w-6 h-6 animate-pulse" />
            <span className="text-xs font-bold font-mono tracking-widest uppercase">Efeitos de Shader Premium</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-text-main mt-1 tracking-tight">
            Renderizador WebGL • Liquid Metal
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Shader dinâmico inspirado no Liquid Metal do designer Jakub Antalík. Perfeito para realçar interfaces e cards de elite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-xs font-semibold text-success font-mono animate-pulse">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            GLSL Core Rodando
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand font-mono">
            Vite + React 19 Support
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* WebGL Canvas Block (Column 1) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div 
            className="flex-1 min-h-[400px] md:min-h-[480px] rounded-2xl overflow-hidden shadow-2xl relative border border-border-main group cursor-crosshair"
            style={{ contentVisibility: 'auto' }}
          >
            <LiquidMetalCanvas 
              preset={activePreset} 
              speed={speed} 
              interactive={interactive}
            >
              {/* Overlay styling elements inside the metal canvas showcasing how text pops perfectly */}
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end justify-between text-white select-none">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                    Demonstração de Contraste
                  </span>
                  <h3 className="text-xl font-heading font-black tracking-tight drop-shadow-md">
                    GATE7 CHROMATIC SHADER
                  </h3>
                  <p className="text-xs text-slate-200 drop-shadow">
                    Passe o mouse por cima do metal para distorcer a geometria mercúria.
                  </p>
                </div>
                <div className="font-mono text-xs opacity-80 backdrop-blur-md bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  {activePreset.toUpperCase()} Presets
                </div>
              </div>

              {/* Minimal floating brand label */}
              <div className="absolute top-4 left-4 backdrop-blur-md bg-black/40 border border-white/10 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest text-slate-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                GATE7 HIGH-FIDELITY
              </div>
            </LiquidMetalCanvas>
          </div>

          {/* Quick info footer */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-card border border-border-main">
            <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary leading-relaxed">
              <span className="font-semibold text-text-main">Como funciona?</span> Este shader calcula vetores normais 3D em tempo real e simula a reflexão usando um mapa matemático de inclinação do metal. A reflexão muda com base no ângulo e no tempo, o que cria a ilusão perfeita de cromo líquido metálico fluido sem sobrecarregar seu processador!
            </div>
          </div>
        </div>

        {/* Controls Panel (Column 2) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Preset Picker Card */}
          <div className="bg-bg-card p-6 rounded-2xl border border-border-main space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-text-main">
              <Settings2 className="w-5 h-5 text-brand" />
              <h2 className="font-heading text-lg font-bold">Presets de Acabamento</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
              {presetCatalog.map((catalog) => (
                <button
                  key={catalog.id}
                  onClick={() => setActivePreset(catalog.id as any)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 relative overflow-hidden group ${
                    activePreset === catalog.id
                      ? 'border-brand bg-brand/5 shadow'
                      : 'border-border-main hover:border-slate-400 hover:bg-bg-main/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${catalog.colorTheme} shrink-0 flex items-center justify-center font-mono font-bold text-xs shadow-sm`}>
                    {catalog.id.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-heading text-sm font-extrabold text-text-main flex items-center gap-1.5">
                      {catalog.label}
                      {activePreset === catalog.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary leading-relaxed font-medium">
                      {catalog.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters / Sliders Card */}
          <div className="bg-bg-card p-6 rounded-2xl border border-border-main space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-text-main">
              <Sliders className="w-5 h-5 text-brand" />
              <h2 className="font-heading text-lg font-bold">Parâmetros de Animação</h2>
            </div>

            <div className="space-y-5">
              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-text-main flex items-center gap-1">Velocidade da Fluidez</span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-bg-main rounded border border-border-main text-text-secondary">
                    {speed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-brand h-1.5 bg-bg-main rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                  <span>0.1x (Quase Parado)</span>
                  <span>1.0x (Padrão)</span>
                  <span>3.0x (Instável / Rápido)</span>
                </div>
              </div>

              {/* Interactive Warp Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-border-main bg-bg-main/20 hover:bg-bg-main/50 transition-colors cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-text-main block">Interatividade ao Cursor</span>
                  <span className="text-xs text-text-secondary leading-normal font-medium block">
                    Distorsão da malha 3D conforme o mouse se move.
                  </span>
                </div>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={interactive}
                    onChange={(e) => setInteractive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
              </label>
            </div>
          </div>

          {/* Integration / Code Exporter Card */}
          <div className="bg-bg-card p-6 rounded-2xl border border-border-main space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-main">
                <Code className="w-5 h-5 text-brand" />
                <h2 className="font-heading text-lg font-bold">Instalação Simples</h2>
              </div>
              <button
                onClick={copyToClipboard}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedCode 
                    ? 'bg-success/10 text-success border border-success/30' 
                    : 'bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20'
                }`}
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar TSX
                  </>
                )}
              </button>
            </div>

            <div className="font-mono text-xs p-4 rounded-xl bg-slate-950 text-slate-100 overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
              <div className="text-slate-500 mb-2">// Copie e cole na estrutura do seu card!</div>
              <span className="text-[#a78bfa]">import</span> {'{'} LiquidMetalCanvas {'}'} <span className="text-[#a78bfa]">from</span> <span className="text-green-400">"./components/LiquidMetal"</span>;
              <br /><br />
              <span className="text-[#e2e8f0]">{codeString}</span>
            </div>
            
            <div className="text-[11px] text-text-secondary leading-normal flex gap-1.5">
              <Layers className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span>
                <strong>Dica de UI:</strong> Você pode usar o <code className="font-mono bg-bg-main px-1 text-text-main rounded">LiquidMetalCanvas</code> como wrapper para qualquer elemento! Ele cria um backplate metálico perfeito mantendo seus botões e textos legíveis na frente.
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
