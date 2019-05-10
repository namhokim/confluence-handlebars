// switch for console.debug
console.debug = function() {}

var os = require('os');
// Program Parameter
if (process.argv.length !== 3) {
    console.error('This application needs argument.' + os.EOL
        + "eg. node view.js 119159940");
    process.exit(1);
}

let pageId = Number(process.argv[2])
console.log(`pageId: ${pageId}`);

var async = require("async");
var Confluence = require("confluence-api");
var htmlParser = require('html-parser');
const config  = require('./config');
var confluence = new Confluence(config);

var tasks = [
    function (callback) {
        confluence.getContentById(pageId, function (err, data) {
            if (err) {
                return callback(err);
            }
            callback(null, {
                title: data.title,
                content: data.body.storage.value
            });
        });
    },
];

async.parallel(tasks, function (err, results) {
    if (err) {
        console.log(err.status + ' error: ' + results.body.message);
        return;
    }
    var templateHeaderCode = results[0].title;
    var templateBodyCode = results[0].content;

    console.log(`title: ${templateHeaderCode}`);
    console.log(`body: ${templateBodyCode}`);
});
