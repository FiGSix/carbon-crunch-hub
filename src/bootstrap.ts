// Minimal, resilient bootstrap that guarantees mount and neutralizes SW/caches on preview

const BOOT_ID = 'boot-overlay';

function ensureRoot(): HTMLElement {
  let root = document.getElementById('root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  }
  return root;
}

function showBootMessage(message: string) {
  const root = ensureRoot();
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,-apple-system,sans-serif;color:#666;">
      <div style="text-align:center">
        <div style="font-weight:700;margin-bottom:6px">Crunch Carbon Hub</div>
        <div style="font-size:14px">${message}</div>
      </div>
    </div>
  `;
}

function showErrorOverlay(title: string, details?: string) {
  const existing = document.getElementById(BOOT_ID);
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = BOOT_ID;
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.background = 'rgba(0,0,0,0.6)';
  el.style.zIndex = '99999';
  el.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;color:#111;max-width:720px;width:92%;padding:20px 20px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-family:Inter,system-ui,-apple-system,sans-serif;">
        <div style="font-weight:700;font-size:16px;margin-bottom:8px">${title}</div>
        ${details ? `<pre style="white-space:pre-wrap;margin:0 0 12px;font-size:12px;line-height:1.4;background:#f7f7f8;padding:10px;border-radius:8px;max-height:40vh;overflow:auto">${details}</pre>` : ''}
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="btn-hard-reload" style="padding:8px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer">Hard refresh</button>
          <button id="btn-clear-sw" style="padding:8px 12px;border-radius:8px;border:0;background:#111;color:#fff;cursor:pointer">Clear caches & SW</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  (document.getElementById('btn-hard-reload') as HTMLButtonElement | null)?.addEventListener('click', () => {
    // Attempt a hard reload
    window.location.reload();
  });
  (document.getElementById('btn-clear-sw') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    await clearPreviewCachesAndServiceWorkers(true);
  });
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return h.includes('preview--') || h.startsWith('preview-');
}

async function clearPreviewCachesAndServiceWorkers(forceOverlayReload = false) {
  try {
    const hadSW = await (async () => {
      if (!('serviceWorker' in navigator)) return false;
      const regs = await navigator.serviceWorker.getRegistrations();
      let unreg = false;
      await Promise.all(
        regs.map(async (r) => {
          try {
            const ok = await r.unregister();
            if (ok) unreg = true;
          } catch {}
        })
      );
      return unreg;
    })();

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}

    if (forceOverlayReload || hadSW) {
      // Prevent loops
      sessionStorage.setItem('sw_cleared', '1');
      window.location.replace(window.location.href);
    }
  } catch (e) {
    console.error('Failed to clear SW/caches', e);
  }
}

function installGlobalBootErrorHandlers() {
  const captured: string[] = [];
  (window as any).__BOOT_ERRORS__ = captured;

  window.addEventListener('error', (ev) => {
    const msg = `[onerror] ${ev.message} @ ${ev.filename}:${ev.lineno}:${ev.colno}`;
    captured.push(msg);
    console.error(msg);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = (ev as PromiseRejectionEvent).reason;
    const msg = `[unhandledrejection] ${reason?.message || String(reason)}`;
    captured.push(msg);
    console.error(msg);
  });
}

(async function bootstrap() {
  installGlobalBootErrorHandlers();
  showBootMessage('Booting…');

  // On preview hosts, clear SW + caches once, then reload
  if (isPreviewHost() && !sessionStorage.getItem('sw_cleared')) {
    showBootMessage('Refreshing preview…');
    await clearPreviewCachesAndServiceWorkers(true);
    return; // page will reload
  }

  // On preview hosts, prevent re-registration of SW
  if (isPreviewHost() && 'serviceWorker' in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator.serviceWorker as any).register = async () => {
        console.info('[Bootstrap] Service worker registration disabled on preview.');
        // Return a minimal-like object to avoid consumer errors
        return {} as any;
      };
    } catch (e) {
      console.warn('Failed to disable SW register override', e);
    }
  }

  // Try to import the real app entry
  try {
    // Do not block UI; small delay lets the boot message render
    await new Promise((r) => setTimeout(r, 0));
    await import('./main.tsx');
  } catch (e: any) {
    const details = [
      e?.stack || String(e),
      'Captured boot errors:',
      ...(Array.isArray((window as any).__BOOT_ERRORS__) ? (window as any).__BOOT_ERRORS__ : [])
    ].join('\n\n');
    showErrorOverlay('Failed to start the app', details);
  }
})();
