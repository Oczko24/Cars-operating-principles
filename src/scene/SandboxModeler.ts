import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class SandboxModeler {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  transformControl: TransformControls;
  container: HTMLElement;
  activeObjects: THREE.Group;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
    
    // Grid and axes for AI to easily see orientation
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    this.scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(5, 5, 5);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    
    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.activeObjects = new THREE.Group();
    this.scene.add(this.activeObjects);

    this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControl.addEventListener('dragging-changed', (event) => {
        this.controls.enabled = !(event as any).value;
    });
    this.scene.add(this.transformControl);

    window.addEventListener('resize', this.onResize.bind(this));
    
    this.animate = this.animate.bind(this);
    this.animate();
  }

  // Helper function for AI: spawn primitive with physical wireframe overlay
  spawnPrimitive(type: string, params: any, color: number = 0xcccccc) {
    let geo;
    if (type === 'box') geo = new THREE.BoxGeometry(params.w, params.h, params.d);
    else if (type === 'cylinder') geo = new THREE.CylinderGeometry(params.rt, params.rb, params.h, params.s || 16);
    else if (type === 'sphere') geo = new THREE.SphereGeometry(params.r, params.sw || 16, params.sh || 16);
    else geo = new THREE.BoxGeometry(1,1,1);

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    
    // Dodajemy widoczną siatkę, żeby AI lepiej rozumiało geometrię
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    mesh.add(line);
    
    this.activeObjects.add(mesh);
    this.transformControl.attach(mesh);
    return mesh;
  }

  // Helper for AI: precise align
  alignTo(source: THREE.Object3D, target: THREE.Object3D, offset: THREE.Vector3) {
    const targetPos = new THREE.Vector3();
    target.getWorldPosition(targetPos);
    source.position.copy(targetPos).add(offset);
  }

  clear() {
      while(this.activeObjects.children.length > 0) {
          this.activeObjects.remove(this.activeObjects.children[0]);
      }
      this.transformControl.detach();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
