/**
 * Copyright (c) Ajay Sreedhar. All rights reserved.
 *
 * Licensed under the MIT License.
 * Please see LICENSE file located in the project root for more information.
 */

'use strict';

const childProcess = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const grunt = require('grunt');
const rimraf = require('rimraf');

const electron = require('electron');
const {build, Platform} = require('electron-builder');

const {ROOT_DIR} = require('./constant');
const {releaseConfig} = require('./builder-config');
const {configureLinuxBuild} = require('./builder-platform');

function onRendererExit(code) {
    grunt.log.writeln(`Electron exited with code ${code}.`);
}

/* eslint-disable no-console */
function cleanBuild() {
    const done = this.async();

    rimraf(path.join(ROOT_DIR, '{dist,release}'), {disableGlob: false}, (error) => {
        if (error) {
            grunt.log.errorlns([`Could not clean-up: ${error}`]);
            return false;
        }

        grunt.log.oklns(['Cleaned up output directories.']);
        done();

        return true;
    });
}

/* eslint-disable no-console */
function startRenderer() {
    const child = childProcess.spawn(electron, [ROOT_DIR, '--trace-warnings'], {
        stdio: ['pipe', process.stdout, process.stderr]
    });

    child.on('close', onRendererExit);
    child.on('exit', onRendererExit);
    child.on('SIGTERM', onRendererExit);
}

function makeRelease(platform, type) {
    let config = releaseConfig;
    let targets = Platform.WINDOWS.createTarget();

    switch (platform) {
        case 'linux':
            targets = Platform.LINUX.createTarget();
            config = configureLinuxBuild(type);
            break;

        case 'macos':
            targets = Platform.MAC.createTarget();
            break;

        default:
            break;
    }

    if (!fs.existsSync(path.join(ROOT_DIR, 'dist/platform/main.js'))) {
        grunt.fail.fatal('Project not compiled yet! Run `yarn run dist` first.', 0);
        return 0;
    }

    const done = this.async();
    const builder = build({config, targets});

    grunt.log.writeln(`Release platform: ${platform}, Type: ${type}.`);

    builder.then(() => {
        grunt.log.oklns(['Binaries written to `release` directory.']);
    });

    builder.catch((error) => {
        grunt.log.errorlns([`${error}`]);
    });

    builder.finally(() => {
        done();
    });
}

module.exports = {
    cleanBuild,
    startRenderer,
    makeRelease
};