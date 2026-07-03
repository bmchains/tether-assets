const revealNodes = document.querySelectorAll(".reveal");
const copyButtons = document.querySelectorAll(".copy-btn");
const tiltCards = document.querySelectorAll("[data-tilt]");
const parallaxNodes = document.querySelectorAll(".scroll-parallax");
const toast = document.getElementById("toast");
const webglStage = document.getElementById("webgl-stage");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  scrollY: window.scrollY,
  pointerX: 0,
  pointerY: 0,
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealNodes.forEach((node) => revealObserver.observe(node));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy");

    try {
      await navigator.clipboard.writeText(value);
      showToast("Contract copied");
    } catch {
      showToast("Copy failed");
    }
  });
});

function updateParallax() {
  if (prefersReducedMotion) {
    parallaxNodes.forEach((node) => {
      node.style.transform = "";
      node.style.opacity = "";
    });
    return;
  }

  const viewportHeight = window.innerHeight;

  parallaxNodes.forEach((node) => {
    const depth = Number(node.dataset.depth || 0.1);
    const rect = node.getBoundingClientRect();
    const offset = rect.top + rect.height / 2 - viewportHeight / 2;
    const translate = -offset * depth * 0.16;
    const visibility = Math.max(0.72, 1 - Math.abs(offset) / (viewportHeight * 3.2));

    node.style.transform = `translate3d(0, ${translate}px, 0)`;
    node.style.opacity = `${visibility}`;
  });
}

updateParallax();
window.addEventListener(
  "scroll",
  () => {
    state.scrollY = window.scrollY;
    updateParallax();
  },
  { passive: true }
);

window.addEventListener(
  "pointermove",
  (event) => {
    state.pointerX = event.clientX / window.innerWidth - 0.5;
    state.pointerY = event.clientY / window.innerHeight - 0.5;
  },
  { passive: true }
);

if (!prefersReducedMotion) {
  tiltCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 14;
      const rotateX = (0.5 - py) * 14;

      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    });
  });
}

async function initWebGLScene() {
  if (prefersReducedMotion || !webglStage) {
    return;
  }

  try {
    const THREE = await import("https://unpkg.com/three@0.167.1/build/three.module.js");

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    webglStage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 12);

    const ambientLight = new THREE.AmbientLight(0xcfffd8, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0x59ff7c, 28, 60, 2);
    keyLight.position.set(-4, 2, 8);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xa7ff5a, 22, 60, 2);
    fillLight.position.set(5, -1, 7);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x1dcf4c, 18, 60, 2);
    rimLight.position.set(0, 5, -2);
    scene.add(rimLight);

    const world = new THREE.Group();
    scene.add(world);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 900;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i += 1) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 22;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 16;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 18;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x78ff8d,
        size: 0.028,
        transparent: true,
        opacity: 0.72,
      })
    );
    world.add(particles);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x6cff8f,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });

    const ringA = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.05, 16, 180), ringMaterial);
    ringA.rotation.x = Math.PI / 2.4;
    ringA.position.set(0.8, 1.3, -4);
    world.add(ringA);

    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.035, 16, 140), ringMaterial.clone());
    ringB.material.color = new THREE.Color(0xb8ff61);
    ringB.position.set(-2.6, -1.2, -2);
    ringB.rotation.x = 0.6;
    ringB.rotation.y = 0.4;
    world.add(ringB);

    function createCoin(label, color, accent) {
      const group = new THREE.Group();

      const edge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.86, 0.86, 0.18, 64, 1, true),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.95,
          roughness: 0.22,
          emissive: accent,
          emissiveIntensity: 0.15,
        })
      );

      const faceMaterial = new THREE.MeshStandardMaterial({
        color: 0xeefff0,
        metalness: 0.5,
        roughness: 0.18,
        emissive: accent,
        emissiveIntensity: 0.12,
      });

      const faceFront = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.04, 64), faceMaterial);
      faceFront.position.z = 0.07;

      const faceBack = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.04, 64), faceMaterial);
      faceBack.position.z = -0.07;

      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.03, 16, 90),
        new THREE.MeshStandardMaterial({
          color: accent,
          metalness: 0.8,
          roughness: 0.28,
          emissive: accent,
          emissiveIntensity: 0.35,
        })
      );
      innerRing.rotation.x = Math.PI / 2;
      innerRing.position.z = 0.09;

      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 512;
      labelCanvas.height = 512;
      const ctx = labelCanvas.getContext("2d");
      ctx.clearRect(0, 0, 512, 512);
      ctx.fillStyle = "#effff1";
      ctx.beginPath();
      ctx.arc(256, 256, 198, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#041006";
      ctx.font = "bold 122px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 256, 272);

      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
          opacity: 0.92,
        })
      );
      labelSprite.scale.set(1.12, 1.12, 1);
      labelSprite.position.z = 0.14;

      group.add(edge, faceFront, faceBack, innerRing, labelSprite);
      return group;
    }

    const coinA = createCoin("TA", 0x63ff7d, 0x17bf43);
    coinA.position.set(-3.1, 1.5, 0.2);
    world.add(coinA);

    const coinB = createCoin("UD", 0x17bf43, 0xb8ff61);
    coinB.scale.setScalar(0.92);
    coinB.position.set(2.9, -0.2, -0.4);
    world.add(coinB);

    const coinC = createCoin("GL", 0x9cff66, 0x59ff7c);
    coinC.scale.setScalar(0.74);
    coinC.position.set(-0.5, -2.2, -1.1);
    world.add(coinC);

    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.95, 0),
      new THREE.MeshStandardMaterial({
        color: 0x79ff99,
        transparent: true,
        opacity: 0.16,
        metalness: 0.2,
        roughness: 0.12,
        emissive: 0x24d355,
        emissiveIntensity: 0.2,
      })
    );
    crystal.position.set(1.1, 1.1, -3.3);
    world.add(crystal);

    const clock = new THREE.Clock();

    function resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    }

    window.addEventListener("resize", resize);

    function animate() {
      const elapsed = clock.getElapsedTime();
      const scrollProgress = Math.min(state.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1), 1);

      particles.rotation.y = elapsed * 0.025;
      particles.rotation.x = elapsed * 0.015;

      ringA.rotation.z = elapsed * 0.12;
      ringB.rotation.z = -elapsed * 0.18;

      coinA.rotation.y = elapsed * 0.55 + scrollProgress * 1.4;
      coinA.rotation.x = Math.sin(elapsed * 0.8) * 0.2;
      coinA.position.y = 1.5 + Math.sin(elapsed * 1.2) * 0.18;

      coinB.rotation.y = -elapsed * 0.62 - scrollProgress * 1.1;
      coinB.rotation.x = Math.cos(elapsed * 0.9) * 0.16;
      coinB.position.y = -0.2 + Math.cos(elapsed * 1.1) * 0.24;

      coinC.rotation.y = elapsed * 0.7 + scrollProgress * 0.9;
      coinC.rotation.z = Math.sin(elapsed * 1.3) * 0.12;
      coinC.position.x = -0.5 + Math.cos(elapsed * 0.8) * 0.2;

      crystal.rotation.x = elapsed * 0.35;
      crystal.rotation.y = -elapsed * 0.28;

      world.rotation.y += (state.pointerX * 0.45 - world.rotation.y) * 0.04;
      world.rotation.x += (-state.pointerY * 0.28 - world.rotation.x) * 0.04;
      world.position.y += ((-scrollProgress * 1.6) - world.position.y) * 0.05;
      world.position.x += (state.pointerX * 0.8 - world.position.x) * 0.035;

      camera.position.z = 12 - scrollProgress * 2.4;
      camera.position.y = -scrollProgress * 0.8;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      window.requestAnimationFrame(animate);
    }

    animate();
  } catch (error) {
    console.error("Three.js scene failed to initialize", error);
  }
}

initWebGLScene();
