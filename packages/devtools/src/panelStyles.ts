export const panelStyles = `
[data-piant-devtools-host] { position: fixed; inset: auto 0 0; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
[data-piant-devtools-host] [hidden] { display: none !important; }
[data-piant-devtools-panel] { position: relative; box-sizing: border-box; width: 100%; box-shadow: 0 -4px 24px #0003; }
[data-piant-devtools-host] .piant-panel-content { height: 100%; min-height: 0; padding: 0; overflow: hidden; }
[data-piant-devtools-host] .piant-inspector-mount { height: 100%; min-height: 0; }
[data-piant-devtools-host] .piant-resize { position: absolute; z-index: 1; inset: -4px 0 auto; height: 8px; cursor: ns-resize; touch-action: none; }
[data-piant-devtools-host] .piant-resize::after { content: ''; display: block; margin: 3px auto; width: 40px; height: 2px; border-radius: 2px; background: #929da5; }
[data-piant-devtools-host] .piant-resize:hover::after, [data-piant-devtools-host] .piant-resize:focus-visible::after { background: #63d6a0; }
[data-piant-devtools-host] .piant-resize:focus-visible { outline: 2px solid #63d6a0; outline-offset: -2px; }
[data-piant-devtools-host] .piant-launcher { position: fixed; right: 16px; bottom: 16px; min-height: 36px; border-radius: 8px; padding: 8px 14px; font: 600 12px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; cursor: pointer; box-shadow: 0 2px 12px #0003; }
`;
