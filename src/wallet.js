function detectBrowser() {
    const ua = navigator.userAgent || '';

    if (/Firefox\/(\d+(?:\.\d+)?)/i.test(ua)) {
        const version = ua.match(/Firefox\/(\d+(?:\.\d+)?)/i)[1];
        return { name: 'Firefox', version: shortenVersion(version), id: 'firefox' };
    }

    if (/Edg\/(\d+(?:\.\d+)?)/i.test(ua)) {
        const version = ua.match(/Edg\/(\d+(?:\.\d+)?)/i)[1];
        return { name: 'Edge', version: shortenVersion(version), id: 'edge' };
    }

    // Chromium-based (exclude Edge already handled)
    if (/Chrome\/(\d+(?:\.\d+)?)/i.test(ua) && !/Edg/i.test(ua)) {
        const version = ua.match(/Chrome\/(\d+(?:\.\d+)?)/i)[1];
        return { name: 'Chrome', version: shortenVersion(version), id: 'chrome' };
    }

    // Safari — must check after Chrome (Safari UA also contains "Safari")
    if (/Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|Android/i.test(ua)) {
        const match = ua.match(/Version\/(\d+[._]\d+(?:[._]\d+)?)/i)
            || ua.match(/Safari\/(\d+(?:\.\d+)?)/i);
        const version = match ? match[1].replace(/_/g, '.') : '?';
        return { name: 'Safari', version: shortenVersion(version), id: 'safari' };
    }

    return { name: 'Browser', version: '?', id: 'unknown' };
}

function shortenVersion(version) {
    const parts = String(version).split('.');
    if (parts.length === 1) return parts[0];
    // Keep major.minor; drop patch/build noise
    return `${parts[0]}.${parts[1]}`;
}

/** Painted ink height of a single glyph via canvas (falls back to fontSize). */
function measureCanvasInkHeight(text, font, canvasSize) {
    try {
        const size = Math.max(8, Math.ceil(canvasSize));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return 0;
        ctx.clearRect(0, 0, size, size);
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, size / 2, size / 2);
        const { data } = ctx.getImageData(0, 0, size, size);
        let minY = size;
        let maxY = -1;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (data[(y * size + x) * 4 + 3] > 12) {
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        return maxY >= minY ? maxY - minY + 1 : 0;
    } catch (_) {
        return 0;
    }
}

function measureDigitInkHeight(fontSize) {
    try {
        // Prefer pixel ink — Safari/WebKit actualBoundingBox* often equals the
        // full em square (24) instead of true Press Start ink (~21–22).
        const fromPixels = measureCanvasInkHeight(
            '0',
            `${fontSize}px "Press Start 2P"`,
            fontSize * 3
        );
        if (fromPixels > 0) return fromPixels;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return Math.round(fontSize * 0.9);
        ctx.font = `${fontSize}px "Press Start 2P"`;
        const m = ctx.measureText('0');
        const fromMetrics = Math.ceil(
            (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0)
        );
        if (fromMetrics > 0 && fromMetrics < fontSize * 1.05) return fromMetrics;
        return Math.round(fontSize * 0.9);
    } catch (_) {
        return Math.round(fontSize * 0.9);
    }
}

/**
 * Rasterize 🪙 at high resolution and return its painted bounding box.
 * Canvas uses the same emoji rasterizer as the DOM, so cropping to these
 * bounds and scaling gives an exact-height coin in every browser.
 */
function rasterizeCoinEmoji() {
    try {
        const probe = 96;
        const size = probe * 2;
        const off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        const ctx = off.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.clearRect(0, 0, size, size);
        ctx.font = `${probe}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪙', size / 2, size / 2);

        const { data } = ctx.getImageData(0, 0, size, size);
        let minX = size, maxX = -1, minY = size, maxY = -1;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (data[(y * size + x) * 4 + 3] > 16) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX || maxY < minY) return null;
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        // Sanity: a coin should be roughly square and a decent fraction of probe
        if (h < probe * 0.4 || w / h > 2 || h / w > 2) return null;
        return { canvas: off, x: minX, y: minY, w, h };
    } catch (_) {
        return null;
    }
}

/**
 * Fallback when canvas rasterization fails. Tuned from real Safari/Firefox screenshots.
 */
function coinEmojiPaintFactor() {
    const ua = navigator.userAgent || '';
    if (/Firefox/i.test(ua)) return 0.88;

    const isIosUa = /iPhone|iPad|iPod/i.test(ua);
    const isMacSafari = /Safari/i.test(ua)
        && !/Chrome|Chromium|CriOS|Edg|Firefox|Android/i.test(ua)
        && !isIosUa;

    // Apple Color Emoji paints larger than CSS font-size
    if (isMacSafari) return 1.22;

    if (isPhoneLikeViewport()) return 1.0;

    return 1.12;
}

function isPhoneLikeViewport() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
    return (
        (window.devicePixelRatio || 1) >= 2
        && Math.min(window.innerWidth, window.innerHeight) < 520
    );
}

function browserIconSvg(id) {
    const common = 'width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"';
    const stroke = '#C0C0C0';
    switch (id) {
        case 'safari':
            return `<svg ${common}><circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="1.75"/><path d="M8.2 15.8L11.2 8.5L15.8 8.2L12.8 15.5L8.2 15.8Z" fill="${stroke}"/><circle cx="12" cy="12" r="1.4" fill="#000"/></svg>`;
        case 'firefox':
            return `<svg ${common}><path d="M12 3.5c-2.2 0-3.8 1.1-4.7 2.3 1.4-.3 2.5-.1 3.3.4-.9.1-2.5.7-3.2 2.2-.2.5-.3 1-.3 1.5 0 4.1 3.1 7.4 7 7.4 3.6 0 6.5-2.6 6.9-6-.8 1.1-2.2 2-4.1 1.7 1.6-.7 2.5-2 2.7-3.6.3-1.7-.4-3.3-1.6-4.3C16.5 4.2 14.4 3.5 12 3.5z" stroke="${stroke}" stroke-width="1.5" fill="none"/><circle cx="13.2" cy="11.2" r="2.2" stroke="${stroke}" stroke-width="1.5"/></svg>`;
        case 'chrome':
            return `<svg ${common}><circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="1.75"/><circle cx="12" cy="12" r="3.2" stroke="${stroke}" stroke-width="1.75"/><path d="M12 8.8h8.1M9.2 14.2L5.1 7.4M14.8 14.2l-4.1 6.8" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/></svg>`;
        case 'edge':
            return `<svg ${common}><path d="M5 14.5c1.8 3.2 5 5 8.2 5 4.2 0 7.3-2.7 7.3-6.2 0-2.6-1.7-4.4-4.6-4.4-1.6 0-2.8.5-3.7 1.3 1.9-.2 4.4.3 4.4 2.7 0 1.8-1.5 3-3.5 3-3.2 0-5.6-2.6-5.6-6.1C7.5 5.8 10.7 3.5 14 3.5c3.6 0 6.2 1.8 7.3 4.2-1.2-3.8-5-6.2-9.2-6.2C6.7 1.5 2.8 5.4 2.8 11c0 1.2.2 2.4.7 3.5z" stroke="${stroke}" stroke-width="1.5" fill="none"/></svg>`;
        default:
            return `<svg ${common}><circle cx="12" cy="12" r="9" stroke="${stroke}" stroke-width="1.75"/><path d="M8 12h8M12 8v8" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/></svg>`;
    }
}

export class WalletUI {
    constructor() {
        this.coins = 0;
        this.createUI();
    }

    createUI() {
        // Shared top-right HUD: LOOK | FPS | coins
        const container = document.createElement('div');
        container.id = 'top-right-hud';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '18px';
        container.style.zIndex = '1000';
        container.style.fontFamily = '"Press Start 2P", monospace';
        container.style.pointerEvents = 'none';

        this.lookText = document.createElement('span');
        this.lookText.id = 'look-hud';
        this.lookText.style.display = 'flex';
        this.lookText.style.alignItems = 'center';
        this.lookText.style.gap = '10px';
        this.lookText.style.color = '#C0C0C0';
        this.lookText.style.fontSize = '24px';

        this.lookValueText = document.createElement('span');
        this.lookValueText.textContent = '0';

        this.lookLabelText = document.createElement('span');
        this.lookLabelText.textContent = 'LOOK';

        this.lookText.appendChild(this.lookValueText);
        this.lookText.appendChild(this.lookLabelText);

        this.fpsText = document.createElement('span');
        this.fpsText.id = 'fps-hud';
        this.fpsText.style.display = 'flex';
        this.fpsText.style.alignItems = 'center';
        this.fpsText.style.gap = '10px';
        this.fpsText.style.color = '#C0C0C0';
        this.fpsText.style.fontSize = '24px';

        this.fpsValueText = document.createElement('span');
        this.fpsValueText.textContent = '--';

        this.fpsLabelText = document.createElement('span');
        this.fpsLabelText.textContent = 'FPS';

        this.fpsText.appendChild(this.fpsValueText);
        this.fpsText.appendChild(this.fpsLabelText);

        this.coinText = document.createElement('span');
        this.coinText.id = 'coin-hud-value';
        this.coinText.style.color = '#C0C0C0';
        this.coinText.style.fontSize = '24px';
        this.coinText.style.lineHeight = '1';
        this.coinText.style.display = 'inline-flex';
        this.coinText.style.alignItems = 'center';
        this.coinText.style.overflow = 'visible';
        this.updateDisplay();

        // The 🪙 is rasterized to a canvas cropped to its painted pixels, so its
        // display height can be forced to exactly match the digit ink height.
        // (DOM emoji paint size vs font-size varies wildly per engine.)
        const coinIcon = document.createElement('span');
        coinIcon.id = 'coin-hud-icon';
        coinIcon.setAttribute('aria-hidden', 'true');
        coinIcon.style.display = 'inline-flex';
        coinIcon.style.position = 'relative';
        coinIcon.style.alignItems = 'center';
        coinIcon.style.justifyContent = 'center';
        coinIcon.style.boxSizing = 'border-box';
        coinIcon.style.overflow = 'visible';
        coinIcon.style.flexShrink = '0';
        coinIcon.style.lineHeight = '0';
        coinIcon.style.width = 'auto';
        coinIcon.style.height = 'auto';

        // Fallback if canvas rasterization fails (kept hidden otherwise)
        const coinGlyph = document.createElement('span');
        coinGlyph.id = 'coin-hud-glyph';
        coinGlyph.textContent = '🪙';
        coinGlyph.style.display = 'none';
        coinGlyph.style.lineHeight = 'normal';
        coinGlyph.style.fontSize = '24px';
        coinIcon.appendChild(coinGlyph);

        const coinCanvas = document.createElement('canvas');
        coinCanvas.id = 'coin-hud-canvas';
        coinCanvas.style.display = 'block';
        coinIcon.appendChild(coinCanvas);

        this.coinGlyph = coinGlyph;
        this.coinCanvas = coinCanvas;
        this.coinIcon = coinIcon;

        const coinsGroup = document.createElement('div');
        coinsGroup.id = 'coin-hud';
        coinsGroup.style.display = 'flex';
        coinsGroup.style.alignItems = 'center';
        coinsGroup.style.gap = '5px';
        coinsGroup.style.lineHeight = 'normal';
        coinsGroup.style.overflow = 'visible';
        coinsGroup.appendChild(this.coinText);
        coinsGroup.appendChild(coinIcon);
        this.coinsGroup = coinsGroup;

        // Keep trailing paint inside the viewport (body overflow:hidden)
        container.style.overflow = 'visible';
        container.style.paddingRight = '8px';
        container.appendChild(this.lookText);
        container.appendChild(this.fpsText);
        container.appendChild(coinsGroup);
        document.body.appendChild(container);

        this.createBrowserBadge();
        this.fitCoinIconToDigit();
        if (document.fonts?.ready) {
            document.fonts.ready.then(() => this.fitCoinIconToDigit()).catch(() => {});
        }
    }

    /**
     * Match coin height to digit ink height exactly, in any browser:
     * rasterize 🪙 offscreen, measure its real painted bounding box, then
     * draw it cropped into the display canvas at exactly digit-ink height.
     * Self-correcting — no per-engine font-size factors.
     */
    fitCoinIconToDigit() {
        if (!this.coinText || !this.coinIcon || !this.coinCanvas) return;

        const fontSize = 24;
        const digitH = measureDigitInkHeight(fontSize);

        this.coinText.style.height = `${fontSize}px`;
        this.coinText.style.display = 'inline-flex';
        this.coinText.style.alignItems = 'center';
        this.coinsGroup.style.height = `${fontSize}px`;
        this.coinsGroup.style.overflow = 'visible';
        this.coinsGroup.style.alignItems = 'center';
        this.coinIcon.style.height = `${fontSize}px`;

        const raster = rasterizeCoinEmoji();
        if (!raster) {
            // Canvas unavailable: show the plain emoji at a conservative size
            this.coinCanvas.style.display = 'none';
            this.coinGlyph.style.display = 'block';
            this.coinGlyph.style.fontSize = `${Math.round(digitH / coinEmojiPaintFactor())}px`;
            return;
        }

        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const outH = Math.max(8, Math.round(digitH * dpr));
        const outW = Math.max(8, Math.round(outH * (raster.w / raster.h)));

        const canvas = this.coinCanvas;
        canvas.width = outW;
        canvas.height = outH;
        canvas.style.width = `${outW / dpr}px`;
        canvas.style.height = `${digitH}px`;
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, outW, outH);
        ctx.drawImage(raster.canvas, raster.x, raster.y, raster.w, raster.h, 0, 0, outW, outH);
        this.coinGlyph.style.display = 'none';
    }

    createBrowserBadge() {
        const info = detectBrowser();
        const badge = document.createElement('div');
        badge.id = 'browser-hud';
        badge.style.position = 'fixed';
        badge.style.top = '20px';
        badge.style.left = '20px';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '10px';
        badge.style.zIndex = '1000';
        badge.style.fontFamily = '"Press Start 2P", monospace';
        badge.style.pointerEvents = 'none';
        badge.style.color = '#C0C0C0';
        badge.style.fontSize = '24px';

        const icon = document.createElement('span');
        icon.style.display = 'inline-flex';
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.flexShrink = '0';
        icon.innerHTML = browserIconSvg(info.id);

        const label = document.createElement('span');
        label.textContent = `${info.name} ${info.version}`;

        badge.appendChild(icon);
        badge.appendChild(label);
        document.body.appendChild(badge);
    }

    setFps(value) {
        if (!this.fpsValueText) return;
        const n = Number(value);
        const isNumber = Number.isFinite(n);
        this.fpsValueText.textContent = isNumber ? String(n) : String(value);

        let color = '#C0C0C0';
        if (isNumber) {
            if (n >= 55) color = '#00FF66';
            else if (n >= 30) color = '#FFD400';
            else color = '#FF3B3B';
        }
        this.fpsText.style.color = color;
    }

    setLook(value) {
        if (!this.lookValueText) return;
        const n = Number(value) || 0;
        this.lookValueText.textContent = String(n);

        // °/s over the HUD window — idle stays silver; active look is graded
        // green = responsive, yellow = decent, red = sluggish (Safari often lands here)
        let color = '#C0C0C0';
        if (n >= 100) color = '#00FF66';
        else if (n >= 40) color = '#FFD400';
        else if (n > 0) color = '#FF3B3B';

        this.lookText.style.color = color;
    }

    updateDisplay() {
        this.coinText.textContent = this.coins.toString();
    }

    addCoins(amount) {
        this.coins += amount;
        this.updateDisplay();
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
