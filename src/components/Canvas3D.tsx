import React, { useEffect, useRef } from 'react';
import { Scene3D } from '../scene3d';

interface Canvas3DProps {
  config: any;
  activeCategory: string;
  lang: string;
  onFrameStats: (stats: any) => void;
  sceneRef?: React.MutableRefObject<Scene3D | null>;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({ config, activeCategory, lang, onFrameStats, sceneRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalSceneRef = useRef<Scene3D | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize the Vanilla Three.js Scene
    const scene = new Scene3D(containerRef.current, onFrameStats);
    internalSceneRef.current = scene;
    if (sceneRef) {
      sceneRef.current = scene;
    }

    // Initial setup
    scene.setLanguage(lang);
    scene.setConfig(config, activeCategory);

    return () => {
      // Cleanup logic if Scene3D has a dispose method
      if (typeof scene.dispose === 'function') {
        scene.dispose();
      }
      internalSceneRef.current = null;
      if (sceneRef) {
        sceneRef.current = null;
      }
    };
  }, []); // Run once on mount

  // React to prop changes (config, category, lang)
  useEffect(() => {
    if (internalSceneRef.current) {
      internalSceneRef.current.setConfig(config, activeCategory);
    }
  }, [config, activeCategory]);

  useEffect(() => {
    if (internalSceneRef.current) {
      internalSceneRef.current.setLanguage(lang);
    }
  }, [lang]);

  return <div id="canvas-container" ref={containerRef}  />;
};

