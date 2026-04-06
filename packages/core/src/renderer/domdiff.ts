import type { PNode } from '../elements/PNode';

export function reconcileArrays(parentNode: PNode, a: PNode[], b: PNode[]) {
  const bLength = b.length;
  let aEnd = a.length,
    bEnd = bLength,
    aStart = 0,
    bStart = 0,
    map: Map<PNode, number> | null = null;
  const after = a[aEnd - 1].nextSibling;

  while (aStart < aEnd || bStart < bEnd) {
    // common prefix
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    // common suffix
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    // append
    if (aEnd === aStart) {
      const node =
        bEnd < bLength
          ? bStart
            ? b[bStart - 1].nextSibling
            : b[bEnd - bStart]
          : after;

      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
      // remove
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) {
          a[aStart].remove();
        }
        aStart++;
      }
      // swap backward
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);

      a[aEnd] = b[bEnd];
      // fallback to map
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) {
          map.set(b[i], i++);
        }
      }

      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
            sequence = 1,
            t: number | undefined;

          while (++i < aEnd && i < bEnd) {
            const t = map.get(a[i]);
            if (t == null || t !== index + sequence) {
              break;
            }
            sequence++;
          }

          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) {
              parentNode.insertBefore(b[bStart++], node);
            }
          } else {
            parentNode.replaceChild(b[bStart++], a[aStart++]);
          }
        } else {
          aStart++;
        }
      } else {
        a[aStart++].remove();
      }
    }
  }
}
