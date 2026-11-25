import type {
  DukeGraphicOverlay,
  DukeImageAspectRatio,
  DukeImageDesignSpec,
  DukeLightFx,
  DukePhotoStyle,
  DukeRelightPreset,
} from '../types';

function getCanvasDimensions(aspectRatio: DukeImageAspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '9:16':
      return { width: 900, height: 1600 };
    case '4:5':
      return { width: 960, height: 1200 };
    case '1:1':
    default:
      return { width: 1080, height: 1080 };
  }
}

function safeHex(color: string | undefined, fallback: string): string {
  const trimmed = (color || '').trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = safeHex(hex, '#f59e0b').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem base para reformulação.'));
    img.src = src;
  });
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const rest = words.slice(i).join(' ');
        current = rest;
        break;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

interface RelightPalette {
  shadowTint: [number, number, number];
  highlightTint: [number, number, number];
  rimColor: string;
  secondaryGlow: string;
  monochrome?: boolean;
}

function getRelightPalette(preset: DukeRelightPreset, accent: string): RelightPalette {
  switch (preset) {
    case 'cool_cyber':
      return {
        shadowTint: [10, 26, 68],
        highlightTint: [130, 226, 255],
        rimColor: '#38bdf8',
        secondaryGlow: '#c084fc',
      };
    case 'emerald_royal':
      return {
        shadowTint: [6, 38, 28],
        highlightTint: [255, 228, 152],
        rimColor: '#f59e0b',
        secondaryGlow: '#10b981',
      };
    case 'sunset_cinema':
      return {
        shadowTint: [44, 14, 42],
        highlightTint: [255, 186, 128],
        rimColor: '#fb923c',
        secondaryGlow: '#f43f5e',
      };
    case 'violet_aura':
      return {
        shadowTint: [28, 12, 58],
        highlightTint: [244, 200, 255],
        rimColor: '#a855f7',
        secondaryGlow: '#f59e0b',
      };
    case 'noir_luxury':
      return {
        shadowTint: [12, 14, 18],
        highlightTint: [248, 240, 224],
        rimColor: '#fde68a',
        secondaryGlow: '#ffffff',
        monochrome: true,
      };
    case 'warm_gold':
    default:
      return {
        shadowTint: [20, 22, 16],
        highlightTint: [255, 222, 144],
        rimColor: accent || '#fbbf24',
        secondaryGlow: '#fde68a',
      };
  }
}

/**
 * Pixel-level studio transformation directly on the user's photo:
 * 1. DSLR Portrait Depth-of-Field Bokeh (feathered subject focus over blurred background edges)
 * 2. Cinema HDR S-curve clarity & Split-Tone RGB Color Grading LUT
 * 3. Optional Digital-Art Stylized Posterization & Luminous Contour Enhancement
 * 4. Volumetric Studio Relighting, Prism Light Leaks, Bokeh Orbs & Integrated Graphic Design Overlays
 */
function buildTransformedPhotoCanvas(
  photo: HTMLImageElement,
  targetW: number,
  targetH: number,
  spec: DukeImageDesignSpec,
  accent: string
): HTMLCanvasElement {
  const workCanvas = document.createElement('canvas');
  workCanvas.width = targetW;
  workCanvas.height = targetH;
  const wctx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!wctx) return workCanvas;

  const photoStyle: DukePhotoStyle = spec.photoStyle || 'studio_relight';
  const relightPreset: DukeRelightPreset = spec.relightPreset || 'emerald_royal';
  const bokehDepth = Math.max(0, Math.min(1, spec.bokehDepth ?? 0.42));
  const hdrClarity = Math.max(0, Math.min(1, spec.hdrClarity ?? 0.72));
  const palette = getRelightPalette(relightPreset, accent);

  const brightness = Math.max(0.7, Math.min(1.45, spec.brightness ?? 1.06));
  const contrast = Math.max(0.8, Math.min(1.55, spec.contrast ?? 1.14));
  const saturate = Math.max(0.0, Math.min(1.9, spec.saturate ?? 1.18));
  const sepia = Math.max(0.0, Math.min(0.65, spec.sepia ?? 0));
  const hueRotate = Math.max(-45, Math.min(45, spec.hueRotate ?? 0));
  const baseFilter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`;

  // Step 1: DSLR Depth-of-Field Bokeh compositing directly on the photo
  if (bokehDepth > 0.06) {
    const blurPx = Math.round(10 + bokehDepth * 16);
    wctx.save();
    wctx.filter = `${baseFilter} blur(${blurPx}px) saturate(${Math.min(1.8, saturate + 0.16)})`;
    drawCoverImage(wctx, photo, -blurPx, -blurPx, targetW + blurPx * 2, targetH + blurPx * 2);
    wctx.restore();

    // Sharp center subject masked with smooth elliptical studio focus feather
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = targetW;
    sharpCanvas.height = targetH;
    const sctx = sharpCanvas.getContext('2d');
    if (sctx) {
      sctx.filter = baseFilter;
      drawCoverImage(sctx, photo, 0, 0, targetW, targetH);
      sctx.filter = 'none';
      sctx.globalCompositeOperation = 'destination-in';
      const focusX = targetW * 0.5;
      const focusY = targetH * 0.44;
      const focusR = Math.max(targetW, targetH) * (0.64 - bokehDepth * 0.14);
      const maskGrad = sctx.createRadialGradient(
        focusX,
        focusY,
        focusR * 0.36,
        focusX,
        focusY,
        focusR
      );
      maskGrad.addColorStop(0, 'rgba(0,0,0,1)');
      maskGrad.addColorStop(0.62, 'rgba(0,0,0,0.92)');
      maskGrad.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = maskGrad;
      sctx.fillRect(0, 0, targetW, targetH);

      wctx.drawImage(sharpCanvas, 0, 0);
    }
  } else {
    wctx.save();
    wctx.filter = baseFilter;
    drawCoverImage(wctx, photo, 0, 0, targetW, targetH);
    wctx.restore();
  }

  // Step 2: Pixel-Level Cinema HDR LUT, Split-Toning & Digital-Art Stylization
  try {
    const imgData = wctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const len = data.length;
    const isDigitalArt = photoStyle === 'digital_art_pop';
    const isNeon = photoStyle === 'neon_modern';
    const isMonochrome = Boolean(palette.monochrome);

    const [sR, sG, sB] = palette.shadowTint;
    const [hR, hG, hB] = palette.highlightTint;
    const gradeStrength = isNeon ? 0.34 : isDigitalArt ? 0.28 : 0.22;
    const sCurveAmount = 0.12 + hdrClarity * 0.28;

    // Precompute fast 256-entry HDR S-curve lookup table
    const hdrLut = new Uint8Array(256);
    for (let v = 0; v < 256; v += 1) {
      const n = v / 255;
      // Smooth cinema S-curve lifting shadows slightly and popping midtone contrast
      const curved = n + sCurveAmount * Math.sin((n - 0.5) * Math.PI) * (0.5 - Math.abs(n - 0.5)) * 2;
      const lifted = curved * 0.96 + 0.025;
      hdrLut[v] = clampByte(lifted * 255);
    }

    for (let i = 0; i < len; i += 4) {
      let r = hdrLut[data[i]];
      let g = hdrLut[data[i + 1]];
      let b = hdrLut[data[i + 2]];

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      if (isMonochrome) {
        const bw = clampByte((lum * 1.08 - 0.04) * 255);
        r = bw;
        g = bw;
        b = bw;
      }

      // Vibrancy boost directly on mid-saturated pixels
      if (!isMonochrome && (hdrClarity > 0.25 || isDigitalArt || isNeon)) {
        const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
        const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
        const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
        const vibBoost = (isDigitalArt ? 0.34 : isNeon ? 0.26 : hdrClarity * 0.18) * (1 - sat * 0.65);
        const avg = (r + g + b) / 3;
        r = clampByte(r + (r - avg) * vibBoost);
        g = clampByte(g + (g - avg) * vibBoost);
        b = clampByte(b + (b - avg) * vibBoost);
      }

      // Smooth Digital-Art Posterization / Silky Painterly Quantization
      if (isDigitalArt) {
        const levels = 9;
        const step = 255 / levels;
        const qR = Math.round(r / step) * step;
        const qG = Math.round(g / step) * step;
        const qB = Math.round(b / step) * step;
        // Blend 52% stylized quantized tone with 48% original detail so faces remain natural and recognizable!
        r = clampByte(r * 0.48 + qR * 0.52);
        g = clampByte(g * 0.48 + qG * 0.52);
        b = clampByte(b * 0.48 + qB * 0.52);
      }

      // Cinema Split-Tone Grading (Shadow tint into darks, Highlight tint into brights)
      const shadowWeight = Math.max(0, 1 - lum * 1.55) * gradeStrength;
      const highWeight = Math.max(0, (lum - 0.42) * 1.45) * (gradeStrength * 0.82);

      r = clampByte(r * (1 - shadowWeight - highWeight) + sR * shadowWeight + hR * highWeight);
      g = clampByte(g * (1 - shadowWeight - highWeight) + sG * shadowWeight + hG * highWeight);
      b = clampByte(b * (1 - shadowWeight - highWeight) + sB * shadowWeight + hB * highWeight);

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    // Crisp micro-clarity luminous contour edge glow for digital_art_pop / editorial_cover
    if (isDigitalArt || photoStyle === 'editorial_cover') {
      const copy = new Uint8ClampedArray(data);
      const stride = targetW * 4;
      const edgeGain = isDigitalArt ? 0.26 : 0.14;
      for (let y = 1; y < targetH - 1; y += 1) {
        const row = y * stride;
        for (let x = 1; x < targetW - 1; x += 1) {
          const idx = row + x * 4;
          const left = copy[idx - 4];
          const right = copy[idx + 4];
          const up = copy[idx - stride];
          const down = copy[idx + stride];
          const lapR = copy[idx] * 4 - left - right - up - down;
          const lapG =
            copy[idx + 1] * 4 -
            copy[idx - 3] -
            copy[idx + 5] -
            copy[idx - stride + 1] -
            copy[idx + stride + 1];
          const lapB =
            copy[idx + 2] * 4 -
            copy[idx - 2] -
            copy[idx + 6] -
            copy[idx - stride + 2] -
            copy[idx + stride + 2];

          data[idx] = clampByte(copy[idx] + lapR * edgeGain);
          data[idx + 1] = clampByte(copy[idx + 1] + lapG * edgeGain);
          data[idx + 2] = clampByte(copy[idx + 2] + lapB * edgeGain);
        }
      }
    }

    wctx.putImageData(imgData, 0, 0);
  } catch {
    // Fallback cleanly if canvas readback is ever restricted
  }

  // Step 3: Volumetric Studio Relighting & Modern Optical Light FX directly on the photo
  drawPhotoVolumetricFx(wctx, targetW, targetH, spec, palette, accent);

  // Step 4: Modern Integrated Graphic Design Overlay directly on the photo
  drawPhotoGraphicOverlay(wctx, targetW, targetH, spec.graphicDesignOverlay || 'editorial_lines', palette, accent);

  return workCanvas;
}

function drawPhotoVolumetricFx(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spec: DukeImageDesignSpec,
  palette: RelightPalette,
  accent: string
) {
  const lightFx: DukeLightFx = spec.lightFx || 'prism_beams';
  const photoStyle: DukePhotoStyle = spec.photoStyle || 'studio_relight';
  const rim = palette.rimColor || accent;
  const secondary = palette.secondaryGlow || accent;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Directional Studio Rim Lighting along left & right contours of the photo
  const leftRim = ctx.createRadialGradient(
    -width * 0.04,
    height * 0.32,
    width * 0.02,
    width * 0.12,
    height * 0.36,
    width * 0.62
  );
  leftRim.addColorStop(0, hexToRgba(rim, photoStyle === 'neon_modern' ? 0.56 : 0.34));
  leftRim.addColorStop(0.55, hexToRgba(rim, 0.1));
  leftRim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftRim;
  ctx.fillRect(0, 0, width, height);

  const rightRim = ctx.createRadialGradient(
    width * 1.04,
    height * 0.68,
    width * 0.02,
    width * 0.88,
    height * 0.64,
    width * 0.62
  );
  rightRim.addColorStop(0, hexToRgba(secondary, photoStyle === 'neon_modern' ? 0.52 : 0.28));
  rightRim.addColorStop(0.55, hexToRgba(secondary, 0.08));
  rightRim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rightRim;
  ctx.fillRect(0, 0, width, height);

  if (lightFx === 'prism_beams' || lightFx === 'studio_rim') {
    // Sleek diagonal volumetric studio light shafts sweeping across the photo
    ctx.save();
    ctx.translate(width * 0.5, height * 0.5);
    ctx.rotate(-0.52);
    const beams = [
      { x: -width * 0.45, w: width * 0.16, a: 0.2, c: rim },
      { x: -width * 0.12, w: width * 0.07, a: 0.14, c: '#ffffff' },
      { x: width * 0.22, w: width * 0.18, a: 0.18, c: secondary },
    ];
    for (const b of beams) {
      const grad = ctx.createLinearGradient(b.x, -height, b.x + b.w, -height);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, hexToRgba(b.c, b.a));
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(b.x, -height, b.w, height * 2);
    }
    ctx.restore();
  }

  if (lightFx === 'sun_flare' || photoStyle === 'golden_gala') {
    const fx = width * 0.82;
    const fy = height * 0.18;
    const flare = ctx.createRadialGradient(fx, fy, 4, fx, fy, width * 0.58);
    flare.addColorStop(0, 'rgba(255,250,230,0.68)');
    flare.addColorStop(0.22, hexToRgba(rim, 0.34));
    flare.addColorStop(0.6, hexToRgba(secondary, 0.08));
    flare.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, width, height);
  }

  if (lightFx === 'bokeh_orbs' || photoStyle === 'golden_gala') {
    const orbs = [
      { x: 0.14, y: 0.18, r: 0.055, a: 0.34, c: rim },
      { x: 0.86, y: 0.22, r: 0.07, a: 0.28, c: secondary },
      { x: 0.22, y: 0.78, r: 0.06, a: 0.26, c: '#ffffff' },
      { x: 0.82, y: 0.72, r: 0.085, a: 0.3, c: rim },
      { x: 0.08, y: 0.52, r: 0.036, a: 0.38, c: '#fef08a' },
      { x: 0.92, y: 0.46, r: 0.042, a: 0.34, c: secondary },
      { x: 0.72, y: 0.11, r: 0.028, a: 0.42, c: '#ffffff' },
      { x: 0.34, y: 0.88, r: 0.038, a: 0.26, c: rim },
    ];
    for (const o of orbs) {
      const cx = width * o.x;
      const cy = height * o.y;
      const rad = Math.min(width, height) * o.r;
      const g = ctx.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
      g.addColorStop(0, hexToRgba(o.c, o.a));
      g.addColorStop(0.75, hexToRgba(o.c, o.a * 0.45));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (lightFx === 'neon_rings' || photoStyle === 'neon_modern') {
    ctx.save();
    ctx.shadowColor = rim;
    ctx.shadowBlur = 32;
    ctx.strokeStyle = hexToRgba(rim, 0.72);
    ctx.lineWidth = Math.max(3, width * 0.0045);
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.48, width * 0.44, height * 0.26, -0.28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = secondary;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = hexToRgba(secondary, 0.55);
    ctx.lineWidth = Math.max(2, width * 0.003);
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.48, width * 0.38, height * 0.42, 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawPhotoGraphicOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: DukeGraphicOverlay,
  palette: RelightPalette,
  accent: string
) {
  if (overlay === 'clean') return;
  const primary = palette.rimColor || accent;
  const secondary = palette.secondaryGlow || '#ffffff';

  ctx.save();
  if (overlay === 'editorial_lines') {
    const inset = Math.round(Math.min(width, height) * 0.048);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    // Sleek editorial top & bottom architectural hairlines
    ctx.beginPath();
    ctx.moveTo(inset, inset + 12);
    ctx.lineTo(width - inset, inset + 12);
    ctx.moveTo(inset, height - inset - 12);
    ctx.lineTo(width - inset, height - inset - 12);
    ctx.stroke();

    // Accent diamond marker top-left & bottom-right
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(inset, inset + 12, 4.5, 0, Math.PI * 2);
    ctx.arc(width - inset, height - inset - 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (overlay === 'glass_cards') {
    // Diagonal translucent glass prism accent ribbons fused at corners
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(0, height * 0.08);
    ctx.lineTo(width * 0.28, 0);
    ctx.lineTo(width * 0.42, 0);
    ctx.lineTo(0, height * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width, height * 0.78);
    ctx.lineTo(width * 0.64, height);
    ctx.lineTo(width * 0.78, height);
    ctx.lineTo(width, height * 0.89);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(primary, 0.14);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(primary, 0.45);
    ctx.stroke();
    ctx.restore();
  } else if (overlay === 'cyber_hud') {
    const pad = Math.round(Math.min(width, height) * 0.055);
    const len = Math.round(Math.min(width, height) * 0.075);
    ctx.strokeStyle = hexToRgba(primary, 0.85);
    ctx.shadowColor = primary;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    const corners: Array<[number, number, number, number]> = [
      [pad, pad, 1, 1],
      [width - pad, pad, -1, 1],
      [pad, height - pad, 1, -1],
      [width - pad, height - pad, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * len, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * len);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexToRgba(secondary, 0.35);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(pad + len + 12, pad);
    ctx.lineTo(width - pad - len - 12, pad);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (overlay === 'luxury_crest') {
    // Subtle metallic sheen & radial corner light accents
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, hexToRgba(primary, 0.22));
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    grad.addColorStop(1, hexToRgba(primary, 0.18));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  motif: DukeImageDesignSpec['decorativeMotif'],
  width: number,
  height: number,
  accent: string
) {
  ctx.save();
  if (motif === 'rays') {
    const cx = width * 0.5;
    const cy = height * 0.28;
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * width * 1.1, cy + Math.sin(angle) * height * 1.1);
      ctx.strokeStyle = hexToRgba(accent, 0.08);
      ctx.lineWidth = Math.max(2, width * 0.012);
      ctx.stroke();
    }
  } else if (motif === 'grid') {
    ctx.strokeStyle = hexToRgba(accent, 0.11);
    ctx.lineWidth = 1;
    const step = Math.round(Math.min(width, height) / 14);
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (motif === 'waves') {
    for (let w = 0; w < 5; w += 1) {
      ctx.beginPath();
      const baseY = height * (0.2 + w * 0.16);
      for (let x = 0; x <= width; x += 24) {
        const y = baseY + Math.sin((x / width) * Math.PI * 3 + w) * (height * 0.04);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hexToRgba(accent, 0.16 - w * 0.02);
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  } else if (motif === 'rings') {
    const cx = width * 0.5;
    const cy = height * 0.42;
    const baseR = Math.min(width, height) * 0.16;
    for (let i = 1; i <= 5; i += 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * i * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(accent, 0.22 - i * 0.032);
      ctx.lineWidth = i === 1 ? 2.5 : 1.5;
      ctx.stroke();
    }
  } else if (motif === 'orbs' || motif === 'emblem') {
    const orbs = [
      { x: width * 0.18, y: height * 0.2, r: width * 0.32, a: 0.24 },
      { x: width * 0.84, y: height * 0.76, r: width * 0.36, a: 0.2 },
      { x: width * 0.75, y: height * 0.22, r: width * 0.2, a: 0.14 },
    ];
    for (const o of orbs) {
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, hexToRgba(accent, o.a));
      g.addColorStop(1, hexToRgba(accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
  }
  ctx.restore();
}

function drawEmblem(
  ctx: CanvasRenderingContext2D,
  emblemType: DukeImageDesignSpec['emblemType'],
  cx: number,
  cy: number,
  size: number,
  accent: string
) {
  if (!emblemType || emblemType === 'none') return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = accent;
  ctx.fillStyle = hexToRgba(accent, 0.18);
  ctx.lineWidth = Math.max(3, size * 0.045);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const r = size * 0.34;
  ctx.fillStyle = accent;
  if (emblemType === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.55);
    ctx.lineTo(-r * 1.05, -r * 0.45);
    ctx.lineTo(-r * 0.42, r * 0.05);
    ctx.lineTo(0, -r * 0.75);
    ctx.lineTo(r * 0.42, r * 0.05);
    ctx.lineTo(r * 1.05, -r * 0.45);
    ctx.lineTo(r, r * 0.55);
    ctx.closePath();
    ctx.fill();
  } else if (emblemType === 'star' || emblemType === 'spark') {
    const spikes = emblemType === 'spark' ? 4 : 5;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i += 1) {
      const rad = i % 2 === 0 ? r * 1.05 : r * 0.42;
      const ang = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (emblemType === 'globe') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.45, r * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(r * 0.9, 0);
    ctx.stroke();
  } else if (emblemType === 'cross') {
    const bar = r * 0.28;
    ctx.fillRect(-bar / 2, -r * 0.9, bar, r * 1.8);
    ctx.fillRect(-r * 0.65, -r * 0.32, r * 1.3, bar);
  } else if (emblemType === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.lineTo(r * 0.85, -r * 0.52);
    ctx.lineTo(r * 0.72, r * 0.25);
    ctx.quadraticCurveTo(0, r * 1.05, 0, r * 1.05);
    ctx.quadraticCurveTo(0, r * 1.05, -r * 0.72, r * 0.25);
    ctx.lineTo(-r * 0.85, -r * 0.52);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frameStyle: DukeImageDesignSpec['frameStyle'],
  width: number,
  height: number,
  accent: string
) {
  if (frameStyle === 'none') return;
  ctx.save();
  const pad = Math.round(Math.min(width, height) * 0.032);
  if (frameStyle === 'gold_double') {
    ctx.strokeStyle = hexToRgba(accent, 0.82);
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 24);
    ctx.stroke();

    const innerPad = pad + 12;
    ctx.strokeStyle = hexToRgba(accent, 0.38);
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, innerPad, innerPad, width - innerPad * 2, height - innerPad * 2, 18);
    ctx.stroke();
  } else if (frameStyle === 'minimal_white') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 22);
    ctx.stroke();
  } else if (frameStyle === 'neon_glow') {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 28;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 28);
    ctx.stroke();
  } else if (frameStyle === 'glass_modern') {
    const borderGrad = ctx.createLinearGradient(pad, pad, width - pad, height - pad);
    borderGrad.addColorStop(0, 'rgba(255,255,255,0.78)');
    borderGrad.addColorStop(0.45, hexToRgba(accent, 0.58));
    borderGrad.addColorStop(1, 'rgba(255,255,255,0.24)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 30);
    ctx.stroke();

    const innerPad = pad + 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.2;
    drawRoundedRect(ctx, innerPad, innerPad, width - innerPad * 2, height - innerPad * 2, 24);
    ctx.stroke();
  } else if (frameStyle === 'luxury_bevel') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.35, accent);
    grad.addColorStop(0.7, '#fde68a');
    grad.addColorStop(1, hexToRgba(accent, 0.85));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 26);
    ctx.stroke();

    const innerPad = pad + 14;
    ctx.strokeStyle = hexToRgba(accent, 0.42);
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, innerPad, innerPad, width - innerPad * 2, height - innerPad * 2, 18);
    ctx.stroke();

    const cornerLen = Math.round(Math.min(width, height) * 0.065);
    const cPad = pad - 6;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    const corners: Array<[number, number, number, number]> = [
      [cPad, cPad, 1, 1],
      [width - cPad, cPad, -1, 1],
      [cPad, height - cPad, 1, -1],
      [width - cPad, height - cPad, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * cornerLen, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * cornerLen);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCardBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  accent: string,
  frameStyle: DukeImageDesignSpec['frameStyle']
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  if (frameStyle === 'glass_modern') {
    grad.addColorStop(0, 'rgba(255,255,255,0.88)');
    grad.addColorStop(0.5, hexToRgba(accent, 0.72));
    grad.addColorStop(1, 'rgba(255,255,255,0.34)');
  } else if (frameStyle === 'neon_glow') {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 26;
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, accent);
    grad.addColorStop(1, accent);
  } else {
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.45, accent);
    grad.addColorStop(1, '#fde68a');
  }

  ctx.strokeStyle = grad;
  ctx.lineWidth = frameStyle === 'minimal_white' ? 3.5 : 5;
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x + 6, y + 6, w - 12, h - 12, Math.max(8, radius - 5));
  ctx.stroke();
  ctx.restore();
}

export async function renderDukeImageStudio(
  spec: DukeImageDesignSpec,
  sourceImageDataUrl?: string
): Promise<string> {
  const { width, height } = getCanvasDimensions(spec.aspectRatio || '1:1');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D indisponível neste navegador.');
  }

  const bgStart = safeHex(spec.bgStart, '#04140d');
  const bgMid = safeHex(spec.bgMid, '#092b1c');
  const bgEnd = safeHex(spec.bgEnd, '#030b07');
  const accent = safeHex(spec.accentColor, '#f59e0b');
  const textPrimary = safeHex(spec.textPrimary, '#ffffff');
  const textMuted = safeHex(spec.textMuted, '#d1fae5');

  // 1. Base Studio Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, bgStart);
  bgGrad.addColorStop(0.52, bgMid);
  bgGrad.addColorStop(1, bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const hasPhoto = spec.mode === 'reformulate' && Boolean(sourceImageDataUrl);
  const hasTextBlock = Boolean(
    spec.badgeText?.trim() ||
      spec.headline?.trim() ||
      spec.subheadline?.trim() ||
      spec.ctaText?.trim() ||
      spec.footerText?.trim()
  );
  const isBackdropShowcase =
    spec.layout === 'modern_backdrop' ||
    spec.layout === 'glass_showcase' ||
    spec.layout === 'luxury_frame' ||
    spec.layout === 'framed_poster';

  // 2. If Modifying/Redesigning a User Photo: Transform the Actual Photo Pixels First!
  if (hasPhoto && sourceImageDataUrl) {
    const photo = await loadImage(sourceImageDataUrl);

    if (isBackdropShowcase) {
      // Rich modern atmospheric studio background BEHIND the redesigned photo
      ctx.save();
      ctx.filter = 'blur(36px) saturate(1.42) brightness(0.95)';
      ctx.globalAlpha = spec.layout === 'glass_showcase' ? 0.36 : 0.28;
      drawCoverImage(ctx, photo, -40, -40, width + 80, height + 80);
      ctx.restore();

      ctx.save();
      const mixGrad = ctx.createLinearGradient(0, 0, width, height);
      mixGrad.addColorStop(0, hexToRgba(bgStart, 0.8));
      mixGrad.addColorStop(0.5, hexToRgba(bgMid, 0.7));
      mixGrad.addColorStop(1, hexToRgba(bgEnd, 0.86));
      ctx.fillStyle = mixGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      drawMotif(ctx, spec.decorativeMotif || 'orbs', width, height, accent);

      const haloY = hasTextBlock ? height * 0.4 : height * 0.5;
      const haloGrad = ctx.createRadialGradient(
        width * 0.5,
        haloY,
        Math.min(width, height) * 0.06,
        width * 0.5,
        haloY,
        Math.max(width, height) * 0.62
      );
      haloGrad.addColorStop(0, hexToRgba(accent, 0.4));
      haloGrad.addColorStop(0.55, hexToRgba(accent, 0.1));
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, width, height);

      const hasTopBadge = Boolean(spec.badgeText?.trim());
      const hasMainText = Boolean(spec.headline?.trim() || spec.subheadline?.trim() || spec.ctaText?.trim());
      const cardW = Math.round(width * (spec.layout === 'luxury_frame' ? 0.76 : 0.82));
      const cardH = Math.round(
        hasMainText ? height * (spec.aspectRatio === '16:9' ? 0.52 : 0.54) : height * 0.74
      );
      const cardX = Math.round((width - cardW) / 2);
      const cardY = Math.round(
        hasMainText
          ? hasTopBadge
            ? height * 0.145
            : height * 0.095
          : (height - cardH) / 2
      );
      const cardRadius = spec.layout === 'glass_showcase' ? 34 : 28;

      // Build pixel-transformed photo canvas at exact card resolution
      const transformedCard = buildTransformedPhotoCanvas(photo, cardW, cardH, spec, accent);

      if (spec.layout === 'modern_backdrop') {
        ctx.save();
        ctx.translate(width / 2, cardY + cardH / 2);
        ctx.rotate(-0.032);
        drawRoundedRect(ctx, -cardW / 2 - 6, -cardH / 2 - 4, cardW + 12, cardH + 8, cardRadius + 4);
        ctx.fillStyle = hexToRgba(accent, 0.18);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(accent, 0.58);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      if (spec.layout === 'glass_showcase') {
        const gPad = 18;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 44;
        ctx.shadowOffsetY = 20;
        drawRoundedRect(ctx, cardX - gPad, cardY - gPad, cardW + gPad * 2, cardH + gPad * 2, cardRadius + 10);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.36)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.74)';
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 22;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.fillStyle = '#050908';
      ctx.fill();
      ctx.restore();

      ctx.save();
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.clip();
      ctx.drawImage(transformedCard, cardX, cardY, cardW, cardH);

      // Glossy top studio sheen on the redesigned photo
      const sheenGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH * 0.26);
      sheenGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
      sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(cardX, cardY, cardW, cardH * 0.26);
      ctx.restore();

      drawCardBorder(
        ctx,
        cardX,
        cardY,
        cardW,
        cardH,
        cardRadius,
        accent,
        spec.frameStyle || 'luxury_bevel'
      );

      if (spec.layout === 'luxury_frame') {
        ctx.save();
        ctx.strokeStyle = hexToRgba(accent, 0.45);
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, cardX - 12, cardY - 12, cardW + 24, cardH + 24, cardRadius + 8);
        ctx.stroke();
        ctx.restore();
      }
    } else if (spec.layout === 'split_hero') {
      const splitH = Math.round(height * 0.6);
      const transformedTop = buildTransformedPhotoCanvas(photo, width, splitH, spec, accent);
      ctx.drawImage(transformedTop, 0, 0, width, splitH);

      const fadeGrad = ctx.createLinearGradient(0, splitH * 0.55, 0, splitH + 40);
      fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fadeGrad.addColorStop(1, bgEnd);
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, splitH * 0.55, width, height - splitH * 0.55);
    } else {
      // Full-canvas modern redesign directly on the photo itself!
      const transformedFull = buildTransformedPhotoCanvas(photo, width, height, spec, accent);
      ctx.drawImage(transformedFull, 0, 0, width, height);

      const tintOpacity = Math.max(0, Math.min(0.45, spec.tintOpacity ?? 0.1));
      if (tintOpacity > 0.01) {
        ctx.save();
        ctx.fillStyle = hexToRgba(spec.tintColor || accent, tintOpacity);
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // Studio Vignette for editorial depth
    const vignette = Math.max(0, Math.min(0.85, spec.vignette ?? (isBackdropShowcase ? 0.34 : 0.44)));
    if (vignette > 0.02) {
      const vGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        Math.min(width, height) * 0.3,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8
      );
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(1, `rgba(0,0,0,${vignette})`);
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);
    }

    const textPos = spec.textPosition || 'bottom';
    const hasAnyOverlayText = Boolean(
      spec.badgeText?.trim() || spec.headline?.trim() || spec.subheadline?.trim() || spec.ctaText?.trim()
    );

    if (hasAnyOverlayText && !isBackdropShowcase && spec.layout !== 'split_hero') {
      if (textPos === 'top') {
        const topScrim = ctx.createLinearGradient(0, 0, 0, height * 0.52);
        topScrim.addColorStop(0, 'rgba(0,0,0,0.82)');
        topScrim.addColorStop(0.55, 'rgba(0,0,0,0.38)');
        topScrim.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topScrim;
        ctx.fillRect(0, 0, width, height * 0.52);
      } else if (textPos === 'center') {
        const midScrim = ctx.createLinearGradient(0, height * 0.16, 0, height * 0.84);
        midScrim.addColorStop(0, 'rgba(0,0,0,0.04)');
        midScrim.addColorStop(0.5, 'rgba(0,0,0,0.66)');
        midScrim.addColorStop(1, 'rgba(0,0,0,0.06)');
        ctx.fillStyle = midScrim;
        ctx.fillRect(0, height * 0.16, width, height * 0.68);
      } else {
        const scrim = ctx.createLinearGradient(0, height * 0.38, 0, height);
        scrim.addColorStop(0, 'rgba(0,0,0,0)');
        scrim.addColorStop(0.55, 'rgba(0,0,0,0.48)');
        scrim.addColorStop(1, 'rgba(0,0,0,0.86)');
        ctx.fillStyle = scrim;
        ctx.fillRect(0, height * 0.38, width, height * 0.62);
      }
    }
  } else {
    // Creation Mode: Rich Geometric Studio Atmosphere + Volumetric Light FX + Emblem
    drawMotif(ctx, spec.decorativeMotif || 'orbs', width, height, accent);
    const palette = getRelightPalette(spec.relightPreset || 'emerald_royal', accent);
    drawPhotoVolumetricFx(ctx, width, height, spec, palette, accent);
    drawPhotoGraphicOverlay(ctx, width, height, spec.graphicDesignOverlay || 'editorial_lines', palette, accent);

    const vGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      Math.min(width, height) * 0.12,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.8
    );
    vGrad.addColorStop(0, hexToRgba(accent, 0.18));
    vGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, width, height);

    if (spec.emblemType && spec.emblemType !== 'none') {
      const emblemSize = Math.round(Math.min(width, height) * 0.17);
      drawEmblem(ctx, spec.emblemType, width * 0.5, height * 0.24, emblemSize, accent);
    }
  }

  // 3. Decorative Architectural Frame
  drawFrame(ctx, spec.frameStyle || 'luxury_bevel', width, height, accent);

  // 4. Typography Overlay (Badge, Headline, Subheadline, CTA, Footer)
  const padX = Math.round(width * 0.085);
  const maxTextW = width - padX * 2;
  const baseUnit = Math.min(width, height);
  const fontScale = Math.max(0.7, Math.min(1.45, spec.fontScale ?? 1));
  const headlineSize = Math.round(
    baseUnit * (spec.aspectRatio === '16:9' ? 0.072 : 0.064) * fontScale
  );
  const subSize = Math.round(baseUnit * 0.03 * Math.min(1.25, fontScale));
  const badgeSize = Math.round(baseUnit * 0.023);

  const headlineFontFamily =
    spec.fontStyle === 'impact'
      ? '"Impact", "Arial Black", system-ui, sans-serif'
      : spec.fontStyle === 'modern'
        ? '"Inter", system-ui, -apple-system, sans-serif'
        : '"Georgia", "Playfair Display", serif';

  const textPos = spec.textPosition || (hasPhoto ? 'bottom' : 'center');

  if (hasTextBlock) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (spec.badgeText?.trim()) {
      const badgeStr = spec.badgeText.trim().toUpperCase().slice(0, 44);
      ctx.font = `700 ${badgeSize}px "Inter", system-ui, -apple-system, sans-serif`;
      const bw = Math.min(maxTextW, ctx.measureText(badgeStr).width + 44);
      const bh = Math.round(badgeSize * 2.15);
      const bx = (width - bw) / 2;
      const by = hasPhoto && isBackdropShowcase ? height * 0.056 : height * 0.082;

      drawRoundedRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fillStyle = hexToRgba(accent, 0.26);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(accent, 0.9);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.fillText(badgeStr, width / 2, by + bh / 2 + 1);
    }

    let cursorY = height * 0.66;
    if (hasPhoto) {
      if (isBackdropShowcase) {
        cursorY = textPos === 'top' ? height * 0.16 : height * 0.74;
      } else if (spec.layout === 'split_hero') {
        cursorY = height * 0.68;
      } else if (textPos === 'top') {
        cursorY = spec.badgeText?.trim() ? height * 0.2 : height * 0.14;
      } else if (textPos === 'center') {
        cursorY = height * 0.44;
      } else {
        cursorY = height * 0.68;
      }
    } else {
      cursorY =
        textPos === 'top'
          ? height * 0.24
          : textPos === 'bottom'
            ? height * 0.62
            : spec.emblemType && spec.emblemType !== 'none'
              ? height * 0.48
              : height * 0.42;
    }

    if (spec.layout === 'editorial_card' && hasPhoto) {
      const boxH = height * 0.34;
      const boxY =
        textPos === 'top'
          ? height * 0.12
          : textPos === 'center'
            ? (height - boxH) / 2
            : height - boxH - height * 0.07;
      drawRoundedRect(ctx, padX * 0.72, boxY, width - padX * 1.44, boxH, 26);
      ctx.fillStyle = 'rgba(4, 14, 10, 0.8)';
      ctx.fill();
      ctx.strokeStyle = hexToRgba(accent, 0.62);
      ctx.lineWidth = 2;
      ctx.stroke();
      cursorY = boxY + boxH * 0.28;
    }

    if (spec.headline?.trim()) {
      ctx.font = `800 ${headlineSize}px ${headlineFontFamily}`;
      ctx.fillStyle = textPrimary;
      ctx.shadowColor = 'rgba(0,0,0,0.82)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 4;
      const lines = wrapLines(ctx, spec.headline.trim(), maxTextW, 3);
      const lineH = Math.round(headlineSize * 1.15);
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, cursorY + idx * lineH);
      });
      cursorY += lines.length * lineH + Math.round(baseUnit * 0.02);
    }

    if (spec.subheadline?.trim()) {
      ctx.shadowBlur = 12;
      ctx.font = `500 ${subSize}px "Inter", system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = textMuted;
      const subLines = wrapLines(ctx, spec.subheadline.trim(), maxTextW * 0.92, 3);
      const subLineH = Math.round(subSize * 1.38);
      subLines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, cursorY + idx * subLineH);
      });
      cursorY += subLines.length * subLineH + Math.round(baseUnit * 0.025);
    }

    if (spec.ctaText?.trim()) {
      ctx.shadowBlur = 0;
      const ctaStr = spec.ctaText.trim().slice(0, 40);
      const ctaFont = Math.round(baseUnit * 0.028);
      ctx.font = `800 ${ctaFont}px "Inter", system-ui, -apple-system, sans-serif`;
      const cw = Math.min(maxTextW * 0.86, ctx.measureText(ctaStr).width + 64);
      const ch = Math.round(ctaFont * 2.25);
      const cx = (width - cw) / 2;
      const cy = Math.min(height - ch - height * 0.085, cursorY);

      drawRoundedRect(ctx, cx, cy, cw, ch, 14);
      ctx.fillStyle = accent;
      ctx.fill();

      ctx.fillStyle = '#0a0a0a';
      ctx.fillText(ctaStr, width / 2, cy + ch / 2 + 1);
    }

    if (spec.footerText?.trim()) {
      ctx.shadowBlur = 6;
      const footerFont = Math.round(baseUnit * 0.021);
      ctx.font = `600 ${footerFont}px "Inter", system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = hexToRgba(textMuted, 0.92);
      ctx.fillText(spec.footerText.trim().slice(0, 84), width / 2, height - height * 0.052);
    }

    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

export async function compressDataUrlForFirestoreBanner(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const maxW = 920;
  const maxH = 540;
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl.slice(0, 54000);
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.82;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > 54000 && quality > 0.35) {
    quality -= 0.08;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}
