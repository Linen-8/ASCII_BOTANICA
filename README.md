# 🌸 ASCII BOTANICA 3D

An interactive, procedural 3D ASCII flower garden rendered in real-time. This project combines mathematical botanical geometry with a retro-futuristic CRT aesthetic, turning complex 3D shapes into a flowing stream of ASCII characters.

## ✨ Features

- **Procedural 3D Flora**: Real-time generation of various flower species using mathematical formulas.
- **ASCII Rendering Engine**: A custom pipeline that renders a WebGL scene into a character-based grid with phosphor glow and scanline effects.
- **Interactive HUD**:
  - **Species Search**: Predictively search for flower species with a dynamic suggestion menu.
  - **Customization**: Adjust bloom, wind flutter, rotation speed, and rendering resolution.
  - **Presets**: Quick-switch between curated aesthetic experiences.
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices.
- **Immersive Atmosphere**: Includes an ambient soundscape and interactive pollen particles.
- **Export Options**: Capture your garden as a `.txt` file or a `.png` screenshot.

## 🛠️ Tech Stack

- **Three.js**: For the underlying 3D scene, geometry, and lighting.
- **JavaScript (ES6+)**: For the procedural logic and ASCII engine.
- **CSS3**: For the "Cyber-HUD" interface and responsive layouts.
- **HTML5**: For the rendering canvas and UI structure.

## 🚀 Getting Started

### Installation
Since this is a front-end project, you can run it simply by serving the files through a local web server:

```bash
# If you have Node.js installed, you can use 'serve'
npx serve .
```

### Controls
- **Drag**: Orbit the 3D camera around the flower.
- **Scroll**: Zoom in and out.
- **Click/Tap**: Trigger a wind ripple and pollen burst.
- **Keyboard Shortcuts**:
  - `Tab`: Toggle the Inspector Panel.
  - `V`: Toggle between Solo Specimen and Botanical Garden mode.
  - `Space`: Toggle the "Breathing" bloom animation.
  - `H`: Enter Zen Mode (hides all UI).
  - `M`: Toggle ambient sound.
  - `S`: Copy current ASCII art to clipboard.
  - `R`: Reset camera position.

## 📂 Project Structure

- `index.html`: The main entry point and HUD structure.
- `style.css`: The cyberpunk aesthetic and responsive styles.
- `src/main.js`: The application coordinator and UI logic.
- `src/ascii-engine.js`: The core logic that converts pixels to characters.
- `src/flower-math.js`: The botanical geometry and procedural formulas.
- `src/presets.js`: Curated color and motion configurations.

## 🌸 Botanical Species Supported
The engine supports a variety of species, including Roses, Lilies, Tulips, and more, each with its own unique geometric signature.
