import type { DukeImageAspectRatio, DukeImageDesignSpec } from '../types';

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

function hexToRgba(hex: string, alpha: number): string {
  const clean = safeHex(hex, '#f59e0b').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
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
  img: HTMLImageElement,
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

  // Outer glowing halo circle
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
  const pad = Math.round(Math.min(width, height) * 0.036);
  if (frameStyle === 'gold_double') {
    ctx.strokeStyle = hexToRgba(accent, 0.75);
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 24);
    ctx.stroke();

    const innerPad = pad + 12;
    ctx.strokeStyle = hexToRgba(accent, 0.35);
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, innerPad, innerPad, width - innerPad * 2, height - innerPad * 2, 18);
    ctx.stroke();
  } else if (frameStyle === 'minimal_white') {
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 20);
    ctx.stroke();
  } else if (frameStyle === 'neon_glow') {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 26);
    ctx.stroke();
  }
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

  // 2. If Reformulating an Uploaded Image, Render & Color-Grade the User's Real Photo
  if (hasPhoto && sourceImageDataUrl) {
    const photo = await loadImage(sourceImageDataUrl);
    const brightness = Math.max(0.65, Math.min(1.5, spec.brightness ?? 1.04));
    const contrast = Math.max(0.75, Math.min(1.6, spec.contrast ?? 1.12));
    const saturate = Math.max(0.0, Math.min(1.9, spec.saturate ?? 1.15));
    const sepia = Math.max(0.0, Math.min(0.65, spec.sepia ?? 0));
    const hueRotate = Math.max(-45, Math.min(45, spec.hueRotate ?? 0));
    const filterCss = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`;

    ctx.save();
    ctx.filter = filterCss;

    if (spec.layout === 'framed_poster') {
      // Soft blurred ambient backdrop + crisp framed portrait/subject card
      ctx.save();
      ctx.filter = `${filterCss} blur(26px)`;
      ctx.globalAlpha = 0.45;
      drawCoverImage(ctx, photo, -30, -30, width + 60, height + 60);
      ctx.restore();

      const cardW = width * 0.78;
      const cardH = height * 0.56;
      const cardX = (width - cardW) / 2;
      const cardY = height * 0.14;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 42;
      ctx.shadowOffsetY = 18;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      ctx.save();
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
      ctx.clip();
      ctx.filter = filterCss;
      drawCoverImage(ctx, photo, cardX, cardY, cardW, cardH);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = hexToRgba(accent, 0.85);
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
      ctx.stroke();
      ctx.restore();
    } else if (spec.layout === 'split_hero') {
      const splitH = height * 0.58;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, splitH);
      ctx.clip();
      drawCoverImage(ctx, photo, 0, 0, width, splitH);
      ctx.restore();

      // Smooth fade transition into lower typography zone
      const fadeGrad = ctx.createLinearGradient(0, splitH * 0.55, 0, splitH + 40);
      fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fadeGrad.addColorStop(1, bgEnd);
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, splitH * 0.55, width, height - splitH * 0.55);
    } else {
      // full_bleed / cinematic_bottom / editorial_card
      drawCoverImage(ctx, photo, 0, 0, width, height);
    }
    ctx.restore();

    // Optional studio color tint overlay
    const tintOpacity = Math.max(0, Math.min(0.55, spec.tintOpacity ?? 0.14));
    if (tintOpacity > 0.01) {
      ctx.save();
      ctx.fillStyle = hexToRgba(spec.tintColor || accent, tintOpacity);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Vignette & text readability gradient
    const vignette = Math.max(0, Math.min(0.9, spec.vignette ?? 0.55));
    if (vignette > 0.02) {
      const vGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        Math.min(width, height) * 0.25,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.78
      );
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(1, `rgba(0,0,0,${vignette})`);
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);
    }

    if (spec.layout !== 'framed_poster' && spec.layout !== 'split_hero') {
      const scrim = ctx.createLinearGradient(0, height * 0.35, 0, height);
      scrim.addColorStop(0, 'rgba(0,0,0,0.06)');
      scrim.addColorStop(0.55, 'rgba(0,0,0,0.52)');
      scrim.addColorStop(1, 'rgba(0,0,0,0.88)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, height * 0.35, width, height * 0.65);
    }
  } else {
    // Creation Mode: Rich Geometric Studio Atmosphere + Emblem
    drawMotif(ctx, spec.decorativeMotif || 'orbs', width, height, accent);

    // Subtle dark editorial vignette for depth
    const vGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      Math.min(width, height) * 0.12,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.8
    );
    vGrad.addColorStop(0, hexToRgba(accent, 0.14));
    vGrad.addColorStop(1, 'rgba(0,0,0,0.52)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, width, height);

    if (spec.emblemType && spec.emblemType !== 'none') {
      const emblemSize = Math.round(Math.min(width, height) * 0.17);
      drawEmblem(ctx, spec.emblemType, width * 0.5, height * 0.24, emblemSize, accent);
    }
  }

  // 3. Decorative Architectural Frame
  drawFrame(ctx, spec.frameStyle || 'gold_double', width, height, accent);

  // 4. Typography Overlay (Badge, Headline, Subheadline, CTA, Footer)
  const padX = Math.round(width * 0.085);
  const maxTextW = width - padX * 2;
  const baseUnit = Math.min(width, height);
  const headlineSize = Math.round(baseUnit * (spec.aspectRatio === '16:9' ? 0.075 : 0.068));
  const subSize = Math.round(baseUnit * 0.032);
  const badgeSize = Math.round(baseUnit * 0.024);

  const hasTextBlock = Boolean(
    spec.badgeText?.trim() || spec.headline?.trim() || spec.subheadline?.trim() || spec.ctaText?.trim()
  );

  if (hasTextBlock) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top Badge Pill
    if (spec.badgeText?.trim()) {
      const badgeStr = spec.badgeText.trim().toUpperCase().slice(0, 44);
      ctx.font = `700 ${badgeSize}px "Inter", system-ui, -apple-system, sans-serif`;
      const bw = Math.min(maxTextW, ctx.measureText(badgeStr).width + 44);
      const bh = Math.round(badgeSize * 2.15);
      const bx = (width - bw) / 2;
      const by = hasPhoto && spec.layout === 'framed_poster' ? height * 0.062 : height * 0.085;

      drawRoundedRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fillStyle = hexToRgba(accent, 0.22);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(accent, 0.85);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.fillText(badgeStr, width / 2, by + bh / 2 + 1);
    }

    // Main Headline Position
    let cursorY = hasPhoto
      ? spec.layout === 'framed_poster'
        ? height * 0.77
        : spec.layout === 'split_hero'
          ? height * 0.67
          : height * 0.67
      : spec.emblemType && spec.emblemType !== 'none'
        ? height * 0.48
        : height * 0.42;

    if (spec.layout === 'editorial_card' && hasPhoto) {
      const boxH = height * 0.34;
      const boxY = height - boxH - height * 0.07;
      drawRoundedRect(ctx, padX * 0.72, boxY, width - padX * 1.44, boxH, 26);
      ctx.fillStyle = 'rgba(4, 14, 10, 0.82)';
      ctx.fill();
      ctx.strokeStyle = hexToRgba(accent, 0.55);
      ctx.lineWidth = 2;
      ctx.stroke();
      cursorY = boxY + boxH * 0.28;
    }

    if (spec.headline?.trim()) {
      ctx.font = `800 ${headlineSize}px "Georgia", "Playfair Display", serif`;
      ctx.fillStyle = textPrimary;
      ctx.shadowColor = 'rgba(0,0,0,0.68)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;
      const lines = wrapLines(ctx, spec.headline.trim(), maxTextW, 3);
      const lineH = Math.round(headlineSize * 1.15);
      lines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, cursorY + idx * lineH);
      });
      cursorY += lines.length * lineH + Math.round(baseUnit * 0.02);
    }

    if (spec.subheadline?.trim()) {
      ctx.shadowBlur = 10;
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
      ctx.fillStyle = hexToRgba(textMuted, 0.85);
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
