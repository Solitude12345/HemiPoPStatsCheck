const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchData(pubkey) {
    const url = `https://testnet.popstats.hemi.network/pubkey/${pubkey}.html`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const newUrl = $('meta[http-equiv="refresh"]').attr('content').split('URL=')[1];
    const newResponse = await axios.get(newUrl);
    return newResponse.data;
}

function parseData(html) {
    const $ = cheerio.load(html);
    const data = {};

    data.bitcoinAddress = $('td:contains("Bitcoin P2PKH Address")').parent().next().children().eq(1).text();
    data.evmAddress = $('td:contains("EVM Address")').parent().next().children().eq(2).text();

    // Extract All-Time Statistics
    data.totalPoPTxs = $('td:contains("Total PoP Txs")').parent().next().children().eq(0).text();
    data.totalKeystonesMined = $('td:contains("Total Keystones Mined")').parent().next().children().eq(1).text();
    data.totalPoPFees = $('td:contains("Total PoP Fees")').parent().next().children().eq(2).text();

    // Extract 24-Hour Statistics
    data.popTxs24h = $('td:contains("PoP Txs")').parent().next().children().eq(0).text();
    data.uniqueKeystonesMined24h = $('td:contains("Unique Keystones Mined")').parent().next().children().eq(1).text();
    data.popFees24h = $('td:contains("PoP Fees")').parent().next().children().eq(2).text();
    data.avgPoPFeeRate24h = $('td:contains("Avg PoP Fee Rate")').parent().next().children().eq(3).text();

    // Extract Last PoP Transaction
    data.lastKeystone = $('td:contains("Hemi Keystone #")').parent().next().children().eq(0).text();
    data.lastFee = $('td:contains("Fee")').parent().next().children().eq(1).text();
    data.lastFeeRate = $('td:contains("Fee Rate (sat/vB)")').parent().next().children().eq(2).text();
    data.lastBTCBlock = $('td:contains("BTC Block #")').parent().next().children().eq(3).text();
    data.lastTimestamp = $('td:contains("Timestamp")').parent().next().children().eq(4).text();

    return data;
}

async function main() {
    const pubkeys = fs.readFileSync('addresses.txt', 'utf-8').split('\n').filter(Boolean);
    const csvData = [];

    for (const pubkey of pubkeys) {
        const html = await fetchData(pubkey);
        const data = parseData(html);
        csvData.push(data);
    }

    const csvHeader = [
        'BTC地址', 'EVM地址',
        '总Tx', '挖到块', '总手续费',
        '24小时Tx', '24小时挖到块', '24小时手续费', '24小时平均手续费率',
        '最后Keystone', '最后手续费', '最后手续费率', '最后BTC高度', '最后时间戳'
    ];

    const csvContent = [
        csvHeader.join(','),
        ...csvData.map(row => [
            row.bitcoinAddress, row.evmAddress,
            row.totalPoPTxs, row.totalKeystonesMined, row.totalPoPFees,
            row.popTxs24h, row.uniqueKeystonesMined24h, row.popFees24h, row.avgPoPFeeRate24h,
            row.lastKeystone, row.lastFee, row.lastFeeRate, row.lastBTCBlock, new Date(row.lastTimestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        ].join(','))
    ].join('\n');

    fs.writeFileSync('output.csv', csvContent);
}

main().catch(console.error);
