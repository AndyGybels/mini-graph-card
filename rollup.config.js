import resolve from 'rollup-plugin-node-resolve';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

const dev = process.env.ROLLUP_WATCH;
const serveopts = {
  contentBase: ['./dist'],
  host: '0.0.0.0',
  port: 5000,
  allowCrossOrigin: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

export default {
  input: 'dist/main.js',
  output: {
    file: 'dist/mini-graph-card-bundle.js',
    format: 'iife',
    name: 'MiniGraphCard',
    sourcemap: dev ? 'inline' : false,
  },
  plugins: [
    resolve({
      browser: true,
      extensions: ['.js'],
    }),
    commonjs(),
    json({
      include: 'package.json',
      preferConst: true,
    }),
    !dev && babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      extensions: ['.js'],
    }),
    dev && serve(serveopts),
  ].filter(Boolean),
};
