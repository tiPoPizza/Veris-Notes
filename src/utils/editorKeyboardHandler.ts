/**
 * Editor keyboard and deletion handler utilities
 * Manages atomic deletion of mention links (@block, @note) and list unwrapping/deletion.
 */

function isLinkElement(node: Node | null): boolean {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  return (
    el.classList.contains('veris-block-link') ||
    el.classList.contains('veris-note-link') ||
    el.hasAttribute('data-block-id') ||
    el.hasAttribute('data-note-id')
  );
}

export function setCaretAtStart(container: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();

  let targetNode: Node = container;
  let targetOffset = 0;

  if (container.nodeType === Node.ELEMENT_NODE) {
    const el = container as HTMLElement;
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(n) {
          if (n.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
          if ((n as HTMLElement).tagName === 'BR') return NodeFilter.FILTER_ACCEPT;
          return NodeFilter.FILTER_SKIP;
        },
      }
    );
    const first = walker.nextNode();
    if (first) {
      targetNode = first;
      targetOffset = 0;
    }
  }

  try {
    if (targetNode.nodeType === Node.TEXT_NODE) {
      range.setStart(targetNode, 0);
    } else {
      range.setStart(targetNode, Math.min(targetOffset, targetNode.childNodes.length));
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {
    console.warn('setCaretAtStart error:', err);
  }
}

function setCaretPosition(targetNode: Node, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (targetNode.nodeType === Node.TEXT_NODE) {
    const len = targetNode.textContent?.length || 0;
    range.setStart(targetNode, Math.min(offset, len));
  } else {
    range.setStart(targetNode, Math.min(offset, targetNode.childNodes.length));
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Handles deletion of block and note links (@name).
 * Works for both Backspace (backward) and Delete (forward) keys, as well as selection delete.
 */
export function handleLinkDeletion(editor: HTMLElement, direction: 'backward' | 'forward'): boolean {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);

  // If there is an active selection across text
  if (!range.collapsed) {
    const common = range.commonAncestorContainer;
    const parentEl = common.nodeType === Node.ELEMENT_NODE ? (common as HTMLElement) : common.parentElement;
    if (!parentEl) return false;

    const links = parentEl.querySelectorAll('.veris-block-link, .veris-note-link, [data-block-id], [data-note-id]');
    let removedAny = false;
    links.forEach(link => {
      try {
        if (range.intersectsNode(link)) {
          link.remove();
          removedAny = true;
        }
      } catch {
        // ignore range calculation errors
      }
    });

    if (removedAny) {
      range.deleteContents();
      return true;
    }
    return false;
  }

  // Collapsed caret
  const node = range.startContainer;
  const offset = range.startOffset;

  if (direction === 'backward') {
    // Backspace: check element before caret
    let targetLink: HTMLElement | null = null;
    let spaceToDelete: { textNode: Text; index: number } | null = null;

    if (node.nodeType === Node.TEXT_NODE) {
      if (offset === 0) {
        let prev = node.previousSibling;
        while (prev && prev.nodeType === Node.TEXT_NODE && prev.textContent === '') {
          prev = prev.previousSibling;
        }
        if (isLinkElement(prev)) {
          targetLink = prev as HTMLElement;
        }
      } else if (offset === 1) {
        const char = node.textContent?.charAt(0);
        if (char === '\u00A0' || char === ' ') {
          let prev = node.previousSibling;
          while (prev && prev.nodeType === Node.TEXT_NODE && prev.textContent === '') {
            prev = prev.previousSibling;
          }
          if (isLinkElement(prev)) {
            targetLink = prev as HTMLElement;
            spaceToDelete = { textNode: node as Text, index: 0 };
          }
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childBefore = node.childNodes[offset - 1];
      if (isLinkElement(childBefore)) {
        targetLink = childBefore as HTMLElement;
      }
    }

    if (targetLink && editor.contains(targetLink)) {
      const parent = targetLink.parentNode;
      if (!parent) return false;
      const linkIdx = Array.from(parent.childNodes).indexOf(targetLink);

      if (spaceToDelete) {
        spaceToDelete.textNode.deleteData(spaceToDelete.index, 1);
      }

      targetLink.remove();

      // Place caret where the link was
      if (parent.childNodes[linkIdx]) {
        setCaretPosition(parent.childNodes[linkIdx], 0);
      } else if (linkIdx > 0 && parent.childNodes[linkIdx - 1]) {
        const prev = parent.childNodes[linkIdx - 1];
        const len = prev.nodeType === Node.TEXT_NODE ? (prev.textContent?.length || 0) : 0;
        setCaretPosition(prev, len);
      } else {
        setCaretPosition(parent, 0);
      }
      return true;
    }
  } else {
    // Delete: check element after caret
    let targetLink: HTMLElement | null = null;
    let spaceToDelete: { textNode: Text; index: number } | null = null;

    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length || 0;
      if (offset === len) {
        let next = node.nextSibling;
        while (next && next.nodeType === Node.TEXT_NODE && next.textContent === '') {
          next = next.nextSibling;
        }
        if (isLinkElement(next)) {
          targetLink = next as HTMLElement;
        }
      } else if (offset === len - 1) {
        const char = node.textContent?.charAt(len - 1);
        if (char === '\u00A0' || char === ' ') {
          let next = node.nextSibling;
          while (next && next.nodeType === Node.TEXT_NODE && next.textContent === '') {
            next = next.nextSibling;
          }
          if (isLinkElement(next)) {
            targetLink = next as HTMLElement;
            spaceToDelete = { textNode: node as Text, index: len - 1 };
          }
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childAfter = node.childNodes[offset];
      if (isLinkElement(childAfter)) {
        targetLink = childAfter as HTMLElement;
      }
    }

    if (targetLink && editor.contains(targetLink)) {
      const parent = targetLink.parentNode;
      if (!parent) return false;
      const linkIdx = Array.from(parent.childNodes).indexOf(targetLink);

      if (spaceToDelete) {
        spaceToDelete.textNode.deleteData(spaceToDelete.index, 1);
      }

      targetLink.remove();

      if (parent.childNodes[linkIdx]) {
        setCaretPosition(parent.childNodes[linkIdx], 0);
      } else if (linkIdx > 0 && parent.childNodes[linkIdx - 1]) {
        const prev = parent.childNodes[linkIdx - 1];
        const len = prev.nodeType === Node.TEXT_NODE ? (prev.textContent?.length || 0) : 0;
        setCaretPosition(prev, len);
      } else {
        setCaretPosition(parent, 0);
      }
      return true;
    }
  }

  return false;
}

/**
 * Splits a list around an LI and turns that LI into a paragraph on its own line.
 * Any subsequent items are put into a new list preserving numbering/style.
 */
function splitListAroundLi(parentList: HTMLElement, li: HTMLElement, htmlContent: string) {
  const isOl = parentList.tagName.toLowerCase() === 'ol';
  const listType =
    parentList.getAttribute('data-list-type') ||
    (isOl && parentList.getAttribute('type') === 'a' ? 'alpha' : isOl ? 'number' : 'bullet');

  // Collect items after this li
  const itemsAfter: HTMLElement[] = [];
  let next = li.nextElementSibling as HTMLElement | null;
  while (next) {
    itemsAfter.push(next);
    next = next.nextElementSibling as HTMLElement | null;
  }

  // Determine starting number for subsequent list if ordered
  let nextStartIndex: number | null = null;
  if (isOl && listType === 'number') {
    const parentStart = parseInt(parentList.getAttribute('start') || '1', 10);
    const currentLiIndex = Array.from(parentList.children).indexOf(li);
    nextStartIndex = parentStart + currentLiIndex + 1;
  }

  // Create paragraph for the current line
  const p = document.createElement('p');
  p.innerHTML = htmlContent || '<br>';

  // Insert paragraph right after parentList
  parentList.parentNode?.insertBefore(p, parentList.nextSibling);

  // If there are items after, put them in a new list after p
  if (itemsAfter.length > 0) {
    const newList = document.createElement(parentList.tagName) as HTMLElement;
    newList.className = parentList.className;
    if (isOl) {
      if (listType === 'alpha') {
        newList.setAttribute('type', 'a');
        newList.setAttribute('data-list-type', 'alpha');
        newList.classList.add('list-alpha');
        newList.style.listStyleType = 'lower-alpha';
      } else {
        newList.style.listStyleType = 'decimal';
        if (nextStartIndex !== null && nextStartIndex > 1) {
          newList.setAttribute('start', String(nextStartIndex));
        }
      }
    }
    itemsAfter.forEach(item => newList.appendChild(item));
    p.parentNode?.insertBefore(newList, p.nextSibling);
  }

  // Remove the current LI from parent list
  li.remove();

  // If parentList has no remaining items, remove it
  if (parentList.children.length === 0) {
    parentList.remove();
  }

  setCaretAtStart(p);
}

/**
 * Handles Backspace key inside lists.
 * Prevents text from merging awkwardly into preceding lines and allows cleanly
 * removing the 1st bullet/number/letter (1., •, a.) as well as 2nd+ items,
 * ensuring each line stays on its own line.
 */
export function handleListBackspace(editor: HTMLElement): boolean {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;

  let node: Node | null = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  const li = (node as HTMLElement)?.closest('li');
  if (!li) return false;
  const parentList = li.closest('ol, ul') as HTMLElement | null;
  if (!parentList || !editor.contains(parentList)) return false;

  // Check if caret is at the beginning of this LI
  let isAtStart = false;
  if (range.startContainer === li && range.startOffset === 0) {
    isAtStart = true;
  } else if (range.startContainer === li.firstChild && range.startOffset === 0) {
    isAtStart = true;
  } else {
    try {
      const rangeBefore = document.createRange();
      rangeBefore.setStart(li, 0);
      rangeBefore.setEnd(range.startContainer, range.startOffset);
      const textBefore = rangeBefore.toString().replace(/[\u200B\u00A0\r\n\t\s]/g, '');
      if (textBefore.length === 0) {
        isAtStart = true;
      }
    } catch {
      isAtStart = false;
    }
  }

  if (!isAtStart) {
    // Caret is inside text, let regular typing/backspace delete characters
    return false;
  }

  const isOnlyChild = parentList.children.length === 1;
  const isFirstChild = parentList.firstElementChild === li;
  const isLastChild = parentList.lastElementChild === li;

  // Non-empty or empty LI with caret at the beginning:
  // User wants to remove the list bullet/number/letter from this line without merging into previous line!
  const liHtml = li.innerHTML.trim() || '<br>';

  if (isOnlyChild) {
    const p = document.createElement('p');
    p.innerHTML = liHtml;
    parentList.parentNode?.replaceChild(p, parentList);
    setCaretAtStart(p);
    return true;
  }

  if (isFirstChild) {
    const p = document.createElement('p');
    p.innerHTML = liHtml;
    parentList.parentNode?.insertBefore(p, parentList);
    li.remove();
    setCaretAtStart(p);
    return true;
  }

  if (isLastChild) {
    const p = document.createElement('p');
    p.innerHTML = liHtml;
    parentList.parentNode?.insertBefore(p, parentList.nextSibling);
    li.remove();
    setCaretAtStart(p);
    return true;
  }

  splitListAroundLi(parentList, li, liHtml);
  return true;
}
