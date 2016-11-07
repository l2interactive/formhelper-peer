import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';

const pkg = require('./package.json');
const external = Object.keys(pkg.dependencies);

const globals = {
  jquery: 'jQuery',
  'cookies-js': 'Cookies',
  porthole: 'Porthole',
  formhelper: 'formHelper'
}

export default {
  entry: 'src/index.js',
  plugins: [
    babel(babelrc())
  ],
  external: external,
  targets: [
    {
      dest: pkg['main'],
      format: 'umd',
      moduleName: 'formhelper-peer-iframe',
      sourceMap: true,
      globals
    },
    {
      dest: pkg['jsnext:main'],
      format: 'es',
      sourceMap: true,
      globals
    }
  ]
};
