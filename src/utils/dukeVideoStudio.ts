import type {
  DukeVideoAspectRatio,
  DukeVideoMusicMood,
  DukeVideoScene,
  DukeVideoSpec,
  DukeVideoVisualStyle,
} from '../types';

function getVideoDimensions(aspectRatio: DukeVideoAspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 960, height: 540 };
    case '1:1':
      return { width: 720, height: 720 };
    case '9:16':
    default:
      return { width: 540, height: 960 };
  }
}

function safeHex(color: string | undefined, fallback: string): string {
  const trimmed = (color || '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
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

function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

function easeInOutSine(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return -(Math.cos(Math.PI * c) - 1) / 2;
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

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
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
        current = words.slice(i).join(' ');
        break;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function loadOptionalImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawKenBurnsPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  progress: number,
  motion: DukeVideoScene['cameraMotion']
) {
  const p = easeInOutSine(progress);
  let scale = 1.06 + p * 0.14;
  let offsetX = 0;
  let offsetY = 0;

  if (motion === 'zoom_out') {
    scale = 1.2 - p * 0.14;
  } else if (motion === 'pan_left') {
    scale = 1.15;
    offsetX = (0.5 - p) * width * 0.12;
  } else if (motion === 'pan_right') {
    scale = 1.15;
    offsetX = (p - 0.5) * width * 0.12;
  } else {
    offsetY = (0.5 - p) * height * 0.04;
  }

  const imgRatio = img.width / img.height;
  const boxRatio = width / height;
  let drawW = width * scale;
  let drawH = height * scale;
  if (imgRatio > boxRatio) {
    drawH = height * scale;
    drawW = drawH * imgRatio;
  } else {
    drawW = width * scale;
    drawH = drawW / imgRatio;
  }

  const dx = (width - drawW) / 2 + offsetX;
  const dy = (height - drawH) / 2 + offsetY;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

export function getStylePaletteOverride(style: DukeVideoVisualStyle): {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  accent: string;
} {
  switch (style) {
    case 'neon_cyber':
      return { bgStart: '#060c24', bgMid: '#121d4f', bgEnd: '#040614', accent: '#38bdf8' };
    case 'aurora_glass':
      return { bgStart: '#06202a', bgMid: '#0f3d4c', bgEnd: '#041019', accent: '#34d399' };
    case 'royal_emerald':
      return { bgStart: '#041710', bgMid: '#0b3826', bgEnd: '#020b07', accent: '#f59e0b' };
    case 'sunset_promo':
      return { bgStart: '#290a1e', bgMid: '#591632', bgEnd: '#11050c', accent: '#fb923c' };
    case 'editorial_noir':
      return { bgStart: '#09090b', bgMid: '#1c1917', bgEnd: '#050505', accent: '#fde68a' };
    case 'cinematic_gold':
    default:
      return { bgStart: '#07150e', bgMid: '#143322', bgEnd: '#040a07', accent: '#fbbf24' };
  }
}

export function drawDukeVideoFrame(
  ctx: CanvasRenderingContext2D,
  spec: DukeVideoSpec,
  scene: DukeVideoScene,
  sceneIndex: number,
  sceneProgress: number, // 0..1
  globalTimeSec: number,
  totalDurationSec: number,
  photo: HTMLImageElement | null
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const baseUnit = Math.min(width, height);

  const stylePal = getStylePaletteOverride(spec.visualStyle || 'cinematic_gold');
  const bgStart = safeHex(scene.bgStart, stylePal.bgStart);
  const bgMid = safeHex(scene.bgMid, stylePal.bgMid);
  const bgEnd = safeHex(scene.bgEnd, stylePal.bgEnd);
  const accent = safeHex(scene.accentColor, stylePal.accent);

  // 1. Animated Gradient Studio Backdrop
  const shift = Math.sin(globalTimeSec * 0.7 + sceneIndex) * 0.14;
  const grad = ctx.createLinearGradient(
    width * (0.1 + shift),
    0,
    width * (0.9 - shift),
    height
  );
  grad.addColorStop(0, bgStart);
  grad.addColorStop(0.5, bgMid);
  grad.addColorStop(1, bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. If User Uploaded a Photo, Animate It with Ken Burns + Cinematic Grading
  if (photo) {
    ctx.save();
    ctx.globalAlpha = 0.58;
    drawKenBurnsPhoto(ctx, photo, width, height, sceneProgress, scene.cameraMotion);
    ctx.restore();

    // Rich studio cinema overlay so typography pops effortlessly
    const scrim = ctx.createLinearGradient(0, 0, 0, height);
    scrim.addColorStop(0, hexToRgba(bgStart, 0.72));
    scrim.addColorStop(0.45, hexToRgba(bgMid, 0.42));
    scrim.addColorStop(1, hexToRgba(bgEnd, 0.9));
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Dynamic Animated Motion-Graphics Motifs (Particles, Light Beams, Waves, Rings, Grid, Bokeh)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const motif = scene.visualMotif || 'particles';

  // Sweeping diagonal volumetric light shaft
  const beamX = ((globalTimeSec * 0.22 + sceneIndex * 0.35) % 1.6 - 0.3) * width;
  ctx.save();
  ctx.translate(beamX, height * 0.5);
  ctx.rotate(-0.42);
  const beamGrad = ctx.createLinearGradient(-width * 0.2, 0, width * 0.2, 0);
  beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
  beamGrad.addColorStop(0.5, hexToRgba(accent, 0.18));
  beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = beamGrad;
  ctx.fillRect(-width * 0.2, -height, width * 0.4, height * 2);
  ctx.restore();

  if (motif === 'rings' || motif === 'beams') {
    const cx = width * 0.5;
    const cy = height * 0.44;
    for (let i = 1; i <= 4; i += 1) {
      const pulse = Math.sin(globalTimeSec * 2 + i * 0.9) * 14;
      const r = baseUnit * (0.14 * i) + pulse;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(12, r), 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(accent, 0.28 - i * 0.05);
      ctx.lineWidth = i === 1 ? 3 : 1.6;
      ctx.stroke();
    }
  } else if (motif === 'waves') {
    for (let w = 0; w < 4; w += 1) {
      ctx.beginPath();
      const baseY = height * (0.25 + w * 0.17);
      for (let x = 0; x <= width; x += 20) {
        const y =
          baseY +
          Math.sin((x / width) * Math.PI * 3 + globalTimeSec * 2.1 + w) * (height * 0.032);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hexToRgba(accent, 0.24 - w * 0.04);
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  } else if (motif === 'grid') {
    const step = Math.round(baseUnit / 10);
    const offset = (globalTimeSec * 28) % step;
    ctx.strokeStyle = hexToRgba(accent, 0.14);
    ctx.lineWidth = 1;
    for (let x = -step + offset; x < width + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = -step + offset; y < height + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // Always add luminous floating cinema bokeh/particles for rich living motion
  const particleCount = motif === 'bokeh' || motif === 'particles' ? 22 : 12;
  for (let i = 0; i < particleCount; i += 1) {
    const seed = i * 1.6180339 + sceneIndex * 3.1;
    const px = ((Math.sin(seed * 7.3) * 0.5 + 0.5) * width + Math.sin(globalTimeSec * 0.8 + seed) * 24 + width) % width;
    const py =
      ((1 - ((globalTimeSec * (0.04 + (i % 5) * 0.014) + seed * 0.37) % 1)) * (height + 80)) - 40;
    const pr = baseUnit * (motif === 'bokeh' ? 0.018 + (i % 4) * 0.012 : 0.006 + (i % 3) * 0.005);
    const alpha = 0.2 + 0.22 * (0.5 + 0.5 * Math.sin(globalTimeSec * 2.5 + seed));
    const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
    pg.addColorStop(0, hexToRgba(i % 3 === 0 ? '#ffffff' : accent, alpha));
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Studio Framing Borders & Animated Corner Accents
  const pad = Math.round(baseUnit * 0.042);
  ctx.save();
  ctx.strokeStyle = hexToRgba(accent, 0.52);
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 20);
  ctx.stroke();

  // Architectural glowing corner ticks
  const cLen = Math.round(baseUnit * 0.065);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  const corners: Array<[number, number, number, number]> = [
    [pad - 4, pad - 4, 1, 1],
    [width - pad + 4, pad - 4, -1, 1],
    [pad - 4, height - pad + 4, 1, -1],
    [width - pad + 4, height - pad + 4, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * cLen, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * cLen);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Kinetic Scene Entrance & Exit Envelope
  const enter = easeOutCubic(Math.min(1, sceneProgress / 0.22));
  const exit = sceneProgress > 0.86 ? 1 - (sceneProgress - 0.86) / 0.14 : 1;
  const opacity = Math.max(0, Math.min(1, enter * exit));
  const slideY = (1 - enter) * 34;

  // 6. Animated Typography Overlay (Badge, Headline, Subheadline, CTA)
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextW = width - pad * 3.2;
  let cursorY = height * (spec.aspectRatio === '16:9' ? 0.24 : 0.31) + slideY;

  // Top Scene Badge
  if (scene.badge?.trim()) {
    const badgeStr = scene.badge.trim().toUpperCase().slice(0, 38);
    const bFont = Math.round(baseUnit * 0.028);
    ctx.font = `800 ${bFont}px "Inter", system-ui, -apple-system, sans-serif`;
    const bw = Math.min(maxTextW, ctx.measureText(badgeStr).width + 40);
    const bh = Math.round(bFont * 2.1);
    const bx = (width - bw) / 2;
    const by = cursorY - bh / 2;

    drawRoundedRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = hexToRgba(accent, 0.22);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(accent, 0.9);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillText(badgeStr, width / 2, cursorY + 1);
    cursorY += bh + baseUnit * 0.06;
  }

  // Animated Headline
  if (scene.headline?.trim()) {
    const hFont = Math.round(baseUnit * (spec.aspectRatio === '16:9' ? 0.088 : 0.082));
    ctx.font = `900 ${hFont}px "Georgia", "Playfair Display", serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 5;
    const hLines = wrapLines(ctx, scene.headline.trim(), maxTextW, 3);
    const hLineH = Math.round(hFont * 1.16);
    hLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, cursorY + idx * hLineH);
    });
    cursorY += hLines.length * hLineH + baseUnit * 0.04;
  }

  // Animated Subheadline
  if (scene.subheadline?.trim()) {
    const sFont = Math.round(baseUnit * 0.038);
    ctx.font = `500 ${sFont}px "Inter", system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(236, 253, 245, 0.92)';
    ctx.shadowBlur = 12;
    const sLines = wrapLines(ctx, scene.subheadline.trim(), maxTextW * 0.92, 3);
    const sLineH = Math.round(sFont * 1.38);
    sLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, cursorY + idx * sLineH);
    });
    cursorY += sLines.length * sLineH + baseUnit * 0.055;
  }

  // Animated CTA Button (pulsing gently)
  if (scene.ctaText?.trim()) {
    const ctaStr = scene.ctaText.trim().slice(0, 36);
    const pulseScale = 1 + Math.sin(globalTimeSec * 4.2) * 0.025;
    const cFont = Math.round(baseUnit * 0.034);
    ctx.font = `800 ${cFont}px "Inter", system-ui, -apple-system, sans-serif`;
    const cw = Math.min(maxTextW * 0.85, ctx.measureText(ctaStr).width + 54) * pulseScale;
    const ch = Math.round(cFont * 2.2) * pulseScale;
    const cx = (width - cw) / 2;
    const cy = Math.min(height - pad * 2.6 - ch, cursorY);

    ctx.shadowColor = hexToRgba(accent, 0.55);
    ctx.shadowBlur = 24;
    drawRoundedRect(ctx, cx, cy, cw, ch, 14);
    ctx.fillStyle = accent;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#09090b';
    ctx.fillText(ctaStr, width / 2, cy + ch / 2 + 1);
  }
  ctx.restore();

  // 7. Bottom Brand Bar & Smooth Timeline Progress Line
  const footerText = (spec.footerBrand || 'CONAE • ROBÔ DUQUE IA').slice(0, 48);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(baseUnit * 0.022)}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.fillText(footerText, width / 2, height - pad * 1.55);

  const barX = pad * 1.4;
  const barW = width - barX * 2;
  const barY = height - pad * 1.05;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  drawRoundedRect(ctx, barX, barY, barW, 5, 3);
  ctx.fill();

  const overallRatio = Math.max(0, Math.min(1, globalTimeSec / Math.max(0.1, totalDurationSec)));
  ctx.fillStyle = accent;
  drawRoundedRect(ctx, barX, barY, Math.max(6, barW * overallRatio), 5, 3);
  ctx.fill();
  ctx.restore();

  // Soft gold flash transition between scenes
  if (sceneProgress < 0.08 && sceneIndex > 0) {
    const flashAlpha = (1 - sceneProgress / 0.08) * 0.25;
    ctx.fillStyle = hexToRgba(accent, flashAlpha);
    ctx.fillRect(0, 0, width, height);
  }
}

interface SoundtrackHandle {
  stream: MediaStream;
  stop: () => void;
}

function createSynthesizedSoundtrack(
  mood: DukeVideoMusicMood,
  durationSec: number
): SoundtrackHandle | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const audioCtx = new AudioCtx();
    const dest = audioCtx.createMediaStreamDestination();
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.6);
    masterGain.gain.setValueAtTime(0.16, audioCtx.currentTime + Math.max(0.8, durationSec - 1.1));
    masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationSec);
    masterGain.connect(dest);

    // Musical chord progressions tailored to each mood (in Hz)
    const chordsByMood: Record<DukeVideoMusicMood, number[][]> = {
      epic_inspirational: [
        [220, 261.63, 329.63, 440],
        [174.61, 220, 261.63, 349.23],
        [261.63, 329.63, 392, 523.25],
        [196, 246.94, 293.66, 392],
      ],
      modern_tech: [
        [246.94, 293.66, 369.99, 493.88],
        [196, 246.94, 293.66, 392],
        [293.66, 369.99, 440, 587.33],
        [220, 277.18, 329.63, 440],
      ],
      corporate_upbeat: [
        [261.63, 329.63, 392, 523.25],
        [196, 246.94, 293.66, 392],
        [220, 261.63, 329.63, 440],
        [174.61, 220, 261.63, 349.23],
      ],
      worship_warm: [
        [196, 246.94, 293.66, 392],
        [164.81, 196, 246.94, 329.63],
        [261.63, 329.63, 392, 523.25],
        [293.66, 369.99, 440, 587.33],
      ],
      luxury_gala: [
        [220, 261.63, 329.63, 392],
        [293.66, 349.23, 440, 523.25],
        [196, 246.94, 293.66, 349.23],
        [261.63, 329.63, 392, 493.88],
      ],
    };

    const chords = chordsByMood[mood] || chordsByMood.epic_inspirational;
    const stepDur = durationSec / chords.length;
    const startTime = audioCtx.currentTime;

    chords.forEach((chord, idx) => {
      const t0 = startTime + idx * stepDur;
      const t1 = t0 + stepDur;
      chord.forEach((freq, noteIdx) => {
        const osc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        osc.type = noteIdx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t0);

        noteGain.gain.setValueAtTime(0.001, t0);
        noteGain.gain.linearRampToValueAtTime(noteIdx === 0 ? 0.24 : 0.14, t0 + 0.35);
        noteGain.gain.setValueAtTime(noteIdx === 0 ? 0.22 : 0.12, Math.max(t0 + 0.4, t1 - 0.35));
        noteGain.gain.linearRampToValueAtTime(0.001, t1 + 0.05);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(t0);
        osc.stop(t1 + 0.08);
      });

      // Soft warm chime arpeggio note on each scene entrance
      const chime = audioCtx.createOscillator();
      const chimeGain = audioCtx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(chord[chord.length - 1] * 2, t0 + 0.08);
      chimeGain.gain.setValueAtTime(0.001, t0 + 0.08);
      chimeGain.gain.linearRampToValueAtTime(0.09, t0 + 0.14);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
      chime.connect(chimeGain);
      chimeGain.connect(masterGain);
      chime.start(t0 + 0.08);
      chime.stop(t0 + 1.15);
    });

    return {
      stream: dest.stream,
      stop: () => {
        try {
          void audioCtx.close();
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return null;
  }
}

function pickSupportedVideoMime(): { mimeType: string; ext: string } | null {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
    } catch {
      // continue
    }
  }
  return { mimeType: '', ext: 'webm' };
}

function createSafeMediaRecorder(
  combinedStream: MediaStream,
  videoOnlyStream: MediaStream,
  preferredMime: string
): MediaRecorder {
  const attempts: Array<{ stream: MediaStream; options?: MediaRecorderOptions }> = [];
  if (preferredMime) {
    attempts.push({
      stream: combinedStream,
      options: { mimeType: preferredMime, videoBitsPerSecond: 2_600_000 },
    });
  }
  attempts.push({ stream: combinedStream, options: { videoBitsPerSecond: 2_600_000 } });
  attempts.push({ stream: combinedStream });
  if (preferredMime) {
    attempts.push({
      stream: videoOnlyStream,
      options: { mimeType: preferredMime, videoBitsPerSecond: 2_600_000 },
    });
  }
  attempts.push({ stream: videoOnlyStream });

  let lastErr: unknown = null;
  for (const attempt of attempts) {
    try {
      return attempt.options
        ? new MediaRecorder(attempt.stream, attempt.options)
        : new MediaRecorder(attempt.stream);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error('Não foi possível iniciar o gravador de vídeo neste navegador.');
}

export interface RenderedDukeVideoResult {
  videoUrl: string;
  mimeType: string;
  fileExtension: string;
  thumbnailDataUrl: string;
  durationSec: number;
}

export async function renderDukeVideoStudio(
  spec: DukeVideoSpec,
  sourcePhotoUrl?: string,
  onProgress?: (pct: number) => void,
  mirrorPreviewCanvas?: HTMLCanvasElement | null
): Promise<RenderedDukeVideoResult> {
  const { width, height } = getVideoDimensions(spec.aspectRatio || '9:16');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D indisponível para renderizar vídeo.');
  }

  const scenes: DukeVideoScene[] =
    spec.scenes && spec.scenes.length > 0
      ? spec.scenes
      : [
          {
            sceneNumber: 1,
            durationSec: 3,
            badge: 'CONAE OFICIAL',
            headline: spec.title || 'Vídeo Criado com IA',
            subheadline: spec.summary || 'Produção inteligente do Robô Duque',
            cameraMotion: 'zoom_in',
            visualMotif: 'particles',
            bgStart: '#041710',
            bgMid: '#0b3826',
            bgEnd: '#020b07',
            accentColor: '#fbbf24',
          },
        ];

  const totalDurationSec = scenes.reduce(
    (sum, s) => sum + Math.max(1.8, Math.min(4.2, s.durationSec || 2.6)),
    0
  );
  const photo = await loadOptionalImage(sourcePhotoUrl);

  // Render frame 0 right away for the thumbnail
  drawDukeVideoFrame(ctx, spec, scenes[0], 0, 0.45, 0.9, totalDurationSec, photo);
  const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);

  const mimeChoice = pickSupportedVideoMime();
  if (!mimeChoice || typeof canvas.captureStream !== 'function') {
    onProgress?.(100);
    return {
      videoUrl: '',
      mimeType: '',
      fileExtension: 'webm',
      thumbnailDataUrl,
      durationSec: Math.round(totalDurationSec),
    };
  }

  const videoStream = canvas.captureStream(30);
  const soundtrack = createSynthesizedSoundtrack(spec.musicMood || 'epic_inspirational', totalDurationSec);
  const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
  if (soundtrack) {
    combinedTracks.push(...soundtrack.stream.getAudioTracks());
  }
  const combinedStream = new MediaStream(combinedTracks);

  const chunks: BlobPart[] = [];
  const recorder = createSafeMediaRecorder(combinedStream, videoStream, mimeChoice.mimeType);
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const recordingFinished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      soundtrack?.stop();
      videoStream.getTracks().forEach((t) => t.stop());
      const finalMime = recorder.mimeType || mimeChoice.mimeType || 'video/webm';
      resolve(new Blob(chunks, { type: finalMime }));
    };
    recorder.onerror = () => {
      soundtrack?.stop();
      videoStream.getTracks().forEach((t) => t.stop());
      reject(new Error('Não foi possível gravar o arquivo de vídeo neste navegador.'));
    };
  });

  recorder.start(250);

  // Real-time 30 FPS playback loop matching exact video duration
  const startPerf = performance.now();
  const totalMs = totalDurationSec * 1000;

  await new Promise<void>((resolve) => {
    let finished = false;
    const renderTick = () => {
      if (finished) return;
      const elapsedMs = performance.now() - startPerf;
      const elapsedSec = Math.min(totalDurationSec, elapsedMs / 1000);

      let acc = 0;
      let activeIdx = 0;
      let sceneLocalSec = 0;
      let sceneDur = 2.6;
      for (let i = 0; i < scenes.length; i += 1) {
        const d = Math.max(1.8, Math.min(4.2, scenes[i].durationSec || 2.6));
        if (elapsedSec <= acc + d || i === scenes.length - 1) {
          activeIdx = i;
          sceneLocalSec = Math.max(0, elapsedSec - acc);
          sceneDur = d;
          break;
        }
        acc += d;
      }

      const sceneProgress = Math.max(0, Math.min(1, sceneLocalSec / sceneDur));
      drawDukeVideoFrame(
        ctx,
        spec,
        scenes[activeIdx],
        activeIdx,
        sceneProgress,
        elapsedSec,
        totalDurationSec,
        photo
      );

      if (mirrorPreviewCanvas) {
        if (mirrorPreviewCanvas.width !== width || mirrorPreviewCanvas.height !== height) {
          mirrorPreviewCanvas.width = width;
          mirrorPreviewCanvas.height = height;
        }
        const mctx = mirrorPreviewCanvas.getContext('2d');
        if (mctx) {
          mctx.drawImage(canvas, 0, 0);
        }
      }

      const pct = Math.min(99, Math.round((elapsedMs / totalMs) * 100));
      onProgress?.(pct);

      if (elapsedMs < totalMs) {
        window.setTimeout(() => {
          window.requestAnimationFrame(renderTick);
        }, 16);
      } else {
        finished = true;
        resolve();
      }
    };
    window.requestAnimationFrame(renderTick);
  });

  if (recorder.state !== 'inactive') {
    recorder.stop();
  }

  const blob = await recordingFinished;
  const videoUrl = URL.createObjectURL(blob);
  onProgress?.(100);

  const actualMime = blob.type || mimeChoice.mimeType || 'video/webm';
  const ext = actualMime.includes('mp4') ? 'mp4' : 'webm';

  return {
    videoUrl,
    mimeType: actualMime,
    fileExtension: ext,
    thumbnailDataUrl,
    durationSec: Math.round(totalDurationSec),
  };
}
