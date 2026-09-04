import * as THREE from 'three';

export class PartsExplorer {
  scene: any;
  container: HTMLElement | null;
  isolatedObject: any = null;

  constructor(scene3d: any) {
    this.scene = scene3d;
    this.container = document.getElementById('parts-tree-container');
    this.init();
    
    // Subscribe to scene rebuild events
    window.addEventListener('parts-tree-rebuild', () => {
        this.isolatedObject = null;
        this.buildTreeUI();
    });
    
    // Add custom event listener for picking from 3D scene
    window.addEventListener('part-selected', ((e: CustomEvent) => {
       const obj = e.detail.object;
       if (obj && obj.userData && obj.userData.treeNode) {
           this.selectNodeInTree(obj);
           this.onSelectPart(obj, false); // false = don't double dip the camera
       }
    }) as EventListener);
  }
  
  init() {
    this.buildTreeUI();
  }
  
  buildTreeUI() {
    if (!this.container || !this.scene.carGroup) return;
    this.container.innerHTML = '';
    
    const controlsDiv = document.createElement('div');
    controlsDiv.style.marginBottom = '10px';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '5px';
    
    const unSoloBtn = document.createElement('button');
    unSoloBtn.innerText = 'Resetuj Izolację';
    unSoloBtn.className = 'config-btn';
    unSoloBtn.style.padding = '4px 8px';
    unSoloBtn.style.fontSize = '11px';
    unSoloBtn.onclick = () => this.unisolateAll();
    controlsDiv.appendChild(unSoloBtn);
    
    this.container.appendChild(controlsDiv);
    
    const rootUl = document.createElement('ul');
    rootUl.className = 'tree-root';
    
    const createNode = (object: any, parentUl: HTMLElement) => {
       // Ignore internal helpers
       const name = object.userData.name || object.name;
       if (!name || name.includes("Zarys") || name.includes("Datum") || object.type === 'GridHelper' || object.isTransformControls) return false;
       
       const li = document.createElement('li');
       const label = document.createElement('div');
       label.className = 'tree-item-label';
       
       let hasValidChildren = false;
       const childrenUl = document.createElement('ul');
       childrenUl.style.display = 'none'; // collapsed by default
       
       object.children.forEach((child: any) => {
          if (createNode(child, childrenUl)) hasValidChildren = true;
       });
       
       const toggleBtn = document.createElement('span');
       toggleBtn.className = 'tree-toggle';
       toggleBtn.innerText = hasValidChildren ? '▶' : ' ';
       toggleBtn.style.cursor = hasValidChildren ? 'pointer' : 'default';
       
       if (hasValidChildren) {
           toggleBtn.addEventListener('click', (e) => {
               e.stopPropagation();
               const isCollapsed = childrenUl.style.display === 'none';
               childrenUl.style.display = isCollapsed ? 'block' : 'none';
               toggleBtn.innerText = isCollapsed ? '▼' : '▶';
           });
       }
       
       const textSpan = document.createElement('span');
       textSpan.innerText = name;
       textSpan.className = 'tree-text';
       textSpan.style.flex = '1';
       
       // Eye icon for visibility
       const eyeBtn = document.createElement('span');
       eyeBtn.innerText = object.visible ? '👁️' : '🚫';
       eyeBtn.style.cursor = 'pointer';
       eyeBtn.style.fontSize = '10px';
       eyeBtn.style.marginLeft = '8px';
       eyeBtn.title = "Pokaż/Ukryj";
       
       eyeBtn.addEventListener('click', (e) => {
           e.stopPropagation();
           object.visible = !object.visible;
           eyeBtn.innerText = object.visible ? '👁️' : '🚫';
           // optional: update children recursively if we want groups to hide children visually in tree?
       });
       
       // Solo button
       const soloBtn = document.createElement('span');
       soloBtn.innerText = '🎯';
       soloBtn.style.cursor = 'pointer';
       soloBtn.style.fontSize = '10px';
       soloBtn.style.marginLeft = '4px';
       soloBtn.title = "Izoluj widok (Solo)";
       
       soloBtn.addEventListener('click', (e) => {
           e.stopPropagation();
           this.isolatePart(object);
       });
       
       label.appendChild(toggleBtn);
       label.appendChild(textSpan);
       label.appendChild(eyeBtn);
       label.appendChild(soloBtn);
       li.appendChild(label);
       if (hasValidChildren) li.appendChild(childrenUl);
       
       label.addEventListener('click', (e) => {
           e.stopPropagation();
           this.selectNodeInTree(object);
           this.onSelectPart(object, true);
       });
       
       // save reference for reverse lookup
       object.userData.treeNode = { label, childrenUl, toggleBtn, eyeBtn, li, parentUl };
       
       parentUl.appendChild(li);
       return true;
    };
    
    this.scene.carGroup.children.forEach((child: any) => {
        createNode(child, rootUl);
    });
    
    this.container.appendChild(rootUl);
  }
  
  unisolateAll() {
      this.isolatedObject = null;
      this.scene.carGroup.traverse((child: any) => {
         if (child.userData && child.userData.treeNode) {
             child.visible = true;
             child.userData.treeNode.eyeBtn.innerText = '👁️';
         }
      });
  }
  
  isolatePart(object: any) {
      this.isolatedObject = object;
      
      // Build a set of allowed objects (the target and all its parents up to carGroup)
      const allowed = new Set();
      let curr = object;
      while (curr) {
          allowed.add(curr);
          curr = curr.parent;
      }
      
      // Hide all at top level and their children unless they are allowed
      this.scene.carGroup.traverse((child: any) => {
          if (child.userData && child.userData.treeNode) {
              if (allowed.has(child) || object.children.includes(child)) { // Also show immediate children? Or just let standard visibility apply if parent is visible?
                  // Three.js object visibility: if parent is invisible, children are invisible.
                  // If we hide siblings of parents, it's sufficient.
              }
          }
      });
      
      // A better approach: 
      // 1. Hide everything.
      // 2. Show the object and its children.
      // 3. Make sure all its ancestors are visible (otherwise it won't render).
      this.scene.carGroup.traverse((child: any) => {
          if (child.userData && child.userData.treeNode) {
              child.visible = false;
              child.userData.treeNode.eyeBtn.innerText = '🚫';
          }
      });
      
      object.traverse((child: any) => {
          if (child.userData && child.userData.treeNode) {
              child.visible = true;
              child.userData.treeNode.eyeBtn.innerText = '👁️';
          }
      });
      
      let p = object.parent;
      while (p) {
          if (p.userData && p.userData.treeNode) {
              p.visible = true;
              p.userData.treeNode.eyeBtn.innerText = '👁️';
          }
          p = p.parent;
      }
      
      this.onSelectPart(object, true);
  }
  
  selectNodeInTree(object: any) {
      document.querySelectorAll('.tree-item-label').forEach(el => el.classList.remove('selected'));
      
      const nodeInfo = object.userData.treeNode;
      if (!nodeInfo) return;
      
      nodeInfo.label.classList.add('selected');
      
      // Expand parents
      let curr = object.parent;
      while (curr) {
          if (curr.userData && curr.userData.treeNode) {
              const pInfo = curr.userData.treeNode;
              pInfo.childrenUl.style.display = 'block';
              if (pInfo.toggleBtn.innerText === '▶') {
                  pInfo.toggleBtn.innerText = '▼';
              }
          }
          curr = curr.parent;
      }
      
      // Scroll to view
      nodeInfo.label.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  onSelectPart(object: any, moveCamera: boolean) {
      // 1. Płynny najazd kamery
      if (moveCamera) {
          const box = new THREE.Box3().setFromObject(object);
          const center = new THREE.Vector3();
          box.getCenter(center);
          
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z, 0.5);
          
          this.scene.controls.target.copy(center);
          const offset = new THREE.Vector3(1, 0.5, 1).normalize().multiplyScalar(maxDim * 2.5);
          this.scene.camera.position.copy(center).add(offset);
      }
      
      // 2. Podświetlenie obrysu (glow)
      if (this.scene.hoveredPart) {
          if (this.scene.hoveredPart.material && this.scene.hoveredPart.material.emissive) {
              this.scene.hoveredPart.material.emissive.setHex(0x000000);
          }
      }
      if (object.isMesh && object.material && object.material.emissive) {
          object.material.emissive.setHex(0x3b82f6);
          this.scene.hoveredPart = object;
      } else {
          object.traverse((child: any) => {
              if (child.isMesh && child.material && child.material.emissive && !this.scene.hoveredPart) {
                  child.material.emissive.setHex(0x3b82f6);
                  this.scene.hoveredPart = child;
              }
          });
      }
      
      // 3. Karta Edukacyjna
      this.updateEduCard(object.userData.name || object.name);
  }
  
  updateEduCard(partName: string) {
     const t = (window as any).app?.t || {};
     const info = (t.parts && t.parts[partName]) ? t.parts[partName] : null;
     
     const drawer = document.getElementById('info-drawer');
     if (drawer) drawer.classList.add('open');
     
     const titleEl = document.getElementById('drawer-title');
     if (titleEl) titleEl.innerText = info ? info.name : partName;
     
     const princEl = document.getElementById('drawer-principle');
     if (princEl) princEl.innerText = info ? info.principle : "Więcej informacji o tej części wkrótce...";
     
     const whyEl = document.getElementById('drawer-why');
     if (whyEl) whyEl.innerText = info ? info.why : "-";
     
     const histEl = document.getElementById('drawer-history');
     if (histEl) histEl.innerText = info ? info.history : "-";
     
     const exEl = document.getElementById('drawer-examples');
     if (exEl) exEl.innerText = info ? info.examples : "-";
  }
}
