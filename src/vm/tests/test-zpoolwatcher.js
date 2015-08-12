// Copyright 2015 Joyent, Inc.

var bunyan = require('bunyan');
var execFile = require('child_process').execFile;

// this puts test stuff in global, so we need to tell jsl about that:
/* jsl:import ../node_modules/nodeunit-plus/index.js */
require('nodeunit-plus');

var TIMEOUT = 10 * 1000;
var DATASET = 'zones/zpoolwatcher-test-dummy-' + process.pid;

function zfs(args, cb) {
    var opts = {encoding: 'utf8'};
    execFile('zfs', args, opts, function (err, stdout, stderr) {
        if (err) {
            cb(err);
            return;
        } else if (stderr) {
            cb(new Error('stderr produced: ' + stderr));
            return;
        }
        cb(null, stdout);
    });
}

var ZpoolWatcher = require('vminfod/zpoolwatcher').ZpoolWatcher;
var log = bunyan.createLogger({
    level: 'warn',
    name: 'zpoolwatcher-test-dummy',
    streams: [ { stream: process.stderr, level: 'warn' } ],
    serializers: bunyan.stdSerializers
});
var zw = new ZpoolWatcher({log: log});

test('creating a ZFS dataset and catching the event', function (t) {
    var timeout = setTimeout(function () {
        t.ok(false, 'timeout');
        t.end();
    }, TIMEOUT);

    zw.on('all', function (ev) {
        if (ev.dsname === DATASET && ev.action === 'create'
            && ev.pool === 'zones') {
            clearTimeout(timeout);
            zw.removeAllListeners('all');
            t.end();
        }
    });

    zfs(['create', DATASET], function (err, out) {
        t.ifError(err, 'error creating dataset');
    });
});

test('modifying a ZFS dataset and catching the event', function (t) {
    var timeout = setTimeout(function () {
        t.ok(false, 'timeout');
        t.end();
    }, TIMEOUT);

    zw.on('all', function (ev) {
        if (ev.dsname === DATASET && ev.action === 'set'
            && ev.pool === 'zones' && ev.extra.atime === 'on'
            && ev.extra.sync === 'always') {

            clearTimeout(timeout);
            zw.removeAllListeners('all');
            t.end();
        }
    });

    zfs(['set', 'atime=on', 'sync=always', DATASET], function (err, out) {
        t.ifError(err, 'error modifying dataset');
    });
});

test('destroying a ZFS dataset and catching the event', function (t) {
    var timeout = setTimeout(function () {
        t.ok(false, 'timeout');
        t.end();
    }, TIMEOUT);

    zw.on('all', function (ev) {
        if (ev.dsname === DATASET && ev.action === 'destroy'
            && ev.pool === 'zones') {
            clearTimeout(timeout);
            zw.removeAllListeners('all');
            t.end();
        }
    });

    zfs(['destroy', DATASET], function (err, out) {
        t.ifError(err, 'error destroying dataset');
    });
});


test('cleanup', function (t) {
    t.ok(true, 'cleaning up');
    zw.shutdown();
    t.end();
});
