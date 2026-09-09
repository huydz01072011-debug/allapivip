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
const POLL_INTERVAL = 5000; // 5 giây

// ================= HAYWIN – LƯU TRỮ LỊCH SỬ =================
const haywinHistoryTx = [];
const haywinHistoryMd5 = [];
let lastSidTx = null;
let lastSidMd5 = null;

// Hàm poll cho một bàn HayWin
async function pollHayWin(gid, historyArray, lastSidRef, modeName) {
    while (true) {
        try {
            const url = `https://jakpotgwab.geightdors.net/glms/v1/notify/taixiu?platform_id=rik&gid=${gid}`;
            const res = await axios.get(url, { timeout: 10000 });
            if (res.data?.status === 'OK' && Array.isArray(res.data.data)) {
                const cmd = (gid === 'vgmn_100') ? 1003 : 7006;
                const game = res.data.data.find(g => g.cmd === cmd && g.d1 && g.d2 && g.d3);
                if (game) {
                    const sid = game.sid;
                    if (sid && sid !== lastSidRef.value) {
                        lastSidRef.value = sid;
                        const total = game.d1 + game.d2 + game.d3;
                        const ketQua = total >= 11 ? 'Tài' : 'Xỉu';
                        const newSession = {
                            phien: sid,
                            dice_1: game.d1,
                            dice_2: game.d2,
                            dice_3: game.d3,
                            tong: total,
                            ket_qua: ketQua
                        };
                        // Kiểm tra trùng lặp
                        const exists = historyArray.some(item => item.phien === sid);
                        if (!exists) {
                            historyArray.unshift(newSession);
                            if (historyArray.length > HISTORY_LIMIT) historyArray.pop();
                            console.log(`[HayWin ${modeName}] 🎲 Phiên ${sid} | ${game.d1}+${game.d2}+${game.d3} = ${total} ${ketQua}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`Lỗi poll HayWin ${modeName}:`, err.message);
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
}

// Khởi chạy polling cho cả 2 bàn HayWin
pollHayWin('vgmn_100', haywinHistoryTx, { value: lastSidTx }, 'Tài Xỉu');
pollHayWin('vgmn_101', haywinHistoryMd5, { value: lastSidMd5 }, 'MD5');

// ================= HELPERS (cho LC79 & BetVip) =================
async function fetchFromExternal(url) {
    try {
        const response = await axios.get(url, { timeout: 10000 });
        if (response.data && Array.isArray(response.data.list)) {
            return response.data.list.slice(0, HISTORY_LIMIT);
        }
        return [];
    } catch (error) {
        console.error(`❌ Lỗi fetch ${url}:`, error.message);
        return null;
    }
}

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
// Trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API nội bộ chung (bao gồm HayWin)
app.get('/api/:game/:mode', async (req, res) => {
    const { game, mode } = req.params;

    // Xử lý riêng cho HayWin (dữ liệu đã có sẵn trong bộ nhớ)
    if (game === 'haywin') {
        let history = [];
        if (mode === 'taixiu') history = haywinHistoryTx;
        else if (mode === 'taixiu_md5') history = haywinHistoryMd5;
        else return res.status(404).json({ error: 'Mode không hợp lệ' });
        return res.json({ list: history, total: history.length });
    }

    // Các game khác (LC79, BetVip)
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

// Các route lịch sử riêng cho HayWin
app.get('/haywin/history', (req, res) => {
    res.json(haywinHistoryTx);
});

app.get('/haywinmd5/history', (req, res) => {
    res.json(haywinHistoryMd5);
});

// Các route lịch sử cũ (giữ nguyên)
app.get('/lc79/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.lc79.taixiu);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

app.get('/lc79md5/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.lc79.taixiu_md5);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

app.get('/betvip/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.betvip.taixiu);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

app.get('/betvipmd5/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.betvip.taixiu_md5);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📜 API lịch sử:`);
    console.log(`   - http://localhost:${PORT}/lc79/history`);
    console.log(`   - http://localhost:${PORT}/lc79md5/history`);
    console.log(`   - http://localhost:${PORT}/betvip/history`);
    console.log(`   - http://localhost:${PORT}/betvipmd5/history`);
    console.log(`   - http://localhost:${PORT}/haywin/history  (mới)`);
    console.log(`   - http://localhost:${PORT}/haywinmd5/history (mới)`);
    console.log(`🔄 Đang polling HayWin mỗi ${POLL_INTERVAL/1000} giây...`);
});