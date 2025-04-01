import * as THREE from 'three';

/**
 * Creates lighting for the arcade environment
 * Uses a combination of ambient, directional, and point lights
 * to create a neon-style atmosphere reminiscent of 80s arcades
 */
export const createLighting = (scene) => {
  // Ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  // Directional light for general illumination
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;
  scene.add(directionalLight);
  
  // Point lights for neon effect
  const pointLights = [];
  
  // Create colorful point lights to simulate neon
  const colors = [
    0xff00ff, // Pink
    0x00ffff, // Cyan
    0xff0000, // Red
    0x0000ff, // Blue
    0xffff00  // Yellow
  ];
  
  // Positions for the point lights
  const positions = [
    { x: -10, y: 3, z: -8 },
    { x: 10, y: 3, z: -8 },
    { x: -10, y: 3, z: 8 },
    { x: 10, y: 3, z: 8 },
    { x: 0, y: 3, z: 0 }
  ];
  
  // Create the point lights
  colors.forEach((color, index) => {
    const pointLight = new THREE.PointLight(color, 2, 10, 2);
    pointLight.position.set(
      positions[index].x,
      positions[index].y,
      positions[index].z
    );
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 512;
    pointLight.shadow.mapSize.height = 512;
    
    // Add light helper for debugging (commented out for production)
    // const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.2);
    // scene.add(pointLightHelper);
    
    scene.add(pointLight);
    pointLights.push(pointLight);
  });
  
  // Create spotlights for cabinet highlighting
  const createCabinetSpotlights = (positions) => {
    const spotlights = [];
    
    positions.forEach((position) => {
      const spotlight = new THREE.SpotLight(0xffffff, 1, 10, Math.PI / 6, 0.5, 1);
      spotlight.position.set(position.x, 3.8, position.z);
      spotlight.target.position.set(position.x, 0, position.z);
      spotlight.castShadow = true;
      spotlight.shadow.mapSize.width = 512;
      spotlight.shadow.mapSize.height = 512;
      
      scene.add(spotlight);
      scene.add(spotlight.target);
      spotlights.push(spotlight);
    });
    
    return spotlights;
  };
  
  // Cabinet positions will be defined in cabinets.js, but we'll add some default positions
  const cabinetPositions = [
    { x: -10, y: 0, z: -6.5 },
    { x: -7.5, y: 0, z: -6.5 },
    { x: -5, y: 0, z: -6.5 },
    { x: -10, y: 0, z: -9.5 },
    { x: -7.5, y: 0, z: -9.5 },
    { x: -5, y: 0, z: -9.5 }
  ];
  
  const cabinetSpotlights = createCabinetSpotlights(cabinetPositions);
  
  return {
    ambientLight,
    directionalLight,
    pointLights,
    cabinetSpotlights
  };
}; 