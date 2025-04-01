import * as THREE from 'three';
import config from '../config.json';

/**
 * Creates arcade cabinets for different vibe coding games
 * Each cabinet has a unique texture and links to a specific game
 */
export const createCabinets = (scene, gltfLoader, textureLoader) => {
  // Cabinet data with game information
  const cabinetData = [
    {
      id: 'fly-pieter',
      name: 'Fly Pieter',
      description: 'The notorious flying game by @levelsio',
      url: 'https://fly.pieter.com/',
      position: config.gameCabinets[0],
      rotation: { y: 0 },
      color: 0xff5555,
      screenTexture: '/textures/fly_pieter_screen.jpg'
    },
    {
      id: 'garden-club',
      name: 'Garden Club',
      description: 'A peaceful gardening simulator',
      url: 'https://garden.club/',
      position: config.gameCabinets[1],
      rotation: { y: 0 },
      color: 0x55ff55,
      screenTexture: '/textures/garden_club_screen.jpg'
    },
    {
      id: 'pizza-legends',
      name: 'Pizza Legends',
      description: 'A pizza-themed RPG adventure',
      url: 'https://pizza-legends.io/',
      position: config.gameCabinets[2],
      rotation: { y: 0 },
      color: 0xffaa55,
      screenTexture: '/textures/pizza_legends_screen.jpg'
    },
    {
      id: 'vibe-synth',
      name: 'Vibe Synth',
      description: 'Create chill music with this synth',
      url: 'https://vibe-synth.com/',
      position: config.gameCabinets[3],
      rotation: { y: 0 },
      color: 0x55aaff,
      screenTexture: '/textures/vibe_synth_screen.jpg'
    },
    {
      id: 'pixel-paint',
      name: 'Pixel Paint',
      description: 'Create pixel art masterpieces',
      url: 'https://pixel-paint.app/',
      position: config.gameCabinets[4],
      rotation: { y: 0 },
      color: 0xaa55ff,
      screenTexture: '/textures/pixel_paint_screen.jpg'
    },
    {
      id: 'retro-racer',
      name: 'Retro Racer',
      description: 'A vaporwave racing experience',
      url: 'https://retro-racer.io/',
      position: config.gameCabinets[5],
      rotation: { y: 0 },
      color: 0xff55aa,
      screenTexture: '/textures/retro_racer_screen.jpg'
    }
  ];

  // Load GLTF model for each cabinet
  const loadCabinetModel = (url, position, data, rotation = 0) => {
    // Create a group for the cabinet
    const modelGroup = new THREE.Group();
    
    // Set position and rotation
    modelGroup.position.set(position.x, position.y, position.z);
    modelGroup.rotation.y = rotation;
    
    // Add user data for interaction
    modelGroup.userData = {
      id: data.id,
      name: data.name,
      description: data.description,
      url: data.url,
      interactive: true
    };
    
    scene.add(modelGroup);

    // Remove loading progress tracking
    /*
    gltfLoader.load(url, (gltf) => {
      const modelGroup = new THREE.Group();
      modelGroup.add(gltf.scene);
      
      // Set position and rotation
      modelGroup.position.set(position.x, position.y, position.z);
      modelGroup.rotation.y = rotation;
      
      // Add user data for interaction
      modelGroup.userData = {
        id: data.id,
        name: data.name,
        description: data.description,
        url: data.url,
        interactive: true
      };
      
      scene.add(modelGroup);
    }, undefined, (error) => {
      console.error('Error loading cabinet model:', error);
    });
    */
  };

  // Load cabinets in their positions
  cabinetData.forEach((data, index) => {
    let x = -10 + (index * 2.5);
    let z = -6.5;
    loadCabinetModel('assets/gameCabinet/scene.gltf', { x, y: 0, z }, data, Math.PI);
  });

  // Load opposite row of cabinet models
  cabinetData.forEach((data, index) => {
    const x = -10 + (index * 2.5);
    const z = -9.5;
    loadCabinetModel('assets/gameCabinet/scene.gltf', { x, y: 0, z }, data, 0);
  });
}; 