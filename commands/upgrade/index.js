'use strict';

const erector = require('erector-set');
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawnSync;

const utilities = require('../utilities');

module.exports = (rootDir) => {
    const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    const latestVersion = checkLibrarianVersion(npmCommand);

    if (latestVersion) {
        installLibrarian(npmCommand, latestVersion);
    }

    erector.inquire([
        {
            allowBlank: true,
            name: 'proceed',
            question: 'The following will overwrite some of the files in your project. Would you like to continue (y/N)?',
            transform: utilities.createYesNoValue('n', [])
        }
    ]).then((answers) => {
        if (answers[0].answer) {
            updateFiles(rootDir);
        } else {
            console.info('    Upgrade cancelled');
        }
    });
};

const checkLibrarianVersion = (npm) => {
    console.info('Identifying the *newest* angular-librarian version');
    const available = execute(npm, ['show', 'angular-librarian', 'version']);
    console.info('Identifying the *installed* angular-librarian version');
    const installed = parseInstalledVersion(execute(npm, ['list', '--depth=0', 'angular-librarian']));
    const update = require('semver').gt(available, installed);

    console.info(`\tUpdate of angular-librarian is ${ update ? '' : 'NOT ' }required.`);

    return update ? available : undefined;
};

const parseInstalledVersion = (installed) => {
    const lines = installed.split(/\r?\n/);
    const librarianLine = lines.find((line) => line.indexOf('angular-librarian@') !== -1);
    let version;

    if (librarianLine) {
        version = librarianLine.match(/\bangular-librarian@[^\s]+\s?/) || [''];
        version = version[0].trim().replace('angular-librarian@', '');
    }

    if (!version || version === '(empty)') {
        throw new Error('Angular Librarian is not installed. Not sure how that\'s possible!\n\n\tRun `npm i -D angular-librarian` to install');
    }

    return version;
};

const installLibrarian = (npm, version) => {
    console.info(`    Installing angular-librarian@${ version }`);
    execute(npm, ['i', '-D', `angular-librarian@${ version }`]);
}

const execute = (command, args) => {
    const result = spawn(command, args || [], { stdio: 'pipe' });

    return result && result.stdout && result.stdout.toString().trim();
};

const updateFiles = (rootDir, tempDir) => {
    console.info('    Updating managed files to latest versions');
    const answers = JSON.parse(fs.readFileSync(path.resolve(rootDir, '.erector'), 'utf8'));
    const srcDir = path.resolve(rootDir, 'src');
    const files = [
        { destination: path.resolve(rootDir, '.gitignore'), name: '__gitignore', update: updateFlatFile },
        { destination: path.resolve(rootDir, '.npmignore'), name: '__npmignore', update: updateFlatFile },
        { name: 'DEVELOPMENT.md' },
        { name: 'karma.conf.js', overwrite: true },
        { name: 'package.json', update: updatePackageJson },
        /*
            the TypeScript files should be 'json', but array merging
            on JSON duplicates values so ['es6', 'dom'] merged
            from two files would be ['es6', 'dom', 'es6', 'dom']
        */
        { name: 'tsconfig.es5.json', overwrite: true },
        { name: 'tsconfig.es2015.json', overwrite: true },
        { name: 'tsconfig.json', overwrite: true },
        { name: 'tsconfig.test.json', overwrite: true },
        { name: 'tslint.json', overwrite: true },
        { destination: path.resolve(srcDir, 'test.js'), name: 'src/test.js', overwrite: true },
        { name: 'tasks/build.js', overwrite: true },
        { name: 'tasks/copy-build.js', overwrite: true },
        { name: 'tasks/copy-globs.js', overwrite: true },
        { name: 'tasks/inline-resources.js', overwrite: true },
        { name: 'tasks/rollup.js', overwrite: true },
        { name: 'tasks/test.js', overwrite: true },
        { name: 'webpack/webpack.common.js', overwrite: true },
        { name: 'webpack/webpack.dev.js', overwrite: true },
        { name: 'webpack/webpack.test.js', overwrite: true },
        { name: 'webpack/webpack.utils.js', overwrite: true }
    ];
    const templates = utilities.getTemplates(rootDir, path.resolve(__dirname, '..', 'initial'), files);

    erector.construct(answers, templates);
};

const updatePackageJson = (existing, replacement) => {
    const merged = JSON.parse(erector.updaters.json(existing, replacement));
    const exist = JSON.parse(existing);

    // attributes handled by ngl that
    // the user may have modified
    merged.author = exist.author;
    merged.description = exist.description;
    merged.es2015 = exist.es2015;
    merged.keywords = exist.keywords;
    merged.license = exist.license;
    merged.main = exist.main;
    merged.module = exist.module;
    merged.name = exist.name;
    merged.repository = exist.repository;
    merged.typings = exist.typings;
    merged.version = exist.version;

    return JSON.stringify(merged, null, 2);
};

const updateFlatFile = (existing, replacement) => {
    const newline = /\r\n/.test(replacement) ? '\r\n' : '\n';
    const replaceLines = replacement.split(/\r?\n/g);
    const missingLines = existing.split(/\r?\n/g).filter((line) =>
        replaceLines.indexOf(line) === -1
    );

    return replaceLines.concat(missingLines).join(newline);
}
