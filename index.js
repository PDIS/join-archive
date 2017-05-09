const http = require('http')
const fs = require('fs')
const phantom = require('phantom')
const download = require('download-file')
const rimraf = require('rimraf')

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function init() {
    rimraf('./archive', error => {})
    fs.existsSync('./archive') || fs.mkdirSync('./archive')
    fs.existsSync('./archive/completed') || fs.mkdirSync('./archive/completed')
    fs.existsSync('./archive/endorsing') || fs.mkdirSync('./archive/endorsing')
}

const crawlData = async(type) => {
    const instance = await phantom.create(['--ignore-ssl-errors=yes', '--load-images=no'])
    const page = await instance.createPage()

    var endorses = []
    var ideas = []
    var count = 1

    do {
        status = await page.open('https://join.gov.tw/idea/index/search/' + type.toUpperCase() + '?page=' + count + '&size=100')
        searchResult = await page.evaluate(function() { return searchResult })
        endorses = endorses.concat(searchResult.result)
        count = count + 1
    }
    while (searchResult.result.length >= 100)

    console.log(endorses.length)

    for (endorse of endorses) {
        await page.open('https://join.gov.tw/idea/detail/' + endorse.id)
        await timeout(2000)
        idea = await page.evaluate(function() { return idea })
        ideas.push(idea)
        console.log(type + ' ' + endorses.indexOf(endorse) + ':' + idea.title)
        options = {
            directory: "./archive/" + type + "/",
            filename: idea.id + ".csv"
        }
        download("https://join.gov.tw/idea/export/endorse/suggestion/" + idea.id, options)
    }

    fs.writeFileSync("./archive/" + type + "/endorses.json", JSON.stringify(ideas))

    await instance.exit()
}

(async() => {
    init()
    await crawlData("completed")
    await crawlData("endorsing")
    fs.writeFileSync('./archive/UPDATE_TIMESTAMP', new Date())
})()
