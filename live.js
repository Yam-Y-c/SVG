const WIDTH = 720;

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrap(text, maxUnits) {
  const lines = [];
  let line = "";
  let units = 0;
  for (const char of String(text || "")) {
    const size = /[\u0000-\u00ff]/.test(char) ? 0.55 : 1;
    if (line && units + size > maxUnits) {
      lines.push(line);
      line = char;
      units = size;
    } else {
      line += char;
      units += size;
    }
  }
  if (line || !lines.length) lines.push(line || " ");
  return lines;
}

function textLines(lines, x, y, { size = 20, color = "#202b3e", weight = 400, gap = 31 } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}">${lines
    .map((line, i) => `<tspan x="${x}" dy="${i ? gap : 0}">${esc(line)}</tspan>`)
    .join("")}</text>`;
}

module.exports = function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  const q = url.searchParams;
  const title = q.get("t") || "도심 한복판 긴급 출동, 현장 상황 실시간 중계";
  const viewers = q.get("v") || "12,847명";
  const defaults = [
    "현장직관러|와 방금 저거 뭐냐 ㄷㄷ",
    "오늘도야근|등장 타이밍 미쳤네",
    "안전구역1열|저기 있는 사람들부터 빼야지",
    "히어로덕후99|액션 진짜 깔끔하다",
    "협회뭐함|지원팀 아직도 안 옴?",
    "퇴근시켜줘|카메라 흔들리는 것 봐 ㅋㅋ",
    "구조대응원함|오른쪽 건물 쪽 확인해야 할 듯",
    "뉴비시민|지금 누가 우세한 거임?",
    "랭킹충|오늘 활약이면 순위 오르겠는데",
    "팩트만말함|방금 판단은 좀 위험했음",
    "중앙구주민|우리 동네 또 이러네",
    "속보알림|대피 방송 이제 나오는 중",
    "액션감별사|저 움직임 다시 보여줘",
    "일단도망|현장 사람들은 채팅 보지 말고 피해라",
    "가디언즈고인물|이 정도면 곧 끝날 듯",
  ];
  const rawMessages = (q.getAll("m").length ? q.getAll("m") : defaults).slice(0, 24);
  const titleLines = wrap(title, 31);
  const colors = ["#347bcf", "#8b5bd6", "#df4d6d", "#228b68", "#b27616", "#526989"];
  const messages = rawMessages.map((raw, index) => {
    const cut = raw.indexOf("|");
    const nick = cut >= 0 ? raw.slice(0, cut) : `시청자${index + 1}`;
    const body = cut >= 0 ? raw.slice(cut + 1) : raw;
    const lines = wrap(body, 34);
    return { nick, lines, color: colors[index % colors.length], height: 43 + lines.length * 30 };
  });

  const titleHeight = titleLines.length * 38;
  const streamHeight = 106 + titleHeight;
  const chatHeight = 72 + messages.reduce((sum, item) => sum + item.height, 0) + 20;
  const height = 118 + streamHeight + 20 + chatHeight + 32;
  const svg = [];

  svg.push(`<rect width="720" height="${height}" fill="#f7f9fc"/>`);
  svg.push(`<rect width="720" height="${height}" fill="url(#grid)"/>`);
  svg.push(`<rect width="720" height="92" fill="#080c14"/>`);
  svg.push(`<rect y="91" width="720" height="2" fill="#3a8fff" opacity="0.8"/>`);
  svg.push(`<rect x="30" y="26" width="4" height="35" fill="#ff4d6d"/>`);
  svg.push(`<text x="48" y="54" font-size="27" font-weight="700" fill="#e8edf5">가디언즈 LIVE</text>`);
  svg.push(`<text x="686" y="42" text-anchor="end" font-size="14" font-weight="700" letter-spacing="2" fill="#ff4d6d">GUARDIANS // STREAM</text>`);
  svg.push(`<text x="686" y="62" text-anchor="end" font-size="11" letter-spacing="1.5" fill="#7a90b0">REAL-TIME PUBLIC CHAT</text>`);

  let y = 118;
  svg.push(`<rect x="24" y="${y}" width="672" height="${streamHeight}" rx="8" fill="#ffffff" stroke="#cbd8e8"/>`);
  svg.push(`<rect x="48" y="${y + 24}" width="78" height="34" rx="17" fill="#ff4d6d"/>`);
  svg.push(`<circle cx="65" cy="${y + 41}" r="5" fill="#ffffff"/>`);
  svg.push(`<text x="78" y="${y + 47}" font-size="16" font-weight="700" fill="#ffffff">LIVE</text>`);
  svg.push(`<text x="660" y="${y + 47}" text-anchor="end" font-size="17" font-weight="700" fill="#536985">● ${esc(viewers)}</text>`);
  svg.push(textLines(titleLines, 48, y + 92, { size: 27, color: "#080c14", weight: 700, gap: 38 }));

  y += streamHeight + 20;
  svg.push(`<rect x="24" y="${y}" width="672" height="${chatHeight}" rx="8" fill="#ffffff" stroke="#cbd8e8"/>`);
  svg.push(`<text x="48" y="${y + 42}" font-size="17" font-weight="700" letter-spacing="1.5" fill="#3a8fff">LIVE CHAT</text>`);
  svg.push(`<text x="660" y="${y + 42}" text-anchor="end" font-size="15" fill="#7a90b0">${messages.length} NEW MESSAGES</text>`);

  let chatY = y + 64;
  messages.forEach((message, index) => {
    svg.push(`<rect x="40" y="${chatY}" width="640" height="${message.height}" fill="${index % 2 ? "#fbfcfe" : "#f4f8fd"}"/>`);
    svg.push(`<circle cx="60" cy="${chatY + 27}" r="5" fill="${message.color}"/>`);
    svg.push(`<text x="76" y="${chatY + 33}" font-size="17" font-weight="700" fill="${message.color}">${esc(message.nick)}</text>`);
    svg.push(textLines(message.lines, 76, chatY + 64, { size: 20, color: "#202b3e", gap: 30 }));
    chatY += message.height;
  });

  const output = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
  <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#3a8fff" stroke-width="1" opacity="0.05"/></pattern></defs>
  <g font-family="Arial, 'Noto Sans KR', 'Malgun Gothic', sans-serif">${svg.join("")}</g>
</svg>`;

  response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.status(200).send(output);
};
