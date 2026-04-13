const babelParser = require('@babel/parser');

const commonPlugins = [
  'asyncGenerators',
  'bigInt',
  'classPrivateMethods',
  'classPrivateProperties',
  'classProperties',
  ['decorators', { decoratorsBeforeExport: false }],
  'doExpressions',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'functionBind',
  'functionSent',
  'importMeta',
  'jsx',
  'logicalAssignment',
  'nullishCoalescingOperator',
  'numericSeparator',
  'objectRestSpread',
  'optionalCatchBinding',
  'optionalChaining',
  ['pipelineOperator', { proposal: 'minimal' }],
  'throwExpressions',
];

module.exports = function (source_code, type_checker = 'typescript') {
  const typePlugins = type_checker === 'typescript' ? ['typescript'] : ['flow', 'flowComments'];

  const ast = babelParser.parse(source_code, {
    sourceType: 'module',
    plugins: [...commonPlugins, ...typePlugins],
  });

  return JSON.stringify(ast);
};
