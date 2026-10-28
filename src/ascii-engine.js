/**
 * 3D ASCII Rendering Engine
 * Translates Three.js WebGL scenes into high-fidelity, colored or monochrome ASCII art
 * with custom glyph ramps, Bayer dithering, phosphor glow, and CRT post-processing.
 */

export const GLYPH_SETS = {
  botanical: {
    name: 'Botanical Bloom',
    chars: '  ·°*•✿❀❁✾✽'
  },
  classic: {
    name: 'Classic Terminal',
    chars: ' .:-=+*#%@'
  },
  dense: {
    name: 'Cyberpunk Detailed',
    chars: ' .\'`^":;!i><~+_?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'
  },
  braille: {
    name: 'Braille Density',
    chars: '  ⠁⠃⠇⡇⣇⣧⣷⣿'
  },
  blocks: {
    name: 'Shade Blocks',
    chars: ' ░▒▓█'
  },
  minimal: {
    name: 'Zen Minimal',
    chars: '  . : * #'
  },
  matrix: {
    name: 'Matrix Code',
    chars: ' 01/\\<>|#$'
  }
};

export const COLOR_PALETTES = {
  cyberpunk: {
    name: 'Neon Cyberpunk',
    bg: '#0a0a12',
    mode: 'sample', // Uses 3D lighting + boost
    boost: { r: 1.3, g: 0.9, b: 1.4 },
    ambient: '#ff007f',
    glowColor: 'rgba(255, 0, 128, 0.45)'
  },
  botanical: {
    name: 'Lush Botanical',
    bg: '#080d0a',
    mode: 'sample',
    boost: { r: 1.1, g: 1.2, b: 0.9 },
    ambient: '#00ff88',
    glowColor: 'rgba(46, 204, 113, 0.4)'
  },
  matrix: {
    name: 'Matrix Phosphor',
    bg: '#040b06',
    mode: 'monochrome',
    primary: '#00ff66',
    secondary: '#008833',
    glowColor: 'rgba(0, 255, 102, 0.5)'
  },
  amber: {
    name: 'Amber CRT',
    bg: '#0f0902',
    mode: 'monochrome',
    primary: '#ffaa00',
    secondary: '#aa6600',
    glowColor: 'rgba(255, 170, 0, 0.5)'
  },
  synthwave: {
    name: 'Sunset Synthwave',
    bg: '#0e071c',
    mode: 'gradient',
    gradTop: '#ff3388',
    gradBottom: '#ff9900',
    glowColor: 'rgba(255, 51, 136, 0.45)'
  },
  ice: {
    name: 'Ice Crystal',
    bg: '#050c14',
    mode: 'sample',
    boost: { r: 0.8, g: 1.2, b: 1.5 },
    ambient: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.4)'
  },
  ghost: {
    name: 'Ghost Monochrome',
    bg: '#050505',
    mode: 'monochrome',
    primary: '#e6edf3',
    secondary: '#6e7681',
    glowColor: 'rgba(230, 237, 243, 0.3)'
  }
};

// 4x4 Bayer Dithering Matrix for smooth character gradation
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

export class AsciiEngine {
  constructor(displayCanvas, options = {}) {
    this.displayCanvas = displayCanvas;
    this.ctx = displayCanvas.getContext('2d', { alpha: false });

    // Internal offscreen canvas where Three.js WebGL renders
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Config
    this.glyphKey = options.glyphKey || 'botanical';
    this.paletteKey = options.paletteKey || 'cyberpunk';
    this.fontSize = options.fontSize || 12;
    this.dithering = options.dithering !== undefined ? options.dithering : true;
    this.scanlines = options.scanlines !== undefined ? options.scanlines : true;
    this.glow = options.glow !== undefined ? options.glow : true;
    this.vignette = options.vignette !== undefined ? options.vignette : true;
    this.bloomGlowIntensity = options.bloomGlowIntensity || 0.35;
    this.colorInvert = false;

    // Fast Color Cache to avoid GC allocations
    this.colorCache = new Map();

    // Grid sizing
    this.cols = 120;
    this.rows = 60;
    this.charWidth = 7.2;
    this.charHeight = 12;

    this.charBuffer = []; // Cache for raw plain-text copying

    this.updateDimensions();
  }

  setGlyphSet(key) {
    if (GLYPH_SETS[key]) {
      this.glyphKey = key;
    }
  }

  setPalette(key) {
    if (COLOR_PALETTES[key]) {
      this.paletteKey = key;
    }
  }

  setFontSize(size) {
    this.fontSize = Math.max(8, Math.min(24, size));
    this.updateDimensions();
  }

  updateDimensions() {
    const width = this.displayCanvas.clientWidth || window.innerWidth;
    const height = this.displayCanvas.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Retina display resolution
    this.displayCanvas.width = width * dpr;
    this.displayCanvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    // Font metrics: width is approx 0.6 of font size in monospaced fonts
    this.charHeight = this.fontSize;
    this.charWidth = this.fontSize * 0.58;

    this.cols = Math.floor(width / this.charWidth);
    this.rows = Math.floor(height / this.charHeight);

    // Ensure offscreen canvas matches grid columns and rows exactly
    this.offscreenCanvas.width = this.cols;
    this.offscreenCanvas.height = this.rows;

    this.displayW = width;
    this.displayH = height;
  }

  /**
   * Renders the Three.js source canvas into the ASCII display
   * @param {HTMLCanvasElement} webglCanvas
   */
  render(webglCanvas) {
    if (!webglCanvas || this.cols <= 0 || this.rows <= 0) return;

    // 1. Downscale the WebGL 3D scene to the ASCII grid resolution
    this.offscreenCtx.drawImage(
      webglCanvas,
      0, 0, webglCanvas.width, webglCanvas.height,
      0, 0, this.cols, this.rows
    );

    const imgData = this.offscreenCtx.getImageData(0, 0, this.cols, this.rows);
    const pixels = imgData.data;

    const palette = COLOR_PALETTES[this.paletteKey] || COLOR_PALETTES.cyberpunk;
    const glyphs = GLYPH_SETS[this.glyphKey]?.chars || GLYPH_SETS.classic.chars;
    const glyphLen = glyphs.length;

    // 2. Clear display canvas with palette background
    this.ctx.fillStyle = palette.bg;
    this.ctx.fillRect(0, 0, this.displayW, this.displayH);

    // 3. Set typography
    this.ctx.font = `${this.fontSize}px "JetBrains Mono", "Courier New", monospace`;
    this.ctx.textBaseline = 'top';

    // Glow configuration
    if (this.glow) {
      this.ctx.shadowBlur = Math.round(this.fontSize * this.bloomGlowIntensity);
      this.ctx.shadowColor = palette.glowColor || 'rgba(255, 255, 255, 0.3)';
    } else {
      this.ctx.shadowBlur = 0;
    }

    // Prepare plain-text buffer
    this.charBuffer = [];

    // Pre-calculate color gradient values if in gradient mode
    const isGradient = palette.mode === 'gradient';
    const isMonochrome = palette.mode === 'monochrome';

    let lastFillStyle = '';
    let lastAlpha = -1;

    if (isMonochrome) {
      this.ctx.fillStyle = palette.primary;
      lastFillStyle = palette.primary;
    }

    // 4. Rasterize each cell
    for (let y = 0; y < this.rows; y++) {
      let rowChars = '';
      const screenY = y * this.charHeight;

      for (let x = 0; x < this.cols; x++) {
        const idx = (y * this.cols + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];

        if (a < 15) {
          rowChars += ' ';
          continue;
        }

        // Perceived luminance (Rec. 601)
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Apply Bayer dithering for smooth tonal transitions
        if (this.dithering) {
          const ditherVal = (BAYER_4X4[y % 4][x % 4] / 16 - 0.5) * 28;
          lum = Math.max(0, Math.min(255, lum + ditherVal));
        }

        // Map luminance to character
        const charIdx = Math.floor((lum / 256) * glyphLen);
        const char = glyphs[Math.min(charIdx, glyphLen - 1)];
        rowChars += char;

        if (char === ' ') continue;

        // Determine character color & render
        const screenX = x * this.charWidth;

        if (isMonochrome) {
          // Phosphor intensity quantized to reduce canvas state resets
          const rawAlpha = (lum / 255) * 0.9 + 0.1;
          const qAlpha = Math.round(rawAlpha * 16) / 16;
          if (qAlpha !== lastAlpha) {
            this.ctx.globalAlpha = qAlpha;
            lastAlpha = qAlpha;
          }
          this.ctx.fillText(char, screenX, screenY);
        } else if (isGradient) {
          const gradT = y / this.rows;
          const fill = gradT < 0.5 ? palette.gradTop : palette.gradBottom;
          if (fill !== lastFillStyle) {
            this.ctx.fillStyle = fill;
            lastFillStyle = fill;
          }
          const rawAlpha = Math.min(1.0, (lum / 255) * 1.2);
          const qAlpha = Math.round(rawAlpha * 16) / 16;
          if (qAlpha !== lastAlpha) {
            this.ctx.globalAlpha = qAlpha;
            lastAlpha = qAlpha;
          }
          this.ctx.fillText(char, screenX, screenY);
        } else {
          // Direct 3D lighting with fast color caching
          const boost = palette.boost || { r: 1, g: 1, b: 1 };
          const cr = Math.min(255, Math.floor(r * boost.r));
          const cg = Math.min(255, Math.floor(g * boost.g));
          const cb = Math.min(255, Math.floor(b * boost.b));

          // Quantize to step of 4 to hit cache
          const qR = (cr >> 2) << 2;
          const qG = (cg >> 2) << 2;
          const qB = (cb >> 2) << 2;
          const colorKey = (qR << 16) | (qG << 8) | qB;

          let colStr = this.colorCache.get(colorKey);
          if (!colStr) {
            colStr = `rgb(${qR},${qG},${qB})`;
            if (this.colorCache.size > 2000) this.colorCache.clear();
            this.colorCache.set(colorKey, colStr);
          }

          if (colStr !== lastFillStyle) {
            this.ctx.fillStyle = colStr;
            lastFillStyle = colStr;
          }
          if (lastAlpha !== 1.0) {
            this.ctx.globalAlpha = 1.0;
            lastAlpha = 1.0;
          }
          this.ctx.fillText(char, screenX, screenY);
        }
      }

      this.charBuffer.push(rowChars);
    }

    // Reset global alpha and shadow for overlays
    this.ctx.globalAlpha = 1.0;
    this.ctx.shadowBlur = 0;

    // 5. Draw subtle scanlines if enabled
    if (this.scanlines) {
      this.drawScanlines();
    }

    // 6. Draw vignette if enabled
    if (this.vignette) {
      this.drawVignette();
    }
  }

  drawScanlines() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    const step = Math.max(2, Math.round(this.charHeight / 2));
    for (let y = 0; y < this.displayH; y += step * 2) {
      this.ctx.fillRect(0, y, this.displayW, step);
    }
  }

  drawVignette() {
    const cx = this.displayW / 2;
    const cy = this.displayH / 2;
    const radius = Math.max(cx, cy);
    const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.displayW, this.displayH);
  }

  /**
   * Export the current frame as a formatted plain-text ASCII string
   */
  getPlainText() {
    return this.charBuffer.join('\n');
  }
}
