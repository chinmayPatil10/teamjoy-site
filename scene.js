// The 3D hero: the Teamjoy mark (the cheering t) built from simple shapes. Round it circle the things
// Teamjoy looks after: a calendar, a gift, a cake, a chat bubble, coins, a map pin and balloons.
// It follows the pointer, spins when dragged and jumps when clicked.
//
// The page opens with a picture of this scene (assets/hero.webp), not the scene itself: the 3D
// library is over a megabyte of code, and fetching and starting it was what made the page stall.
// The real scene is fetched only when someone clicks the picture or rests the pointer on it.

const stage = document.getElementById("stage");
const canvas = document.getElementById("scene");
const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PINK = 0xf2467e, SUN = 0xffc83d, PLUM = 0x2b1b4e, TEAL = 0x2ec4b6, WHITE = 0xffffff;

const POSE = 13;  // the moment the picture was taken at, so the scene takes over without a jump

async function start(cheerFirst) {
  const THREE = await import("three");  // fetched only now that someone wants to play with it
  // Drawn at up to 1.5x, not the screen's full 2x or 3x: far less work for the graphics chip,
  // and on a small moving scene the difference is hard to see.
  let ratio = Math.min(window.devicePixelRatio, 1.25);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.1, 7.2);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9e4, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc83d, 0.9);
  rim.position.set(-4, 1, -3);
  scene.add(rim);

  // A simple glossy material: much cheaper to draw than a physically based one, and it looks the same here.
  const shiny = (color) => new THREE.MeshPhongMaterial({ color, shininess: 70, specular: 0x3a3a3a });

  // --- the mark, on the same proportions as the logo (logo grid 256 -> 1 unit = 100) ---
  const R = 0.18;
  const mascot = new THREE.Group();
  const pink = shiny(PINK);

  const tube = (curve, segments) => new THREE.Mesh(new THREE.TubeGeometry(curve, segments, R, 20, false), pink);
  const cap = (x, y) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), pink);
    ball.position.set(x, y, 0);
    return ball;
  };

  const stem = new THREE.CurvePath();
  stem.add(new THREE.LineCurve3(new THREE.Vector3(0, 0.28, 0), new THREE.Vector3(0, -0.54, 0)));
  stem.add(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, -0.54, 0), new THREE.Vector3(0, -0.9, 0), new THREE.Vector3(0.36, -0.9, 0)));
  stem.add(new THREE.LineCurve3(new THREE.Vector3(0.36, -0.9, 0), new THREE.Vector3(0.52, -0.9, 0)));
  mascot.add(tube(stem, 80), cap(0, 0.28), cap(0.52, -0.9));

  const arms = new THREE.Group();
  const armCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.7, 0.24, 0), new THREE.Vector3(0, -0.32, 0), new THREE.Vector3(0.7, 0.24, 0));
  arms.add(tube(armCurve, 60), cap(-0.7, 0.24), cap(0.7, 0.24));
  mascot.add(arms);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 40, 28), shiny(SUN));
  head.position.set(0, 0.86, 0);
  mascot.add(head);

  mascot.position.y = 0.05;
  mascot.scale.setScalar(0.98);
  scene.add(mascot);

  // A soft shadow on the "floor", so the mark feels like it is floating.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 40),
    new THREE.MeshBasicMaterial({ color: PLUM, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.45;
  scene.add(shadow);

  // --- the things Teamjoy looks after, circling the mascot ---
  const mat = Object.fromEntries(Object.entries({
    pink: PINK, sun: SUN, teal: TEAL, plum: PLUM, white: WHITE, gold: 0xf5b301, flame: 0xff8a3d, cream: 0xfff3df,
  }).map(([name, color]) => [name, shiny(color)]));
  const part = (geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const group = (...parts) => { const g = new THREE.Group(); g.add(...parts); return g; };

  function gift() {  // group gifts
    const bow = (side) => {
      const loop = part(new THREE.TorusGeometry(0.09, 0.035, 10, 24), mat.sun, side * 0.09, 0.4, 0);
      loop.rotation.set(0, 0, side * 0.6);
      return loop;
    };
    return group(
      part(new THREE.BoxGeometry(0.5, 0.42, 0.5), mat.teal),
      part(new THREE.BoxGeometry(0.56, 0.12, 0.56), mat.teal, 0, 0.26, 0),
      part(new THREE.BoxGeometry(0.1, 0.56, 0.58), mat.sun, 0, 0.04, 0),
      part(new THREE.BoxGeometry(0.58, 0.56, 0.1), mat.sun, 0, 0.04, 0),
      bow(-1), bow(1));
  }

  function calendar() {  // events: picking a date
    const page = group(
      part(new THREE.BoxGeometry(0.62, 0.64, 0.08), mat.white),
      part(new THREE.BoxGeometry(0.62, 0.17, 0.1), mat.pink, 0, 0.235, 0));
    for (const x of [-0.17, 0.17]) {
      const ring = part(new THREE.TorusGeometry(0.045, 0.018, 8, 16), mat.plum, x, 0.33, 0);
      ring.rotation.y = Math.PI / 2;
      page.add(ring);
    }
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const chosen = row === 1 && col === 1;  // the date the team picked
        page.add(part(new THREE.BoxGeometry(0.11, 0.11, 0.03), chosen ? mat.sun : mat.plum,
          -0.17 + col * 0.17, 0.04 - row * 0.19, 0.05));
      }
    }
    return page;
  }

  function cake() {  // celebrations
    return group(
      part(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 40), mat.cream, 0, -0.1, 0),
      part(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 40), mat.pink, 0, 0.02, 0),
      part(new THREE.CylinderGeometry(0.22, 0.22, 0.17, 40), mat.cream, 0, 0.13, 0),
      part(new THREE.CylinderGeometry(0.23, 0.23, 0.045, 40), mat.pink, 0, 0.235, 0),
      part(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12), mat.teal, 0, 0.33, 0),
      part(new THREE.SphereGeometry(0.04, 14, 10), mat.flame, 0, 0.44, 0));
  }

  function coins() {  // the budget
    const coin = (y, x) => group(
      part(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 40), mat.gold, x, y, 0),
      part(new THREE.CylinderGeometry(0.19, 0.19, 0.075, 40), mat.sun, x, y, 0));
    const stack = group(coin(-0.09, 0), coin(0, 0.03), coin(0.09, -0.02));
    stack.rotation.x = 0.5;
    return stack;
  }

  function balloon(material) {  // a party
    const body = part(new THREE.SphereGeometry(0.25, 32, 22), material, 0, 0.16, 0);
    body.scale.y = 1.18;
    const knot = part(new THREE.ConeGeometry(0.05, 0.07, 12), material, 0, -0.16, 0);
    return group(body, knot, part(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), mat.plum, 0, -0.4, 0));
  }

  function bubble() {  // just ask, in Slack
    const tail = part(new THREE.ConeGeometry(0.1, 0.18, 4), mat.plum, -0.16, -0.26, 0);
    tail.rotation.z = 0.5;
    const speech = group(part(new THREE.BoxGeometry(0.66, 0.42, 0.14), mat.plum), tail);
    for (const x of [-0.17, 0, 0.17]) speech.add(part(new THREE.SphereGeometry(0.045, 14, 10), mat.white, x, 0, 0.08));
    return speech;
  }

  function pin() {  // finding a place
    const tip = part(new THREE.ConeGeometry(0.2, 0.36, 28), mat.pink, 0, -0.2, 0);
    tip.rotation.x = Math.PI;
    return group(part(new THREE.SphereGeometry(0.22, 30, 20), mat.pink, 0, 0.08, 0), tip,
      part(new THREE.SphereGeometry(0.085, 18, 12), mat.white, 0, 0.08, 0.17));
  }

  const things = [calendar(), gift(), cake(), bubble(), coins(), pin(), balloon(mat.teal), balloon(mat.sun)];
  const orbiters = things.map((thing, i) => {
    thing.scale.setScalar(0.82);
    scene.add(thing);
    return {
      thing, angle: (i / things.length) * Math.PI * 2, height: [0.75, -0.55, 0.15, 1.05, -0.95, 0.55, -0.2, 1.2][i],
      phase: i * 1.7, burst: 0,
    };
  });

  // --- pointer: follow, drag to spin, click to cheer ---
  const pointer = { x: 0, y: 0 };
  // A drag may already be under way: it is what woke the scene (see `gesture` below).
  let spin = 0, spinSpeed = 0, dragging = gesture.down, lastX = gesture.x, moved = dragging ? 99 : 0, cheer = 0;
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (dragging) {
      const dx = e.clientX - lastX;
      spinSpeed = dx * 0.012;
      moved += Math.abs(dx);
      lastX = e.clientX;
    }
  });
  stage.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; moved = 0; canvas.style.cursor = "grabbing"; });
  window.addEventListener("pointerup", () => {
    if (dragging && moved < 6) {
      cheer = 1;
      orbiters.forEach((o) => { o.burst = 0.45; });
      document.getElementById("hint")?.remove();
    }
    dragging = false;
    canvas.style.cursor = "grab";
  });

  function resize() {
    const size = stage.clientWidth;
    renderer.setSize(size, stage.clientHeight, false);
    camera.aspect = size / stage.clientHeight;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);

  // While the page is being scrolled the scene holds still, so scrolling gets the whole machine.
  let scrolling = false, scrollTimer = 0;
  window.addEventListener("scroll", () => {
    scrolling = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { scrolling = false; }, 160);
  }, { passive: true });

  const clock = new THREE.Clock();
  // The scene moves for a few seconds when it first appears, and whenever someone points at it,
  // drags it or clicks it. The rest of the time it is a still picture and costs nothing, so the
  // page stays smooth on any machine.
  let last = 0, shown = false, awakeUntil = performance.now() + 4500;
  const wake = () => { awakeUntil = performance.now() + 2500; };
  stage.addEventListener("pointermove", wake);
  stage.addEventListener("pointerdown", wake);
  function frame(now = 0) {
    const t = clock.getElapsedTime() + POSE;
    const due = now - last >= 22;   // every second screen refresh: about 30 pictures a second
    const moving = now < awakeUntil;
    if (visible && !scrolling && !document.hidden && moving && (due || calm)) {
      last = now;
      spin += spinSpeed;
      spinSpeed *= dragging ? 0.6 : 0.95;
      cheer *= 0.94;
      const jump = Math.sin(Math.min(1, cheer * 1.2) * Math.PI) * 0.5;

      mascot.rotation.y = spin + pointer.x * 0.5 + Math.sin(t * 0.6) * 0.12;
      mascot.rotation.x = pointer.y * 0.18;
      mascot.rotation.z = Math.sin(t * 0.9) * 0.04;
      mascot.position.y = 0.05 + Math.sin(t * 1.4) * 0.08 + jump;
      arms.position.y = Math.sin(t * 2.2) * 0.03 + cheer * 0.12;   // a little wave
      arms.scale.y = 1 + cheer * 0.35;
      shadow.scale.setScalar(1 - (mascot.position.y - 0.05) * 0.35);

      orbiters.forEach((o) => {
        o.burst *= 0.95;
        const a = o.angle + t * 0.16;  // a slow lap round the mascot
        const reach = 1 + o.burst;
        o.thing.position.set(
          Math.cos(a) * 1.72 * reach,
          o.height + Math.sin(t * 0.9 + o.phase) * 0.1,
          Math.sin(a) * 1.0 * reach);
        // Sway instead of spinning, so each thing stays easy to recognise.
        o.thing.rotation.y = Math.sin(t * 0.7 + o.phase) * 0.55;
        o.thing.rotation.z = Math.sin(t * 0.5 + o.phase) * 0.12;
      });
      scene.rotation.y = pointer.x * 0.08;
      renderer.render(scene, camera);
      if (!shown) {
        shown = true; stage.classList.add("live"); stage.classList.remove("waking");
        const hint = document.getElementById("hint");   // now that it can spin, say so
        if (hint) hint.textContent = "Drag to spin · click for a cheer";
      }
      // Time the first frames (the very first ones include one-off setup, so they are skipped).
    }
    if (!calm) requestAnimationFrame(frame);
  }
  if (cheerFirst) {  // the click that woke the scene gets its cheer
    cheer = 1;
    orbiters.forEach((o) => { o.burst = 0.45; });
    document.getElementById("hint")?.remove();
  }
  frame();  // with reduced motion this draws one still picture
}

// On a slow or data-saving connection the picture is enough.
const link = navigator.connection || {};
const light = link.saveData || /(^|-)2g$|^3g$/.test(link.effectiveType || "");

let started = false;
async function wake(cheerFirst) {
  if (started) return;
  started = true;
  stage.classList.add("waking");
  try {
    await start(cheerFirst);
  } catch (error) {
    // No WebGL, or the library could not be fetched: the picture stays.
    stage.classList.remove("waking");
    stage.classList.add("no-3d");
    document.getElementById("hint")?.remove();
  }
}

// The finger or mouse on the hero, tracked from the start so that the very drag that wakes the
// scene also spins it.
const gesture = { down: false, x: 0, startX: 0, startY: 0 };
stage.addEventListener("pointerdown", (e) => {
  gesture.down = true;
  gesture.x = gesture.startX = e.clientX;
  gesture.startY = e.clientY;
});
const lift = () => { gesture.down = false; };
window.addEventListener("pointerup", lift);
window.addEventListener("pointercancel", lift);
stage.addEventListener("pointermove", (e) => {
  if (!gesture.down) return;
  gesture.x = e.clientX;
  const across = Math.abs(e.clientX - gesture.startX), down = Math.abs(e.clientY - gesture.startY);
  if (!started && across > 8 && across > down) wake(false);  // a sideways drag, not a scroll
});

// A tap or click. The picture jumps at once, so the tap is answered even while the scene is fetched.
stage.addEventListener("click", () => {
  if (started) return;
  stage.classList.add("cheer");
  wake(true);
});

// A mouse that rests on the picture for a moment.
let dwell = 0;
stage.addEventListener("pointerenter", (e) => {
  if (e.pointerType === "mouse") dwell = setTimeout(() => wake(false), 350);
});
stage.addEventListener("pointerleave", () => clearTimeout(dwell));

// Once the page has settled, fetch the 3D library in the background without running it, so the
// first tap is answered quickly. Skipped on a slow or data-saving connection.
if (!light) {
  const fetchAhead = () => setTimeout(() => {
    if (started) return;
    const ahead = document.createElement("link");
    ahead.rel = "modulepreload";
    ahead.href = import.meta.resolve ? import.meta.resolve("three") : "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";
    document.head.append(ahead);
  }, 2500);
  if (document.readyState === "complete") fetchAhead(); else window.addEventListener("load", fetchAhead, { once: true });
}
