// switch for console.debug
console.debug = function() {}

var os = require('os');
// Program Parameter
if (process.argv.length !== 3) {
    console.error('This application needs argument.' + os.EOL
        + "eg. '{\"PageIds\": {\"template\": 99499848, \"context\": 99499859, \"parent\": 98012841}}'");
    process.exit(1);
}

var runtimeParameters = JSON.parse(process.argv[2]);
console.log(runtimeParameters);
let templatePageId = runtimeParameters.PageIds.template,
    contextPageId = runtimeParameters.PageIds.context,
    parentPageId = runtimeParameters.PageIds.parent;


var async = require("async");
var Confluence = require("confluence-api");
var htmlParser = require('html-parser');
const config  = require('./config');
var confluence = new Confluence(config);

var tasks = [
    function (callback) {
        confluence.getContentById(templatePageId, function (err, data) {
            if (err) {
                return callback(err);
            }
            callback(null, {
                title: data.title,
                content: data.body.storage.value
            });
        });
    },
    function (callback) {
        confluence.getContentById(contextPageId, function (err, data) {
            if (err) {
                return callback(err);
            }
            callback(null, {
                title: data.title,
                content: data.body.storage.value
            });
        });
    }
];

function postContent(param) {
    confluence.postContent(param.space, param.title, param.contents, param.parentId, function (err, data) {
        if (err) {
            if (err.status === 403) {
                console.log(err.status + ': Please check the space ID.');
            } else {
                console.log(err.status + ': ' + data.body.message);
            }
            return;
        }
        console.log(config.baseUrl + '/pages/viewpage.action?pageId=' + data.id + ' was created.');
        process.exit(1);
    }, 'storage');
}

async.parallel(tasks, function (err, results) {
    if (err) {
        console.log(err.status + ' error: ' + results.body.message);
        return;
    }
    var templateHeaderCode = results[0].title;
    var templateBodyCode = results[0].content;
    console.debug({ title: templateHeaderCode, content: templateBodyCode });
    var isTriggerCdata = false;
    htmlParser.parse(results[1].content, {
        cdata: function (value) {
            if (isTriggerCdata) {
                return;
            }
            isTriggerCdata = true;

            var contextCode = 'var contextGenerator = ' + value
            console.debug({ context: contextCode });
            eval(contextCode);
            if (typeof contextGenerator !== 'function') {
                console.info('context code should be function.')
                process.exit(1);
            }
            var context = contextGenerator();

            var Handlebars = require('handlebars');
            var templateHeader = Handlebars.compile(templateHeaderCode);
            var templateBody = Handlebars.compile(templateBodyCode);
            console.debug({ templateHeader: templateHeader, templateBody: outputBody });
            var outputTitle = templateHeader(context);
            var outputBody = templateBody(context);
            console.debug({ outputTitle: outputTitle, outputBody: outputBody });

            postContent({
                space: '~nhk',
                title: outputTitle,
                contents: outputBody,
                parentId: parentPageId
            });
        }
    });
});
