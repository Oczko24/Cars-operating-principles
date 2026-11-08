/// <reference types="vite/client" />

import type { Scene3D } from './scene3d';

declare global {
  interface Window {
    scene3d?: Scene3D;
  }
}
