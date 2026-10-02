// extension/content.js - CHANGAN.AM Floating Return Button
(function () {
  'use strict';

  // Do not inject on CHANGAN.AM portal itself
  const currentHost = window.location.hostname.toLowerCase();
  if (currentHost.includes('changan-gui.vercel.app') || currentHost === 'localhost') {
    return;
  }

  // Prevent multiple injections
  if (document.getElementById('changan-extension-fab-host')) return;

  // Check storage if button is enabled
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['changan_fab_enabled', 'changan_fab_pos'], function (res) {
      if (res.changan_fab_enabled === false) return;
      initFab(res.changan_fab_pos || null);
    });
  } else {
    initFab(null);
  }

  function initFab(savedPos) {
    // Create host element with highest z-index
    const host = document.createElement('div');
    host.id = 'changan-extension-fab-host';
    host.style.cssText = 'all: initial !important; position: fixed !important; z-index: 2147483647 !important; pointer-events: auto !important;';

    // Shadow DOM to isolate styles completely from host page
    const shadow = host.attachShadow({ mode: 'open' });

    // CSS inside shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
      
      .changan-fab {
        position: fixed;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FF6B00 0%, #CC4400 100%);
        box-shadow: 0 4px 22px rgba(255, 107, 0, 0.55), 0 2px 10px rgba(0, 0, 0, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        touch-action: none;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        animation: changanPulse 3s ease-in-out infinite;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .changan-fab:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px rgba(255, 107, 0, 0.75), 0 2px 12px rgba(0, 0, 0, 0.5);
      }
      
      .changan-fab:active, .changan-fab.dragging {
        transform: scale(0.95);
        animation: none;
      }

      .changan-icon {
        width: 28px;
        height: 28px;
        pointer-events: none;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      }

      .changan-badge {
        position: absolute;
        bottom: -18px;
        background: rgba(15, 15, 15, 0.92);
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.05em;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid rgba(255, 107, 0, 0.4);
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      }

      @keyframes changanPulse {
        0%, 100% {
          box-shadow: 0 4px 22px rgba(255, 107, 0, 0.55), 0 0 0 0 rgba(255, 107, 0, 0.4);
        }
        50% {
          box-shadow: 0 4px 22px rgba(255, 107, 0, 0.55), 0 0 0 10px rgba(255, 107, 0, 0);
        }
      }
    `;

    const fab = document.createElement('div');
    fab.className = 'changan-fab';
    fab.title = 'Нажмите, чтобы вернуться в CHANGAN.AM';

    // SVG icon: Changan wings + home arrow
    fab.innerHTML = `
      <svg class="changan-icon" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17l10 5 10-5" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12l10 5 10-5" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="changan-badge">CHANGAN</div>
    `;

    // Position setup (default: bottom 28px, right 22px)
    let posX = savedPos ? savedPos.x : (window.innerWidth - 76);
    let posY = savedPos ? savedPos.y : (window.innerHeight - 84);

    // Keep within bounds
    posX = Math.max(10, Math.min(window.innerWidth - 66, posX));
    posY = Math.max(10, Math.min(window.innerHeight - 76, posY));

    fab.style.left = posX + 'px';
    fab.style.top = posY + 'px';

    // Drag & Click Logic
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let moved = false;

    function onPointerDown(e) {
      isDragging = true;
      moved = false;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      initialLeft = fab.offsetLeft;
      initialTop = fab.offsetTop;
      fab.classList.add('dragging');
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        moved = true;
      }

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      newLeft = Math.max(10, Math.min(window.innerWidth - 66, newLeft));
      newTop = Math.max(10, Math.min(window.innerHeight - 76, newTop));

      fab.style.left = newLeft + 'px';
      fab.style.top = newTop + 'px';
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      fab.classList.remove('dragging');

      if (moved) {
        // Save new position
        const currentPos = { x: fab.offsetLeft, y: fab.offsetTop };
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ changan_fab_pos: currentPos });
        }
      } else {
        // Was a tap/click! Return to CHANGAN.AM
        window.location.href = 'https://changan-gui.vercel.app/';
      }
    }

    // Touch events
    fab.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });

    // Mouse events
    fab.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // Keep on screen if window resizes
    window.addEventListener('resize', function () {
      let curLeft = fab.offsetLeft;
      let curTop = fab.offsetTop;
      curLeft = Math.max(10, Math.min(window.innerWidth - 66, curLeft));
      curTop = Math.max(10, Math.min(window.innerHeight - 76, curTop));
      fab.style.left = curLeft + 'px';
      fab.style.top = curTop + 'px';
    });

    shadow.appendChild(style);
    shadow.appendChild(fab);
    document.body.appendChild(host);
  }
})();
