import { Component } from "preact";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
//import CannonDebugger from "cannon-es-debugger";

type Dice = { mesh: THREE.Group; body: CANNON.Body };

const params = {
  segments: 40,
  edgeRadius: 0.07,
  notchRadius: 0.12,
  notchDepth: 0.1,
};

type Props = {
  numberOfDice: number;
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

  throwing = 0;
  result: number[] = [];

  renderScene: () => void;

  constructor() {
    super();
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.renderer.useLegacyLights = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, 0.5);
    topLight.decay = 1;
    topLight.position.set(10, 15, 0);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 2048;
    topLight.shadow.mapSize.height = 2048;
    topLight.shadow.camera.near = 1;
    topLight.shadow.camera.far = 400;
    this.scene.add(topLight);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 10, 32);
    this.camera.lookAt(0, 0, 10);
    this.physicsWorld = new CANNON.World({
      allowSleep: true,
      gravity: new CANNON.Vec3(0, -50, 0),
    });
    this.physicsWorld.defaultContactMaterial.restitution = 0.3;

    this.floor = this.createFloor();

    this.diceMesh = createDiceMesh();

    //const cannonDebugger = CannonDebugger(this.scene, this.physicsWorld);

    this.renderScene = (() => {
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
      })
    );
    floor.receiveShadow = true;
    floor.position.y = -10;
    floor.quaternion.setFromAxisAngle(
      new THREE.Vector3(-1, 0, 0),
      Math.PI * 0.5
    );
    this.scene.add(floor);

    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    floorBody.position.copy(floor.position as any);
    floorBody.quaternion.copy(floor.quaternion as any);
    this.physicsWorld.addBody(floorBody);

    const leftWall = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    leftWall.position.x = -window.innerWidth / 60;
    //leftWall.position.z = -11;
    //leftWall.quaternion.setFromEuler(0, Math.PI / 2, 0);
    //this.physicsWorld.addBody(leftWall);

    const rightWall = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    rightWall.position.x = window.innerWidth / 60;
    //rightWall.position.z = -11;
    rightWall.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    //this.physicsWorld.addBody(rightWall);

    const frontWall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    frontWall.quaternion.setFromEuler(0, Math.PI, 0);
    frontWall.position.set(0, 0, 11);

    this.physicsWorld.addBody(frontWall);

    return floorBody;
  }

  private createDice(): Dice {
    const mesh = this.diceMesh.clone();
    const body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
      sleepTimeLimit: 0.1,
    });
    return { mesh, body };
  }

  private addDiceEvents(dice: Dice) {
    dice.body.addEventListener("sleep", (e: any) => {
      dice.body.allowSleep = false;

      const euler = new CANNON.Vec3();
      e.target.quaternion.toEuler(euler);

      const eps = 0.1;
      let isZero = (angle: number) => Math.abs(angle) < eps;
      let isHalfPi = (angle: number) => Math.abs(angle - 0.5 * Math.PI) < eps;
      let isMinusHalfPi = (angle: number) =>
        Math.abs(0.5 * Math.PI + angle) < eps;
      let isPiOrMinusPi = (angle: number) =>
        Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps;

      if (isZero(euler.z)) {
        if (isZero(euler.x)) {
          this.addResult(1);
        } else if (isHalfPi(euler.x)) {
          this.addResult(4);
        } else if (isMinusHalfPi(euler.x)) {
          this.addResult(3);
        } else if (isPiOrMinusPi(euler.x)) {
          this.addResult(6);
        } else {
          // landed on edge => wait to fall on side and fire the event again
          dice.body.allowSleep = true;
        }
      } else if (isHalfPi(euler.z)) {
        this.addResult(2);
      } else if (isMinusHalfPi(euler.z)) {
        this.addResult(5);
      } else {
        // landed on edge => wait to fall on side and fire the event again
        dice.body.allowSleep = true;
      }
    });
  }

  private addResult(value: number) {
    this.result.push(value);
    if (this.result.length === this.throwing) {
      this.props.onResult(this.result);
    }
  }

  setup() {
    if (!(this.base instanceof Element)) return;
    this.base.appendChild(this.renderer.domElement);

    for (let i = 0; i < 5; i++) {
      this.diceArray.push(this.createDice());
      this.addDiceEvents(this.diceArray[i]);
    }

    this.updateSceneSize();
  }

  updateSceneSize() {
    if (!(this.base instanceof Element)) return;
    let { width, height } = this.base.getBoundingClientRect();
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  shake() {
    for (let i = 0; i < this.throwing; i++) {
      const { body } = this.diceArray[i];
      body.applyImpulse(new CANNON.Vec3(2, 1, 0));
    }
  }

  throwDice() {
    if (this.throwing) {
      this.shake();
      return;
    }
    this.throwing = this.props.numberOfDice;
    this.result = [];
    for (let i = 0; i < this.throwing; i++) {
      const { mesh, body } = this.diceArray[i];

      body.velocity.setZero();
      body.angularVelocity.setZero();

      body.position = new CANNON.Vec3(6, i * 1.5, 6);
      mesh.position.copy(body.position);

      mesh.rotation.set(
        2 * Math.PI * Math.random(),
        0,
        2 * Math.PI * Math.random()
      );
      body.quaternion.copy(mesh.quaternion as any);

      const force = 3 + 5 * Math.random();
      body.applyImpulse(
        new CANNON.Vec3(-force, force, 0),
        new CANNON.Vec3(0, 0, 0.2)
      );

      body.allowSleep = true;
      this.scene.add(mesh);
      this.physicsWorld.addBody(body);
    }

    this.renderScene();
  }

  render() {
    return (
      <div
        class="absolute inset-0 max-h-[100svh] data-[throwing='0']:pointer-events-none"
        onClick={() => this.shake()}
        data-throwing={this.props.numberOfDice}
      />
    );
  }

  componentDidUpdate() {
    if (this.props.numberOfDice > 0) this.throwDice();
    else {
      for (let i = 0; i < this.throwing; i++) {
        const { mesh, body } = this.diceArray[i];
        this.scene.remove(mesh);
        this.physicsWorld.removeBody(body);
      }
      this.throwing = 0;
    }
  }

  componentDidMount() {
    setTimeout(() => this.setup(), 1);
  }

  componentWillUnmount() {
    this.throwing = 0;
  }
}

function createDiceMesh() {
  const boxMaterialOuter = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
  });
  const boxMaterialInner = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0,
    metalness: 1,
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
    1 - 2 * params.edgeRadius
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
    false
  );
}

function createBoxGeometry() {
  let boxGeometry = new THREE.BoxGeometry(
    1,
    1,
    1,
    params.segments,
    params.segments,
    params.segments
  );

  const positionAttr = boxGeometry.attributes.position;
  const subCubeHalfSize = 0.5 - params.edgeRadius;

  for (let i = 0; i < positionAttr.count; i++) {
    let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);

    const subCube = new THREE.Vector3(
      Math.sign(position.x),
      Math.sign(position.y),
      Math.sign(position.z)
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

    const offset = 0.23;

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
