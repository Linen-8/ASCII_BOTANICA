import * as THREE from 'three';
import { createFlower, createGarden, FLOWER_TYPES } from './flower-math.js';
import { AsciiEngine, GLYPH_SETS, COLOR_PALETTES } from './ascii-engine.js';
import { FlowerParticleField } from './particles.js';
import { AmbientSoundscape } from './audio.js';
import { PRESETS } from './presets.js';

class AsciiFlowerApp {
  constructor() {
    // DOM Elements
    this.displayCanvas = document.getElementById('ascii-canvas');
    this.hudElement = document.getElementById('hud');
    this.toastElement = document.getElementById('toast');
    this.controlPanel = document.getElementById('control-panel');
    this.statFps = document.getElementById('stat-fps');
    this.statGrid = document.getElementById('stat-grid');

    // WebGL Off-screen Renderer
    this.webglCanvas = document.createElement('canvas');
    this.webglRenderer = new THREE.WebGLRenderer({
      canvas: this.webglCanvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.webglRenderer.toneMappingExposure = 1.25;

    // Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05050a);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

    // Camera Orbit State
    this.target = new THREE.Vector3(0, 0.45, 0);
    this.spherical = {
      radius: 4.8,
      targetRadius: 4.8,
      theta: 0.6,
      targetTheta: 0.6,
      phi: 1.15,
      targetPhi: 1.15
    };

    // Lights
    this.setupLighting();

    // ASCII Engine
    this.asciiEngine = new AsciiEngine(this.displayCanvas, {
      glyphKey: 'botanical',
      paletteKey: 'cyberpunk',
      fontSize: 12,
      scanlines: true,
      glow: true,
      vignette: true,
      dithering: true
    });

    // Particles
    this.particles = new FlowerParticleField(75);
    this.scene.add(this.particles.group);

    // Audio Soundscape
    this.audio = new AmbientSoundscape();

    // App State
    this.state = {
      flowerType: 'rose',
      displayMode: 'solo', // 'solo' or 'garden'
      activePresetId: 'cyber-rose',
      bloom: 0.9,
      autoBloom: true,
      bloomSpeed: 0.8,
      wind: 1.0,
      windGust: 0,
      autoRotate: true,
      rotSpeed: 0.35,
      isZenMode: false,
      isPanelCollapsed: false,
      scale: 1.0
    };

    // Flower instance
    this.flower = null;
    this.loadFlower(this.state.flowerType);

    // Timing with performance.now() to avoid Three.js Clock deprecation
    this.lastTime = performance.now();
    this.time = 0;

    // FPS Meter tracking
    this.fpsFrames = 0;
    this.fpsLastUpdate = performance.now();

    // Interaction & UI
    this.setupOrbitControls();
    this.setupUI();
    this.setupKeyboard();

    // Window Resize
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // Start Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    // Key Light (warm upper right)
    this.keyLight = new THREE.DirectionalLight(0xffeedd, 2.2);
    this.keyLight.position.set(4, 6, 5);
    this.scene.add(this.keyLight);

    // Rim Light (cool accent light from behind)
    this.rimLight = new THREE.DirectionalLight(0x00f0ff, 2.6);
    this.rimLight.position.set(-5, 4, -5);
    this.scene.add(this.rimLight);

    // Core point light for blooming center
    this.centerLight = new THREE.PointLight(0xff3388, 2.4, 4.5);
    this.centerLight.position.set(0, 1.2, 0);
    this.scene.add(this.centerLight);
  }

  loadFlower(type, forceMode = null) {
    if (this.flower && this.flower.group) {
      this.scene.remove(this.flower.group);
    }

    if (forceMode) {
      this.state.displayMode = forceMode;
    }

    this.state.flowerType = type;

    if (this.state.displayMode === 'garden') {
      this.flower = createGarden(type);
      this.spherical.targetRadius = 6.2;
    } else {
      this.flower = createFlower(type);
      this.spherical.targetRadius = 4.8;
    }

    this.flower.group.scale.setScalar(this.state.scale);
    this.scene.add(this.flower.group);

    // Update particle colors to match flower palette
    const palette = COLOR_PALETTES[this.asciiEngine.paletteKey];
    if (palette) {
      this.particles.setPalette(
        palette.ambient || palette.primary || 0xff77aa,
        palette.primary || 0xffea70
      );
    }
  }

  setupOrbitControls() {
    let isPointerDown = false;
    let startX = 0;
    let startY = 0;
    let prevX = 0;
    let prevY = 0;
    let hasDragged = false;
    let touchDist = 0;

    const onPointerDown = (clientX, clientY) => {
      isPointerDown = true;
      hasDragged = false;
      startX = clientX;
      startY = clientY;
      prevX = clientX;
      prevY = clientY;
    };

    const onPointerMove = (clientX, clientY) => {
      if (!isPointerDown) return;
      const dx = clientX - prevX;
      const dy = clientY - prevY;

      if (Math.hypot(clientX - startX, clientY - startY) > 6) {
        hasDragged = true;
      }

      prevX = clientX;
      prevY = clientY;

      this.spherical.targetTheta -= dx * 0.007;
      this.spherical.targetPhi = Math.max(0.2, Math.min(Math.PI - 0.2, this.spherical.targetPhi - dy * 0.007));
    };

    const onPointerUp = (clientX, clientY) => {
      if (isPointerDown && !hasDragged) {
        // User clicked or tapped: trigger interactive wind ripple & pollen burst
        this.triggerCanvasTap(clientX, clientY);
      }
      isPointerDown = false;
    };

    // Mouse Listeners
    this.displayCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) onPointerDown(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', (e) => onPointerUp(e.clientX, e.clientY));

    // Wheel Zoom
    this.displayCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const minR = this.state.displayMode === 'garden' ? 3.0 : 2.0;
      const maxR = this.state.displayMode === 'garden' ? 9.5 : 8.0;
      this.spherical.targetRadius = Math.max(minR, Math.min(maxR, this.spherical.targetRadius + e.deltaY * 0.004));
    }, { passive: false });

    // Touch Listeners
    this.displayCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    this.displayCanvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const newDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const diff = touchDist - newDist;
        touchDist = newDist;
        const minR = this.state.displayMode === 'garden' ? 3.0 : 2.0;
        const maxR = this.state.displayMode === 'garden' ? 9.5 : 8.0;
        this.spherical.targetRadius = Math.max(minR, Math.min(maxR, this.spherical.targetRadius + diff * 0.01));
      }
    }, { passive: true });

    this.displayCanvas.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      onPointerUp(touch ? touch.clientX : 0, touch ? touch.clientY : 0);
    });
  }

  triggerCanvasTap(x, y) {
    if (this.state.isZenMode) {
      this.toggleZenMode();
      return;
    }

    // Interactive Pollen Burst
    if (this.particles) {
      this.particles.burst(0.8);
    }

    // Wind gust surge
    this.state.windGust = 1.6;

    // Harmonic audio chime
    if (this.audio && this.audio.isPlaying) {
      const note = this.audio.chimeNotes[Math.floor(Math.random() * this.audio.chimeNotes.length)];
      this.audio.playChime(note);
    }
  }

  updateCamera(delta) {
    // Auto-rotation when turntable is enabled
    if (this.state.autoRotate) {
      this.spherical.targetTheta += this.state.rotSpeed * delta * 0.5;
    }

    // Smooth lerp damping
    this.spherical.theta += (this.spherical.targetTheta - this.spherical.theta) * 0.08;
    this.spherical.phi += (this.spherical.targetPhi - this.spherical.phi) * 0.08;
    this.spherical.radius += (this.spherical.targetRadius - this.spherical.radius) * 0.08;

    // Convert spherical coordinates to Cartesian
    const sinPhi = Math.sin(this.spherical.phi);
    const cosPhi = Math.cos(this.spherical.phi);
    const sinTheta = Math.sin(this.spherical.theta);
    const cosTheta = Math.cos(this.spherical.theta);

    this.camera.position.set(
      this.target.x + this.spherical.radius * sinPhi * sinTheta,
      this.target.y + this.spherical.radius * cosPhi,
      this.target.z + this.spherical.radius * sinPhi * cosTheta
    );

    this.camera.lookAt(this.target);
  }

  setupUI() {
    // 1. Preset Chips
    this.renderPresetChips();

    // 2. Display Mode Select
    const modeSelect = document.getElementById('select-mode');
    if (modeSelect) {
      modeSelect.value = this.state.displayMode;
      modeSelect.onchange = (e) => {
        this.state.displayMode = e.target.value;
        this.loadFlower(this.state.flowerType);
        this.showToast(this.state.displayMode === 'garden' ? 'Switched to Botanical Garden 🌸' : 'Specimen Mode');
      };
    }

    // 3. Flower Select
    const flowerSelect = document.getElementById('select-flower');
    if (flowerSelect) {
      flowerSelect.innerHTML = '';
      Object.entries(FLOWER_TYPES).forEach(([key, name]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = name;
        flowerSelect.appendChild(opt);
      });
      flowerSelect.value = this.state.flowerType;
      flowerSelect.onchange = (e) => this.loadFlower(e.target.value);
    }

    // 4. Palette Select
    const paletteSelect = document.getElementById('select-palette');
    if (paletteSelect) {
      paletteSelect.innerHTML = '';
      Object.entries(COLOR_PALETTES).forEach(([key, pal]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = pal.name;
        paletteSelect.appendChild(opt);
      });
      paletteSelect.value = this.asciiEngine.paletteKey;
      paletteSelect.onchange = (e) => {
        this.asciiEngine.setPalette(e.target.value);
        this.updateLightingForPalette(e.target.value);
      };
    }

    // 5. Glyph Set Select
    const glyphSelect = document.getElementById('select-glyphs');
    if (glyphSelect) {
      glyphSelect.innerHTML = '';
      Object.entries(GLYPH_SETS).forEach(([key, set]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = set.name;
        glyphSelect.appendChild(opt);
      });
      glyphSelect.value = this.asciiEngine.glyphKey;
      glyphSelect.onchange = (e) => this.asciiEngine.setGlyphSet(e.target.value);
    }

    // 6. Sliders & Toggles
    const bloomSlider = document.getElementById('slider-bloom');
    if (bloomSlider) {
      bloomSlider.value = this.state.bloom;
      bloomSlider.oninput = (e) => {
        this.state.bloom = parseFloat(e.target.value);
        this.state.autoBloom = false;
        const autoBloomCheck = document.getElementById('check-autobloom');
        if (autoBloomCheck) autoBloomCheck.checked = false;
      };
    }

    const scaleSlider = document.getElementById('slider-scale');
    if (scaleSlider) {
      scaleSlider.value = this.state.scale;
      scaleSlider.oninput = (e) => {
        this.state.scale = parseFloat(e.target.value);
        if (this.flower && this.flower.group) {
          this.flower.group.scale.setScalar(this.state.scale);
        }
      };
    }

    const autoBloomCheck = document.getElementById('check-autobloom');
    if (autoBloomCheck) {
      autoBloomCheck.checked = this.state.autoBloom;
      autoBloomCheck.onchange = (e) => {
        this.state.autoBloom = e.target.checked;
      };
    }

    const windSlider = document.getElementById('slider-wind');
    if (windSlider) {
      windSlider.value = this.state.wind;
      windSlider.oninput = (e) => this.state.wind = parseFloat(e.target.value);
    }

    const rotSpeedSlider = document.getElementById('slider-rotation');
    if (rotSpeedSlider) {
      rotSpeedSlider.value = this.state.rotSpeed;
      rotSpeedSlider.oninput = (e) => this.state.rotSpeed = parseFloat(e.target.value);
    }

    const autoRotateCheck = document.getElementById('check-autorotate');
    if (autoRotateCheck) {
      autoRotateCheck.checked = this.state.autoRotate;
      autoRotateCheck.onchange = (e) => this.state.autoRotate = e.target.checked;
    }

    const fontSizeSlider = document.getElementById('slider-fontsize');
    if (fontSizeSlider) {
      fontSizeSlider.value = this.asciiEngine.fontSize;
      fontSizeSlider.oninput = (e) => {
        this.asciiEngine.setFontSize(parseInt(e.target.value, 10));
        this.onResize();
      };
    }

    const scanlinesCheck = document.getElementById('check-scanlines');
    if (scanlinesCheck) {
      scanlinesCheck.checked = this.asciiEngine.scanlines;
      scanlinesCheck.onchange = (e) => this.asciiEngine.scanlines = e.target.checked;
    }

    const glowCheck = document.getElementById('check-glow');
    if (glowCheck) {
      glowCheck.checked = this.asciiEngine.glow;
      glowCheck.onchange = (e) => this.asciiEngine.glow = e.target.checked;
    }

    const vignetteCheck = document.getElementById('check-vignette');
    if (vignetteCheck) {
      vignetteCheck.checked = this.asciiEngine.vignette;
      vignetteCheck.onchange = (e) => this.asciiEngine.vignette = e.target.checked;
    }

    const ditherCheck = document.getElementById('check-dither');
    if (ditherCheck) {
      ditherCheck.checked = this.asciiEngine.dithering;
      ditherCheck.onchange = (e) => this.asciiEngine.dithering = e.target.checked;
    }

    // 7. Action Buttons
    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) {
      btnAudio.onclick = () => {
        const isPlaying = this.audio.toggle();
        btnAudio.classList.toggle('active', isPlaying);
        btnAudio.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
        btnAudio.querySelector('.audio-label').textContent = isPlaying ? 'Sound On' : 'Sound Off';
        this.showToast(isPlaying ? 'Ambient Soundscape active 🎵' : 'Audio muted');
      };
    }

    // Search Flower Logic
    const searchInput = document.getElementById('search-flower');
    const suggestionsPanel = document.getElementById('search-suggestions');
    
    if (searchInput) {
      searchInput.oninput = (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
          if (suggestionsPanel) suggestionsPanel.classList.remove('visible');
          return;
        }

        // Filter species that match query
        const matches = Object.entries(FLOWER_TYPES).filter(([key, name]) => 
          key.toLowerCase().includes(query) || name.toLowerCase().includes(query)
        );

        if (matches.length > 0 && suggestionsPanel) {
          suggestionsPanel.innerHTML = '';
          matches.forEach(([key, name]) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = name;
            item.onclick = () => {
              searchInput.value = name;
              this.loadFlower(key);
              this.syncUI();
              this.showToast(`Loaded: ${name} 🌸`);
              suggestionsPanel.classList.remove('visible');
            };
            suggestionsPanel.appendChild(item);
          });
          suggestionsPanel.classList.add('visible');
        } else if (suggestionsPanel) {
          suggestionsPanel.classList.remove('visible');
        }
      };

      // Handle Enter key to load first match
      searchInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.toLowerCase().trim();
          const match = Object.entries(FLOWER_TYPES).find(([key, name]) => 
            key.toLowerCase().includes(query) || name.toLowerCase().includes(query)
          );
          
          if (match) {
            this.loadFlower(match[0]);
            this.syncUI();
            this.showToast(`Loaded: ${match[1]} 🌸`);
            if (suggestionsPanel) suggestionsPanel.classList.remove('visible');
          } else {
            this.showToast('Species not found');
          }
        }
      };
    }

    // Close suggestions when clicking outside
    window.addEventListener('click', (e) => {
      if (searchInput && suggestionsPanel && !searchInput.contains(e.target) && !suggestionsPanel.contains(e.target)) {
        suggestionsPanel.classList.remove('visible');
      }
    });

    const btnZen = document.getElementById('btn-zen');
    if (btnZen) {
      btnZen.onclick = () => this.toggleZenMode();
    }

    const btnCopy = document.getElementById('btn-copy-ascii');
    if (btnCopy) {
      btnCopy.onclick = () => this.copyAsciiToClipboard();
    }

    const btnDownloadTxt = document.getElementById('btn-download-txt');
    if (btnDownloadTxt) {
      btnDownloadTxt.onclick = () => this.downloadAsciiTxt();
    }

    const btnScreenshot = document.getElementById('btn-screenshot');
    if (btnScreenshot) {
      btnScreenshot.onclick = () => this.downloadScreenshot();
    }

    const btnResetCam = document.getElementById('btn-reset-cam');
    if (btnResetCam) {
      btnResetCam.onclick = () => {
        this.spherical.targetRadius = this.state.displayMode === 'garden' ? 6.2 : 4.8;
        this.spherical.targetTheta = 0.6;
        this.spherical.targetPhi = 1.15;
        this.showToast('Camera reset');
      };
    }

    const btnToggleInspector = document.getElementById('btn-toggle-inspector');
    if (btnToggleInspector) {
      btnToggleInspector.onclick = () => this.togglePanel();
    }

    const btnClosePanel = document.getElementById('btn-close-panel');
    if (btnClosePanel) {
      btnClosePanel.onclick = () => this.togglePanel(true);
    }
  }

  renderPresetChips() {
    const presetContainer = document.getElementById('preset-chips');
    if (!presetContainer) return;

    presetContainer.innerHTML = '';
    PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = `preset-chip ${this.state.activePresetId === p.id ? 'active' : ''}`;
      btn.innerHTML = `<span class="preset-name">${p.name}</span><span class="preset-sub">${p.subtitle}</span>`;
      btn.onclick = () => this.applyPreset(p);
      presetContainer.appendChild(btn);
    });
  }

  togglePanel(forceCollapse = null) {
    if (forceCollapse !== null) {
      this.state.isPanelCollapsed = forceCollapse;
    } else {
      this.state.isPanelCollapsed = !this.state.isPanelCollapsed;
    }

    if (this.controlPanel) {
      this.controlPanel.classList.toggle('collapsed', this.state.isPanelCollapsed);
    }

    const btnToggleInspector = document.getElementById('btn-toggle-inspector');
    if (btnToggleInspector) {
      btnToggleInspector.classList.toggle('active', !this.state.isPanelCollapsed);
    }

    this.showToast(this.state.isPanelCollapsed ? 'Inspector minimized [Tab]' : 'Inspector open');
  }

  applyPreset(preset) {
    this.state.activePresetId = preset.id;
    this.state.displayMode = preset.isGarden ? 'garden' : 'solo';

    this.loadFlower(preset.flower, this.state.displayMode);
    this.asciiEngine.setPalette(preset.palette);
    this.asciiEngine.setGlyphSet(preset.glyphSet);
    this.asciiEngine.scanlines = preset.scanlines;
    this.asciiEngine.glow = preset.glow;
    this.asciiEngine.setFontSize(preset.fontSize || 12);

    this.state.bloom = preset.bloom;
    this.state.wind = preset.wind;
    this.state.rotSpeed = preset.rotSpeed;

    this.updateLightingForPalette(preset.palette);
    this.renderPresetChips();
    this.syncUI();
    this.onResize();

    this.showToast(`Applied preset: ${preset.name}`);
  }

  updateLightingForPalette(paletteKey) {
    const pal = COLOR_PALETTES[paletteKey];
    if (!pal) return;

    if (paletteKey === 'matrix') {
      this.keyLight.color.set(0x00ff66);
      this.rimLight.color.set(0x00aa33);
      this.centerLight.color.set(0x33ff88);
      this.scene.background.set(0x020803);
    } else if (paletteKey === 'amber') {
      this.keyLight.color.set(0xffaa00);
      this.rimLight.color.set(0xff7700);
      this.centerLight.color.set(0xffdd44);
      this.scene.background.set(0x090501);
    } else if (paletteKey === 'ice') {
      this.keyLight.color.set(0xd0f0ff);
      this.rimLight.color.set(0x00e5ff);
      this.centerLight.color.set(0x80ffff);
      this.scene.background.set(0x02070d);
    } else if (paletteKey === 'synthwave') {
      this.keyLight.color.set(0xff5599);
      this.rimLight.color.set(0xff9900);
      this.centerLight.color.set(0xaa00ff);
      this.scene.background.set(0x080312);
    } else {
      this.keyLight.color.set(0xffeedd);
      this.rimLight.color.set(0x00f0ff);
      this.centerLight.color.set(0xff3388);
      this.scene.background.set(0x05050a);
    }

    this.particles.setPalette(
      pal.ambient || pal.primary || 0xff77aa,
      pal.primary || 0xffea70
    );
  }

  syncUI() {
    const modeSelect = document.getElementById('select-mode');
    if (modeSelect) modeSelect.value = this.state.displayMode;

    const flowerSelect = document.getElementById('select-flower');
    if (flowerSelect) flowerSelect.value = this.state.flowerType;

    const paletteSelect = document.getElementById('select-palette');
    if (paletteSelect) paletteSelect.value = this.asciiEngine.paletteKey;

    const glyphSelect = document.getElementById('select-glyphs');
    if (glyphSelect) glyphSelect.value = this.asciiEngine.glyphKey;

    const bloomSlider = document.getElementById('slider-bloom');
    if (bloomSlider) bloomSlider.value = this.state.bloom;

    const windSlider = document.getElementById('slider-wind');
    if (windSlider) windSlider.value = this.state.wind;

    const rotSpeedSlider = document.getElementById('slider-rotation');
    if (rotSpeedSlider) rotSpeedSlider.value = this.state.rotSpeed;

    const scanlinesCheck = document.getElementById('check-scanlines');
    if (scanlinesCheck) scanlinesCheck.checked = this.asciiEngine.scanlines;

    const glowCheck = document.getElementById('check-glow');
    if (glowCheck) glowCheck.checked = this.asciiEngine.glow;

    const vignetteCheck = document.getElementById('check-vignette');
    if (vignetteCheck) vignetteCheck.checked = this.asciiEngine.vignette;

    const ditherCheck = document.getElementById('check-dither');
    if (ditherCheck) ditherCheck.checked = this.asciiEngine.dithering;
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.key.toLowerCase()) {
        case 'tab': // Tab: Toggle Inspector Panel
          e.preventDefault();
          this.togglePanel();
          break;
        case 'v': // V: Toggle Garden / Solo Mode
          e.preventDefault();
          this.state.displayMode = this.state.displayMode === 'garden' ? 'solo' : 'garden';
          this.loadFlower(this.state.flowerType);
          this.syncUI();
          this.showToast(this.state.displayMode === 'garden' ? 'Garden Cluster Mode 🌸' : 'Solo Specimen Mode');
          break;
        case ' ': // Space: toggle auto bloom
          e.preventDefault();
          this.state.autoBloom = !this.state.autoBloom;
          const autoBloomCheck = document.getElementById('check-autobloom');
          if (autoBloomCheck) autoBloomCheck.checked = this.state.autoBloom;
          this.showToast(this.state.autoBloom ? 'Bloom breathing enabled' : 'Bloom fixed');
          break;
        case 'h': // H: Toggle Zen Mode
          this.toggleZenMode();
          break;
        case 'm': // M: Toggle Audio
          const btnAudio = document.getElementById('btn-audio');
          if (btnAudio) btnAudio.click();
          break;
        case 'c': // C: Cycle Palettes
          this.cyclePalette();
          break;
        case 'f': // F: Cycle Flower
          this.cycleFlower();
          break;
        case 'g': // G: Cycle Glyph Sets
          this.cycleGlyphs();
          break;
        case 's': // S: Snapshot ASCII
          this.copyAsciiToClipboard();
          break;
        case 'r': // R: Reset Camera
          const btnReset = document.getElementById('btn-reset-cam');
          if (btnReset) btnReset.click();
          break;
      }
    });
  }

  cyclePalette() {
    const keys = Object.keys(COLOR_PALETTES);
    const currIdx = keys.indexOf(this.asciiEngine.paletteKey);
    const nextKey = keys[(currIdx + 1) % keys.length];
    this.asciiEngine.setPalette(nextKey);
    this.updateLightingForPalette(nextKey);
    this.syncUI();
    this.showToast(`Palette: ${COLOR_PALETTES[nextKey].name}`);
  }

  cycleFlower() {
    const keys = Object.keys(FLOWER_TYPES);
    const currIdx = keys.indexOf(this.state.flowerType);
    const nextKey = keys[(currIdx + 1) % keys.length];
    this.loadFlower(nextKey);
    this.syncUI();
    this.showToast(`Flower: ${FLOWER_TYPES[nextKey]}`);
  }

  cycleGlyphs() {
    const keys = Object.keys(GLYPH_SETS);
    const currIdx = keys.indexOf(this.asciiEngine.glyphKey);
    const nextKey = keys[(currIdx + 1) % keys.length];
    this.asciiEngine.setGlyphSet(nextKey);
    this.syncUI();
    this.showToast(`Glyphs: ${GLYPH_SETS[nextKey].name}`);
  }

  toggleZenMode() {
    this.state.isZenMode = !this.state.isZenMode;
    document.body.classList.toggle('zen-mode', this.state.isZenMode);
    this.showToast(this.state.isZenMode ? 'Zen Mode (Press H or tap canvas to restore)' : 'Controls restored');
  }

  copyAsciiToClipboard() {
    const text = this.asciiEngine.getPlainText();
    if (!text || text.trim().length === 0) {
      this.showToast('Rendering ASCII...');
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied raw 3D ASCII art to clipboard! 📋');
    }).catch(err => {
      console.error(err);
      this.showToast('Clipboard access denied');
    });
  }

  downloadAsciiTxt() {
    const text = this.asciiEngine.getPlainText();
    if (!text || text.trim().length === 0) {
      this.showToast('Generating ASCII text...');
      return;
    }

    const header = `/* 🌸 3D ASCII FLOWER BOTANICA\n   Species: ${FLOWER_TYPES[this.state.flowerType]}\n   Mode: ${this.state.displayMode.toUpperCase()}\n   Palette: ${this.asciiEngine.paletteKey}\n   Timestamp: ${new Date().toISOString()}\n*/\n\n`;
    const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascii-botanica-${this.state.flowerType}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Downloaded .TXT ASCII file 📄');
  }

  downloadScreenshot() {
    const dataUrl = this.displayCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `3d-ascii-flower-${this.state.flowerType}-${Date.now()}.png`;
    a.click();
    this.showToast('Saved ASCII screenshot 📸');
  }

  showToast(msg) {
    if (!this.toastElement) return;
    this.toastElement.textContent = msg;
    this.toastElement.classList.add('visible');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastElement.classList.remove('visible');
    }, 2400);
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.asciiEngine.updateDimensions();

    // Size WebGL buffer to match ASCII grid columns and rows
    const renderW = Math.max(80, this.asciiEngine.cols * 2);
    const renderH = Math.max(45, this.asciiEngine.rows * 2);
    this.webglRenderer.setSize(renderW, renderH, false);

    // Update Grid Resolution Stat
    if (this.statGrid) {
      this.statGrid.textContent = `${this.asciiEngine.cols}×${this.asciiEngine.rows}`;
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += delta;

    // Track FPS
    this.fpsFrames++;
    if (now - this.fpsLastUpdate >= 500) {
      const currentFps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastUpdate));
      if (this.statFps) {
        this.statFps.textContent = `${currentFps} FPS`;
      }
      this.fpsFrames = 0;
      this.fpsLastUpdate = now;
    }

    // Decay wind gust
    if (this.state.windGust > 0.01) {
      this.state.windGust *= 0.94;
    } else {
      this.state.windGust = 0;
    }

    const effectiveWind = this.state.wind + this.state.windGust;

    // Organic Bloom Breathing cycle
    let activeBloom = this.state.bloom;
    if (this.state.autoBloom) {
      // Gentle sine breathing from 0.6 to 1.15
      activeBloom = 0.85 + Math.sin(this.time * 0.9 * this.state.bloomSpeed) * 0.32;
    }

    // Update Flower geometry & wind flutter
    if (this.flower && this.flower.update) {
      this.flower.update(this.time, activeBloom, effectiveWind);
    }

    // Update 3D Floating Particles
    if (this.particles) {
      this.particles.update(delta, this.time, effectiveWind);
    }

    // Update Audio synth breathing
    if (this.audio) {
      this.audio.updateWithBloom(activeBloom);
    }

    // Update 3D Orbit Camera
    this.updateCamera(delta);

    // 1. Render 3D Scene into WebGL buffer
    this.webglRenderer.render(this.scene, this.camera);

    // 2. Render WebGL buffer into ASCII display canvas
    this.asciiEngine.render(this.webglCanvas);
  }
}

// Boot application
window.addEventListener('DOMContentLoaded', () => {
  new AsciiFlowerApp();
});
