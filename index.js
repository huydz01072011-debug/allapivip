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

// ================= LUCK8 – LƯU TRỮ LỊCH SỬ =================
let luck8HistoryTx = [];
let luck8HistoryMd5 = [];
let lastLuck8TxSid = null;
let lastLuck8Md5Sid = null;

async function pollLuck8() {
    const urls = {
        tx: 'https://luck8bot.com/api/GetNewLottery/Taixiu',
        md5: 'https://luck8bot.com/api/GetNewLottery/TaixiuMd5'
    };

    while (true) {
        try {
            // Poll TX
            const resTx = await axios.get(urls.tx, { timeout: 10000 });
            if (resTx.data?.state === 1 && resTx.data?.data) {
                const item = resTx.data.data;
                const parts = item.OpenCode.split(',').map(Number);
                if (parts.length === 3) {
                    const sid = parseInt(item.Expect);
                    if (sid && sid !== lastLuck8TxSid) {
                        lastLuck8TxSid = sid;
                        const total = parts[0] + parts[1] + parts[2];
                        const ketQua = total >= 11 ? 'Tài' : 'Xỉu';
                        const newSession = {
                            phien: sid,
                            dice_1: parts[0],
                            dice_2: parts[1],
                            dice_3: parts[2],
                            tong: total,
                            ket_qua: ketQua
                        };
                        // Chèn vào đầu mảng, giữ tối đa HISTORY_LIMIT
                        luck8HistoryTx.unshift(newSession);
                        if (luck8HistoryTx.length > HISTORY_LIMIT) luck8HistoryTx.pop();
                        console.log(`[Luck8 TX] 🎲 Phiên ${sid} | ${parts.join('+')} = ${total} ${ketQua}`);
                    }
                }
            }

            // Poll MD5
            const resMd5 = await axios.get(urls.md5, { timeout: 10000 });
            if (resMd5.data?.state === 1 && resMd5.data?.data) {
                const item = resMd5.data.data;
                const parts = item.OpenCode.split(',').map(Number);
                if (parts.length === 3) {
                    const sid = parseInt(item.Expect);
                    if (sid && sid !== lastLuck8Md5Sid) {
                        lastLuck8Md5Sid = sid;
                        const total = parts[0] + parts[1] + parts[2];
                        const ketQua = total >= 11 ? 'Tài' : 'Xỉu';
                        const newSession = {
                            phien: sid,
                            dice_1: parts[0],
                            dice_2: parts[1],
                            dice_3: parts[2],
                            tong: total,
                            ket_qua: ketQua
                        };
                        luck8HistoryMd5.unshift(newSession);
                        if (luck8HistoryMd5.length > HISTORY_LIMIT) luck8HistoryMd5.pop();
                        console.log(`[Luck8 MD5] 🎲 Phiên ${sid} | ${parts.join('+')} = ${total} ${ketQua}`);
                    }
                }
            }
        } catch (err) {
            console.error('Lỗi poll Luck8:', err.message);
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
}

// ================= HAYWIN – LƯU TRỮ LỊCH SỬ =================
let haywinHistoryTx = [];
let haywinHistoryMd5 = [];
let lastHaywinTxSid = null;
let lastHaywinMd5Sid = null;

async function pollHayWin() {
    const urls = {
        tx: 'https://jakpotgwab.geightdors.net/glms/v1/notify/taixiu?platform_id=rik&gid=vgmn_100',
        md5: 'https://jakpotgwab.geightdors.net/glms/v1/notify/taixiu?platform_id=rik&gid=vgmn_101'
    };

    while (true) {
        try {
            // Poll TX (gid=100)
            const resTx = await axios.get(urls.tx, { timeout: 10000 });
            if (resTx.data?.status === 'OK' && Array.isArray(resTx.data.data)) {
                // Tìm game có cmd=1003 (kết quả)
                const game = resTx.data.data.find(g => g.cmd === 1003 && g.d1 && g.d2 && g.d3);
                if (game) {
                    const sid = game.sid;
                    if (sid && sid !== lastHaywinTxSid) {
                        lastHaywinTxSid = sid;
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
                        haywinHistoryTx.unshift(newSession);
                        if (haywinHistoryTx.length > HISTORY_LIMIT) haywinHistoryTx.pop();
                        console.log(`[HayWin TX] 🎲 Phiên ${sid} | ${game.d1}+${game.d2}+${game.d3} = ${total} ${ketQua}`);
                    }
                }
            }

            // Poll MD5 (gid=101)
            const resMd5 = await axios.get(urls.md5, { timeout: 10000 });
            if (resMd5.data?.status === 'OK' && Array.isArray(resMd5.data.data)) {
                // Tìm game có cmd=7006 (kết quả)
                const game = resMd5.data.data.find(g => g.cmd === 7006 && g.d1 && g.d2 && g.d3);
                if (game) {
                    const sid = game.sid;
                    if (sid && sid !== lastHaywinMd5Sid) {
                        lastHaywinMd5Sid = sid;
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
                        haywinHistoryMd5.unshift(newSession);
                        if (haywinHistoryMd5.length > HISTORY_LIMIT) haywinHistoryMd5.pop();
                        console.log(`[HayWin MD5] 🎲 Phiên ${sid} | ${game.d1}+${game.d2}+${game.d3} = ${total} ${ketQua}`);
                    }
                }
            }
        } catch (err) {
            console.error('Lỗi poll HayWin:', err.message);
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
}

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

// API nội bộ chung (bao gồm cả Luck8 và HayWin)
app.get('/api/:game/:mode', async (req, res) => {
    const { game, mode } = req.params;

    // Xử lý riêng cho Luck8
    if (game === 'luck8') {
        let history = [];
        if (mode === 'taixiu') history = luck8HistoryTx;
        else if (mode === 'taixiu_md5') history = luck8HistoryMd5;
        else return res.status(404).json({ error: 'Mode không hợp lệ' });
        return res.json({ list: history, total: history.length });
    }

    // Xử lý riêng cho HayWin
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

// Các route lịch sử riêng cho từng game (giữ nguyên để tương thích)
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

// (Không cần route riêng cho Luck8/HayWin vì đã có route động /api/:game/:mode)

// ================= START SERVER =================
// Khởi chạy polling cho Luck8 và HayWin
pollLuck8();
pollHayWin();

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📜 API lịch sử:`);
    console.log(`   - http://localhost:${PORT}/lc79/history`);
    console.log(`   - http://localhost:${PORT}/lc79md5/history`);
    console.log(`   - http://localhost:${PORT}/betvip/history`);
    console.log(`   - http://localhost:${PORT}/betvipmd5/history`);
    console.log(`   - http://localhost:${PORT}/api/luck8/taixiu`);
    console.log(`   - http://localhost:${PORT}/api/luck8/taixiu_md5`);
    console.log(`   - http://localhost:${PORT}/api/haywin/taixiu`);
    console.log(`   - http://localhost:${PORT}/api/haywin/taixiu_md5`);
    console.log(`🔄 Đang polling Luck8 và HayWin mỗi ${POLL_INTERVAL/1000} giây...`);
});