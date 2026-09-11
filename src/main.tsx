import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Active scrollbar controller: displays scrollbars only on the currently scrolling container while scrolling, hides them 10% faster (550ms)
if (typeof window !== 'undefined') {
  const activeTimers = new Map<HTMLElement, number>();

  window.addEventListener(
    'scroll',
    (e: Event) => {
      let targetEl: HTMLElement | null = null;
      if (e.target instanceof HTMLElement) {
        targetEl = e.target;
      } else if (e.target === document && document.scrollingElement instanceof HTMLElement) {
        targetEl = document.scrollingElement;
      }
      if (targetEl) {
        targetEl.classList.add('is-scrolling');
        const existing = activeTimers.get(targetEl);
        if (existing) window.clearTimeout(existing);
        activeTimers.set(
          targetEl,
          window.setTimeout(() => {
            targetEl?.classList.remove('is-scrolling');
            if (targetEl) activeTimers.delete(targetEl);
          }, 550)
        );
      }
    },
    { capture: true, passive: true }
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
