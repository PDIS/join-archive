const JOIN_URL = 'http://join.gov.tw';

const JOIN_COMPLETED_URL = JOIN_URL + '/idea/index/search/COMPLETED?size=2000';
const JOIN_ENDORSING_URL = JOIN_URL + '/idea/index/search/ENDORSING?size=2000&status=FirstSigned';

const ARCHIVE_FOLDER = 'archive/';
const COMPLETED_ARCHIVE_FOLDER = ARCHIVE_FOLDER + 'completed/';
const ENDORSING_ARCHIVE_FOLDER = ARCHIVE_FOLDER + 'endorsing/';

const JOIN_DETAIL_URL = JOIN_URL + '/idea/detail/';
const JOIN_SUGGESTION_URL = JOIN_URL + '/idea/export/endorse/suggestion/';
const ENDORSES_JSON = 'endorses.json';

const JOB_URL = [JOIN_COMPLETED_URL, JOIN_ENDORSING_URL];
const JOB_FOLDER = [COMPLETED_ARCHIVE_FOLDER, ENDORSING_ARCHIVE_FOLDER];

var system = require('system');
var page = require('webpage').create();
var fs = require('fs');
var process = require("child_process");
var JOB_INDEX = 0;
var ENDORSES = [];

page.viewportSize = { width: 1024, height: 768 };

console.log("Delete previous data")

console.log("Crawling Start ...")

fs.makeDirectory(ARCHIVE_FOLDER);

execute();

// 執行每一項工作，目前工作有「已完成附議的議題」與「附議中的議題」
function execute() {

    if (JOB_INDEX === JOB_URL.length) {
        finish();
    }

    //為避免沒有資料夾，先建立工作相對應的資料夾
    fs.makeDirectory(JOB_FOLDER[JOB_INDEX]);

    page.open(JOB_URL[JOB_INDEX], function(status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            // 取得searchResult，這個是在JOIN頁面上可以直接取得的物件，工程師留的禮物ＸＤ
            ENDORSES = page.evaluate(function() { return searchResult.result });
            ENDORSES = ENDORSES.map(function(endorse) { return cleanObject(endorse) });
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

// 採用遞迴的方式把每一個提案的資訊抓回來，因為JS會異步執行，所以採用遞迴作法
function getProjectContent(current) {
    console.log(JOIN_DETAIL_URL + ENDORSES[current].id);
    var link = JOIN_DETAIL_URL + ENDORSES[current].id;
    page.open(link, function(status) {
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            waitFor(
                function() {
                    // idea也是JOIN工程師留的禮物ＸＤ，集中放到ENDORSE變數，最後存成一個大JSON
                    endorse = page.evaluate(function() { return idea });
                    ENDORSES[current] = endorse;
                    //但是對每個提案，個別下載附議名單
                    downloadCSV(ENDORSES[current].id);
                },
                function() {
                    console.log("get " + (current + 1) + "/" + ENDORSES.length + " " + ENDORSES[current].title + " content success.");
                    if (current < ENDORSES.length - 1) {
                        //要等，不然會被JOIN擋掉....
                        setTimeout(
                            function() { //不知道為什麼不用function包起來就不會睡...
                                getProjectContent(current + 1);
                            }, 1000);
                    } else {
                        console.log("Get " + ENDORSES.length + " endorses content. Job done.");
                        // 工作完成，把大JSON寫進檔案
                        fs.write(JOB_FOLDER[JOB_INDEX] + '/' + ENDORSES_JSON, JSON.stringify(ENDORSES, null, 2), 'w');
                        // 休息10秒後，繼續下一個工作
                        setTimeout(
                            function() {
                                JOB_INDEX += 1;
                                execute();
                            }, 10000);
                    }
                });
        }
    });
}

function downloadCSV(id) {
    var execFile = process.execFile;
    execFile("curl", ["-XGET", JOIN_SUGGESTION_URL + id], null, function(err, stdout, stderr) {
        fs.write(JOB_FOLDER[JOB_INDEX] + '/' + id + '.csv', stdout, 'w');
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
        interval = setInterval(function() {
            if ((new Date().getTime() - start < maxtimeOutMillis) && condition < 0) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
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
                    typeof(func) === "string" ?
                    eval(func): func(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat waitForCheckbox every 250ms
};

function finish() {
    // 全部結束 寫入日期 關閉phantomjs
    fs.write(ARCHIVE_FOLDER + 'UPDATE_TIMESTAMP', new Date().toLocaleString(), 'w');
    phantom.exit();
}