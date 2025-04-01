import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * Sets up interaction with arcade cabinets
 * Handles raycasting, hover effects, and click events to open game URLs
 */
export const setupInteraction = (scene, camera, raycaster, cabinets) => {
  // Track the currently intersected object
  let INTERSECTED = null;
  
  // Create a popup for cabinet information
  const createInfoPopup = () => {
    const popup = document.createElement('div');
    popup.className = 'cabinet-info';
    popup.style.position = 'absolute';
    popup.style.padding = '10px 15px';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    popup.style.color = '#fff';
    popup.style.borderRadius = '5px';
    popup.style.fontFamily = "'Press Start 2P', 'Courier New', monospace";
    popup.style.fontSize = '12px';
    popup.style.pointerEvents = 'none';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.3s';
    popup.style.zIndex = '100';
    popup.style.maxWidth = '250px';
    popup.style.textAlign = 'center';
    popup.style.border = '2px solid #ff00ff';
    popup.style.boxShadow = '0 0 10px #ff00ff';
    popup.style.left = '50%';
    popup.style.top = '45%';
    popup.style.transform = 'translate(-50%, -50%)';
    
    document.body.appendChild(popup);
    return popup;
  };
  
  const infoPopup = createInfoPopup();
  
  // Create a "Play Now" button that appears when hovering over cabinets
  const createPlayButton = () => {
    const button = document.createElement('div');
    button.className = 'play-button';
    button.textContent = 'PLAY NOW';
    button.style.position = 'absolute';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#ff00ff';
    button.style.color = '#fff';
    button.style.borderRadius = '5px';
    button.style.fontFamily = "'Press Start 2P', 'Courier New', monospace";
    button.style.fontSize = '14px';
    button.style.cursor = 'pointer';
    button.style.opacity = '0';
    button.style.transition = 'opacity 0.3s, transform 0.3s';
    button.style.zIndex = '100';
    button.style.textAlign = 'center';
    button.style.border = '2px solid #fff';
    button.style.boxShadow = '0 0 10px #ff00ff';
    button.style.transform = 'translate(-50%, -50%) scale(1)';
    button.style.left = '50%';
    button.style.top = '55%';
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translate(-50%, -50%) scale(1.1)';
      button.style.backgroundColor = '#ff55ff';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translate(-50%, -50%) scale(1)';
      button.style.backgroundColor = '#ff00ff';
    });
    
    document.body.appendChild(button);
    return button;
  };
  
  const playButton = createPlayButton();
  
  // Mouse position for raycasting
  const mouse = new THREE.Vector2();
  let isPointerLocked = false;
  
  // Update mouse position on move
  const onMouseMove = (event) => {
    if (document.pointerLockElement) {
      // In pointer lock mode, use movement for raycasting
      mouse.x = 0; // Keep centered
      mouse.y = 0; // Keep centered
      isPointerLocked = true;
    } else {
      // Normal mouse mode
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      isPointerLocked = false;
    }
    
    // Update the position of the info popup to be slightly higher
    infoPopup.style.left = `${window.innerWidth / 2 - infoPopup.offsetWidth / 2}px`;
    infoPopup.style.top = `${window.innerHeight - infoPopup.offsetHeight - 40}px`; // 40px from the bottom
    
    // Update the position of the play button to be below the info popup
    playButton.style.left = `${window.innerWidth / 2 - playButton.offsetWidth / 2}px`;
    playButton.style.top = `${window.innerHeight - playButton.offsetHeight - 10}px`; // 10px below the info popup
  };
  
  window.addEventListener('mousemove', onMouseMove, false);
  
  // Handle cabinet interaction
  const onCabinetInteraction = () => {
    // Update the raycaster with the camera and mouse position
    if (document.pointerLockElement) {
      // In pointer lock, raycast straight ahead
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    } else {
      raycaster.setFromCamera(mouse, camera);
    }
    
    // Intersect with cabinet groups
    const intersects = raycaster.intersectObjects(cabinets, true);
    
    // Find the first cabinet that was intersected
    let cabinetIntersected = null;
    
    if (intersects.length > 0) {
      // Get the cabinet group that contains the intersected object
      let object = intersects[0].object;
      while (object.parent && !object.parent.userData.interactive) {
        object = object.parent;
      }
      if (object.parent && object.parent.userData.interactive) {
        cabinetIntersected = object.parent;
      }
    }
    
    // Define a distance threshold for all interactions
    const DISTANCE_THRESHOLD = 6;

    // Handle cabinet hover effects
    if (cabinetIntersected) {
      // Check distance before allowing any interaction
      const distanceToCabinet = camera.position.distanceTo(cabinetIntersected.position);
      
      if (distanceToCabinet < DISTANCE_THRESHOLD) {
        if (INTERSECTED !== cabinetIntersected) {
          // Restore previous intersected cabinet (if any)
          if (INTERSECTED) {
            /*
            gsap.to(INTERSECTED.position, {
              y: 0,
              duration: 0.3,
              ease: 'power2.out'
            });
            
            // Reset any other effects
            INTERSECTED.traverse(child => {
              if (child.material && child.material.emissiveIntensity) {
                gsap.to(child.material, {
                  emissiveIntensity: 0.5,
                  duration: 0.3
                });
              }
            });
            */

            // Reset interaction flag
            INTERSECTED.userData.isBeingInteractedWith = false;
          }
          
          // Set new intersected cabinet
          INTERSECTED = cabinetIntersected;
          
          // Set interaction flag
          INTERSECTED.userData.isBeingInteractedWith = true;
          
          // Show info popup with cabinet details
          /*
          infoPopup.innerHTML = `
            <h3>${INTERSECTED.userData.name}</h3>
            <p>${INTERSECTED.userData.description}</p>
          `;
          
          // Special message for web browser
          if (INTERSECTED.userData.id === 'web-browser') {
            infoPopup.innerHTML += `
              <p style="margin-top: 10px; color: #ffff00;">${INTERSECTED.userData.active ? 'Click to deactivate' : 'Click to activate'}</p>
            `;
          }
          
          infoPopup.style.opacity = '1';
          */
          
          // Show play button for normal cabinets only (not for web browser)
          if (INTERSECTED.userData.url && INTERSECTED.userData.id !== 'web-browser') {
            playButton.style.opacity = '1';
            playButton.onclick = () => {
              window.open(INTERSECTED.userData.url, '_blank');
            };
          } else {
            playButton.style.opacity = '0';
          }
        }
      } else {
        // Too far away, reset everything
        if (INTERSECTED) {
          /*
          gsap.to(INTERSECTED.position, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out'
          });
          
          // Reset any other effects
          INTERSECTED.traverse(child => {
            if (child.material && child.material.emissiveIntensity) {
              gsap.to(child.material, {
                emissiveIntensity: 0.5,
                duration: 0.3
              });
            }
          });
          */
          
          // Hide info popup and play button
          playButton.style.opacity = '0';
          
          INTERSECTED = null;
        }
      }
    } else {
      // No cabinet intersected
      if (INTERSECTED) {
        /*
        gsap.to(INTERSECTED.position, {
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
        
        // Reset any other effects
        INTERSECTED.traverse(child => {
          if (child.material && child.material.emissiveIntensity) {
            gsap.to(child.material, {
              emissiveIntensity: 0.5,
              duration: 0.3
            });
          }
        });
        */
        
        // Reset interaction flag
        INTERSECTED.userData.isBeingInteractedWith = false;
        
        // Hide info popup and play button
        playButton.style.opacity = '0';
        
        INTERSECTED = null;
      }
    }
  };
  
  // Handle cabinet click
  const onMouseClick = (event) => {
    if (INTERSECTED) {
      // Special check for test button - only update log, don't open URL
      if (INTERSECTED.userData.id === 'test-button-3d') {
        const timestamp = new Date().toLocaleTimeString();
        if (window.updateLog) {
          window.updateLog(`3D Button clicked at ${timestamp}`);
        }
        console.log('3D button clicked at ' + timestamp);
      } 
      // Special handling for web browser
      else if (INTERSECTED.userData.id === 'web-browser') {
        INTERSECTED.userData.active = !INTERSECTED.userData.active;
        // If deactivating, blur the iframe to remove focus
        if (!INTERSECTED.userData.active && INTERSECTED.userData.iframe) {
          INTERSECTED.userData.iframe.blur();
        }
      }
      // Special handling for Pong cabinet
      else if (INTERSECTED.userData.id === 'pong') {
        if (INTERSECTED.userData.handleClick) {
          INTERSECTED.userData.handleClick();
        }
      }
      // Only open URL for regular cabinets, not the test button, web browser, or pong
      else if (INTERSECTED.userData.url) {
        window.open(INTERSECTED.userData.url, '_blank');
      }
    }
  };
  
  window.addEventListener('click', onMouseClick, false);
  
  // Handle pointer lock changes
  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = !!document.pointerLockElement;
  }, false);
  
  return {
    update: onCabinetInteraction,
    infoPopup,
    playButton,
    get INTERSECTED() { return INTERSECTED; }, // Expose INTERSECTED as a getter
    isInteractingWith: (id) => INTERSECTED && INTERSECTED.userData && INTERSECTED.userData.id === id
  };
}; 