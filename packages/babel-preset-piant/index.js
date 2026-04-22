const jsxTransform = require('babel-plugin-jsx-dom-expressions');

module.exports = (context, options = {}) => {
  const plugins = [
    [
      jsxTransform,
      Object.assign(
        {
          moduleName: '@piant/core',
          builtIns: [
            'For',
            'Show',
            'Switch',
            'Match',
            // 'Suspense',
            // 'SuspenseList',
            // 'Portal',
            'Index',
            'Dynamic',
            'ErrorBoundary',
          ],
          contextToCustomElements: true,
          wrapConditionals: true,
          generate: 'dom',
        },
        options,
      ),
    ],
  ];

  return {
    plugins,
  };
};
