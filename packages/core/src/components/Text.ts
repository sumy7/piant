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
import type { StyleValue } from '../styleSheet';
import { StyleSheet } from '../styleSheet';
import type { ComponentChild, ComponentValue, RefCallback } from './types';
import type { ImageSource } from '../elements/text';

type TextElementLike = {
  type: string | { name?: string; displayName?: string };
  props?: {
    style?: StyleValue<TextStyles>;
    bold?: boolean;
    italic?: boolean;
    src?: string;
    children?: ComponentChild;
  } & Record<string, ComponentValue | ComponentValue[]>;
};

type TextViewNode =
  | { type: 'span'; content: string; style: TextStyles }
  | { type: 'imageSpan'; src: string; style: TextStyles };

const isZeroArgGetter = (
  value: ComponentChild,
): value is Getter<ComponentChild> =>
  typeof value === 'function' && !value.length;

const isTextElementLike = (value: ComponentChild): value is TextElementLike =>
  !!value && typeof value === 'object' && 'type' in value && 'props' in value;

export function collectTextViewNodes(
  childrenRoot: ComponentChild,
  rootStyles: TextStyles,
): TextViewNode[] {
  // helper: resolve any "children" input to a flattened array of items (primitives or elements),
  // resolving zero-arg getters and arrays.
  const resolveToArray = (input: ComponentChild): ComponentChild[] => {
    const out: ComponentChild[] = [];
    const stack: ComponentChild[] = [input];
    while (stack.length) {
      const node = stack.pop();
      if (node === undefined) {
        continue;
      }
      if (isZeroArgGetter(node)) {
        stack.push(node());
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

  const nodes: TextViewNode[] = [];

  // Detect element type name (works for function components and string types)
  const getTypeName = (el: TextElementLike): string | undefined => {
    if (!el || typeof el !== 'object') return undefined;
    const t = el.type;
    if (typeof t === 'string') return t;
    if (typeof t === 'object') return t.name || t.displayName;
    return undefined;
  };

  const process = (item: ComponentChild, inheritedStyle: TextStyles = {}) => {
    if (item == null || item === false) return;
    // resolve zero-arg getters inline
    if (isZeroArgGetter(item)) {
      process(item(), inheritedStyle);
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
    if (isTextElementLike(item)) {
      const typeName = getTypeName(item);
      const props = item.props || {};

      let currentStyle: TextStyles = { ...inheritedStyle };
      if (props.style) {
        Object.assign(currentStyle, StyleSheet.flatten(props.style));
      }
      if (props.bold) currentStyle.fontWeight = 'bold';
      if (props.italic) currentStyle.fontStyle = 'italic';

      if (typeName === 'Img' || typeName === 'img') {
        nodes.push({
          type: 'imageSpan',
          src: typeof props.src === 'string' ? props.src : '',
          style: currentStyle,
        });
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

export interface TextProps {
  style?: StyleValue<TextStyles>;
  children?: ComponentChild;
  ref?: RefCallback<PText>;
}

export interface SpanProps {
  style?: StyleValue<TextStyles>;
  bold?: boolean;
  italic?: boolean;
  children?: ComponentChild;
}

export interface ImgProps {
  src?: ImageSource | null;
  style?: StyleValue<TextStyles>;
}

export function Text(props: TextProps) {
  const [styleProps, childrenProps] = splitProps(
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

    props.ref?.(element);

    effect(() => {
      element.setStyle(getTextViewStyles());
    });

    effect(() => {
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

export function Span(props: SpanProps) {
  return memo(() => ({
    type: 'span',
    props: props,
  }));
}

export function Img(props: ImgProps) {
  return memo(() => ({
    type: 'imageSpan',
    props: props,
  }));
}
