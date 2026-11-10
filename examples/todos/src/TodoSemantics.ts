import { createContext, onCleanup, useContext } from '@piant/core';

const TodoDOMContext = createContext<HTMLElement>();

/** Keep native controls in visual order without changing Pixi DOM transforms. */
export function createTodoGroup(parent = useContext(TodoDOMContext)) {
  const group = document.createElement('div');
  group.style.display = 'contents';
  parent?.append(group);
  onCleanup(() => group.remove());
  return group;
}

export function adoptTodoDOM(host: HTMLElement) {
  useContext(TodoDOMContext)?.append(host);
}

export function TodoSemantics(props: {
  group: HTMLElement;
  children: () => unknown;
}) {
  return TodoDOMContext.Provider({
    value: props.group,
    children: props.children,
  });
}
