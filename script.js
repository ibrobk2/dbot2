// Replace with your Deriv API credentials
const derivToken = "eCLCd3H23HFpq83"; // Replace with Deriv API Token
const app_id = "66586";    // Replace with Deriv App ID

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${app_id}`);

let running = false;
let tickData = [];
let stake = 10,
    takeProfit = 50,
    stopLoss = 20,
    profit = 0,
    loss = 0,
    balance = 0;
let symbol = "R_100";

document.getElementById("start-btn").addEventListener("click", () => {
    stake = Number(document.getElementById("stake").value);
    takeProfit = Number(document.getElementById("take-profit").value);
    stopLoss = Number(document.getElementById("stop-loss").value);
    symbol = document.getElementById("index").value;

    running = true;
    document.getElementById("status-text").innerText = "Bot Running...";

    ws.send(JSON.stringify({ authorize: derivToken }));
    ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
});

ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    if (data.tick && running) {
        updateTicks(data.tick.quote);
    }
};

function updateTicks(price) {
    tickData.push(price);
    if (tickData.length > 20) tickData.shift();

    const { upper, lower } = calculateBollingerBands(tickData, 20);
    const rsi = calculateRSI(tickData, 14);

    if (price <= lower && rsi > 30 && rsi < 40) {
        trade("CALL", price);
    } else if (price >= upper && rsi > 60 && rsi < 70) {
        trade("PUT", price);
    }
}

function calculateBollingerBands(data, period) {
    const sma = data.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(data.map(x => Math.pow(x - sma, 2)).reduce((a, b) => a + b, 0) / period);
    return { upper: sma + 2 * sd, lower: sma - 2 * sd };
}

function calculateRSI(data, period) {
    let gains = 0, losses = 0;
    for (let i = 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    return 100 - 100 / (1 + avgGain / avgLoss);
}

function trade(type, price) {
    if (type === "CALL") {
        profit += stake * 0.9; // 90% profit
    } else if (type === "PUT") {
        loss += stake; // Stake as loss
    }
    updateProfitLoss();
    checkStopConditions();
}

function updateProfitLoss() {
    document.getElementById("profit-amount").innerText = profit.toFixed(2);
    document.getElementById("loss-amount").innerText = loss.toFixed(2);
}

function checkStopConditions() {
    if (profit >= takeProfit || loss >= stopLoss) {
        running = false;
        document.getElementById("status-text").innerText = "Bot Stopped - Condition Met";
        ws.close();
    }
}