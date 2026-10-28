import * as THREE from 'three';

/**
 * Procedural 3D Flower Geometries
 * Generates mathematically distinct, organic, blooming 3D flowers with stems and leaves.
 */

export const FLOWER_TYPES = {
  rose: 'Cyber Rose',
  lotus: 'Golden Lotus',
  dahlia: 'Fibonacci Dahlia',
  sakura: 'Sakura Blossom',
  sunflower: 'Solar Helianthus',
  orchid: 'Fractal Orchid',
  tulip: 'Emperor Tulip',
  lavender: 'Meadow Lavender'
};

/**
 * Creates a complete flower group (flower head + stem + leaves + stamen)
 */
export function createFlower(type = 'rose', options = {}) {
  const group = new THREE.Group();
  group.name = 'flowerGroup';

  // Master container for the head (allows blooming, twisting, tilting)
  const headGroup = new THREE.Group();
  headGroup.name = 'flowerHead';
  headGroup.position.set(0, 1.2, 0);

  // Stored references for animation
  const animatedParts = [];

  switch (type) {
    case 'lotus':
      buildLotus(headGroup, animatedParts);
      break;
    case 'dahlia':
      buildDahlia(headGroup, animatedParts);
      break;
    case 'sakura':
      buildSakura(headGroup, animatedParts);
      break;
    case 'sunflower':
      buildSunflower(headGroup, animatedParts);
      break;
    case 'orchid':
      buildOrchid(headGroup, animatedParts);
      break;
    case 'tulip':
      buildTulip(headGroup, animatedParts);
      break;
    case 'lavender':
      buildLavender(headGroup, animatedParts);
      break;
    case 'rose':
    default:
      buildRose(headGroup, animatedParts);
      break;
  }

  // Build the organic curved stem and leaves
  const stemData = buildStemAndLeaves();
  group.add(stemData.stemGroup);

  group.add(headGroup);

  return {
    group,
    headGroup,
    animatedParts,
    stemCurve: stemData.curve,
    update: (time, bloomAmount, windStrength) => {
      // Animate petals bloom and wind flutter
      animatedParts.forEach((part, index) => {
        if (!part) return;
        const offset = part.userData.phaseOffset || 0;
        const layer = part.userData.layer || 0;
        const baseRotX = part.userData.baseRotX || 0;
        const baseRotZ = part.userData.baseRotZ || 0;
        const openFactor = part.userData.openFactor || 1.0;

        // Blooming rotation: unfolds outward based on bloomAmount
        // Inner petals open later than outer petals
        const layerBloom = Math.max(0, Math.min(1.5, bloomAmount * 1.3 - layer * 0.12));
        const targetRotX = baseRotX + layerBloom * openFactor * 0.65;
        
        // Organic wind fluttering
        const flutter = Math.sin(time * 2.2 + offset) * 0.04 * windStrength +
                        Math.cos(time * 3.7 + index) * 0.02 * windStrength;

        part.rotation.x = THREE.MathUtils.lerp(part.rotation.x, targetRotX + flutter, 0.1);
        part.rotation.z = baseRotZ + Math.sin(time * 1.5 + offset) * 0.03 * windStrength;

        // Slight breathing scale
        const breathe = 1.0 + Math.sin(time * 1.8 + layer) * 0.025 * bloomAmount;
        part.scale.set(breathe, breathe, breathe);
      });

      // Stem organic swaying
      const swayX = Math.sin(time * 1.2) * 0.04 * windStrength;
      const swayZ = Math.cos(time * 0.9) * 0.04 * windStrength;
      headGroup.rotation.z = swayX * 0.8;
      headGroup.rotation.x = swayZ * 0.8;
      headGroup.position.x = swayX * 0.5;
    }
  };
}

/**
 * Rose: Spiraling overlapping petal whorls that tightly coil at the core
 * and open wide in outer whorls.
 */
function buildRose(headGroup, animatedParts) {
  const whorlCounts = [4, 5, 7, 8, 9, 10]; // Petals per layer from center to outer
  const totalLayers = whorlCounts.length;

  // Stamen / Center Pistil
  const centerGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xffdd44,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0xffaa00,
    emissiveIntensity: 0.3
  });
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.position.y = 0.05;
  headGroup.add(centerMesh);

  // Petal geometry helper (curved dish-like petal)
  whorlCounts.forEach((count, layerIndex) => {
    const layerRadius = 0.12 + layerIndex * 0.14;
    const petalWidth = 0.35 + layerIndex * 0.16;
    const petalLength = 0.45 + layerIndex * 0.18;
    const openFactor = 0.4 + (layerIndex / totalLayers) * 1.1;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + layerIndex * 0.85; // Natural spiral offset
      const petalPivot = new THREE.Group();
      petalPivot.position.set(0, 0, 0);
      petalPivot.rotation.y = angle;

      const petalMesh = createCurvedPetalMesh(petalWidth, petalLength, 0.45, {
        color: layerIndex < 2 ? 0xff2a6d : (layerIndex < 4 ? 0xff4f81 : 0xff7597),
        innerColor: 0xff1053,
        roughness: 0.35
      });

      // Position along radius and tilt
      petalMesh.position.set(0, 0, layerRadius);
      petalMesh.rotation.x = THREE.MathUtils.degToRad(-15 - layerIndex * 8);

      petalPivot.add(petalMesh);

      petalPivot.userData = {
        layer: layerIndex,
        baseRotX: THREE.MathUtils.degToRad(10 + layerIndex * 12),
        baseRotZ: (Math.random() - 0.5) * 0.1,
        openFactor: openFactor,
        phaseOffset: angle + layerIndex
      };

      headGroup.add(petalPivot);
      animatedParts.push(petalPivot);
    }
  });
}

/**
 * Lotus: Multi-tiered pointed petals with sacred geometry and a prominent central pod
 */
function buildLotus(headGroup, animatedParts) {
  // Lotus Seed Pod (Flat-topped inverted cone)
  const podGeo = new THREE.CylinderGeometry(0.35, 0.18, 0.28, 18);
  const podMat = new THREE.MeshStandardMaterial({
    color: 0x88cc44,
    roughness: 0.4,
    emissive: 0x448822,
    emissiveIntensity: 0.2
  });
  const podMesh = new THREE.Mesh(podGeo, podMat);
  podMesh.position.y = 0.14;
  headGroup.add(podMesh);

  // Seed spots on top of pod
  const seedRingCount = 8;
  const seedGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const seedMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });
  for (let s = 0; s < seedRingCount; s++) {
    const sAng = (s / seedRingCount) * Math.PI * 2;
    const sm = new THREE.Mesh(seedGeo, seedMat);
    sm.position.set(Math.cos(sAng) * 0.2, 0.29, Math.sin(sAng) * 0.2);
    headGroup.add(sm);
  }

  // Golden stamen fringe around pod
  const stamenCount = 28;
  const stamenGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 5);
  const stamenMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5
  });
  for (let st = 0; st < stamenCount; st++) {
    const stAng = (st / stamenCount) * Math.PI * 2;
    const stMesh = new THREE.Mesh(stamenGeo, stamenMat);
    stMesh.position.set(Math.cos(stAng) * 0.38, 0.18, Math.sin(stAng) * 0.38);
    stMesh.rotation.z = Math.cos(stAng) * 0.25;
    stMesh.rotation.x = Math.sin(stAng) * 0.25;
    headGroup.add(stMesh);
  }

  // Lotus tiered petals
  const layers = [
    { count: 6, radius: 0.38, width: 0.38, length: 0.75, angle: 25 },
    { count: 8, radius: 0.55, width: 0.48, length: 0.95, angle: 45 },
    { count: 10, radius: 0.72, width: 0.58, length: 1.15, angle: 65 },
    { count: 12, radius: 0.90, width: 0.65, length: 1.25, angle: 80 }
  ];

  layers.forEach((layer, layerIndex) => {
    for (let i = 0; i < layer.count; i++) {
      const angle = (i / layer.count) * Math.PI * 2 + (layerIndex % 2) * (Math.PI / layer.count);
      const pivot = new THREE.Group();
      pivot.rotation.y = angle;

      const petalMesh = createPointedPetalMesh(layer.width, layer.length, 0.3, {
        color: layerIndex === 0 ? 0xfff0f5 : (layerIndex === 1 ? 0xffccd9 : 0xff99bb),
        tipColor: 0xff3377
      });

      petalMesh.position.set(0, 0, layer.radius);
      pivot.add(petalMesh);

      pivot.userData = {
        layer: layerIndex,
        baseRotX: THREE.MathUtils.degToRad(layer.angle),
        baseRotZ: 0,
        openFactor: 0.7 + layerIndex * 0.25,
        phaseOffset: angle
      };

      headGroup.add(pivot);
      animatedParts.push(pivot);
    }
  });
}

/**
 * Dahlia: Hundreds of spiraling florets following Fibonacci phyllotaxis (Golden ratio)
 */
function buildDahlia(headGroup, animatedParts) {
  const goldenAngle = 137.508 * (Math.PI / 180);
  const totalPetals = 95;

  const centerGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff2200,
    emissiveIntensity: 0.4
  });
  headGroup.add(new THREE.Mesh(centerGeo, centerMat));

  for (let i = 0; i < totalPetals; i++) {
    const fraction = i / totalPetals;
    const theta = i * goldenAngle;
    const r = Math.sqrt(fraction) * 1.35 + 0.15;
    const y = 0.2 - Math.pow(fraction, 1.4) * 0.45;

    const pivot = new THREE.Group();
    pivot.position.set(0, y, 0);
    pivot.rotation.y = theta;

    const pWidth = 0.16 + fraction * 0.18;
    const pLength = 0.32 + fraction * 0.55;

    const petalMesh = createCurvedPetalMesh(pWidth, pLength, 0.6, {
      color: 0xff0055,
      innerColor: 0xffcc00,
      roughness: 0.3
    });

    petalMesh.position.set(0, 0, r);
    pivot.add(petalMesh);

    pivot.userData = {
      layer: Math.floor(fraction * 6),
      baseRotX: THREE.MathUtils.degToRad(15 + fraction * 65),
      baseRotZ: 0,
      openFactor: 0.5 + fraction * 0.8,
      phaseOffset: theta
    };

    headGroup.add(pivot);
    animatedParts.push(pivot);
  }
}

/**
 * Sakura (Cherry Blossom): 5 delicate notched petals, long slender stamens, gentle breeze
 */
function buildSakura(headGroup, animatedParts) {
  // Center pistil cluster
  const pistilGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const pistilMat = new THREE.MeshStandardMaterial({ color: 0xee7799 });
  headGroup.add(new THREE.Mesh(pistilGeo, pistilMat));

  // Slender golden stamens
  const stamenCount = 20;
  for (let s = 0; s < stamenCount; s++) {
    const sAng = (s / stamenCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const sLen = 0.25 + Math.random() * 0.1;
    const sPivot = new THREE.Group();
    sPivot.rotation.y = sAng;

    const sStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, sLen, 5),
      new THREE.MeshStandardMaterial({ color: 0xffddaa })
    );
    sStem.position.set(0, sLen / 2, 0.08);
    sStem.rotation.x = THREE.MathUtils.degToRad(30);

    const sAnther = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffbb33, emissive: 0xff9900, emissiveIntensity: 0.5 })
    );
    sAnther.position.set(0, sLen, 0.08 + Math.sin(THREE.MathUtils.degToRad(30)) * (sLen / 2));

    sPivot.add(sStem);
    sPivot.add(sAnther);
    headGroup.add(sPivot);
  }

  // 5 Iconic notched Sakura Petals
  const petalCount = 5;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.y = angle;

    const petalMesh = createSakuraPetalMesh(0.65, 0.95);
    petalMesh.position.set(0, 0, 0.2);
    pivot.add(petalMesh);

    pivot.userData = {
      layer: 0,
      baseRotX: THREE.MathUtils.degToRad(68),
      baseRotZ: 0,
      openFactor: 0.6,
      phaseOffset: angle
    };

    headGroup.add(pivot);
    animatedParts.push(pivot);
  }
}

/**
 * Sunflower: Dark golden-ratio seed center disk with vibrant outer ray florets
 */
function buildSunflower(headGroup, animatedParts) {
  // Dense Fermat spiral center disk
  const floretCount = 180;
  const goldenAngle = 137.508 * (Math.PI / 180);
  const diskGroup = new THREE.Group();

  const floretGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6);
  const floretMat = new THREE.MeshStandardMaterial({
    color: 0x3d2005,
    roughness: 0.8
  });
  const edgeFloretMat = new THREE.MeshStandardMaterial({
    color: 0xb57800,
    roughness: 0.6
  });

  for (let i = 0; i < floretCount; i++) {
    const fraction = i / floretCount;
    const r = Math.sqrt(fraction) * 0.75;
    const theta = i * goldenAngle;
    const floret = new THREE.Mesh(floretGeo, fraction > 0.75 ? edgeFloretMat : floretMat);
    floret.position.set(Math.cos(theta) * r, 0.05 + (1 - fraction) * 0.05, Math.sin(theta) * r);
    floret.rotation.y = theta;
    diskGroup.add(floret);
  }
  headGroup.add(diskGroup);

  // Outer Ray Petals (2 layers of brilliant golden yellow petals)
  const rayCounts = [24, 24];
  rayCounts.forEach((count, layerIndex) => {
    const radius = 0.75 + layerIndex * 0.12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (layerIndex * Math.PI) / count;
      const pivot = new THREE.Group();
      pivot.rotation.y = angle;

      const petalMesh = createPointedPetalMesh(0.28, 0.95, 0.2, {
        color: 0xffcc00,
        tipColor: 0xffaa00
      });

      petalMesh.position.set(0, 0, radius);
      pivot.add(petalMesh);

      pivot.userData = {
        layer: layerIndex,
        baseRotX: THREE.MathUtils.degToRad(78 + layerIndex * 8),
        baseRotZ: 0,
        openFactor: 0.5 + layerIndex * 0.3,
        phaseOffset: angle
      };

      headGroup.add(pivot);
      animatedParts.push(pivot);
    }
  });
}

/**
 * Orchid: Highly intricate bilateral symmetry with broad dorsal sepal,
 * swept lateral petals, and a dramatically curved labellum
 */
function buildOrchid(headGroup, animatedParts) {
  // Center column
  const colGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8);
  const colMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xee88cc, emissiveIntensity: 0.3 });
  const colMesh = new THREE.Mesh(colGeo, colMat);
  colMesh.rotation.x = THREE.MathUtils.degToRad(35);
  colMesh.position.set(0, 0.2, 0.1);
  headGroup.add(colMesh);

  // Dorsal Sepal (top petal)
  const topPivot = new THREE.Group();
  const topPetal = createPointedPetalMesh(0.55, 1.1, 0.3, { color: 0xdd55bb });
  topPetal.position.set(0, 0, 0.2);
  topPivot.add(topPetal);
  topPivot.userData = { layer: 0, baseRotX: THREE.MathUtils.degToRad(20), baseRotZ: 0, openFactor: 0.6, phaseOffset: 0 };
  headGroup.add(topPivot);
  animatedParts.push(topPivot);

  // 2 Lateral Petals (spread like wings)
  [-1, 1].forEach((side, i) => {
    const wingPivot = new THREE.Group();
    wingPivot.rotation.y = side * THREE.MathUtils.degToRad(80);
    const wingPetal = createCurvedPetalMesh(0.65, 1.2, 0.25, { color: 0xee66cc });
    wingPetal.position.set(0, 0, 0.25);
    wingPivot.add(wingPetal);
    wingPivot.userData = { layer: 1, baseRotX: THREE.MathUtils.degToRad(40), baseRotZ: side * 0.2, openFactor: 0.7, phaseOffset: side };
    headGroup.add(wingPivot);
    animatedParts.push(wingPivot);
  });

  // 2 Lower Lateral Sepals
  [-1, 1].forEach((side, i) => {
    const lowPivot = new THREE.Group();
    lowPivot.rotation.y = side * THREE.MathUtils.degToRad(145);
    const lowPetal = createPointedPetalMesh(0.45, 1.0, 0.2, { color: 0xcc44aa });
    lowPetal.position.set(0, 0, 0.2);
    lowPivot.add(lowPetal);
    lowPivot.userData = { layer: 2, baseRotX: THREE.MathUtils.degToRad(60), baseRotZ: -side * 0.2, openFactor: 0.6, phaseOffset: side * 2 };
    headGroup.add(lowPivot);
    animatedParts.push(lowPivot);
  });

  // Labellum (Exotic ruffled lower lip)
  const lipPivot = new THREE.Group();
  lipPivot.rotation.y = Math.PI;
  const lipMesh = createCurvedPetalMesh(0.7, 0.9, 0.6, { color: 0x990066, innerColor: 0xffdd22 });
  lipMesh.position.set(0, -0.15, 0.2);
  lipPivot.add(lipMesh);
  lipPivot.userData = { layer: 3, baseRotX: THREE.MathUtils.degToRad(85), baseRotZ: 0, openFactor: 0.8, phaseOffset: 3 };
  headGroup.add(lipPivot);
  animatedParts.push(lipPivot);
}

/**
 * Tulip: Regal chalice formed by two overlapping trios of cupped petals
 * with a prominent central pistil and pollen stamens.
 */
function buildTulip(headGroup, animatedParts) {
  // Center Pistil
  const pistilGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.45, 8);
  const pistilMat = new THREE.MeshStandardMaterial({
    color: 0x88cc44,
    roughness: 0.3,
    emissive: 0x336611,
    emissiveIntensity: 0.2
  });
  const pistilMesh = new THREE.Mesh(pistilGeo, pistilMat);
  pistilMesh.position.y = 0.22;
  headGroup.add(pistilMesh);

  // 6 dark stamens with golden yellow pollen anthers
  const stamenCount = 6;
  const stamenGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6);
  const stamenMat = new THREE.MeshStandardMaterial({ color: 0x221100 });
  const antherGeo = new THREE.SphereGeometry(0.035, 8, 8);
  antherGeo.scale(1, 2, 1);
  const antherMat = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.4
  });

  for (let s = 0; s < stamenCount; s++) {
    const sAng = (s / stamenCount) * Math.PI * 2;
    const sGroup = new THREE.Group();
    sGroup.position.set(Math.cos(sAng) * 0.12, 0.05, Math.sin(sAng) * 0.12);
    sGroup.rotation.z = Math.cos(sAng) * 0.18;
    sGroup.rotation.x = Math.sin(sAng) * 0.18;

    const sStem = new THREE.Mesh(stamenGeo, stamenMat);
    sStem.position.y = 0.17;
    sGroup.add(sStem);

    const antherMesh = new THREE.Mesh(antherGeo, antherMat);
    antherMesh.position.y = 0.35;
    sGroup.add(antherMesh);

    headGroup.add(sGroup);
  }

  // 2 whorls of 3 petals: Inner 3 and Outer 3
  const whorls = [
    { count: 3, radius: 0.16, width: 0.65, length: 1.1, baseRotX: 12, rotOffset: 0, color: 0xff2244, layer: 0 },
    { count: 3, radius: 0.24, width: 0.72, length: 1.18, baseRotX: 18, rotOffset: Math.PI / 3, color: 0xff5533, layer: 1 }
  ];

  whorls.forEach(w => {
    for (let i = 0; i < w.count; i++) {
      const angle = (i / w.count) * Math.PI * 2 + w.rotOffset;
      const pivot = new THREE.Group();
      pivot.rotation.y = angle;

      const petalMesh = createCurvedPetalMesh(w.width, w.length, 0.55, {
        color: w.color,
        roughness: 0.35
      });
      petalMesh.position.set(0, 0, w.radius);
      pivot.add(petalMesh);

      pivot.userData = {
        layer: w.layer,
        baseRotX: THREE.MathUtils.degToRad(w.baseRotX),
        baseRotZ: 0,
        openFactor: 0.45 + w.layer * 0.35,
        phaseOffset: angle
      };

      headGroup.add(pivot);
      animatedParts.push(pivot);
    }
  });
}

/**
 * Lavender: Slender vertical spire of tiered blooming florets with soothing sway
 */
function buildLavender(headGroup, animatedParts) {
  const tiers = 8;
  const floretsPerTier = 5;
  const floretGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.18, 6);
  floretGeo.rotateX(Math.PI / 2);

  const colors = [0x7b68ee, 0x8a2be2, 0x9370db, 0x6a5acd, 0xba55d3];

  for (let t = 0; t < tiers; t++) {
    const tierY = t * 0.18;
    const tierScale = 1.0 - (t / tiers) * 0.35;
    const tierColor = colors[t % colors.length];

    const floretMat = new THREE.MeshStandardMaterial({
      color: tierColor,
      roughness: 0.4,
      emissive: 0x483d8b,
      emissiveIntensity: 0.25
    });

    for (let f = 0; f < floretsPerTier; f++) {
      const angle = (f / floretsPerTier) * Math.PI * 2 + (t * 0.5);
      const pivot = new THREE.Group();
      pivot.position.set(0, tierY, 0);
      pivot.rotation.y = angle;

      const floretMesh = new THREE.Mesh(floretGeo, floretMat);
      floretMesh.scale.set(tierScale, tierScale, tierScale);
      floretMesh.position.set(0, 0, 0.14 * tierScale);
      floretMesh.rotation.x = THREE.MathUtils.degToRad(20 + t * 4);
      pivot.add(floretMesh);

      // 4 tiny petal lobes on floret
      for (let p = 0; p < 4; p++) {
        const pAng = (p / 4) * Math.PI * 2;
        const lobeGeo = new THREE.SphereGeometry(0.035 * tierScale, 6, 6);
        const lobeMesh = new THREE.Mesh(lobeGeo, floretMat);
        lobeMesh.position.set(Math.cos(pAng) * 0.05 * tierScale, Math.sin(pAng) * 0.05 * tierScale, 0.09 * tierScale);
        floretMesh.add(lobeMesh);
      }

      pivot.userData = {
        layer: t,
        baseRotX: THREE.MathUtils.degToRad(25),
        baseRotZ: 0,
        openFactor: 0.2 + (t / tiers) * 0.3,
        phaseOffset: angle + t
      };

      headGroup.add(pivot);
      animatedParts.push(pivot);
    }
  }
}

/**
 * Generates curved 3D petal mesh with smooth normals
 */
function createCurvedPetalMesh(width, length, curl = 0.4, options = {}) {
  const segmentsU = 14;
  const segmentsV = 14;
  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= segmentsV; j++) {
    const v = j / segmentsV; // 0 (base) to 1 (tip)
    // Petal profile width: tear-drop shape
    const w = Math.sin(Math.PI * Math.pow(v, 0.6)) * (width / 2);
    // Length along petal
    const z = v * length;
    // Curvature: cups in middle, curls back at tip
    const cup = -Math.sin(Math.PI * v) * curl * 0.35;
    const tipCurl = Math.pow(v, 2.8) * curl * 0.4;
    const y = cup + tipCurl;

    for (let i = 0; i <= segmentsU; i++) {
      const u = i / segmentsU; // 0 (left) to 1 (right)
      const x = (u - 0.5) * 2 * w;
      // Cross-sectional bowl cup
      const crossCup = (1 - Math.pow((u - 0.5) * 2, 2)) * (v * 0.12);

      vertices.push(x, y - crossCup, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segmentsV; j++) {
    for (let i = 0; i < segmentsU; i++) {
      const a = j * (segmentsU + 1) + i;
      const b = (j + 1) * (segmentsU + 1) + i;
      const c = (j + 1) * (segmentsU + 1) + (i + 1);
      const d = j * (segmentsU + 1) + (i + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: options.color || 0xff3366,
    roughness: options.roughness || 0.4,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Pointed petal (e.g. Lotus / Dahlia / Sunflower)
 */
function createPointedPetalMesh(width, length, curl = 0.3, options = {}) {
  const segmentsU = 12;
  const segmentsV = 16;
  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= segmentsV; j++) {
    const v = j / segmentsV;
    // Lancet shape: reaches max width at 40%, tapers to a sharp point at 100%
    const profile = v < 0.4 ? Math.sin((v / 0.4) * (Math.PI / 2)) : Math.cos(((v - 0.4) / 0.6) * (Math.PI / 2));
    const w = profile * (width / 2);
    const z = v * length;
    const y = -Math.sin(v * Math.PI) * curl * 0.25;

    for (let i = 0; i <= segmentsU; i++) {
      const u = i / segmentsU;
      const x = (u - 0.5) * 2 * w;
      // Slight center ridge (keel)
      const ridge = (1 - Math.abs(u - 0.5) * 2) * (0.05 * v);

      vertices.push(x, y + ridge, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segmentsV; j++) {
    for (let i = 0; i < segmentsU; i++) {
      const a = j * (segmentsU + 1) + i;
      const b = (j + 1) * (segmentsU + 1) + i;
      const c = (j + 1) * (segmentsU + 1) + (i + 1);
      const d = j * (segmentsU + 1) + (i + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: options.color || 0xffaacc,
    roughness: 0.45,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Sakura petal with distinct center notch at tip
 */
function createSakuraPetalMesh(width, length) {
  const segmentsU = 16;
  const segmentsV = 16;
  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= segmentsV; j++) {
    const v = j / segmentsV;
    const baseW = Math.sin(Math.pow(v, 0.7) * Math.PI) * (width / 2);

    for (let i = 0; i <= segmentsU; i++) {
      const u = i / segmentsU;
      const xNorm = (u - 0.5) * 2;
      const x = xNorm * baseW;

      // Create tip heart-notch indentation
      let z = v * length;
      if (v > 0.8) {
        const tipProg = (v - 0.8) / 0.2;
        const notch = (1 - Math.abs(xNorm)) * 0.12 * tipProg;
        z -= notch;
      }

      const y = -Math.sin(v * Math.PI) * 0.12;

      vertices.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segmentsV; j++) {
    for (let i = 0; i < segmentsU; i++) {
      const a = j * (segmentsU + 1) + i;
      const b = (j + 1) * (segmentsU + 1) + i;
      const c = (j + 1) * (segmentsU + 1) + (i + 1);
      const d = j * (segmentsU + 1) + (i + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffc4d6,
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Stem and graceful botanical leaves
 */
function buildStemAndLeaves() {
  const stemGroup = new THREE.Group();
  stemGroup.name = 'stemGroup';

  // Smooth Catmull-Rom curve for organic stem
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -2.4, -0.1),
    new THREE.Vector3(0.08, -1.6, 0.1),
    new THREE.Vector3(-0.06, -0.8, -0.05),
    new THREE.Vector3(0.04, 0.2, 0.08),
    new THREE.Vector3(0, 1.2, 0)
  ]);

  const stemGeo = new THREE.TubeGeometry(curve, 32, 0.065, 10, false);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.5,
    metalness: 0.1
  });
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemGroup.add(stemMesh);

  // Leaves branching off stem
  const leafNodes = [
    { t: 0.35, angle: 0.9, tilt: 0.4, scale: 0.9 },
    { t: 0.65, angle: -1.8, tilt: 0.5, scale: 0.75 }
  ];

  leafNodes.forEach(node => {
    const pt = curve.getPointAt(node.t);
    const leafPivot = new THREE.Group();
    leafPivot.position.copy(pt);
    leafPivot.rotation.y = node.angle;
    leafPivot.rotation.z = node.tilt;

    const leafMesh = createCurvedPetalMesh(0.45 * node.scale, 1.1 * node.scale, 0.3, {
      color: 0x388e3c,
      roughness: 0.4
    });
    leafMesh.rotation.x = THREE.MathUtils.degToRad(35);
    leafPivot.add(leafMesh);
    stemGroup.add(leafPivot);
  });

  // Receptacle / Sepals at base of flower head
  const sepalCount = 6;
  for (let i = 0; i < sepalCount; i++) {
    const angle = (i / sepalCount) * Math.PI * 2;
    const sepalPivot = new THREE.Group();
    sepalPivot.position.set(0, 1.16, 0);
    sepalPivot.rotation.y = angle;

    const sepalMesh = createPointedPetalMesh(0.18, 0.48, 0.4, { color: 0x2e7d32 });
    sepalMesh.position.set(0, 0, 0.12);
    sepalMesh.rotation.x = THREE.MathUtils.degToRad(100);
    sepalPivot.add(sepalMesh);
    stemGroup.add(sepalPivot);
  }

  return { stemGroup, curve };
}

/**
 * Creates a coordinated botanical 3D Garden composition of multiple flowers
 */
export function createGarden(mainType = 'rose', options = {}) {
  const gardenGroup = new THREE.Group();
  gardenGroup.name = 'gardenGroup';

  const companions = {
    rose: ['sakura', 'tulip', 'lavender'],
    lotus: ['sakura', 'orchid', 'rose'],
    dahlia: ['sunflower', 'tulip', 'sakura'],
    sakura: ['lotus', 'lavender', 'rose'],
    sunflower: ['dahlia', 'tulip', 'rose'],
    orchid: ['lotus', 'rose', 'sakura'],
    tulip: ['rose', 'lavender', 'dahlia'],
    lavender: ['sakura', 'tulip', 'rose']
  };

  const compTypes = companions[mainType] || ['sakura', 'tulip', 'lavender'];

  // 1. Center Master Flower
  const centerFlower = createFlower(mainType, options);
  centerFlower.group.position.set(0, 0, 0);
  gardenGroup.add(centerFlower.group);

  // 2. Left Flanking Flower
  const leftFlower = createFlower(compTypes[0], options);
  leftFlower.group.position.set(-1.4, -0.22, -0.25);
  leftFlower.group.scale.set(0.78, 0.78, 0.78);
  leftFlower.group.rotation.y = 0.45;
  gardenGroup.add(leftFlower.group);

  // 3. Right Flanking Flower
  const rightFlower = createFlower(compTypes[1], options);
  rightFlower.group.position.set(1.35, -0.18, 0.2);
  rightFlower.group.scale.set(0.82, 0.82, 0.82);
  rightFlower.group.rotation.y = -0.5;
  gardenGroup.add(rightFlower.group);

  // 4. Background Accent Flower
  const backFlower = createFlower(compTypes[2], options);
  backFlower.group.position.set(-0.35, -0.4, -1.05);
  backFlower.group.scale.set(0.66, 0.66, 0.66);
  backFlower.group.rotation.y = 1.1;
  gardenGroup.add(backFlower.group);

  const flowers = [centerFlower, leftFlower, rightFlower, backFlower];

  return {
    group: gardenGroup,
    flowers,
    isGarden: true,
    update: (time, bloomAmount, windStrength) => {
      flowers.forEach((fl, idx) => {
        // Individual time phase offset for natural organic desynchronization
        const tOffset = idx * 0.73;
        const individualBloom = Math.max(0.2, bloomAmount + Math.sin(time * 0.9 + idx) * 0.08);
        fl.update(time + tOffset, individualBloom, windStrength);
      });
    }
  };
}
