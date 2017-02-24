const JOIN_URL = 'https://join.gov.tw';

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

const GOV_DAY = 60;
const ENDORSE_COUNT = 5000;
/* Rocket.Chat Bot Configuration below */
const CONF_FILE = 'Crawler.conf';
/* webkey uri before # + /hooks/ + Webhook Token */
const ROCKETCHAT_WEBHOOK_URL = 'rocketchatWebhookUrl';
/* webkey uri after # */
const BEARER_TOKEN = 'bearerToken';
/* bot exec hours */
const CRON_HOURS = 'cronHours';
const GOV_NOTIFY_DAY = 'govNotifyDay';
const ENDORSE_NOTIFY_COUNT = 'endorseNotifyCount';
const CHANNEL = 'channel';
const USERNAME = 'username';
const APPROVED_NOTIFY_HOURS = 'approvedNotifyHours';

var system = require('system');
var page = require('webpage').create();
var fs = require('fs');
var process = require("child_process");
var JOB_INDEX = 0;
var ENDORSES = [];

var GOOD_MSG0 = '';
var GOOD_MSG1_ENDORSE = '';
var GOOD_MSG1_APPROVED = '';
var fConfig = null;
var now = new Date();
var hours = now.getHours();
var today = now.setHours(0, 0, 0, 0);

init();
console.log(CRON_HOURS + ":" + config(CRON_HOURS));
console.log(BEARER_TOKEN + ":" + config(BEARER_TOKEN));
console.log(ROCKETCHAT_WEBHOOK_URL + ":" + config(ROCKETCHAT_WEBHOOK_URL));
console.log(GOV_NOTIFY_DAY + ":" + config(GOV_NOTIFY_DAY));
console.log(ENDORSE_NOTIFY_COUNT + ":" + config(ENDORSE_NOTIFY_COUNT));
console.log(CHANNEL + ":" + config(CHANNEL));
console.log(USERNAME + ":" + config(USERNAME));
console.log(APPROVED_NOTIFY_HOURS + ":" + config(APPROVED_NOTIFY_HOURS));

page.viewportSize = { width: 1024, height: 768 };

console.log("Delete previous data")

console.log("Crawling Start ...")

fs.makeDirectory(ARCHIVE_FOLDER);

execute();

function init() {
    if (!fs.isFile(CONF_FILE)) {
        var f = fs.open(CONF_FILE, "w");
        f.write('{}');
        f.close();
    }
    var confFile = fs.open(CONF_FILE, 'r');
    var readData = confFile.read();
    if (readData[0] != '{') {
        fConfig = {};
    } else {
        fConfig = JSON.parse(readData);
    }
    confFile.close();
}

function config(key, value) {
    if (value === undefined) {
        return fConfig[key];
    }
    fConfig[key] = value;
    var f = fs.open(CONF_FILE, 'w');
    f.write(JSON.stringify(fConfig));
    f.close();
}

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
                GOOD_MSG0 = "";
                GOOD_MSG1_ENDORSE = "";
                GOOD_MSG1_APPROVED = "";
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
                    if (hours == config(CRON_HOURS)) {
                        if (JOB_INDEX == 0 && ENDORSES[current].govResponses.length == 0 && ((today.valueOf() - ENDORSES[current].secondSignedTime)/(3600000*24)).toFixed() >= config(GOV_NOTIFY_DAY)) {
                            console.log("機關回應倒數 " + (GOV_DAY - ((today.valueOf() - ENDORSES[current].secondSignedTime)/(3600000*24)).toFixed()) + " 天(" + ENDORSES[current].approvalOrganization.master.organizationName  + "): " + ENDORSES[current].title);
                            GOOD_MSG0 += encodeURIComponent("機關回應倒數 " + (GOV_DAY - ((today.valueOf() - ENDORSES[current].secondSignedTime)/(3600000*24)).toFixed()) + " 天(" + ENDORSES[current].approvalOrganization.master.organizationName  + "): [" + ENDORSES[current].title) + "](" + JOIN_DETAIL_URL + ENDORSES[current].id + ")\\n";
                        }
                        if (JOB_INDEX == 1 && ENDORSES[current].endorseCount >= config(ENDORSE_NOTIFY_COUNT)) {
                            console.log("附議通過剩餘 " + (ENDORSE_COUNT - ENDORSES[current].endorseCount) + " 個: " + ENDORSES[current].title);
                            GOOD_MSG1_ENDORSE += encodeURIComponent("附議通過剩餘 " + (ENDORSE_COUNT - ENDORSES[current].endorseCount) + " 個: [" + ENDORSES[current].title) + "](" + JOIN_DETAIL_URL + ENDORSES[current].id + ")\\n";
                        }
                        if (JOB_INDEX == 1 && (now.valueOf() - ENDORSES[current].approvedTime) <= config(APPROVED_NOTIFY_HOURS)*3600000) {
                            console.log(new Date(ENDORSES[current].approvedTime).toISOString().substring(0,10) + " 進入附議階段: " + ENDORSES[current].title);
                            GOOD_MSG1_APPROVED += encodeURIComponent(new Date(ENDORSES[current].approvedTime).toISOString().substring(0,10) + " 進入附議階段: [" + ENDORSES[current].title) + "](" + JOIN_DETAIL_URL + ENDORSES[current].id + ")\\n";
                        }                        
                    }                    
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
                            }, 2000);
                    } else {
                        console.log("Get " + ENDORSES.length + " endorses content. Job done.");
                        // 工作完成，把大JSON寫進檔案
                        fs.write(JOB_FOLDER[JOB_INDEX] + '/' + ENDORSES_JSON, JSON.stringify(ENDORSES, null, 2), 'w');
                        if (GOOD_MSG0.length > 0) {
                            GOOD_MSG0 = encodeURIComponent("`成案待回超過" + config(GOV_NOTIFY_DAY) + "天`") + "\\n" + GOOD_MSG0;
                            webhookRocketChat(GOOD_MSG0.slice(0, -2));
                        }
                        if (GOOD_MSG1_ENDORSE.length > 0) {
                            GOOD_MSG1_ENDORSE = encodeURIComponent("`附議累積超過" + config(ENDORSE_NOTIFY_COUNT) + "個`") + "\\n" + GOOD_MSG0;
                            webhookRocketChat(GOOD_MSG1_ENDORSE.slice(0, -2));
                        }
                        if (GOOD_MSG1_APPROVED.length > 0) {
                            GOOD_MSG1_APPROVED = encodeURIComponent("`開始附議" + config(APPROVED_NOTIFY_HOURS) + "小時內`") + "\\n" + GOOD_MSG0;
                            webhookRocketChat(GOOD_MSG1_APPROVED.slice(0, -2));
                        }
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
    execFile("curl", ["-XGET", "-4", JOIN_SUGGESTION_URL + id], null, function(err, stdout, stderr) {
        fs.write(JOB_FOLDER[JOB_INDEX] + '/' + id + '.csv', stdout, 'w');
        console.log("execFileSTDERR:", stderr);
    })
}

function webhookRocketChat(msg) {
    var data = 'payload={"channel":"' + config(CHANNEL) + '","username":"' + config(USERNAME) + '","text":"' + msg + '"}';
    var headers = {
        "Authorization": ("Bearer " + config(BEARER_TOKEN))
    };
    page.open(config(ROCKETCHAT_WEBHOOK_URL), 'post', data, headers, function(status) {
        if (status !== 'success') {
            console.log('Unable to post!');
        } else {
            console.log(page.content);
        }
    });
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
