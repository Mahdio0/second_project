/**
 * mindmap.js — Mermaid.js mindmap renderer
 *
 * Loads Mermaid via CDN (already included in <head>) and exposes
 * `renderMindmap(code, containerId)`.
 */

const mindmapRenderer = (() => {
  let _initialized = false;

  async function ensureInit() {
    if (_initialized) return;
    if (typeof mermaid === 'undefined') {
      console.error('[TubeMind] Mermaid.js is not loaded.');
      return;
    }
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#7c3aed',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#a78bfa',
        lineColor: '#60a5fa',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#1e293b',
        background: 'transparent',
        mainBkg: 'rgba(124,58,237,0.15)',
        nodeBorder: '#a78bfa',
        clusterBkg: 'rgba(37,99,235,0.12)',
        titleColor: '#e2e8f0',
        edgeLabelBackground: 'rgba(15,12,41,0.8)',
        fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
        fontSize: '15px',
      },
      mindmap: { padding: 18, maxNodeWidth: 200 },
    });
    _initialized = true;
  }

  /**
   * Render a Mermaid mindmap diagram into the specified container element.
   * @param {string} code         — Mermaid mindmap source code
   * @param {string} containerId  — ID of the DOM element to render into
   */
  async function renderMindmap(code, containerId) {
    await ensureInit();
    const container = document.getElementById(containerId);
    if (!container) return;

    // Sanitize: ensure it starts with `mindmap`
    const cleanCode = code.trim().startsWith('mindmap') ? code.trim() : `mindmap\n${code.trim()}`;

    container.innerHTML = '<div class="spinner" style="margin:auto;display:block;"></div>';

    try {
      const id = 'mmd-' + Date.now();
      const { svg } = await mermaid.render(id, cleanCode);
      container.innerHTML = svg;
    } catch (err) {
      console.error('[TubeMind] Mermaid render error:', err);
      container.innerHTML = `
        <div style="color:#f87171;padding:1rem;">
          <strong>Could not render mindmap.</strong><br>
          <pre style="font-size:0.75rem;margin-top:0.5rem;opacity:0.7;white-space:pre-wrap;">${escapeHtml(cleanCode)}</pre>
        </div>`;
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { renderMindmap };
})();
