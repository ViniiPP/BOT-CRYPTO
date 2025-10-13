const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();
const fs = require("fs");

// CONFIGURAÇÕES
const SYMBOL = "BTCUSDT";
const QUANTITY = "0.000010";

// Para testes usar https://testnet.binance.vision' real: https://api.binance.com
const API_URL = "https://testnet.binance.vision"; // mainnet real
const API_KEY = process.env.API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
let IsOpened = false;

// Cria pasta logs se não existir
if (!fs.existsSync("./logs")) fs.mkdirSync("./logs");

// FUNÇÃO SMA
function calcSMA(data) {
  const closes = data.map((c) => parseFloat(c[4])).filter((c) => !isNaN(c));
  if (closes.length === 0) return 0;
  return closes.reduce((a, b) => a + b, 0) / closes.length;
}

// FUNÇÃO DE ORDEM
async function newOrder(symbol, quantity, side) {
  const order = {
    symbol,
    side,
    type: "MARKET",
    quantity,
    timestamp: Date.now(),
  };

  const query = new URLSearchParams(order).toString();
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(query)
    .digest("hex");
  const fullQuery = query + "&signature=" + signature;

  try {
    const { data } = await axios.post(`${API_URL}/api/v3/order`, fullQuery, {
      headers: {
        "X-MBX-APIKEY": API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const price = data.fills?.[0]?.price || "N/A";
    console.log(`✅ Ordem ${side} enviada com sucesso! Preço: ${price}`);

    // Log no arquivo
    fs.appendFileSync(
      "./logs/trades.log",
      `${new Date().toISOString()} - ${side} - ${symbol} - ${price}\n`
    );

  } catch (err) {
    console.error(
      "❌ Erro ao enviar ordem:",
      err.response?.data || err.message
    );
  }
}

// LOOP PRINCIPAL
async function start() {
  try {
    const { data } = await axios.get(`${API_URL}/api/v3/klines`, {
      params: { symbol: SYMBOL, interval: "15m", limit: 21 },
    });

    const candle = data[data.length - 1];
    const price = parseFloat(candle[4]);
    const sma = calcSMA(data);
    const diffPercent = ((price - sma) / sma) * 100;

    console.clear();
    console.log("💰 Preço atual:", price);
    console.log("📊 SMA 21:", sma.toFixed(2));
    console.log("📦 Posição Aberta?", IsOpened);
    console.log("📈 Diferença Preço/SMA:", diffPercent.toFixed(2), "%");
    console.log("-------------------------------");

    // LÓGICA DINÂMICA
    const BUY_THRESHOLD = -0.01;
    const SELL_THRESHOLD = 0.01; 

    if (diffPercent <= BUY_THRESHOLD && !IsOpened) {
      IsOpened = true;
      console.log("🟢 Comprar");
      await newOrder(SYMBOL, QUANTITY, "BUY");

    } else if (diffPercent >= SELL_THRESHOLD && IsOpened) {
      console.log("🔴 Vender");
      await newOrder(SYMBOL, QUANTITY, "SELL");
      IsOpened = false;

    } else {
      console.log("Aguardar Sinal...");
    }
  } catch (err) {
    console.error("Erro no loop principal:", err.response?.data || err.message);
  }
}

setInterval(start, 3000);
start();
