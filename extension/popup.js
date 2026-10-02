// extension/popup.js
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-fab');
  const btnPortal = document.getElementById('btn-open-portal');
  const btnReset = document.getElementById('btn-reset-pos');

  // Load current toggle state
  chrome.storage.local.get(['changan_fab_enabled'], (res) => {
    toggle.checked = res.changan_fab_enabled !== false;
  });

  // Save toggle changes
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ changan_fab_enabled: toggle.checked });
  });

  // Open portal in current or new tab
  btnPortal.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://changan-gui.vercel.app/' });
  });

  // Reset position
  btnReset.addEventListener('click', () => {
    chrome.storage.local.remove(['changan_fab_pos'], () => {
      btnReset.textContent = 'Позиция сброшена ✓';
      setTimeout(() => { btnReset.textContent = 'Сбросить позицию кнопки'; }, 1500);
    });
  });
});
