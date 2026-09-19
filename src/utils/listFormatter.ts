export type ListType = 'number' | 'bullet' | 'alpha';

/**
 * Detects if current selection / caret is inside a list (ul or ol),
 * and what specific type of list it is.
 */
export function getActiveListType(): ListType | null {
  if (typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  let node: Node | null = sel.anchorNode;
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  const el = node as HTMLElement | null;
  if (!el) return null;

  const li = el.closest('li');
  if (!li) return null;

  const parentList = li.closest('ol, ul');
  if (!parentList) return null;

  if (parentList.tagName.toLowerCase() === 'ul') {
    return 'bullet';
  }

  if (parentList.tagName.toLowerCase() === 'ol') {
    const isAlpha =
      parentList.getAttribute('type') === 'a' ||
      parentList.classList.contains('list-alpha') ||
      (parentList as HTMLElement).style.listStyleType === 'lower-alpha' ||
      parentList.getAttribute('data-list-type') === 'alpha';
    return isAlpha ? 'alpha' : 'number';
  }

  return null;
}

/**
 * Applies or toggles a list of the requested type (number, bullet, alpha).
 * If already active with the same type, turns it off (toggles).
 * If active with a different type, transforms the list into the requested type.
 */
export function applyListFormat(targetType: ListType, onApply?: () => void) {
  if (typeof window === 'undefined') return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const currentType = getActiveListType();

  // If already the exact same type -> toggle OFF back to plain paragraphs
  if (currentType === targetType) {
    if (currentType === 'bullet') {
      document.execCommand('insertUnorderedList', false);
    } else {
      document.execCommand('insertOrderedList', false);
    }
    onApply?.();
    return;
  }

  // Find nearest list container if existing
  let node: Node | null = sel.anchorNode;
  if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  const existingList = (node as HTMLElement)?.closest('ol, ul') as HTMLElement | null;

  if (targetType === 'bullet') {
    document.execCommand('insertUnorderedList', false);
    onApply?.();
    return;
  }

  if (targetType === 'number') {
    document.execCommand('insertOrderedList', false);
    // Ensure ol has standard decimal numbering
    const updateOl = () => {
      const s = window.getSelection();
      let n = s?.anchorNode;
      if (n && n.nodeType === Node.TEXT_NODE) n = n.parentNode;
      const ol = (n as HTMLElement)?.closest('ol');
      if (ol) {
        ol.removeAttribute('type');
        ol.removeAttribute('data-list-type');
        ol.classList.remove('list-alpha');
        ol.style.listStyleType = 'decimal';
      }
      onApply?.();
    };
    updateOl();
    setTimeout(updateOl, 10);
    return;
  }

  if (targetType === 'alpha') {
    document.execCommand('insertOrderedList', false);
    const updateAlpha = () => {
      const s = window.getSelection();
      let n = s?.anchorNode;
      if (n && n.nodeType === Node.TEXT_NODE) n = n.parentNode;
      const ol = (n as HTMLElement)?.closest('ol');
      if (ol) {
        ol.setAttribute('type', 'a');
        ol.setAttribute('data-list-type', 'alpha');
        ol.classList.add('list-alpha');
        ol.style.listStyleType = 'lower-alpha';
      }
      onApply?.();
    };
    updateAlpha();
    setTimeout(updateAlpha, 10);
    return;
  }
}
