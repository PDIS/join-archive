const JOIN_URL = 'http://join.gov.tw';
const JOIN_COMPLETED_URL = JOIN_URL + '/idea/index/search/COMPLETED?page=1&size=99999';
const JOIN_DETAIL_URL = JOIN_URL + '/idea/detail/';
const JOIN_SUGGESTION_URL = JOIN_URL + '/idea/export/endorse/suggestion/';
const ENDORSES_JSON = 'endorses.json';
const SUGGESTIONS_CSV = 'suggestions.csv';

var system = require('system');
var page = require('webpage').create();
var fs = require('fs');
var process = require("child_process");

var ENDORSES = [];

page.viewportSize = { width: 1024, height: 768 };

console.log("Crawling Satrt ...")

execute();

function execute() {
    page.open(JOIN_COMPLETED_URL, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        }
        else {

            ENDORSES = page.evaluate(function () { return searchResult.result });
            ENDORSES = ENDORSES.map(function (endorse) { return cleanObject(endorse) });
            fs.write(ENDORSES_JSON, JSON.stringify(ENDORSES, null, 2), 'w');
            console.log('Get ' + ENDORSES.length + ' endorses...');

            if (ENDORSES.length > 0) {
                getProjectContent(0);
            } else {
                console.log('Something wrong, no project on list');
                finish();
            }

        }
    });
}

function getProjectContent(current) {
    console.log(JOIN_DETAIL_URL + ENDORSES[current].id);
    var link = JOIN_DETAIL_URL + ENDORSES[current].id;
    page.open(link, function (status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            waitFor(
                function () {
                    endorse = page.evaluate(function () { return idea });
                    fs.makeDirectory(ENDORSES[current].id);
                    fs.write(ENDORSES[current].id + '/endorse.json', JSON.stringify(endorse, null, 2), 'w');
                    downloadCSV(ENDORSES[current].id);
                },
                function () {
                    console.log("get " + ENDORSES[current].title + " content success.");
                    if (current < ENDORSES.length - 1) {
                        getProjectContent(current + 1);
                    } else {
                        console.log("Get " + ENDORSES.length + " endorses content. Job done.");
                        finish();
                    }
                });
        }
    });
}

function downloadCSV(id) {
    var execFile = process.execFile;
    execFile("curl", ["-XGET", JOIN_SUGGESTION_URL + id], null, function (err, stdout, stderr) {
    fs.write(id + '/' + SUGGESTIONS_CSV, stdout, 'w');
    console.log("execFileSTDERR:", stderr);
    })
}

function cleanObject(object) {
    for (key in object) {
        if (object[key] === null || object[key].length === 0)
            delete object[key];
    }
    return object;
}

function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 5000,
        start = new Date().getTime(),
        condition = -1,
        interval = setInterval(function () {
            if ((new Date().getTime() - start < maxtimeOutMillis) && condition < 0) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof (testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
                if (condition === true) condition = 0;
                if (condition === false) condition = -1;
            } else {
                if (condition < 0) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    console.log(onReady);
                    page.render('waitfor.png');
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    //console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    var func;
                    if (onReady instanceof Array) {
                        func = onReady[condition];
                    } else {
                        func = onReady;
                    }
                    typeof (func) === "string" ?
                        eval(func) : func(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat waitForCheckbox every 250ms
};

function finish() {
    execFile("ls", ["-lF", "/usr"], null, function (err, stdout, stderr) {
        console.log("execFileSTDOUT:", JSON.stringify(stdout))
        console.log("execFileSTDERR:", JSON.stringify(stderr))
    })
    phantom.exit();
}