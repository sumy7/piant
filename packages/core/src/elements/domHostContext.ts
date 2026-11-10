import { createContext } from '../reactivity/context';

/** Renderer-origin DOM group for content rendered into an existing Canvas. */
export const DOMHostContext = createContext<HTMLElement>();
