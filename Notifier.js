const ARCHIVE_FOLDER = 'archive/';
const COMPLETED_ARCHIVE_FOLDER = ARCHIVE_FOLDER + 'completed/';
const ENDORSING_ARCHIVE_FOLDER = ARCHIVE_FOLDER + 'endorsing/';

const ENDORSES_JSON = 'endorses.json';

/* Rocket.Chat Bot Configuration below */
const CONF_FILE = 'Notifier.conf';
const GOV_DAY = 60;
const ENDORSE_COUNT = 5000;
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
const JOIN_URL = 'joinUrl';
const IDEA_DETAIL = 'ideaDetail';
const RAW_URL = 'rawUrl';
const RAW_PATH = 'rawPath';

var page = require('webpage').create();
var fs = require('fs');
var JOB_INDEX = 0;
var ENDORSES = [];

var JOIN_COMPLETED_URL = '';
var JOIN_ENDORSING_URL = '';
var JOB_URL = [];
var JOIN_DETAIL_URL = '';

var fConfig = null;

var GOOD_MSG0 = '';
var GOOD_MSG1_ENDORSE = '';
var GOOD_MSG1_APPROVED = '';
var now = new Date();
var hours = now.getHours();
var today = now.setHours(0, 0, 0, 0);

init();
console.log(JOIN_URL + ":" + config(JOIN_URL));
console.log(IDEA_DETAIL + ":" + config(IDEA_DETAIL));
console.log(RAW_URL + ":" + config(RAW_URL));
console.log(RAW_PATH + ":" + config(RAW_PATH));
console.log(BEARER_TOKEN + ":" + config(BEARER_TOKEN));
console.log(ROCKETCHAT_WEBHOOK_URL + ":" + config(ROCKETCHAT_WEBHOOK_URL));
console.log(CRON_HOURS + ":" + config(CRON_HOURS));
console.log(GOV_NOTIFY_DAY + ":" + config(GOV_NOTIFY_DAY));
console.log(ENDORSE_NOTIFY_COUNT + ":" + config(ENDORSE_NOTIFY_COUNT));
console.log(CHANNEL + ":" + config(CHANNEL));
console.log(USERNAME + ":" + config(USERNAME));
console.log(APPROVED_NOTIFY_HOURS + ":" + config(APPROVED_NOTIFY_HOURS));

console.log("Notifying Start ...")

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

    JOIN_DETAIL_URL = config(JOIN_URL) + config(IDEA_DETAIL);
    JOIN_COMPLETED_URL = config(RAW_URL) + config(RAW_PATH) + COMPLETED_ARCHIVE_FOLDER + ENDORSES_JSON;
    JOIN_ENDORSING_URL = config(RAW_URL) + config(RAW_PATH) + ENDORSING_ARCHIVE_FOLDER + ENDORSES_JSON;
    JOB_URL = [JOIN_COMPLETED_URL, JOIN_ENDORSING_URL];
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

    page.open(JOB_URL[JOB_INDEX], function(status) {
        console.log('JOB_URL[' + JOB_INDEX + ']' + JOB_URL[JOB_INDEX]);
        if (status !== "success") {
            console.log("Unable to access network");
        } else {
            ENDORSES = JSON.parse(page.plainText);
            console.log('Get ' + ENDORSES.length + ' endorses...');

            if (ENDORSES.length > 0) {
                GOOD_MSG0 = "";
                GOOD_MSG1_ENDORSE = "";
                GOOD_MSG1_APPROVED = "";
                getProjectContent();
            } else {
                console.log('Something wrong, no project on list');
                finish();
            }

        }
    });
}

function getProjectContent() {
    for (var current=0; current<ENDORSES.length - 1; current++) {
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
    }
    console.log("Get " + ENDORSES.length + " endorses content. Job done.");
    if (GOOD_MSG0.length > 0) {
        // GOOD_MSG0 = encodeURIComponent("`成案待回超過" + config(GOV_NOTIFY_DAY) + "天`") + "\\n" + GOOD_MSG0;
        console.log("GOOD_MSG0: " + GOOD_MSG0);
        webhookRocketChat(encodeURIComponent("成案待回超過" + config(GOV_NOTIFY_DAY) + "天"), GOOD_MSG0.slice(0, -2));
    }
    if (GOOD_MSG1_ENDORSE.length > 0) {
        // GOOD_MSG1_ENDORSE = encodeURIComponent("`附議累積超過" + config(ENDORSE_NOTIFY_COUNT) + "個`") + "\\n" + GOOD_MSG1_ENDORSE;
        console.log("GOOD_MSG0: " + GOOD_MSG1_ENDORSE);
        webhookRocketChat(encodeURIComponent("附議累積超過" + config(ENDORSE_NOTIFY_COUNT) + "個"), GOOD_MSG1_ENDORSE.slice(0, -2));
    }
    if (GOOD_MSG1_APPROVED.length > 0) {
        // GOOD_MSG1_APPROVED = encodeURIComponent("`開始附議" + config(APPROVED_NOTIFY_HOURS) + "小時內`") + "\\n" + GOOD_MSG1_APPROVED;
        console.log("GOOD_MSG0: " + GOOD_MSG1_APPROVED);
        webhookRocketChat(encodeURIComponent("開始附議" + config(APPROVED_NOTIFY_HOURS) + "小時內"), GOOD_MSG1_APPROVED.slice(0, -2));
    }
    // 休息3秒後，繼續下一個工作（確保POST做完）
    setTimeout(
        function() {
            JOB_INDEX += 1;
            execute();
        }, 3000);
}

/*
// <html><head></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">{"success":true}</pre></body></html>
*/
function webhookRocketChat(title, msg) {

    var postPage = require('webpage').create();

    // var data = 'payload={"channel":"' + config(CHANNEL) + '","username":"' + config(USERNAME) + '","text":"' + msg + '"}';
    var data = 'payload={"channel":"' + config(CHANNEL) + '","username":"' + config(USERNAME) + '","attachments":[{"title":"' + title + '","text":"' + msg + '","color":"#4B0056"}]}';
    var headers = {
        "Authorization": ("Bearer " + config(BEARER_TOKEN))
    };

    postPage.onConsoleMessage = function(msg, lineNum, sourceId) {
        console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    };
    postPage.open(config(ROCKETCHAT_WEBHOOK_URL), 'post', data, headers, function(status) {
        if (status !== 'success') {
            console.log('Unable to post!');
        }
        // 當 Rocket.Chat grain 活着時可以得到回應
        console.log(postPage.content);
        console.log(document.readyState);
    });

}

/*
// https://github.com/ariya/phantomjs/blob/master/examples/waitfor.js
*/
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat check every 250ms
};

function finish() {
    phantom.exit();
}
