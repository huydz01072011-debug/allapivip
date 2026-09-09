// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= CONFIG =================
const EXTERNAL_APIS = {
    lc79: {
        taixiu: 'https://wtx.tele68.com/v1/tx/sessions',
        taixiu_md5: 'https://wtxmd52.tele68.com/v1/txmd5/sessions'
    },
    betvip: {
        taixiu: 'https://wtx.macminim6.online/v1/tx/sessions',
        taixiu_md5: 'https://wtxmd52.macminim6.online/v1/txmd5/sessions'
    }
};

const HISTORY_LIMIT = 50;

// ================= HELPERS =================
async function fetchFromExternal(url) {
    try {
        const response = await axios.get(url, { timeout: 10000 });
        if (response.data && Array.isArray(response.data.list)) {
            return response.data.list.slice(0, HISTORY_LIMIT);
        }
        return [];
    } catch (error) {
        console.error(`Lỗi fetch ${url}:`, error.message);
        return null;
    }
}

// Chuyển đổi từ cấu trúc gốc sang cấu trúc mới
function transformSessions(rawSessions) {
    return rawSessions.map(item => {
        const result = item.resultTruyenThong === 'TAI' ? 'T' : 'X';
        const dices = item.dices || [];
        const total = dices.reduce((sum, d) => sum + d, 0);
        return {
            phien: item.id,
            dice_1: dices[0] ?? null,
            dice_2: dices[1] ?? null,
            dice_3: dices[2] ?? null,
            tong: total,
            ket_qua: result === 'T' ? 'Tài' : 'Xỉu'
        };
    });
}

// ================= ROUTES =================
// Phục vụ giao diện chính
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API nội bộ để frontend gọi (trả về dữ liệu đã transform)
app.get('/api/:game/:mode', async (req, res) => {
    const { game, mode } = req.params;
    const gameConfig = EXTERNAL_APIS[game];
    if (!gameConfig || !gameConfig[mode]) {
        return res.status(404).json({ error: 'Không tìm thấy game hoặc mode' });
    }
    const raw = await fetchFromExternal(gameConfig[mode]);
    if (raw === null) {
        return res.status(502).json({ error: 'Không thể kết nối API gốc' });
    }
    const transformed = transformSessions(raw);
    res.json({ list: transformed, total: transformed.length });
});

// Các route history theo yêu cầu
app.get('/lc79/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.lc79.taixiu);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    const transformed = transformSessions(raw);
    res.json(transformed);
});

app.get('/lc79md5/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.lc79.taixiu_md5);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    const transformed = transformSessions(raw);
    res.json(transformed);
});

app.get('/betvip/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.betvip.taixiu);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    const transformed = transformSessions(raw);
    res.json(transformed);
});

app.get('/betvipmd5/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.betvip.taixiu_md5);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    const transformed = transformSessions(raw);
    res.json(transformed);
});

// ================= FRONTEND =================
// Tạo thư mục public nếu chưa có và file index.html
const fs = require('fs');
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>🎲 Tài Xỉu VIP - LC79 & BetVip</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style>
        /* Giữ nguyên CSS VIP từ trước, bổ sung nút API */
        :root {
            --bg: #070b17;
            --card-bg: rgba(255, 255, 255, 0.04);
            --border: rgba(255, 255, 255, 0.08);
            --text: #eef2f8;
            --text-dim: rgba(255, 255, 255, 0.45);
            --gold: #fcd34d;
            --tai-color: #fb923c;
            --xiu-color: #60a5fa;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding: 30px 24px 50px;
            background-image:
                radial-gradient(ellipse at 15% 15%, rgba(120, 80, 255, 0.15) 0%, transparent 55%),
                radial-gradient(ellipse at 85% 85%, rgba(255, 80, 180, 0.08) 0%, transparent 55%),
                radial-gradient(ellipse at 50% 50%, rgba(0, 220, 255, 0.05) 0%, transparent 70%),
                radial-gradient(ellipse at 70% 20%, rgba(245, 158, 11, 0.06) 0%, transparent 50%);
            background-attachment: fixed;
        }
        ::-webkit-scrollbar { width: 6px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius:10px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius:10px; }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
            margin-bottom: 40px; padding: 0 6px;
        }
        .header-left { display: flex; align-items: center; gap: 18px; }
        .logo {
            font-size: 48px; font-weight: 900;
            background: linear-gradient(135deg, #fcd34d, #f59e0b, #f97316);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 0 20px rgba(245,158,11,0.2));
        }
        h1 {
            font-size: 32px; font-weight: 800; letter-spacing: -0.5px;
            background: linear-gradient(135deg, #fcd34d, #f59e0b, #f97316);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .vip-badge {
            background: linear-gradient(135deg, #fcd34d, #f59e0b);
            -webkit-text-fill-color: #1a1a1a; font-size: 10px; font-weight: 900;
            padding: 3px 8px; border-radius: 20px; letter-spacing: 1.2px;
            vertical-align: middle; margin-left: 8px; display: inline-block;
        }
        .sub { font-size: 14px; color: var(--text-dim); margin-top: 2px; }
        .header-right { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .status, .time {
            font-size: 13px; font-weight: 500; color: var(--text-dim);
            background: rgba(255,255,255,0.03); padding: 10px 20px; border-radius: 40px;
            border: 1px solid var(--border); backdrop-filter: blur(12px); letter-spacing: 0.5px;
        }
        .status { display:flex; align-items:center; gap:10px; color:rgba(255,255,255,0.6); }
        .status .dot { width:10px; height:10px; border-radius:50%; background:#4ade80; animation:pulse-dot 2.2s ease-in-out infinite; box-shadow:0 0 30px rgba(74,222,128,0.4); }
        @keyframes pulse-dot { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:0.4; transform:scale(0.75);} }
        .vip-ribbon {
            display:inline-flex; align-items:center; gap:6px;
            background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05));
            border:1px solid rgba(245,158,11,0.3); color:#fcd34d; font-size:11px; font-weight:700;
            letter-spacing:1.5px; padding:6px 16px; border-radius:40px; text-transform:uppercase;
            backdrop-filter: blur(8px); box-shadow:0 0 40px rgba(245,158,11,0.1);
        }
        .games-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap:28px; }
        .game-card {
            background: rgba(255,255,255,0.03); backdrop-filter: blur(28px);
            border-radius:28px; border:1px solid var(--border);
            box-shadow:0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03);
            overflow:hidden; transition: transform 0.4s, box-shadow 0.5s; position:relative;
        }
        .game-card:hover { transform: translateY(-8px) scale(1.01); box-shadow:0 40px 100px rgba(0,0,0,0.8), 0 0 60px var(--accent-glow); }
        .game-card::before {
            content:''; position:absolute; top:0; left:0; right:0; height:4px;
            background: linear-gradient(90deg, var(--accent), var(--accent-light));
            opacity:0.9; z-index:2; box-shadow:0 0 40px var(--accent-glow);
        }
        .card-header { padding:22px 24px 18px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.04); background:rgba(0,0,0,0.1); }
        .game-info { display:flex; align-items:center; gap:16px; }
        .game-icon { width:56px; height:56px; border-radius:16px; background:rgba(255,255,255,0.04); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:28px; }
        .game-name { font-size:22px; font-weight:700; color:#fff; }
        .game-name small { display:block; font-size:12px; color:rgba(255,255,255,0.3); }
        .badge { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; padding:6px 14px; border-radius:40px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.5); border:1px solid var(--border); }
        .badge.vip { background:linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05)); border-color:rgba(245,158,11,0.3); color:#fcd34d; }
        .current-result { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.04); flex-wrap:wrap; gap:10px; }
        .current-result .label { font-size:12px; font-weight:600; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.8px; display:flex; align-items:center; gap:6px; }
        .current-result .label .live { width:8px; height:8px; border-radius:50%; background:#4ade80; animation:pulse-dot 1.8s infinite; }
        .result-badge { display:flex; align-items:center; gap:8px; font-size:22px; font-weight:900; padding:8px 20px; border-radius:16px; }
        .result-badge.tai { background:linear-gradient(135deg, rgba(251,146,60,0.2), rgba(234,88,12,0.1)); color:#fb923c; border:1px solid rgba(251,146,60,0.3); }
        .result-badge.xiu { background:linear-gradient(135deg, rgba(96,165,250,0.2), rgba(37,99,235,0.1)); color:#60a5fa; border:1px solid rgba(96,165,250,0.3); }
        .result-info { display:flex; gap:12px; font-size:12px; color:var(--text-dim); }
        .result-info span { background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:8px; }
        .tabs { display:flex; gap:6px; padding:14px 18px 0 18px; background:rgba(0,0,0,0.15); border-bottom:1px solid rgba(255,255,255,0.04); }
        .tab-btn { flex:1; padding:12px 6px 10px; border:none; background:transparent; color:rgba(255,255,255,0.35); font-family:'Inter',sans-serif; font-size:14px; font-weight:600; border-radius:14px 14px 0 0; cursor:pointer; transition:all 0.35s; position:relative; }
        .tab-btn:hover { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.02); }
        .tab-btn.active { color:#fff; background:rgba(255,255,255,0.06); }
        .tab-btn.active::after { content:''; position:absolute; bottom:0; left:25%; right:25%; height:3px; border-radius:10px; background:var(--accent); box-shadow:0 0 30px var(--accent-glow); }
        .tab-icon { margin-right:8px; }
        .tab-content { display:none; padding:20px 22px 24px; animation:fadeSlide 0.4s; }
        .tab-content.active { display:block; }
        @keyframes fadeSlide { 0%{opacity:0; transform:translateY(10px);} 100%{opacity:1; transform:translateY(0);} }
        .stats-row { display:flex; gap:16px; margin-bottom:20px; }
        .stat-item { flex:1; text-align:center; background:rgba(255,255,255,0.02); border-radius:16px; padding:16px 10px; border:1px solid rgba(255,255,255,0.04); }
        .stat-value { font-size:28px; font-weight:800; }
        .tai-stat { color:#fb923c; }
        .xiu-stat { color:#60a5fa; }
        .total-stat { color:rgba(255,255,255,0.35); font-size:22px; }
        .stat-label { font-size:11px; font-weight:600; color:rgba(255,255,255,0.25); text-transform:uppercase; margin-top:6px; }
        .stat-percent { font-size:10px; color:rgba(255,255,255,0.15); margin-top:4px; }
        .history-container { max-height:380px; overflow-y:auto; border-radius:16px; border:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.2); }
        .history-header { display:grid; grid-template-columns:1fr 1fr 1fr 1.5fr; padding:12px 16px; background:rgba(255,255,255,0.03); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-dim); border-bottom:1px solid rgba(255,255,255,0.04); position:sticky; top:0; backdrop-filter:blur(10px); }
        .history-row { display:grid; grid-template-columns:1fr 1fr 1fr 1.5fr; padding:10px 16px; font-size:13px; border-bottom:1px solid rgba(255,255,255,0.02); align-items:center; }
        .history-row:hover { background:rgba(255,255,255,0.03); }
        .session-id { font-weight:600; color:rgba(255,255,255,0.7); }
        .result-badge-small { display:inline-block; padding:4px 12px; border-radius:20px; font-weight:700; font-size:11px; }
        .result-badge-small.tai { background:rgba(251,146,60,0.15); color:#fb923c; }
        .result-badge-small.xiu { background:rgba(96,165,250,0.15); color:#60a5fa; }
        .dice-container { display:flex; gap:4px; }
        .dice { width:28px; height:28px; background:rgba(255,255,255,0.08); border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; border:1px solid rgba(255,255,255,0.1); }
        .empty-state { text-align:center; padding:30px 0; color:rgba(255,255,255,0.2); }
        .loading-spinner { display:inline-block; width:20px; height:20px; border:3px solid rgba(255,255,255,0.1); border-radius:50%; border-top-color:#fcd34d; animation:spin 1s linear infinite; margin-right:8px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .api-btn {
            background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.6); padding:6px 12px; border-radius:8px; font-size:11px;
            cursor:pointer; transition:all 0.3s; text-decoration:none; display:inline-flex; align-items:center; gap:4px;
        }
        .api-btn:hover { background:rgba(255,255,255,0.1); color:#fff; border-color:rgba(255,255,255,0.2); }
        .toast-container { position:fixed; bottom:30px; right:30px; z-index:9999; display:flex; flex-direction:column; gap:12px; max-width:380px; width:100%; pointer-events:none; }
        .toast { padding:16px 22px; border-radius:18px; background:rgba(16,22,40,0.95); backdrop-filter:blur(24px); border:1px solid var(--border); box-shadow:0 16px 50px rgba(0,0,0,0.7); color:#fff; font-size:14px; display:flex; align-items:center; gap:14px; animation:slideUp 0.45s; pointer-events:auto; border-left:4px solid #fcd34d; }
        .toast-icon { font-size:22px; }
        .toast-msg { flex:1; }
        .toast-close { background:none; border:none; color:rgba(255,255,255,0.25); cursor:pointer; font-size:20px; }
        @keyframes slideUp { 0%{opacity:0; transform:translateY(30px);} 100%{opacity:1; transform:translateY(0);} }
        .toast.out { animation:slideDown 0.35s forwards; }
        @keyframes slideDown { 0%{opacity:1; transform:translateY(0);} 100%{opacity:0; transform:translateY(30px);} }
        @media (max-width:768px) { .games-grid { grid-template-columns:1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <span class="logo">🎲</span>
                <div>
                    <h1>Tài Xỉu <span>API</span> <span class="vip-badge">👑 VIP</span></h1>
                    <div class="sub">📊 LC79 & BetVip · Chi tiết từng phiên</div>
                </div>
            </div>
            <div class="header-right">
                <div class="status"><span class="dot"></span> Trực tuyến</div>
                <div class="time" id="clock">--:--:--</div>
                <div class="vip-ribbon">⭐ Premium</div>
            </div>
        </header>

        <div class="games-grid" id="gamesGrid"></div>
    </div>

    <div class="toast-container" id="toastContainer"></div>

    <script>
        // ================= CONFIG =================
        const MODE_DEFS = {
            taixiu: { id: 'taixiu', label: 'Tài Xỉu', icon: '🎲', historyUrl: 'lc79/history' },
            taixiu_md5: { id: 'taixiu_md5', label: 'Tài Xỉu MD5', icon: '🔐', historyUrl: 'lc79md5/history' }
        };

        const GAME_CONFIG = [
            {
                id: 'lc79',
                name: 'LC79',
                accent: '#f7d44a',
                accentLight: '#fbbf24',
                accentGlow: 'rgba(247,212,74,0.25)',
                modes: ['taixiu', 'taixiu_md5'],
                historyUrls: {
                    taixiu: 'lc79/history',
                    taixiu_md5: 'lc79md5/history'
                }
            },
            {
                id: 'betvip',
                name: 'BetVip',
                accent: '#00d4ff',
                accentLight: '#38bdf8',
                accentGlow: 'rgba(0,212,255,0.25)',
                modes: ['taixiu', 'taixiu_md5'],
                historyUrls: {
                    taixiu: 'betvip/history',
                    taixiu_md5: 'betvipmd5/history'
                }
            }
        ];

        const HISTORY_LIMIT = 50;
        const state = {};

        GAME_CONFIG.forEach(game => {
            state[game.id] = {};
            game.modes.forEach(modeId => {
                state[game.id][modeId] = [];
            });
        });

        // ================= API FETCH =================
        async function fetchSessionData(gameId, modeId) {
            const url = '/api/' + gameId + '/' + modeId;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const data = await response.json();
                if (data && Array.isArray(data.list)) {
                    return data.list;
                }
                return [];
            } catch (err) {
                console.warn('Lỗi fetch:', err.message);
                return null;
            }
        }

        async function refreshGameData(gameId, modeId) {
            const sessions = await fetchSessionData(gameId, modeId);
            if (sessions !== null) {
                state[gameId][modeId] = sessions;
                updateGameUI(gameId);
            }
        }

        async function refreshAllData() {
            const tasks = [];
            GAME_CONFIG.forEach(game => {
                game.modes.forEach(modeId => {
                    tasks.push(refreshGameData(game.id, modeId));
                });
            });
            await Promise.allSettled(tasks);
        }

        // ================= RENDER =================
        const grid = document.getElementById('gamesGrid');

        function render() {
            grid.innerHTML = '';
            GAME_CONFIG.forEach(game => {
                const card = createGameCard(game);
                grid.appendChild(card);
            });
            updateClock();
        }

        function createGameCard(game) {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.style.setProperty('--accent', game.accent);
            card.style.setProperty('--accent-light', game.accentLight);
            card.style.setProperty('--accent-glow', game.accentGlow);
            card.dataset.gameId = game.id;

            const header = document.createElement('div');
            header.className = 'card-header';
            header.innerHTML = `
                <div class="game-info">
                    <div class="game-icon">🎮</div>
                    <div>
                        <div class="game-name">${game.name}</div>
                        <small>${game.id.toUpperCase()} · API v2</small>
                    </div>
                </div>
                <span class="badge vip">👑 ${state[game.id][game.modes[0]].length || 0} phiên</span>
            `;
            card.appendChild(header);

            const currentResult = document.createElement('div');
            currentResult.className = 'current-result';
            currentResult.dataset.gameId = game.id;
            currentResult.innerHTML = buildCurrentResult(game, game.modes[0]);
            card.appendChild(currentResult);

            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'tabs';
            game.modes.forEach((modeId, idx) => {
                const mode = MODE_DEFS[modeId];
                const btn = document.createElement('button');
                btn.className = `tab-btn ${idx === 0 ? 'active' : ''}`;
                btn.dataset.gameId = game.id;
                btn.dataset.modeId = modeId;
                btn.innerHTML = `<span class="tab-icon">${mode.icon}</span> ${mode.label}`;
                btn.addEventListener('click', () => switchTab(game.id, modeId));
                tabsContainer.appendChild(btn);

                // Nút API lịch sử
                const apiUrl = game.historyUrls[modeId];
                const apiLink = document.createElement('a');
                apiLink.href = '/' + apiUrl;
                apiLink.target = '_blank';
                apiLink.className = 'api-btn';
                apiLink.style.marginLeft = '8px';
                apiLink.textContent = '📜 API';
                btn.appendChild(apiLink);
            });
            card.appendChild(tabsContainer);

            game.modes.forEach((modeId, idx) => {
                const content = document.createElement('div');
                content.className = `tab-content ${idx === 0 ? 'active' : ''}`;
                content.dataset.gameId = game.id;
                content.dataset.modeId = modeId;
                content.innerHTML = buildTabContent(game, modeId);
                card.appendChild(content);
            });

            return card;
        }

        function buildCurrentResult(game, modeId) {
            const sessions = state[game.id][modeId] || [];
            if (sessions.length === 0) {
                return '<span class="label">🎯 Phiên gần nhất: <span style="color:rgba(255,255,255,0.2)">Chưa có</span></span>';
            }
            const latest = sessions[0];
            const isTai = latest.ket_qua === 'Tài';
            const badgeClass = isTai ? 'tai' : 'xiu';
            const badgeText = latest.ket_qua;
            const diceStr = [latest.dice_1, latest.dice_2, latest.dice_3].filter(d => d !== null).join(' - ');
            return `
                <span class="label"><span class="live"></span> Phiên #${latest.phien}</span>
                <div class="result-badge ${badgeClass}">
                    <span class="arrow">→</span>
                    <span>${isTai ? '🟠' : '🔵'} ${badgeText}</span>
                    <span class="arrow">←</span>
                </div>
                <div class="result-info">
                    <span>🎲 ${diceStr}</span>
                    <span>📊 ${latest.tong}</span>
                </div>
            `;
        }

        function buildTabContent(game, modeId) {
            const sessions = state[game.id][modeId] || [];
            const taiCount = sessions.filter(s => s.ket_qua === 'Tài').length;
            const xiuCount = sessions.filter(s => s.ket_qua === 'Xỉu').length;
            const total = sessions.length;
            const taiPercent = total > 0 ? Math.round((taiCount / total) * 100) : 0;
            const xiuPercent = total > 0 ? Math.round((xiuCount / total) * 100) : 0;

            let historyHtml = '';
            if (sessions.length === 0) {
                historyHtml = '<div class="empty-state"><span class="loading-spinner"></span> Đang tải dữ liệu...</div>';
            } else {
                historyHtml = sessions.map(s => {
                    const resultClass = s.ket_qua === 'Tài' ? 'tai' : 'xiu';
                    const dices = [s.dice_1, s.dice_2, s.dice_3].filter(d => d !== null).map(d => `<span class="dice">${d}</span>`).join('');
                    return `
                        <div class="history-row">
                            <span class="session-id">#${s.phien}</span>
                            <span><span class="result-badge-small ${resultClass}">${s.ket_qua}</span></span>
                            <span>${s.tong}</span>
                            <span class="dice-container">${dices}</span>
                        </div>
                    `;
                }).join('');
            }

            return `
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-value tai-stat">${taiCount}</div>
                        <div class="stat-label">🟠 Tài</div>
                        <div class="stat-percent">${taiPercent}%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value xiu-stat">${xiuCount}</div>
                        <div class="stat-label">🔵 Xỉu</div>
                        <div class="stat-percent">${xiuPercent}%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value total-stat">${total}</div>
                        <div class="stat-label">📊 Tổng</div>
                        <div class="stat-percent">100%</div>
                    </div>
                </div>
                <div class="history-container">
                    <div class="history-header">
                        <span>Phiên ID</span>
                        <span>Kết quả</span>
                        <span>Điểm</span>
                        <span>Xúc xắc</span>
                    </div>
                    ${historyHtml}
                </div>
            `;
        }

        function updateGameUI(gameId) {
            const game = GAME_CONFIG.find(g => g.id === gameId);
            if (!game) return;
            const card = document.querySelector('.game-card[data-game-id="' + gameId + '"]');
            if (!card) return;

            const activeMode = card.querySelector('.tab-btn.active')?.dataset.modeId || game.modes[0];
            const badge = card.querySelector('.badge');
            if (badge) badge.textContent = '👑 ' + (state[gameId][activeMode]?.length || 0) + ' phiên';

            const currentResult = card.querySelector('.current-result');
            if (currentResult) currentResult.innerHTML = buildCurrentResult(game, activeMode);

            card.querySelectorAll('.tab-content').forEach(content => {
                const mId = content.dataset.modeId;
                content.innerHTML = buildTabContent(game, mId);
            });
        }

        function switchTab(gameId, modeId) {
            const card = document.querySelector('.game-card[data-game-id="' + gameId + '"]');
            if (!card) return;
            card.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.modeId === modeId);
            });
            card.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.dataset.modeId === modeId);
            });
            const game = GAME_CONFIG.find(g => g.id === gameId);
            const badge = card.querySelector('.badge');
            if (badge) badge.textContent = '👑 ' + (state[gameId][modeId]?.length || 0) + ' phiên';
            const currentResult = card.querySelector('.current-result');
            if (currentResult) currentResult.innerHTML = buildCurrentResult(game, modeId);
        }

        function updateClock() {
            const now = new Date();
            document.getElementById('clock').textContent = '🕐 ' + now.toTimeString().split(' ')[0];
        }
        setInterval(updateClock, 1000);

        function showToast(message, icon = '📡', accent = '#fcd34d') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.setProperty('--accent', accent);
            toast.innerHTML = `
                <span class="toast-icon">${icon}</span>
                <span class="toast-msg">${message}</span>
                <button class="toast-close">&times;</button>
            `;
            toast.querySelector('.toast-close').addEventListener('click', () => {
                toast.classList.add('out');
                setTimeout(() => toast.remove(), 350);
            });
            container.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.add('out');
                    setTimeout(() => toast.remove(), 350);
                }
            }, 3000);
        }

        async function init() {
            render();
            showToast('🚀 Đang kết nối API...', '⚡', '#fcd34d');
            await refreshAllData();
            GAME_CONFIG.forEach(game => updateGameUI(game.id));
            showToast('✅ Dữ liệu đã được tải thành công', '📡', '#4ade80');
            setInterval(async () => {
                await refreshAllData();
                GAME_CONFIG.forEach(game => updateGameUI(game.id));
            }, 10000);
        }

        init();
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📜 API lịch sử:`);
    console.log(`   - http://localhost:${PORT}/lc79/history`);
    console.log(`   - http://localhost:${PORT}/lc79md5/history`);
    console.log(`   - http://localhost:${PORT}/betvip/history`);
    console.log(`   - http://localhost:${PORT}/betvipmd5/history`);
});