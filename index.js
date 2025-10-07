const axios = require('axios');

const SYMBOL = 'BTCUSDT';
const DAY_PRICE = 34160;
const SELL_PRICE = 34501;

const API_URL = 'https://testnet.binance.vision'; // mudar dps pela API nativa https://api.binance.com

let IsOpened = false;

function calcSMA(data) {
    const closes = data.map(candle => parseFloat(candle[4]));   
    const sum = closes.reduce((a,b) => a + b);
    return sum / data.length;
}

async function start() {
    const {data} = await axios.get(API_URL + `/api/v3/klines?limit=21&interval=15m&symbol=${SYMBOL}`);
    const candle =data[data.length -1];
    const price = parseFloat(candle[4]);

    console.clear();
    console.log('Price: ' + price);

    const sma = calcSMA(data);
    console.log('SMA: ' + sma);
    console.log('Is Opened: ' + IsOpened);

    if (price >= DAY_PRICE && IsOpened == false) {
        console.log('Comprar');
        IsOpened = true;
    } else if (price >= SELL_PRICE && IsOpened == true) {
        console.log('Vender');
        IsOpened = false;
    } else {
        console.log('Aguardar');
    }
}
setInterval(start, 3000);

start();
