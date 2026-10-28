import * as THREE from 'three';

/**
 * 3D Floating Particle System
 * Emits drifting flower petals, pollen sparks, and ambient glowing spores
 * that orbit the flower and are seamlessly rasterized into ASCII.
 */

export class FlowerParticleField {
  constructor(count = 70) {
    this.group = new THREE.Group();
    this.group.name = 'particleField';
    this.count = count;
    this.particles = [];

    // Shared geometries
    const petalGeo = new THREE.PlaneGeometry(0.12, 0.16);
    petalGeo.rotateX(Math.PI / 2); // Lay horizontal initially
    const sporeGeo = new THREE.SphereGeometry(0.04, 6, 6);

    // Color materials
    this.petalMat = new THREE.MeshStandardMaterial({
      color: 0xff77aa,
      roughness: 0.3,
      side: THREE.DoubleSide
    });

    this.sporeMat = new THREE.MeshStandardMaterial({
      color: 0xffea70,
      emissive: 0xffcc00,
      emissiveIntensity: 0.8
    });

    for (let i = 0; i < count; i++) {
      const isPetal = i % 3 !== 0;
      const mesh = new THREE.Mesh(isPetal ? petalGeo : sporeGeo, isPetal ? this.petalMat : this.sporeMat);

      const pData = {
        mesh,
        isPetal,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
        orbitRadius: 1.2 + Math.random() * 2.2,
        orbitSpeed: (0.15 + Math.random() * 0.35) * (Math.random() > 0.5 ? 1 : -1),
        orbitAngle: Math.random() * Math.PI * 2,
        baseY: -1.0 + Math.random() * 3.2,
        verticalSpeed: 0.05 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
        scale: 0.6 + Math.random() * 0.8
      };

      mesh.scale.set(pData.scale, pData.scale, pData.scale);
      this.resetParticle(pData, true);

      this.group.add(mesh);
      this.particles.push(pData);
    }
  }

  resetParticle(p, initial = false) {
    p.orbitAngle = Math.random() * Math.PI * 2;
    p.orbitRadius = 0.8 + Math.random() * 2.0;
    p.baseY = initial ? (-1.5 + Math.random() * 3.5) : (-1.2 - Math.random() * 0.5);
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.orbitRadius,
      p.baseY,
      Math.sin(p.orbitAngle) * p.orbitRadius
    );
  }

  setPalette(petalColor, sporeColor) {
    if (this.petalMat) this.petalMat.color.set(petalColor);
    if (this.sporeMat) {
      this.sporeMat.color.set(sporeColor);
      this.sporeMat.emissive.set(sporeColor);
    }
  }

  burst(originY = 1.0) {
    this.particles.forEach(p => {
      p.orbitSpeed *= (Math.random() > 0.5 ? 2.5 : -2.5);
      p.rotVel.multiplyScalar(2.5);
      if (Math.random() > 0.35) {
        p.baseY = originY + (Math.random() - 0.5) * 0.8;
        p.orbitRadius = 0.4 + Math.random() * 1.8;
      }
    });
  }

  update(delta, time, wind = 1.0) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Swirling vortex orbit
      p.orbitAngle += p.orbitSpeed * delta * (0.8 + wind * 0.4);
      p.baseY += p.verticalSpeed * delta * (0.9 + wind * 0.3);

      // Radial wobble
      const currentRadius = p.orbitRadius + Math.sin(time * 1.5 + p.phase) * 0.2;

      p.mesh.position.x = Math.cos(p.orbitAngle) * currentRadius + Math.sin(time * 0.8 + p.phase) * 0.15;
      p.mesh.position.z = Math.sin(p.orbitAngle) * currentRadius + Math.cos(time * 0.8 + p.phase) * 0.15;
      p.mesh.position.y = p.baseY + Math.sin(time * 2.0 + p.phase) * 0.1;

      // 3D tumble
      p.mesh.rotation.x += p.rotVel.x * delta * wind;
      p.mesh.rotation.y += p.rotVel.y * delta * wind;
      p.mesh.rotation.z += p.rotVel.z * delta * wind;

      // Wrap around top boundary
      if (p.baseY > 3.0) {
        this.resetParticle(p, false);
      }
    }
  }
}
