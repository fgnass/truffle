import { Component } from "preact";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { diceSound } from "./diceSound";
import { shaking, shakingActive, nudging } from "../state";
//import CannonDebugger from "cannon-es-debugger";

type Dice = { mesh: THREE.Group; body: CANNON.Body };

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

// The (invisible) shaker cup. Modelled as a kinematic compound body: a ring of
// inward-facing planes forms the wall (an infinite vertical prism) and one
// up-facing plane the bottom. Pointer / device input steers its velocity, so
// the dice rattle against the walls and each other. "Opening the bottom" is
// just removing the body — with no mesh to show, a vanished cup and a dropped
// floor look identical, and the dice simply fall onto the felt below.
const CUP = {
  radius: 3.2,
  walls: 8,
  // Sit the cup above the top of the screen so the dice are hidden while
  // shaking (you only hear them rattle) and then drop into view when the cup
  // opens — a real, visible fall onto the felt below.
  home: { x: 0, y: 14, z: 6 },
  bottomOffset: 2,
  boundX: 4.5,
  zMin: 3,
  zMax: 9,
  stiffness: 12,
  maxVel: 45,
  recenter: 0.035,
};

const SHAKE = {
  // Once the player has actually shaken, drop the dice this long after they
  // hold still. There is no bare timeout — an untouched cup waits forever (or
  // until clicked).
  idleMs: 1200,
  tapMaxPx: 10, // a press that barely moves counts as a release click
};

const DEVICE = { threshold: 1.5, scale: 0.25 };

// Settling the stragglers: once the dice have landed but not all lie flat, the
// player shakes (mouse / device) to topple them. A shake gives every still-stuck
// die exactly ONE sideways shove — like wobbling a real table: friction drags
// the die across the felt and a die balanced on an edge or leaning on a wall
// topples flat under its own weight. There is no upward pop (that felt
// unnatural); the shove is purely horizontal and aimed straight AWAY from the
// nearest wall, so a wall-wedged die gets room to fall flat instead of being
// shoved back against it. A die sitting clear of every wall gets a random
// heading, so the player can re-roll a stuck die but can never steer it toward a
// chosen face — shaking can't be abused to "dial in" a result. The shove fires
// only once every stuck die has come to rest and wakes them, so further shakes
// are ignored until they settle again. Dice that land flat resolve; the rest
// re-prompt the shake.
const NUDGE = {
  shove: 4.5, // horizontal velocity added to a stuck die per shake
  wallDist: 1.4, // when within this of a wall, shove straight away from it
  emergencyMs: 12000, // safety net: snap any die still stuck after this much inactivity
};
const GRAVITY = 50;

// Contact materials. The screen-edge walls are made frictionless against the
// dice so a die that lands leaning on a wall can't be held there by vertical
// wall friction: with friction 0 the wall only pushes horizontally (its normal
// points inward), so the die's top is shoved away from the wall and it topples
// flat into the open felt under its own weight — the "rattle itself flat" we
// want, no abrupt edge-roll. The floor keeps the default friction so the dice
// still settle and come to rest rather than gliding forever (a die's bottom
// edge must grip to topple over it). Dice↔dice and dice↔floor pairs aren't
// registered here, so they fall back to defaultContactMaterial unchanged.
const diceMaterial = new CANNON.Material("dice");
const wallMaterial = new CANNON.Material("wall");
const diceWallContact = new CANNON.ContactMaterial(diceMaterial, wallMaterial, {
  friction: 0,
  restitution: 0.3,
});

// A die counts as "flat" (resolves on its own, no shake needed) when its up-face
// normal's world-y clears this — cos(~31.8°). The genuine coin-flip is a die
// balanced exactly on an edge (~45°), where two faces tie at y = cos(45°) ≈ 0.71;
// anything comfortably above that has an unambiguous up-face — the chosen value
// is already correct, it just isn't perfectly level. So 0.85 sits ~13° clear of
// the edge: a die leaning on a wall or sitting a touch crooked (but plainly
// readable) resolves on its own and resolveDie() snaps its minor tilt flat, and
// only a die truly teetering near the edge prompts a shake. The old 0.98 (~11.5°)
// was far too strict — it nagged for a shake whenever a die wasn't dead level,
// even when which face was up was never in doubt.
const FLAT_TILT = 0.85;

// How the dice spill when the cup opens — see release(). `lateral` is the shared
// tip direction's speed, `jitter` the per-die spread around it, `toss` a small
// upward lob for an arc, and `spin` the per-die tumble that randomizes the
// landing face.
const POUR = { lateral: 2.5, jitter: 1.5, toss: 1.5, spin: 14 };

// Invisible walls that keep the dice from rolling off-screen. They are the
// camera's frustum side planes, so a wall coincides exactly with a screen edge
// at every depth and height — no perspective guesswork. `margin` pulls each wall
// a touch inward so a die stops fully on-screen rather than half over the edge.
const WALL = { margin: 0.8 };

// Resting spots on the cup floor (x,z offsets) — a small non-overlapping cross
// so the dice sit apart and stay quiet until the player shakes.
const DICE_SPOTS = [
  [0, 0],
  [1.5, 1.5],
  [-1.5, 1.5],
  [1.5, -1.5],
  [-1.5, -1.5],
];

const params = {
  segments: 40,
  edgeRadius: 0.16,
  notchRadius: 0.11,
  notchDepth: 0.12,
  scale: 1.6,
};

type Props = {
  numberOfDice: number;
  // When true (the computer's turn) the dice are arranged randomly offscreen
  // and dropped on their own — no cup, no shaking, no waiting.
  auto?: boolean;
  onResult: (dice: number[]) => unknown;
};

export class Scene extends Component<Props> {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  diceMesh: THREE.Group;
  physicsWorld: CANNON.World;
  diceArray: Dice[] = [];
  floor: CANNON.Body;
  wallBodies: CANNON.Body[] = [];

  throwing = 0;
  result: number[] = [];
  resolved: boolean[] = [];
  resultCount = 0;
  watchdog?: ReturnType<typeof setInterval>;

  phase: "idle" | "shaking" | "settling" = "idle";
  cupBody?: CANNON.Body;
  cupTarget = { x: CUP.home.x, z: CUP.home.z };
  inputMode: "pointer" | "device" = "pointer";
  lastInputAt = 0;
  hasShaken = false;
  pointerStart?: { x: number; y: number };
  pointerMoved = false;

  renderScene: () => void;

  handleMotion = (e: DeviceMotionEvent) => {
    if (this.phase !== "shaking" && this.phase !== "settling") return;
    // Gravity-free reading only: accelerationIncludingGravity carries a
    // constant ~1g bias that would shove the cup to one side forever.
    const a = e.acceleration;
    if (!a) return;
    const ax = a.x ?? 0;
    const ay = a.y ?? 0;
    if (Math.hypot(ax, ay) < DEVICE.threshold) return;
    this.inputMode = "device";
    this.lastInputAt = performance.now();

    if (this.phase === "settling") {
      // Same shake, different job: pop the stuck dice so they topple flat. The
      // computer's throw settles on its own and must stay untouched.
      if (this.props.auto) return;
      this.requestNudge();
      return;
    }

    this.hasShaken = true;
    shakingActive.value = true;
    this.cupTarget.x = clamp(
      this.cupTarget.x + ax * DEVICE.scale,
      -CUP.boundX,
      CUP.boundX,
    );
    this.cupTarget.z = clamp(
      this.cupTarget.z - ay * DEVICE.scale,
      CUP.zMin,
      CUP.zMax,
    );
  };

  handlePointerDown = (e: PointerEvent) => {
    if (this.phase !== "shaking") return;
    diceSound.unlock();
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.pointerMoved = false;
  };

  handlePointerMove = (e: PointerEvent) => {
    if (this.phase === "settling") {
      if (this.props.auto) return;
      // After landing, moving the pointer shakes the stuck dice loose.
      this.inputMode = "pointer";
      this.lastInputAt = performance.now();
      this.requestNudge();
      return;
    }
    if (this.phase !== "shaking") return;
    this.inputMode = "pointer";
    // Moving the pointer over the play area is the shake gesture; this is what
    // arms the idle auto-release (a motionless cup never falls on its own).
    this.hasShaken = true;
    shakingActive.value = true;
    this.lastInputAt = performance.now();
    this.steerCupToPointer(e.clientX, e.clientY);
    if (this.pointerStart) {
      const d = Math.hypot(
        e.clientX - this.pointerStart.x,
        e.clientY - this.pointerStart.y,
      );
      if (d > SHAKE.tapMaxPx) this.pointerMoved = true;
    }
  };

  handlePointerUp = () => {
    if (this.phase !== "shaking" || !this.pointerStart) return;
    const wasClick = !this.pointerMoved;
    this.pointerStart = undefined;
    // A click (press without dragging) opens the cup immediately. Moving the
    // pointer is shaking, so that leaves the idle timer to drop the dice.
    if (wasClick) this.release();
  };

  handleResize = () => this.updateSceneSize();

  constructor() {
    super();
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();

    // Intensities are scaled by π: three r155 made physically-correct lighting
    // the default (dropping the old useLegacyLights flag), which brightens
    // ambient/hemisphere/directional lights by π. Multiplying keeps the exact
    // pre-r155 look without the deprecated flag.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4 * Math.PI);
    this.scene.add(ambientLight);
    // Soft, even fill so the faces don't read as harshly shaded.
    const fillLight = new THREE.HemisphereLight(
      0xffffff,
      0xcdc7da,
      0.35 * Math.PI,
    );
    this.scene.add(fillLight);
    // DirectionalLight (not PointLight): VSM's gaussian blur only applies to
    // directional/spot shadows, so this is what actually softens the edge.
    const topLight = new THREE.DirectionalLight(0xffffff, 0.45 * Math.PI);
    topLight.position.set(8, 18, 6);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.radius = 14;
    topLight.shadow.blurSamples = 25;
    const shadowCam = topLight.shadow.camera;
    shadowCam.near = 1;
    shadowCam.far = 80;
    shadowCam.left = -22;
    shadowCam.right = 22;
    shadowCam.top = 22;
    shadowCam.bottom = -22;
    this.scene.add(topLight);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 10, 32);
    this.camera.lookAt(0, 0, 10);
    this.physicsWorld = new CANNON.World({
      allowSleep: true,
      gravity: new CANNON.Vec3(0, -GRAVITY, 0),
    });
    this.physicsWorld.defaultContactMaterial.restitution = 0.3;
    this.physicsWorld.addContactMaterial(diceWallContact);

    this.floor = this.createFloor();

    this.diceMesh = createDiceMesh();

    //const cannonDebugger = CannonDebugger(this.scene, this.physicsWorld);

    this.renderScene = (() => {
      if (this.phase === "shaking") this.updateCup();
      this.physicsWorld.fixedStep();
      //cannonDebugger.update();
      for (let i = 0; i < this.throwing; i++) {
        const { mesh, body } = this.diceArray[i];
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }

      this.renderer.render(this.scene, this.camera);
      if (this.throwing) {
        requestAnimationFrame(this.renderScene);
      }
    }).bind(this);
  }

  private createFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.ShadowMaterial({
        opacity: 0.1,
      }),
    );
    floor.receiveShadow = true;
    floor.position.y = -10;
    floor.quaternion.setFromAxisAngle(
      new THREE.Vector3(-1, 0, 0),
      Math.PI * 0.5,
    );
    this.scene.add(floor);

    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    floorBody.position.copy(floor.position as any);
    floorBody.quaternion.copy(floor.quaternion as any);
    this.physicsWorld.addBody(floorBody);

    // The near/bottom edge is handled by the bottom frustum wall in
    // rebuildWalls(); no separate front wall needed.
    return floorBody;
  }

  // (Re)build the screen-edge walls from the current camera frustum. Each wall is
  // a frustum side plane, so it maps exactly onto a screen edge regardless of
  // perspective; we just nudge it inward by WALL.margin so dice stop on-screen.
  // Called on resize because the frustum widens/narrows with the aspect ratio.
  private rebuildWalls() {
    for (const b of this.wallBodies) this.physicsWorld.removeBody(b);
    this.wallBodies = [];

    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);

    const apex = this.camera.position.clone();
    // A point safely inside the view, used only to orient each plane's normal
    // inward (toward the play area).
    const inside = new THREE.Vector3(0, 0, 10);
    const corner = (ndcX: number, ndcY: number) =>
      new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);

    // Left, right and bottom screen edges. Two edge corners plus the camera apex
    // define the corresponding frustum side plane exactly. There is deliberately
    // no top wall: the dice spawn above the top edge and fall into view, so a top
    // plane would eject them — and the floor reaches the horizon up there anyway,
    // so dice can't roll off the top.
    const sides = [
      { a: corner(-1, -1), b: corner(-1, 1) }, // left edge (NDC x = -1)
      { a: corner(1, 1), b: corner(1, -1) }, // right edge (NDC x = +1)
      { a: corner(-1, -1), b: corner(1, -1) }, // bottom edge (NDC y = -1)
    ];

    for (const { a, b } of sides) {
      const plane = new THREE.Plane().setFromCoplanarPoints(apex, a, b);
      // Make the normal point inward so the solid side is "off-screen".
      if (plane.distanceToPoint(inside) < 0) plane.negate();
      const n = plane.normal;

      // Shift the plane inward by the margin, then place a CANNON plane there.
      const point = plane.coplanarPoint(new THREE.Vector3());
      point.addScaledVector(n, WALL.margin);

      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        material: wallMaterial,
        shape: new CANNON.Plane(),
      });
      body.quaternion.setFromVectors(
        new CANNON.Vec3(0, 0, 1),
        new CANNON.Vec3(n.x, n.y, n.z),
      );
      body.position.set(point.x, point.y, point.z);
      this.physicsWorld.addBody(body);
      this.wallBodies.push(body);
    }
  }

  private createDice(): Dice {
    const mesh = this.diceMesh.clone();
    mesh.scale.setScalar(params.scale);
    const half = 0.5 * params.scale;
    const body = new CANNON.Body({
      mass: 1,
      material: diceMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(half, half, half)),
      sleepTimeLimit: 0.1,
    });
    return { mesh, body };
  }

  private createCup(): CANNON.Body {
    const cup = new CANNON.Body({ type: CANNON.Body.KINEMATIC, mass: 0 });
    cup.allowSleep = false;
    const zToY = new CANNON.Quaternion().setFromVectors(
      new CANNON.Vec3(0, 0, 1),
      new CANNON.Vec3(0, 1, 0),
    );
    // Bottom: an up-facing plane the dice rest on while shaking.
    cup.addShape(
      new CANNON.Plane(),
      new CANNON.Vec3(0, -CUP.bottomOffset, 0),
      zToY,
    );
    // Wall: a ring of inward-facing planes whose intersection is the cup bore.
    for (let i = 0; i < CUP.walls; i++) {
      const a = (i / CUP.walls) * Math.PI * 2;
      const ox = Math.cos(a);
      const oz = Math.sin(a);
      const q = new CANNON.Quaternion().setFromVectors(
        new CANNON.Vec3(0, 0, 1),
        new CANNON.Vec3(-ox, 0, -oz),
      );
      cup.addShape(
        new CANNON.Plane(),
        new CANNON.Vec3(ox * CUP.radius, 0, oz * CUP.radius),
        q,
      );
    }
    cup.position.set(CUP.home.x, CUP.home.y, CUP.home.z);
    return cup;
  }

  private steerCupToPointer(clientX: number, clientY: number) {
    if (!(this.base instanceof Element)) return;
    const r = this.base.getBoundingClientRect();
    const nx = (clientX - r.left) / r.width;
    const ny = (clientY - r.top) / r.height;
    this.cupTarget.x = clamp(
      (nx * 2 - 1) * CUP.boundX,
      -CUP.boundX,
      CUP.boundX,
    );
    this.cupTarget.z = clamp(
      CUP.zMin + ny * (CUP.zMax - CUP.zMin),
      CUP.zMin,
      CUP.zMax,
    );
  }

  // Drive the kinematic cup toward its input-set target each step. Setting the
  // body's velocity (rather than teleporting its position) is what makes the
  // walls transfer real momentum to the dice when the player shakes.
  private updateCup() {
    const cup = this.cupBody;
    if (!cup) return;

    // Drop only after the player has actually shaken and then held still —
    // never on a bare timeout. A click (handlePointerUp) still releases at once.
    if (this.hasShaken && performance.now() - this.lastInputAt > SHAKE.idleMs) {
      this.release();
      return;
    }

    // Device input is relative, so let the target ease home when the player
    // pauses; pointer input is absolute and positions the cup directly.
    if (this.inputMode === "device") {
      this.cupTarget.x += (CUP.home.x - this.cupTarget.x) * CUP.recenter;
      this.cupTarget.z += (CUP.home.z - this.cupTarget.z) * CUP.recenter;
    }

    let vx = (this.cupTarget.x - cup.position.x) * CUP.stiffness;
    let vz = (this.cupTarget.z - cup.position.z) * CUP.stiffness;
    const speed = Math.hypot(vx, vz);
    if (speed > CUP.maxVel) {
      vx = (vx / speed) * CUP.maxVel;
      vz = (vz / speed) * CUP.maxVel;
    }
    cup.velocity.set(vx, 0, vz);
  }

  // A shake during settling fires exactly one hop — but only once every stuck
  // die has come to rest. evaluateSettle() raises `nudging` precisely then, so
  // it doubles as both the on-screen prompt and the "a hop is allowed now" gate:
  // while the dice are still tumbling `nudging` is false and shakes are ignored,
  // which is what limits the player to one undirected re-roll per rest. Clearing
  // it here hides the prompt until the dice settle tilted again.
  private requestNudge() {
    if (!nudging.value) return;
    nudging.value = false;
    this.shoveStuckDice();
  }

  // Give every still-unresolved die a horizontal shove so a tilted/edge-balanced
  // die topples flat under gravity — the table-wobble move, no upward pop. The
  // push is aimed away from the nearest wall (see shoveDirection) so a leaning
  // die falls into the open felt rather than back against the wall.
  private shoveStuckDice() {
    for (let i = 0; i < this.throwing; i++) {
      if (this.resolved[i]) continue;
      const { body } = this.diceArray[i];
      body.allowSleep = true;
      body.wakeUp();
      const dir = this.shoveDirection(body);
      body.velocity.x += dir.x * NUDGE.shove;
      body.velocity.z += dir.z * NUDGE.shove;
    }
  }

  // The horizontal direction to shove a stuck die. If it sits within NUDGE.wallDist
  // of a screen-edge wall it's likely leaning on it, so push straight along that
  // wall's inward normal (away from the wall). Otherwise — an edge-balanced die
  // out in the open — pick a random heading so the topple stays unsteerable.
  private shoveDirection(body: CANNON.Body) {
    const normal = new CANNON.Vec3();
    const localZ = new CANNON.Vec3(0, 0, 1);
    let best: { dist: number; x: number; z: number } | undefined;
    for (const wall of this.wallBodies) {
      wall.quaternion.vmult(localZ, normal); // wall's inward normal
      // Horizontal heading away from the wall (the plane may tilt, e.g. the
      // bottom edge, so drop the vertical part — we only want a table-level push).
      const len = Math.hypot(normal.x, normal.z);
      if (len < 1e-3) continue; // a (near-)horizontal wall offers no lateral push
      // Signed distance from the die to the wall plane (positive = inside view).
      const dist =
        (body.position.x - wall.position.x) * normal.x +
        (body.position.y - wall.position.y) * normal.y +
        (body.position.z - wall.position.z) * normal.z;
      if (!best || dist < best.dist) {
        best = { dist, x: normal.x / len, z: normal.z / len };
      }
    }
    if (best && best.dist < NUDGE.wallDist) return { x: best.x, z: best.z };
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a), z: Math.sin(a) };
  }

  // After a die comes to rest, check whether everything that's left is now also
  // at rest. If so the stragglers are stuck tilted — prompt the player to shake,
  // which also unlocks the hop (see requestNudge). The computer never reaches
  // here; auto throws are excluded.
  private evaluateSettle() {
    if (this.phase !== "settling" || this.props.auto) return;
    if (this.resultCount === this.throwing) return; // all resolved → done
    for (let i = 0; i < this.throwing; i++) {
      if (this.resolved[i]) continue;
      if (this.diceArray[i].body.sleepState !== CANNON.Body.SLEEPING) return;
    }
    nudging.value = true;
  }

  // Open the cup: remove it so the dice fall free onto the floor and settle.
  private release() {
    if (this.phase !== "shaking") return;
    this.phase = "settling";
    shaking.value = false;
    shakingActive.value = false;
    // Reset the emergency clock to the landing moment; the dice resolve as they
    // come to rest, and a shake re-arms it (handlePointerMove / handleMotion).
    this.lastInputAt = performance.now();
    if (this.cupBody) {
      this.physicsWorld.removeBody(this.cupBody);
      this.cupBody = undefined;
    }
    // Tip the dice out in one motion instead of dropping the floor from under a
    // flat-lying stack: a shared horizontal "pour" direction (the cup tipping
    // one way) plus a strong per-die tumble. They spill and land in random
    // orientations even when the player barely shook — no more all-same,
    // flat-side-down fall.
    const ang = Math.random() * Math.PI * 2;
    const pourX = Math.cos(ang) * POUR.lateral;
    const pourZ = Math.sin(ang) * POUR.lateral;
    const jitter = () => (Math.random() * 2 - 1) * POUR.jitter;
    const spin = () => (Math.random() * 2 - 1) * POUR.spin;
    for (let i = 0; i < this.throwing; i++) {
      const { mesh, body } = this.diceArray[i];
      body.velocity.set(pourX + jitter(), POUR.toss, pourZ + jitter());
      body.angularVelocity.set(spin(), spin(), spin());
      // Reveal the dice now so the fall into view is visible.
      mesh.visible = true;
      body.allowSleep = true;
      body.wakeUp();
    }
    this.startWatchdog();
  }

  private addDiceEvents(dice: Dice, index: number) {
    dice.body.addEventListener(
      "collide",
      (e: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
        // Relative speed along the contact normal — at rest this is ~0, so it
        // naturally gates out the resting contacts the engine keeps emitting.
        const v = Math.abs(e.contact.getImpactVelocityAlongNormal());

        const otherIndex = this.diceArray.findIndex((d) => d.body === e.body);
        if (e.body === this.cupBody) {
          // Knocking against the cup wall while shaking.
          diceSound.cup(v);
        } else if (otherIndex === -1) {
          // Floor or back wall after release: muffled felt thud.
          diceSound.surface(v);
        } else if (index < otherIndex) {
          // Dice knocking together. Both bodies fire this event for the same
          // contact, so only the lower-indexed one plays it to avoid doubling.
          diceSound.collision(v);
        }
      },
    );
    dice.body.addEventListener("sleep", () => {
      const { tilt } = this.readUpFace(dice.body);
      // A flat-enough lie reads immediately. A die that fell asleep clearly
      // tilted (on an edge or wedged against a wall / another die) won't move on
      // its own: for a human we prompt a shake to topple it (evaluateSettle);
      // the computer has no hands, so its stragglers are snapped by the watchdog.
      if (tilt > FLAT_TILT) {
        this.resolveDie(index);
      } else {
        dice.body.allowSleep = true;
      }
      this.evaluateSettle();
    });
  }

  // Local face normals mapped to their pip value (opposite faces sum to 7).
  private static faces: [CANNON.Vec3, number][] = [
    [new CANNON.Vec3(0, 1, 0), 1],
    [new CANNON.Vec3(0, -1, 0), 6],
    [new CANNON.Vec3(1, 0, 0), 2],
    [new CANNON.Vec3(-1, 0, 0), 5],
    [new CANNON.Vec3(0, 0, 1), 3],
    [new CANNON.Vec3(0, 0, -1), 4],
  ];

  // Determine which face points up by rotating each local normal into world
  // space and picking the largest y. `tilt` is that y (1 = perfectly flat).
  private readUpFace(body: CANNON.Body) {
    let tilt = -Infinity;
    let value = 1;
    let normal = Scene.faces[0][0];
    const world = new CANNON.Vec3();
    for (const [n, v] of Scene.faces) {
      body.quaternion.vmult(n, world);
      if (world.y > tilt) {
        tilt = world.y;
        value = v;
        normal = n;
      }
    }
    return { value, normal, tilt };
  }

  private resolveDie(index: number) {
    if (index >= this.throwing || this.resolved[index]) return;
    const { body } = this.diceArray[index];
    const { value, normal } = this.readUpFace(body);

    // Snap the up-face exactly level so a forced result never looks tilted.
    // For a clean lie this correction is ~identity and invisible.
    const worldNormal = body.quaternion.vmult(normal);
    const correction = new CANNON.Quaternion().setFromVectors(
      worldNormal,
      new CANNON.Vec3(0, 1, 0),
    );
    body.quaternion = correction.mult(body.quaternion);
    // Freeze the settled die in place: mass 0 makes it effectively infinitely
    // heavy, so a later hop of a still-stuck neighbour can't shove it (and it
    // ignores gravity, so it can't drift). Its value is already locked; we never
    // read it again. Reset to mass 1 at the next throw. See throwDice().
    body.mass = 0;
    body.updateMassProperties();
    body.allowSleep = false;
    body.sleep();

    this.resolved[index] = true;
    this.result[index] = value;
    this.resultCount++;
    if (this.resultCount === this.throwing) {
      this.stopWatchdog();
      this.props.onResult([...this.result]);
    }
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.watchdog = setInterval(() => {
      // The computer's stragglers are snapped at once. A human is meant to
      // wiggle them flat, so for them this only fires as a deadlock safety net
      // after a long stretch with no input at all.
      const emergency =
        !!this.props.auto ||
        performance.now() - this.lastInputAt > NUDGE.emergencyMs;
      for (let i = 0; i < this.throwing; i++) {
        if (this.resolved[i]) continue;
        // A sleeping body won't move again, so an unresolved sleeper is stuck
        // (edge/wedge). Bodies still in motion get another tick to settle.
        if (
          emergency &&
          this.diceArray[i].body.sleepState === CANNON.Body.SLEEPING
        ) {
          this.resolveDie(i);
        }
      }
    }, 800);
  }

  private stopWatchdog() {
    if (this.watchdog !== undefined) {
      clearInterval(this.watchdog);
      this.watchdog = undefined;
    }
  }

  setup() {
    if (!(this.base instanceof Element)) return;
    this.base.appendChild(this.renderer.domElement);

    for (let i = 0; i < 5; i++) {
      this.diceArray.push(this.createDice());
      this.addDiceEvents(this.diceArray[i], i);
    }

    this.updateSceneSize();
  }

  updateSceneSize() {
    if (!(this.base instanceof Element)) return;
    let { width, height } = this.base.getBoundingClientRect();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // The frustum (and thus the screen edges) changed — rebuild the walls.
    this.rebuildWalls();
  }

  // Begin a throw: drop the dice into the (invisible) cup and start the shake
  // phase. They settle only once the cup is opened — by tap or auto-release.
  throwDice() {
    if (this.phase !== "idle") return;
    diceSound.unlock();
    this.updateSceneSize();
    this.throwing = this.props.numberOfDice;
    this.result = [];
    this.resolved = [];
    this.resultCount = 0;
    const auto = !!this.props.auto;
    this.phase = auto ? "settling" : "shaking";
    shaking.value = !auto;
    shakingActive.value = false;
    nudging.value = false;
    this.inputMode = "pointer";
    this.hasShaken = false;
    this.lastInputAt = performance.now();
    this.cupTarget = { x: CUP.home.x, z: CUP.home.z };
    this.physicsWorld.gravity.set(0, -GRAVITY, 0);

    if (!auto) {
      this.cupBody = this.createCup();
      this.physicsWorld.addBody(this.cupBody);
    }

    for (let i = 0; i < this.throwing; i++) {
      const { mesh, body } = this.diceArray[i];

      body.velocity.setZero();
      body.angularVelocity.setZero();
      // Undo the freeze from a die that resolved last throw (resolveDie sets
      // mass 0); a mass-0 body ignores gravity and would never fall.
      body.mass = 1;
      body.updateMassProperties();

      if (auto) {
        // The computer's turn: no cup, no shaking. Scatter the dice randomly
        // offscreen above the viewport with random orientation and spin, then
        // let them tumble down into view on their own. The random spin is what
        // makes the result genuinely random — they fall like a real throw.
        const rand = () => Math.random();
        body.position = new CANNON.Vec3(
          (rand() * 2 - 1) * CUP.boundX,
          CUP.home.y + rand() * 5,
          CUP.zMin + rand() * (CUP.zMax - CUP.zMin),
        );
        body.quaternion.setFromEuler(
          rand() * Math.PI * 2,
          rand() * Math.PI * 2,
          rand() * Math.PI * 2,
        );
        body.angularVelocity.set(
          (rand() * 2 - 1) * 10,
          (rand() * 2 - 1) * 10,
          (rand() * 2 - 1) * 10,
        );
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion as any);
        // Visible right away — the fall into view is the whole show.
        mesh.visible = true;
        body.allowSleep = true;
      } else {
        // Resting flat on the cup floor in a non-overlapping spread, so they sit
        // still and silent until the player actually shakes. Orientation is a
        // random multiple of 90° on each axis: the die still lies flat (stays put
        // rather than toppling) but shows a random face, so even an un-shaken drop
        // doesn't come up all ones.
        const [sx, sz] = DICE_SPOTS[i];
        body.position = new CANNON.Vec3(
          CUP.home.x + sx,
          CUP.home.y - CUP.bottomOffset + 0.5 * params.scale,
          CUP.home.z + sz,
        );
        mesh.position.copy(body.position);

        const quarter = () => Math.floor(Math.random() * 4) * (Math.PI / 2);
        mesh.rotation.set(quarter(), quarter(), quarter());
        body.quaternion.copy(mesh.quaternion as any);

        // Hidden while shaking: the dice rattle offscreen above the viewport, but
        // a visible mesh would still cast a shadow onto the felt. Revealed on
        // release so the fall into view is what the player actually sees.
        mesh.visible = false;
        // Held in the cup — must not fall asleep until released. Wake it first:
        // resolveDie() put it to sleep last round, and a sleeping body is never
        // integrated, so it would hang mid-air and resolve instantly on release.
        body.allowSleep = false;
      }
      body.wakeUp();
      this.scene.add(mesh);
      this.physicsWorld.addBody(body);
    }

    if (auto) this.startWatchdog();
    this.renderScene();
  }

  render() {
    return (
      <div
        class="absolute inset-x-0 top-0 z-30 h-[100svh] touch-none data-[throwing='0']:pointer-events-none"
        onPointerDown={this.handlePointerDown}
        onPointerMove={this.handlePointerMove}
        onPointerUp={this.handlePointerUp}
        data-throwing={this.props.numberOfDice}
      />
    );
  }

  componentDidUpdate() {
    if (this.props.numberOfDice > 0) this.throwDice();
    else {
      this.stopWatchdog();
      shaking.value = false;
      shakingActive.value = false;
      nudging.value = false;
      this.physicsWorld.gravity.set(0, -GRAVITY, 0);
      if (this.cupBody) {
        this.physicsWorld.removeBody(this.cupBody);
        this.cupBody = undefined;
      }
      for (let i = 0; i < this.throwing; i++) {
        const { mesh, body } = this.diceArray[i];
        this.scene.remove(mesh);
        this.physicsWorld.removeBody(body);
      }
      this.throwing = 0;
      this.phase = "idle";
    }
  }

  componentDidMount() {
    setTimeout(() => this.setup(), 1);
    window.addEventListener("devicemotion", this.handleMotion, {
      passive: true,
    });
    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    this.stopWatchdog();
    this.throwing = 0;
    this.phase = "idle";
    shaking.value = false;
    shakingActive.value = false;
    nudging.value = false;
    if (this.cupBody) {
      this.physicsWorld.removeBody(this.cupBody);
      this.cupBody = undefined;
    }
    window.removeEventListener("devicemotion", this.handleMotion);
    window.removeEventListener("resize", this.handleResize);

    // Release GPU resources. A fresh Scene (and WebGLRenderer) is created every
    // game, so without this each finished game leaks a WebGL context — browsers
    // cap them (~16) and start dropping the oldest — plus its geometries,
    // materials and textures. Disposing the same shared geometry twice is a
    // harmless no-op in three.js, so a blanket traverse is safe.
    const dispose = (root: THREE.Object3D) =>
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose?.();
      });
    dispose(this.scene);
    dispose(this.diceMesh);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function createDiceMesh() {
  // Match the CSS dice: warm off-white body with deep, near-black pips.
  const boxMaterialOuter = new THREE.MeshStandardMaterial({
    color: 0xfafaf8,
    roughness: 0.5,
    metalness: 0,
  });
  const boxMaterialInner = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const diceMesh = new THREE.Group();
  const innerMesh = new THREE.Mesh(createInnerGeometry(), boxMaterialInner);
  const outerMesh = new THREE.Mesh(createBoxGeometry(), boxMaterialOuter);
  outerMesh.castShadow = true;
  diceMesh.add(innerMesh, outerMesh);

  return diceMesh;
}

function createInnerGeometry() {
  const baseGeometry = new THREE.PlaneGeometry(
    1 - 2 * params.edgeRadius,
    1 - 2 * params.edgeRadius,
  );
  const offset = 0.48;
  return BufferGeometryUtils.mergeGeometries(
    [
      baseGeometry.clone().translate(0, 0, offset),
      baseGeometry.clone().translate(0, 0, -offset),
      baseGeometry
        .clone()
        .rotateX(0.5 * Math.PI)
        .translate(0, -offset, 0),
      baseGeometry
        .clone()
        .rotateX(0.5 * Math.PI)
        .translate(0, offset, 0),
      baseGeometry
        .clone()
        .rotateY(0.5 * Math.PI)
        .translate(-offset, 0, 0),
      baseGeometry
        .clone()
        .rotateY(0.5 * Math.PI)
        .translate(offset, 0, 0),
    ],
    false,
  );
}

function createBoxGeometry() {
  let boxGeometry = new THREE.BoxGeometry(
    1,
    1,
    1,
    params.segments,
    params.segments,
    params.segments,
  );

  const positionAttr = boxGeometry.attributes.position;
  const subCubeHalfSize = 0.5 - params.edgeRadius;

  for (let i = 0; i < positionAttr.count; i++) {
    let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

    const subCube = new THREE.Vector3(
      Math.sign(position.x),
      Math.sign(position.y),
      Math.sign(position.z),
    ).multiplyScalar(subCubeHalfSize);
    const addition = new THREE.Vector3().subVectors(position, subCube);

    if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.y) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.normalize().multiplyScalar(params.edgeRadius);
      position = subCube.add(addition);
    } else if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.y) > subCubeHalfSize
    ) {
      addition.z = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.y = subCube.y + addition.y;
    } else if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.y = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.z = subCube.z + addition.z;
    } else if (
      Math.abs(position.y) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.x = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.y = subCube.y + addition.y;
      position.z = subCube.z + addition.z;
    }

    const notchWave = (v: number) => {
      v = (1 / params.notchRadius) * v;
      v = Math.PI * Math.max(-1, Math.min(1, v));
      return params.notchDepth * (Math.cos(v) + 1);
    };
    const notch = (pos: number[]) => notchWave(pos[0]) * notchWave(pos[1]);

    const offset = 0.21;

    if (position.y === 0.5) {
      position.y -= notch([position.x, position.z]);
    } else if (position.x === 0.5) {
      position.x -= notch([position.y + offset, position.z + offset]);
      position.x -= notch([position.y - offset, position.z - offset]);
    } else if (position.z === 0.5) {
      position.z -= notch([position.x - offset, position.y + offset]);
      position.z -= notch([position.x, position.y]);
      position.z -= notch([position.x + offset, position.y - offset]);
    } else if (position.z === -0.5) {
      position.z += notch([position.x + offset, position.y + offset]);
      position.z += notch([position.x + offset, position.y - offset]);
      position.z += notch([position.x - offset, position.y + offset]);
      position.z += notch([position.x - offset, position.y - offset]);
    } else if (position.x === -0.5) {
      position.x += notch([position.y + offset, position.z + offset]);
      position.x += notch([position.y + offset, position.z - offset]);
      position.x += notch([position.y, position.z]);
      position.x += notch([position.y - offset, position.z + offset]);
      position.x += notch([position.y - offset, position.z - offset]);
    } else if (position.y === -0.5) {
      position.y += notch([position.x + offset, position.z + offset]);
      position.y += notch([position.x + offset, position.z]);
      position.y += notch([position.x + offset, position.z - offset]);
      position.y += notch([position.x - offset, position.z + offset]);
      position.y += notch([position.x - offset, position.z]);
      position.y += notch([position.x - offset, position.z - offset]);
    }

    positionAttr.setXYZ(i, position.x, position.y, position.z);
  }

  boxGeometry.deleteAttribute("normal");
  boxGeometry.deleteAttribute("uv");
  boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry) as any;

  boxGeometry.computeVertexNormals();

  return boxGeometry;
}
