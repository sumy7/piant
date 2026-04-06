import { PComment } from '../elements/PComment';
import { PNode } from '../elements/PNode';
import { PText } from '../elements/PText';
import { createPTextNode } from '../elements/pom';
import { effect, root } from '../reactivity/effects';
import { reconcileArrays } from './domdiff';

export function insert(
  parent: PNode,
  accessor: any,
  marker?: any,
  initial?: any,
) {
  if (marker !== undefined && !initial) {
    initial = [];
  }
  if (typeof accessor !== 'function') {
    return insertExpression(parent, accessor, initial, marker);
  }
  effect(
    (current) => insertExpression(parent, accessor(), current, marker),
    initial,
  );
}

export function insertExpression(
  parent: PNode,
  value: any,
  current: any,
  marker?: any,
  unwrapArray?: any,
) {
  console.log('[insertExpression]', { parent, value, current, marker });
  while (typeof current === 'function') {
    current = current();
  }
  if (value === current) {
    return current;
  }

  const t = typeof value;
  const multi = marker !== undefined;

  if (t === 'string' || t === 'number') {
    // todo textNode
    console.warn('[insertExpression]text value', value);
    console.warn('Text nodes must wrapped in <Text /> node');
  } else if (value == null || t === 'boolean') {
    console.info('[insertExpression]boolean value', value);
    current = cleanChildren(parent, current, marker);
  } else if (t === 'function') {
    console.log('[insertExpression]function value', value);
    effect(() => {
      let v = value();
      while (typeof v === 'function') {
        v = v();
      }
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    console.log('[insertExpression]array value', value);
    const array: any[] = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      effect(() => {
        current = insertExpression(parent, array, current, marker, true);
      });
      return () => current;
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) {
        return current;
      }
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else {
        reconcileArrays(parent, current, array);
      }
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value instanceof PNode) {
    console.info('[insertExpression]PNode value', value);
    if (Array.isArray(current)) {
      if (multi) {
        current = cleanChildren(parent, current, marker, value);
        return current;
      }
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === '' || !parent.firstChild) {
      parent.appendChild(value);
    } else {
      parent.replaceChild(value, parent.firstChild);
    }
    current = value;
  } else {
    console.warn('Unrecognized value. Skipped inserting', value);
  }
  return current;
}

export function render(code: () => any, element: PNode) {
  let disposer: () => void;
  root((dispose) => {
    disposer = dispose;
    insert(element, code());
  });
  return disposer!;
}

function normalizeIncomingArray(
  normalized: any[],
  array: any[],
  current: any[],
  unwrap?: boolean,
): boolean {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i];
    const prev = current && current[i];
    if (item == null || item === true || item === false) {
      // matches null, undefined, true or false skip
    } else if (typeof item === 'object' && item instanceof PNode) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (item.call) {
      if (unwrap) {
        while (typeof item === 'function') {
          item = item();
        }
        dynamic =
          normalizeIncomingArray(
            normalized,
            Array.isArray(item) ? item : [item],
            Array.isArray(prev) ? prev : [prev],
          ) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      // todo not support directly insert text node
      const value = String(item);
      if (
        prev &&
        prev instanceof PText &&
        prev._textContent.length === 1 &&
        prev._textContent[0]?.type === 'text' &&
        prev._textContent[0].content === value
      ) {
        normalized.push(prev);
      } else {
        normalized.push(createPTextNode(value));
      }
    }
  }
  return dynamic;
}

function cleanChildren(
  parent: PNode,
  current?: PNode[],
  marker?: PNode | null,
  replacement?: PNode,
): string | PNode[] {
  if (marker === undefined) {
    parent.removeAllChildren();
    return '';
  }
  const node = replacement || new PComment();
  if (current?.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) {
          isParent
            ? parent.replaceChild(node, el)
            : parent.insertBefore(node, marker);
        } else {
          isParent && el.remove();
        }
      } else {
        inserted = true;
      }
    }
  } else {
    parent.insertBefore(node, marker);
  }
  return [node];
}

function appendNodes(
  parent: PNode,
  array: PNode[],
  marker: null | PNode = null,
) {
  for (let i = 0, len = array.length; i < len; i++) {
    parent.insertBefore(array[i], marker);
  }
}
