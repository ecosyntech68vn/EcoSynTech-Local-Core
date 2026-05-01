(function(){
  const THEME_KEY = 'eco-theme';
  const root = document.documentElement;
  function applyTheme(theme){
    root.setAttribute('data-theme', theme);
  }
  function loadTheme(){
    const saved = localStorage.getItem(THEME_KEY);
    const preferred = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(preferred);
  }
  window.toggleTheme = function(){
    const current = root.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  };
  document.addEventListener('DOMContentLoaded', loadTheme);

  // Optional: auto-insert a small toggle button for UX improvement (no CSS bleed)
  document.addEventListener('DOMContentLoaded', function(){
    if (!document.getElementById('ecot-theme-toggle')) {
      const btn = document.createElement('button');
      btn.id = 'ecot-theme-toggle';
      btn.textContent = 'Theme';
      btn.style.position = 'fixed';
      btn.style.bottom = '16px';
      btn.style.right = '16px';
      btn.style.zIndex = '9999';
      btn.style.padding = '8px 12px';
      btn.style.background = 'var(--bg-card)';
      btn.style.border = '1px solid var(--border)';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', window.toggleTheme);
      document.body.appendChild(btn);
    }
  });
})();
