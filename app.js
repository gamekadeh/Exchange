/* SimpleX Demo Exchange UI
 * - No backend: uses localStorage for state
 * - Replace MOCK/API stubs with real endpoints
*/

const state = {
  pairs: [
    { pair: "BTC/USDT", price: 64321.5, change: 2.4, vol: 18923 },
    { pair: "ETH/USDT", price: 3245.12, change: -1.2, vol: 112003 },
    { pair: "SOL/USDT", price: 187.41, change: 3.1, vol: 45021 },
    { pair: "XRP/USDT", price: 0.64, change: 0.8, vol: 871229 },
    { pair: "ADA/USDT", price: 0.49, change: -0.6, vol: 212331 },
    { pair: "BNB/USDT", price: 592.77, change: 0.4, vol: 9804 },
    { pair: "DOGE/USDT", price: 0.17, change: -3.4, vol: 452190 },
  ],
  selectedPair: "BTC/USDT",
  side: "buy",
  user: load("user", { username: "guest", twoFA: false }),
  wallet: load("wallet", { USDT: 10000, BTC: 0.2, ETH: 1.5, SOL: 0, XRP: 0, ADA: 0, BNB: 0, DOGE: 0 }),
  openOrders: load("openOrders", []),
  orderHistory: load("orderHistory", []),
  chart: { points: [] }
};

// Utilities
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function fmt(n, d=2) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }); }
function now() { return new Date().toLocaleTimeString(); }
function qs(sel, el=document) { return el.querySelector(sel); }
function qsa(sel, el=document) { return Array.from(el.querySelectorAll(sel)); }
function setActiveNav(view) {
  qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
}

// Routing (simple views)
const views = ["dashboard","markets","trade","wallet","profile"];
function show(view) {
  views.forEach(v => qs(`#view-${v}`).hidden = (v !== view));
  window.location.hash = view;
  setActiveNav(view);
  if (view === "trade") drawChart();
  if (view === "wallet") renderWallet();
}
window.addEventListener("hashchange", () => {
  const v = window.location.hash.replace("#","") || "dashboard";
  if (views.includes(v)) show(v);
});

// Topbar nav
qsa(".nav-btn").forEach(btn => btn.addEventListener("click", () => show(btn.dataset.view)));
qs("#hamburger").addEventListener("click", () => qs(".nav").classList.toggle("open"));

// Year in footer
qs("#year").textContent = new Date().getFullYear();

// Dashboard & Markets render
function renderMarkets() {
  const body1 = qs("#table-top-markets tbody");
  const body2 = qs("#table-markets tbody");
  body1.innerHTML = "";
  body2.innerHTML = "";
  const top = state.pairs.slice(0,5);
  for (const row of top) body1.appendChild(marketRow(row));
  for (const row of state.pairs) body2.appendChild(marketRow(row, true));
}
function marketRow({pair, price, change, vol}, clickable=false) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${pair}</td>
    <td>${fmt(price)}</td>
    <td style="color:${change>=0?'#1fbf75':'#ff5c5c'}">${change>=0?'+':''}${fmt(change,2)}%</td>
    <td>${fmt(vol,0)}</td>`;
  if (clickable) {
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => { state.selectedPair = pair; updateTradePair(); show("trade"); });
  }
  return tr;
}
qs("#search-markets").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  const body = qs("#table-markets tbody");
  body.innerHTML = "";
  for (const row of state.pairs.filter(p => p.pair.toLowerCase().includes(q))) {
    body.appendChild(marketRow(row, true));
  }
});

// Chart (pure Canvas mini line chart)
const chart = {
  el: qs("#price-chart"),
  get ctx(){ return this.el.getContext("2d"); },
  w: 0, h: 0
};
function seedChart() {
  const base = state.pairs.find(p => p.pair === state.selectedPair)?.price || 100;
  const pts = [base];
  for (let i=0;i<80;i++) {
    const last = pts[pts.length-1];
    const next = last * (1 + (Math.random()-0.5) * 0.01);
    pts.push(next);
  }
  state.chart.points = pts;
}
function drawChart() {
  if (!state.chart.points.length) seedChart();
  const ctx = chart.ctx;
  chart.w = chart.el.width = chart.el.clientWidth * (window.devicePixelRatio || 1);
  chart.h = chart.el.height = chart.el.clientHeight * (window.devicePixelRatio || 1);
  ctx.clearRect(0,0,chart.w,chart.h);

  // Axes (minimal)
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = "#21283a";
  for (let i=1;i<4;i++) {
    const y = (chart.h/4)*i;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(chart.w,y); ctx.stroke();
  }

  // Line
  const pts = state.chart.points;
  const min = Math.min(...pts), max = Math.max(...pts);
  const pad = 8;
  const xs = pts.map((_,i) => pad + i * ((chart.w - pad*2) / (pts.length-1)));
  const ys = pts.map(v => pad + (chart.h - pad*2) * (1 - (v - min) / (max - min || 1)));
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#4f8cff";
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i=1;i<xs.length;i++) ctx.lineTo(xs[i], ys[i]);
  ctx.stroke();

  // Last price tag
  const last = pts[pts.length-1];
  ctx.fillStyle = "#0e1320";
  ctx.strokeStyle = "#4f8cff";
  ctx.lineWidth = 1;
  const label = ` ${fmt(last)} `;
  const tw = ctx.measureText(label).width + 10;
  const x = chart.w - tw - 10;
  const y = ys[ys.length-1];
  ctx.beginPath();
  ctx.roundRect(x, y-12, tw, 24, 6);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#e6e8ef";
  ctx.fillText(label, x+8, y+4);
}
window.addEventListener("resize", drawChart);

// Order book + trades (mock live)
function renderBook() {
  const pair = state.pairs.find(p => p.pair === state.selectedPair);
  const mid = pair.price;
  const asks = [], bids = [];
  for (let i=0;i<15;i++) {
    asks.push({ price: mid * (1 + 0.0005 * (i+1)), amount: Math.random()*2 });
    bids.push({ price: mid * (1 - 0.0005 * (i+1)), amount: Math.random()*2 });
  }
  fillList("#asks", asks.reverse(), "ask");
  fillList("#bids", bids, "bid");
}
function fillList(sel, rows, cls) {
  const ul = qs(sel);
  ul.innerHTML = "";
  for (const r of rows) {
    const li = document.createElement("li");
    li.className = cls;
    li.innerHTML = `<span>${fmt(r.price)}</span><span>${fmt(r.amount,4)}</span>`;
    ul.appendChild(li);
  }
}
function pushTrade() {
  const pair = state.pairs.find(p => p.pair === state.selectedPair);
  // jitter price slightly
  const drift = (Math.random()-0.5) * (pair.price * 0.001);
  pair.price = Math.max(0.0001, pair.price + drift);
  state.chart.points.push(pair.price);
  if (state.chart.points.length > 180) state.chart.points.shift();

  const tr = { t: now(), price: pair.price, amount: Math.random() * 0.25 + 0.01 };
  const tbody = qs("#table-trades tbody");
  const row = document.createElement("tr");
  row.innerHTML = `<td>${tr.t}</td><td>${fmt(tr.price)}</td><td>${fmt(tr.amount,4)}</td>`;
  tbody.prepend(row);
  while (tbody.children.length > 50) tbody.removeChild(tbody.lastChild);

  drawChart();
  renderBook();
  renderMarkets();
}
setInterval(pushTrade, 2500);

// Trade: pair selector
function updateTradePair() {
  qs("#chart-title").textContent = state.selectedPair;
  const sel = qs("#chart-asset");
  sel.innerHTML = "";
  for (const p of state.pairs) {
    const opt = document.createElement("option");
    opt.value = p.pair; opt.textContent = p.pair;
    if (p.pair === state.selectedPair) opt.selected = true;
    sel.appendChild(opt);
  }
  seedChart();
  drawChart();
  renderBook();
}
qs("#chart-asset").addEventListener("change", e => { state.selectedPair = e.target.value; updateTradePair(); });

// Order form behaviour
qsa('input[name="ordertype"]').forEach(r => r.addEventListener("change", () => {
  const isLimit = qs('input[name="ordertype"][value="limit"]').checked;
  qs("#limit-price-wrap").hidden = !isLimit;
}));
qsa('.seg').forEach(b => b.addEventListener("click", () => {
  state.side = b.dataset.side;
  qsa('.seg').forEach(s => s.classList.toggle('active', s.dataset.side===state.side));
}));

qs("#btn-submit-order").addEventListener("click", () => {
  const isLimit = qs('input[name="ordertype"][value="limit"]').checked;
  const price = isLimit ? Number(qs("#input-limit-price").value) : currentPrice();
  const amount = Number(qs("#input-amount").value);
  const pair = state.selectedPair;
  const base = pair.split('/')[0], quote = pair.split('/')[1]; // e.g., BTC/USDT
  const err = qs("#order-error");
  err.hidden = true; err.textContent = "";

  if (!amount || amount <= 0) return showError("Enter a valid amount");
  if (isLimit && (!price || price <= 0)) return showError("Enter a valid price");

  // Balance checks (very simplified)
  if (state.side === "buy") {
    const cost = price * amount;
    if ((state.wallet[quote] ?? 0) < cost) return showError(`Insufficient ${quote}. Need ${fmt(cost)}.`);
    // market executes immediately in this mock; limit is added to book as open order
    if (isLimit) {
      addOpenOrder(pair, "buy", "limit", price, amount);
      state.wallet[quote] -= cost;
    } else {
      executeTrade(pair, "buy", price, amount);
    }
  } else {
    // sell
    if ((state.wallet[base] ?? 0) < amount) return showError(`Insufficient ${base}. Need ${fmt(amount,4)}.`);
    if (isLimit) {
      addOpenOrder(pair, "sell", "limit", price, amount);
      state.wallet[base] -= amount;
    } else {
      executeTrade(pair, "sell", price, amount);
    }
  }
  save("wallet", state.wallet);
  renderWallet();
  qs("#input-amount").value = "";
  qs("#input-limit-price").value = "";
});

function showError(msg){ const err = qs("#order-error"); err.textContent = msg; err.hidden = false; }

function addOpenOrder(pair, side, type, price, amount) {
  const order = { id: crypto.randomUUID(), time: new Date().toISOString(), pair, side, type, price, amount, status: "OPEN" };
  state.openOrders.unshift(order); save("openOrders", state.openOrders);
  renderOpenOrders();
}

function executeTrade(pair, side, price, amount) {
  // simple fill
  const base = pair.split('/')[0], quote = pair.split('/')[1];
  if (side === "buy") {
    state.wallet[base] = (state.wallet[base] ?? 0) + amount;
    state.wallet[quote] -= price * amount;
  } else {
    state.wallet[base] -= amount;
    state.wallet[quote] = (state.wallet[quote] ?? 0) + price * amount;
  }
  const order = { id: crypto.randomUUID(), time: new Date().toISOString(), pair, side, type:"market", price, amount, status:"FILLED" };
  state.orderHistory.unshift(order); save("orderHistory", state.orderHistory);
  renderOrderHistory();
}

function renderOpenOrders() {
  const body = qs("#table-open-orders tbody"); body.innerHTML = "";
  for (const o of state.openOrders) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${new Date(o.time).toLocaleTimeString()}</td>
      <td>${o.pair}</td><td class="${o.side==='buy'?'buy':'sell'}">${o.side.toUpperCase()}</td>
      <td>${o.type}</td><td>${fmt(o.price)}</td><td>${fmt(o.amount,4)}</td>
      <td><button data-cancel="${o.id}" class="secondary">Cancel</button></td>`;
    body.appendChild(tr);
  }
  qsa('[data-cancel]').forEach(btn => btn.addEventListener('click', () => cancelOrder(btn.dataset.cancel)));
}
function cancelOrder(id) {
  const idx = state.openOrders.findIndex(o => o.id === id);
  if (idx >= 0) {
    const o = state.openOrders[idx];
    // refund reserved funds
    const [base, quote] = o.pair.split('/');
    if (o.side === "buy") state.wallet[quote] += o.price * o.amount;
    else state.wallet[base] += o.amount;
    state.openOrders.splice(idx,1);
    save("openOrders", state.openOrders);
    save("wallet", state.wallet);
    renderOpenOrders(); renderWallet();
  }
}
function renderOrderHistory() {
  const body = qs("#table-order-history tbody"); body.innerHTML = "";
  for (const o of state.orderHistory) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${new Date(o.time).toLocaleTimeString()}</td>
      <td>${o.pair}</td><td class="${o.side==='buy'?'buy':'sell'}">${o.side.toUpperCase()}</td>
      <td>${o.type}</td><td>${fmt(o.price)}</td><td>${fmt(o.amount,4)}</td>
      <td>${o.status}</td>`;
    body.appendChild(tr);
  }
}

// Tabs
qsa('.tab').forEach(t => t.addEventListener('click', () => {
  qsa('.tab').forEach(x => x.classList.toggle('active', x===t));
  const showOpen = t.dataset.tab === "open";
  qs("#table-open-orders").hidden = !showOpen;
  qs("#table-order-history").hidden = showOpen;
}));

// Wallet
function renderWallet() {
  const body = qs("#table-wallet tbody"); body.innerHTML = "";
  const pairsMap = Object.fromEntries(state.pairs.map(p => [p.pair.split('/')[0], p.price]));
  let total = 0;
  for (const [asset, amt] of Object.entries(state.wallet)) {
    const price = asset === "USDT" ? 1 : (pairsMap[asset] || 0);
    const value = price * amt;
    total += value;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${asset}</td><td>${fmt(amt, 6)}</td><td>${fmt(value)}</td>
      <td><button class="secondary" data-dep="${asset}">Deposit</button> <button class="secondary" data-wd="${asset}">Withdraw</button></td>`;
    body.appendChild(tr);
  }
  qs("#wallet-total").textContent = `Total Value ≈ ${fmt(total)} USDT`;

  qsa('[data-dep]').forEach(b => b.addEventListener('click', () => mockFlow('deposit', b.dataset.dep)));
  qsa('[data-wd]').forEach(b => b.addEventListener('click', () => mockFlow('withdraw', b.dataset.wd)));
}
function mockFlow(kind, asset) {
  const amt = Number(prompt(`${kind==='deposit'?'Deposit to':'Withdraw from'} ${asset}: Amount`));
  if (!amt || amt <= 0) return;
  if (kind === 'deposit') state.wallet[asset] = (state.wallet[asset] ?? 0) + amt;
  else {
    if ((state.wallet[asset] ?? 0) < amt) return alert("Insufficient balance");
    state.wallet[asset] -= amt;
  }
  save("wallet", state.wallet);
  renderWallet();
}

// Profile
qs("#profile-username").value = state.user.username;
qs("#toggle-2fa").checked = state.user.twoFA;
qs("#btn-save-profile").addEventListener("click", () => {
  state.user.username = qs("#profile-username").value || "guest";
  state.user.twoFA = qs("#toggle-2fa").checked;
  save("user", state.user);
  alert("Saved!");
});

// Orders tables initial
renderOpenOrders(); renderOrderHistory();

// Markets & Trade initial
renderMarkets(); updateTradePair(); show(window.location.hash.replace("#","") || "dashboard");

// Helper to get current price
function currentPrice() {
  return state.pairs.find(p => p.pair === state.selectedPair)?.price ?? 0;
}
