import * as THREE from 'three';

export class WalletUI {
    constructor() {
        this.coins = 0;
        this.createUI();
    }

    createUI() {
        // Create wallet container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '5px';
        container.style.zIndex = '1000';
        container.style.fontFamily = '"Press Start 2P", monospace';
        
        // Create coin count text
        this.coinText = document.createElement('span');
        this.coinText.style.color = '#C0C0C0'; // Silver color
        this.coinText.style.fontSize = '24px';
        this.updateDisplay();
        
        // Create coin icon
        const coinIcon = document.createElement('span');
        coinIcon.innerHTML = '🪙'; // Silver coin emoji
        coinIcon.style.fontSize = '24px';
        
        // Assemble UI
        container.appendChild(this.coinText);
        container.appendChild(coinIcon);
        document.body.appendChild(container);
    }

    updateDisplay() {
        this.coinText.textContent = this.coins.toString();
    }

    addCoins(amount) {
        this.coins += amount;
        this.updateDisplay();
        // Save to localStorage
        localStorage.setItem('vibecadeCoins', this.coins.toString());
    }

    loadCoins() {
        const savedCoins = localStorage.getItem('vibecadeCoins');
        if (savedCoins) {
            this.coins = parseInt(savedCoins);
            this.updateDisplay();
        }
    }
} 