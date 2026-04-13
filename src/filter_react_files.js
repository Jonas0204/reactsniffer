const fs = require('fs');
// const dir = require('node-dir');
const read_files = require('./utils/read_files');
const ast_generator = require('./generate_ast');

// Recursively check whether an AST node contains JSX elements or fragments.
function hasJSX(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (hasJSX(item)) return true;
    }
    return false;
  }
  for (const val of Object.values(node)) {
    if (val !== null && typeof val === 'object' && hasJSX(val)) return true;
  }
  return false;
}

module.exports = function (dirname) {
  files = read_files.get_files(dirname);

  const react_files = [];
  files.forEach(function (filepath) {
    sourceCode = fs.readFileSync(filepath, 'utf-8');

    let ast = null;
    let error = false;
    try {
      // Generating ast representation of the source code
      ast = JSON.parse(ast_generator(sourceCode));
    } catch (err) {
      // handle the error safely
    }

    if (!ast) {
      try {
        // Generating ast representation of the source code using flow parser as fallback
        ast = JSON.parse(ast_generator(sourceCode, 'flow'));
      } catch (err) {
        // handle the error safely
        // console.log("Invalid json passed: ", filepath);
      }
    }

    // Skip files that could not be parsed at all
    if (!ast) return;

    ast['imports'] = [];

    //Filtering react files
    if (ast.hasOwnProperty('program') && ast['program'].hasOwnProperty('body')) {
      for (var [key, body] of Object.entries(ast['program']['body'])) {
        if (body.hasOwnProperty('specifiers')) {
          // Detect any import from the 'react' package
          var isReactImport = body['source'] && body['source']['value'] === 'react';
          for (var [key, specifier] of Object.entries(body['specifiers'])) {
            if (
              isReactImport &&
              (specifier['type'] == 'ImportDefaultSpecifier' ||
                specifier['type'] == 'ImportNamespaceSpecifier') &&
              specifier['local']['name'].toLowerCase() == 'react'
            ) {
              ast['url'] = filepath;
              ast['number_of_lines'] = ast['loc']['end']['line'] - ast['loc']['start']['line'] + 1;
            } else if (
              specifier['type'] == 'ImportSpecifier' ||
              specifier['type'] == 'ImportDefaultSpecifier'
            ) {
              ast['imports'].push(specifier['local']['name']);
            }
          }

          // Detect files that import from 'react' without a default React import
          // (e.g. "import { useState } from 'react'").
          if (
            !ast.hasOwnProperty('url') &&
            body.hasOwnProperty('source') &&
            body['source'] &&
            body['source']['value'] === 'react'
          ) {
            ast['url'] = filepath;
            ast['number_of_lines'] = ast['loc']['end']['line'] - ast['loc']['start']['line'] + 1;
          }
        } else if (body.hasOwnProperty('declarations')) {
          for (var [key, declarations] of Object.entries(body['declarations'])) {
            if (
              declarations['type'] == 'VariableDeclarator' &&
              declarations.hasOwnProperty('id') &&
              declarations['id'].hasOwnProperty('name') &&
              declarations['id']['name'].toLowerCase() == 'react'
            ) {
              // var dict = {};
              // dict[filepath] = ast;
              ast['url'] = filepath;
              ast['number_of_lines'] = ast['loc']['end']['line'] - ast['loc']['start']['line'] + 1;
            }
          }
        }
      }

      // Detect files that contain JSX but have no explicit React import at all
      if (!ast.hasOwnProperty('url') && hasJSX(ast['program'])) {
        ast['url'] = filepath;
        ast['number_of_lines'] = ast['loc']['end']['line'] - ast['loc']['start']['line'] + 1;
      }

      if (ast.hasOwnProperty('url')) {
        react_files.push(ast);
      }
    }
  });

  return react_files;
};
