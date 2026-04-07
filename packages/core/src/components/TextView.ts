import { PText } from '../elements/PText';
import {
  DEFAULT_BLOCK_PROPS,
  DEFAULT_INLINE_PROPS,
  type TextStyles,
} from '../elements/text/textStyles';
import type { Getter } from '../reactivity';
import { memo } from '../reactivity';
import { children as $children, effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { StyleSheet } from '../styleSheet';

export function collectTextViewNodes(
  childrenRoot: unknown,
  rootStyles: TextStyles,
): any[] {
  // helper: resolve any "children" input to a flattened array of items (primitives or elements),
  // resolving zero-arg getters and arrays.
  const resolveToArray = (input: unknown): any[] => {
    const out: any[] = [];
    const stack: any[] = [input];
    while (stack.length) {
      const node = stack.pop();
      if (typeof node === 'function' && !(node as Getter<any>).length) {
        stack.push((node as Getter<any>)());
        continue;
      }
      if (Array.isArray(node)) {
        // push in reverse so natural order is preserved when popping
        for (let i = node.length - 1; i >= 0; --i) stack.push(node[i]);
        continue;
      }
      out.push(node);
    }
    return out;
  };

  const nodes: any[] = [];

  // Detect element type name (works for function components and string types)
  const getTypeName = (el: any): string | undefined => {
    if (!el || typeof el !== 'object') return undefined;
    const t = el.type;
    if (typeof t === 'string') return t;
    if (typeof t === 'function')
      return (t as any).name || (t as any).displayName;
    return undefined;
  };

  const process = (item: any, inheritedStyle: any = {}) => {
    if (item == null || item === false) return;
    // resolve zero-arg getters inline
    if (typeof item === 'function' && !(item as Getter<any>).length) {
      process((item as Getter<any>)(), inheritedStyle);
      return;
    }
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; ++i) process(item[i], inheritedStyle);
      return;
    }

    // primitive text/number -> treat as a text span (outside of a leaf-span detection,
    // higher-level Span logic will decide whether to merge text)
    if (typeof item === 'string' || typeof item === 'number') {
      nodes.push({
        type: 'span',
        content: String(item),
        style: inheritedStyle,
      });
      return;
    }

    // JSX element-like object: { type, props }
    if (typeof item === 'object' && 'type' in item && 'props' in item) {
      const typeName = getTypeName(item);
      const props: any = item.props || {};

      let currentStyle = { ...inheritedStyle };
      if (props.style) {
        Object.assign(currentStyle, StyleSheet.flatten(props.style));
      }
      if (props.bold) currentStyle.fontWeight = 'bold';
      if (props.italic) currentStyle.fontStyle = 'italic';

      if (typeName === 'ImageSpan' || typeName === 'imageSpan') {
        nodes.push({ type: 'imageSpan', src: props.src, style: currentStyle });
        return;
      }

      if (typeName === 'Span' || typeName === 'span') {
        // resolve direct children of this Span
        const childItems = resolveToArray(props.children);
        // process children in order
        for (let i = 0; i < childItems.length; ++i)
          process(childItems[i], currentStyle);
        return;
      }

      // unknown element type: recurse into its children (if any) and preserve structure
      if ('children' in props) {
        process(props.children, inheritedStyle);
        return;
      }

      // otherwise ignore unknown element
      return;
    }

    // anything else: ignore
  };

  // start processing from the provided root
  const rootArr = resolveToArray(childrenRoot);
  for (let i = 0; i < rootArr.length; ++i) process(rootArr[i], rootStyles);
  return nodes;
}

export interface TextViewProps {
  style?: TextStyles | TextStyles[];
  children?: JSX.Element;
  ref?: (ref: PText) => void;
}

export function TextView(props: TextViewProps) {
  const [styleProps, childrenProps, otherProps] = splitProps(
    props,
    ['style'],
    ['children'],
  );

  const children = $children(() => childrenProps.children);

  const getTextViewStyles = () => {
    return StyleSheet.flatten([
      DEFAULT_BLOCK_PROPS,
      DEFAULT_INLINE_PROPS,
      styleProps.style,
    ]);
  };

  return () => {
    const element = new PText();

    props.ref && (props as any).ref(element);

    effect(() => {
      element.setStyle(getTextViewStyles());
    });

    effect(() => {
      console.log('TextView children changed');
      const nodes = collectTextViewNodes(children(), getTextViewStyles());
      const contents = nodes
        .map((n) => {
          if (n.type === 'span') {
            return {
              type: 'text',
              content: n.content,
              ...n.style,
            };
          }
          if (n.type === 'imageSpan') {
            return { type: 'image', src: n.src, ...n.style };
          }
          return null;
        })
        .filter(Boolean);
      element.setContents(contents);
    });

    return element;
  };
}

export function Span(props: any) {
  return memo(() => ({
    type: 'span',
    props: props,
  }));
}

export function ImageSpan(props: any) {
  return memo(() => ({
    type: 'imageSpan',
    props: props,
  }));
}
