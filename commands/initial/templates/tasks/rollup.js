'use strict';

const erectorUtils = require('erector-set/src/utils');
const fs = require('fs-extra');
const librarianUtils = require('angular-librarian/commands/utilities');
const path = require('path');
const rollup = require('rollup');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const rollupUglify = require('rollup-plugin-uglify');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');


const globals = {
    '@angular/core': 'ng.core',
    '@angular/common': 'ng.common',
    '@angular/compiler': 'ng.compiler',
    '@angular/platform-browser': 'ng.platformBrowser',
    'rxjs/Observable': 'Rx',
    'rxjs/ReplaySubject': 'Rx',
    'rxjs/add/operator/map': 'Rx.Observable.prototype',
    'rxjs/add/operator/mergeMap': 'Rx.Observable.prototype',
    'rxjs/add/observable/fromEvent': 'Rx.Observable',
    'rxjs/add/observable/of': 'Rx.Observable',
};

const doRollup = (libName, dirs) => {
    const es5Entry = path.resolve(dirs.dist, `index.js`);
    const baseConfig = generateConfig({
        entry: es5Entry,
        dest: 'dist/bundles/ngdeepmap.umd.js',
        sourceMap: true,
        format: 'umd',
        moduleName: librarianUtils.dashToCamel(libName),
        plugins: [
            rollupSourcemaps(),
            resolve({jsnext: true, main: true}),
            commonjs(),
        ],
        external: Object.keys(globals),
        globals: globals
    }, dirs.root);
    const hdmiConfig = Object.assign({}, baseConfig, {});

    const bundles = [
        hdmiConfig
    ].map((config) =>
        rollup.rollup(config).then((bundle) =>
            bundle.write(config)
        )
    );

    return Promise.all(bundles);
};
const generateConfig = (base, rootDir) => {
    // const customLocation = path.resolve(rootDir, 'configs', 'rollup.config.js');
    //
    // if (fs.existsSync(customLocation)) {
    //     const custom = require(customLocation);
    //     const external = (custom.external || []).filter((external) => base.external.indexOf(external) === -1);
    //
    //     base.external = base.external.concat(external);
    //     base.globals = erectorUtils.mergeDeep(custom.globals, base.globals);
    //     base.plugins = erectorUtils.mergeDeep(custom.plugins, base.plugins);
    // }

    return base;
};

module.exports = doRollup;
