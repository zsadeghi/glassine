const ChildProcess = require('child_process');
const tmp = require('tmp-promise');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const wget = require('wget-improved');
const cliProgress = require('cli-progress');
const filesize = require('filesize');
const mcopy = require('mcopy');

const base = path.resolve('/', 'var', 'glassine');

class Glassine {

    async fetch(origin) {
        await mkdirp(base);
        let imageName = origin.replace(/^.*?:\/\//, '');
        let tld = imageName.split('/', 2)[0].split('.').reverse().join('.');
        let object = imageName.split('/').splice(1).filter(s => s !== '').join('.');
        imageName = tld + ':' + object;
        let imagePath = path.resolve(base, 'images', tld + '#' + object);
        if (!fs.existsSync(imagePath) || !fs.existsSync(path.resolve(imagePath, 'vmlinux')) || !fs.existsSync(path.resolve(imagePath, 'rootfs.ext4'))) {
            await mkdirp(imagePath);
            console.log('No local version of this object was found: ' + imageName);
            const multiBar = new cliProgress.MultiBar({
                clearOnComplete: true,
                hideCursor: true,
                noTTYOutput: true,
                barsize: 35,
                etaBuffer: 150,
                fps: 1,
                format: '{target} [{bar}] | {size} | ETA: {eta}s'
            }, cliProgress.Presets.shades_grey);
            let tasks = [];
            if (!fs.existsSync(path.resolve(imagePath, 'vmlinux'))) {
                tasks.push(this._download(multiBar, origin, imagePath, 'vmlinux'));
            }
            if (!fs.existsSync(path.resolve(imagePath, 'rootfs.ext4'))) {
                tasks.push(this._download(multiBar, origin, imagePath, 'rootfs.ext4'));
            }
            return Promise.allSettled(tasks).then(() => {
                multiBar.stop();
            });
        }
        return Promise.resolve();
    }

    async resize(source, target, size) {
        const multiBar = new cliProgress.MultiBar({
            clearOnComplete: true,
            hideCursor: true,
            noTTYOutput: true,
            stopOnComplete: true,
            barsize: 35,
            etaBuffer: 150,
            fps: 10,
            format: '{target} [{bar}] | {size} | ETA: {eta}s'
        }, cliProgress.Presets.shades_grey);
        await this._copyFiles(multiBar, [{
            src: source,
            dest: target
        }]);
        let resize = multiBar.create(1, 0);
        resize.update(0, {
            target: 'resize',
            size: size
        });
        ChildProcess.execSync('/usr/bin/truncate -s ' + size + ' ' + target);
        resize.update(1);
    }

    _copyFiles(multiBar, operations) {
        let bars = {};
        operations.map(op => [op.src, multiBar.create(0, 0)]).forEach(def => {
            bars[def[0]] = def[1];
        });
        return new Promise((resolve, reject) => {
            mcopy(operations)
                .on('error', reject)
                .on('success', resolve)
                .on('progress', (progress) => {
                    bars[progress.file.src].setTotal(progress.fileBytesTotal);
                    bars[progress.file.src].update(progress.fileBytesCopied, {
                        target: path.basename(progress.file.src),
                        size: filesize(progress.fileBytesTotal)
                    });
                });

        });
    }

    _download(multiBar, origin, imagePath, file) {
        return new Promise((resolve, reject) => {
            const progressBar = multiBar.create(100, 0);
            let download = wget.download((origin + '/' + file).replace(/([^:])\/{2,}/g, '$1/'), path.resolve(imagePath, file));
            download.on('error', reject);
            download.on('end', resolve);
            download.on('start', (size) => {
                progressBar.update(0, {size: this._strLimit(filesize(size)), target: this._strLimit(file)});
            });
            download.on('progress', (progress) => {
                progressBar && progressBar.update(Math.round(progress * 10000) / 100);
            });
        });
    }

    _strLimit(value) {
        value = value.substring(0, Math.min(14, value.length));
        value += '              '.substring(0, 14 - value.length);
        return value;
    }

}

module.exports = new Glassine();