// ── DEBUG: Direct DOM overlay for iPhone Safari ───────────────────
// This runs BEFORE React and writes directly to the HTML document.
// It catches every possible error and displays it on screen.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const _dbgLogs: string[] = [];
  const _dbgLog = (msg: string) => {
    _dbgLogs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    const el = document.getElementById('__dbg_overlay');
    if (el) el.innerText = _dbgLogs.slice(-20).join('\n');
  };

  // Create a visible debug panel at the bottom of the screen
  const createOverlay = () => {
    if (document.getElementById('__dbg_overlay')) return;
    const div = document.createElement('div');
    div.id = '__dbg_overlay';
    Object.assign(div.style, {
      position: 'fixed', bottom: '0', left: '0', right: '0',
      maxHeight: '40vh', overflow: 'auto', zIndex: '99999',
      background: 'rgba(0,0,0,0.92)', color: '#0f0',
      fontSize: '11px', fontFamily: 'monospace', padding: '8px',
      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      pointerEvents: 'auto',
    });
    div.innerText = 'Debug overlay active...';
    (document.body || document.documentElement).appendChild(div);
  };

  // Set up overlay as soon as DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOverlay);
  } else {
    createOverlay();
  }

  _dbgLog('Polyfills loading...');

  // Catch ALL errors globally
  window.onerror = (msg, src, line, col, err) => {
    _dbgLog(`ERROR: ${msg} | ${src}:${line}:${col} | ${err?.stack || err}`);
    createOverlay();
    return false;
  };
  window.addEventListener('unhandledrejection', (e) => {
    _dbgLog(`REJECTION: ${e.reason?.stack || e.reason?.message || String(e.reason)}`);
    createOverlay();
  });

  // Intercept console.error to capture React's internal error logging
  const _origError = console.error;
  console.error = (...args: any[]) => {
    _dbgLog(`console.error: ${args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a)?.slice(0, 200) : String(a); }
      catch { return String(a); }
    }).join(' ')}`);
    createOverlay();
    _origError.apply(console, args);
  };

  // Also intercept console.warn
  const _origWarn = console.warn;
  console.warn = (...args: any[]) => {
    _dbgLog(`console.warn: ${args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a)?.slice(0, 200) : String(a); }
      catch { return String(a); }
    }).join(' ')}`);
    _origWarn.apply(console, args);
  };

  (globalThis as any).__dbgLog = _dbgLog;
}

// ── Symbol.dispose / Symbol.asyncDispose polyfill ──────────────────
// Zod v4 and other modern libraries reference Symbol.dispose and
// Symbol.asyncDispose (Explicit Resource Management proposal).
// iOS Safari does NOT support these yet, causing a fatal runtime error
// that shows as a blank white screen.
if (typeof Symbol.dispose === 'undefined') {
  (Symbol as any).dispose = Symbol.for('Symbol.dispose');
}
if (typeof Symbol.asyncDispose === 'undefined') {
  (Symbol as any).asyncDispose = Symbol.for('Symbol.asyncDispose');
}

if (typeof window !== 'undefined' && (globalThis as any).__dbgLog) {
  (globalThis as any).__dbgLog('Polyfills applied OK');
}

if (!Array.prototype.findLast) {
  Array.prototype.findLast = function findLast<T>(
    this: T[],
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: unknown
  ) {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      const value = this[index];
      if (predicate.call(thisArg, value, index, this)) {
        return value;
      }
    }
    return undefined;
  };
}

if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function findLastIndex<T>(
    this: T[],
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: unknown
  ) {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate.call(thisArg, this[index], index, this)) {
        return index;
      }
    }
    return -1;
  };
}

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function structuredCloneFallback<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  };
}

if (typeof globalThis.WeakRef === 'undefined') {
  globalThis.WeakRef = class WeakRefFallback<T extends object> {
    private readonly value: T;

    constructor(value: T) {
      this.value = value;
    }

    deref() {
      return this.value;
    }

    get [Symbol.toStringTag]() {
      return 'WeakRef';
    }
  } as unknown as typeof WeakRef;
}
