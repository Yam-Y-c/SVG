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
    if (char === "\n") {
      lines.push(line || " ");
      line = "";
      units = 0;
      continue;
    }
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

function textLines(lines, x, y, { size = 21, color = "#202b3e", weight = 400, gap = 32 } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}">${lines
    .map((line, i) => `<tspan x="${x}" dy="${i ? gap : 0}">${esc(line)}</tspan>`)
    .join("")}</text>`;
}

function chipRows(tags) {
  const rows = [[]];
  let used = 0;
  for (const tag of tags) {
    const label = tag.startsWith("#") ? tag : `#${tag}`;
    const width = Math.min(610, 34 + [...label].reduce((n, ch) => n + (/[\u0000-\u00ff]/.test(ch) ? 10 : 18), 0));
    if (used + width + 10 > 616 && rows.at(-1).length) {
      rows.push([]);
      used = 0;
    }
    rows.at(-1).push({ label, width });
    used += width + 10;
  }
  return rows;
}

module.exports = function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  const q = url.searchParams;
  const score = Math.max(0, Math.min(10, Number.parseFloat(q.get("s") || "8.4") || 0));
  const rank = q.get("r") || "▲ 1위";
  const scale = q.get("d") || "광역 C급";
  const location = q.get("l") || q.get("loc") || "도심 중앙구";
  const casualties = q.get("x") || q.get("cas") || "0명";
  const note = q.get("n") || "현장 통제 완료. 추가 피해 보고 없음.";
  const compactTags = q.get("g");
  const tags = (compactTags
    ? compactTags.split("~").filter(Boolean)
    : q.getAll("tag").length
      ? q.getAll("tag")
      : ["신속대응", "시민보호", "협회해명요구"]
  ).slice(0, 5);
  const rawComments = q.getAll("c");
  const compactComments = rawComments.length === 1 && rawComments[0].includes("~")
    ? rawComments[0].split("~").filter(Boolean)
    : rawComments;
  const comments = (compactComments.length ? compactComments : [
    "익명1|오늘 대응은 빨랐음",
    "익명2|대피 안내는 조금 늦었던 것 같은데",
    "익명3|현장에 있었는데 통제는 잘 됐음",
    "익명4|협회에서 공식 설명 올려야 할 듯",
    "익명5|다음 업데이트 기다리는 중",
  ]).slice(0, 8);

  const noteLines = wrap(note, 43);
  const rows = chipRows(tags);
  const commentData = comments.map((raw, index) => {
    const cut = raw.indexOf("|");
    const author = cut >= 0 ? raw.slice(0, cut) : `익명${index + 1}`;
    const body = cut >= 0 ? raw.slice(cut + 1) : raw;
    const lines = wrap(body, 33);
    return { author, lines, height: 46 + lines.length * 31 };
  });

  const noteHeight = 62 + noteLines.length * 33;
  const trendsHeight = 86 + rows.length * 54;
  const commentsHeight = 78 + commentData.reduce((sum, item) => sum + item.height, 0) + 18;
  const height = 118 + 190 + 24 + 198 + 20 + noteHeight + 20 + trendsHeight + 20 + commentsHeight + 32;
  const svg = [];
  let y = 0;

  svg.push(`<rect width="720" height="${height}" fill="#f7f9fc"/>`);
  svg.push(`<rect width="720" height="${height}" fill="url(#grid)"/>`);
  svg.push(`<rect width="720" height="92" fill="#080c14"/>`);
  svg.push(`<rect y="91" width="720" height="2" fill="#3a8fff" opacity="0.8"/>`);
  svg.push(`<rect x="30" y="26" width="4" height="35" fill="#3a8fff"/>`);
  svg.push(`<text x="48" y="54" font-size="27" font-weight="700" fill="#e8edf5">가디언즈</text>`);
  svg.push(`<text x="686" y="42" text-anchor="end" font-size="14" font-weight="700" letter-spacing="2" fill="#3a8fff">GUARDIANS // LIVE</text>`);
  svg.push(`<text x="686" y="62" text-anchor="end" font-size="11" letter-spacing="1.5" fill="#7a90b0">PUBLIC RESPONSE MONITOR</text>`);

  y = 118;
  svg.push(`<rect x="24" y="${y}" width="672" height="190" rx="8" fill="#ffffff" stroke="#cbd8e8"/>`);
  svg.push(`<text x="52" y="${y + 38}" font-size="16" font-weight="700" letter-spacing="2" fill="#7a90b0">LIVE RATING</text>`);
  svg.push(`<text x="52" y="${y + 99}" font-size="52" font-weight="700" fill="#080c14">${score.toFixed(1)}</text>`);
  svg.push(`<text x="142" y="${y + 98}" font-size="23" fill="#7a90b0">/ 10</text>`);
  svg.push(`<rect x="545" y="${y + 48}" width="115" height="44" rx="22" fill="#eaf3ff" stroke="#b9d8ff"/>`);
  svg.push(`<text x="602" y="${y + 77}" text-anchor="middle" font-size="19" font-weight="700" fill="#3a8fff">${esc(rank)}</text>`);
  svg.push(`<rect x="52" y="${y + 132}" width="608" height="20" rx="10" fill="#e5ebf3"/>`);
  svg.push(`<rect x="52" y="${y + 132}" width="${Math.round(608 * score / 10)}" height="20" rx="10" fill="url(#scoreBar)"/>`);
  svg.push(`<line x1="356" y1="${y + 129}" x2="356" y2="${y + 155}" stroke="#ffffff" stroke-width="2" opacity="0.8"/>`);

  y += 214;
  svg.push(`<text x="24" y="${y + 24}" font-size="17" font-weight="700" letter-spacing="1.5" fill="#3a8fff">DISASTER STATISTICS</text>`);
  y += 46;
  const stats = [["재난 규모", scale, "#ff4d6d"], ["현장 위치", location, "#3a8fff"], ["인명 피해", casualties, "#ffd166"]];
  stats.forEach(([label, value, color], index) => {
    const x = 24 + index * 224;
    const lines = wrap(value, 9);
    svg.push(`<rect x="${x}" y="${y}" width="208" height="128" rx="7" fill="#ffffff" stroke="#cbd8e8"/>`);
    svg.push(`<rect x="${x}" y="${y}" width="4" height="128" rx="2" fill="${color}"/>`);
    svg.push(`<text x="${x + 20}" y="${y + 34}" font-size="15" font-weight="700" fill="#7a90b0">${label}</text>`);
    svg.push(textLines(lines, x + 20, y + 73, { size: 21, weight: 700, color: "#15223a", gap: 28 }));
  });

  y += 148;
  svg.push(`<rect x="24" y="${y}" width="672" height="${noteHeight}" rx="7" fill="#fff8fa" stroke="#ffd1da"/>`);
  svg.push(`<rect x="24" y="${y}" width="4" height="${noteHeight}" rx="2" fill="#ff4d6d"/>`);
  svg.push(`<text x="48" y="${y + 34}" font-size="16" font-weight="700" letter-spacing="1" fill="#ff4d6d">SPECIAL NOTE</text>`);
  svg.push(textLines(noteLines, 48, y + 72, { size: 21, color: "#263146", gap: 33 }));

  y += noteHeight + 20;
  svg.push(`<rect x="24" y="${y}" width="672" height="${trendsHeight}" rx="7" fill="#ffffff" stroke="#cbd8e8"/>`);
  svg.push(`<text x="48" y="${y + 38}" font-size="17" font-weight="700" letter-spacing="1.5" fill="#ff4d6d">LIVE TRENDS</text>`);
  let chipY = y + 62;
  rows.forEach((row) => {
    let chipX = 48;
    row.forEach((chip, index) => {
      const danger = (chip.label.includes("비판") || chip.label.includes("논란") || chip.label.includes("해명"));
      svg.push(`<rect x="${chipX}" y="${chipY}" width="${chip.width}" height="40" rx="20" fill="${danger ? "#fff0f3" : "#edf5ff"}" stroke="${danger ? "#ffc2ce" : "#c4ddfb"}"/>`);
      svg.push(`<text x="${chipX + chip.width / 2}" y="${chipY + 26}" text-anchor="middle" font-size="17" font-weight="700" fill="${danger ? "#e43d5d" : "#347bcf"}">${esc(chip.label)}</text>`);
      chipX += chip.width + 10;
    });
    chipY += 54;
  });

  y += trendsHeight + 20;
  svg.push(`<rect x="24" y="${y}" width="672" height="${commentsHeight}" rx="7" fill="#ffffff" stroke="#cbd8e8"/>`);
  svg.push(`<text x="48" y="${y + 42}" font-size="17" font-weight="700" letter-spacing="1.5" fill="#3a8fff">LIVE COMMENTS</text>`);
  svg.push(`<text x="660" y="${y + 42}" text-anchor="end" font-size="16" fill="#7a90b0">${comments.length} RESPONSES</text>`);
  let commentY = y + 64;
  commentData.forEach((item, index) => {
    svg.push(`<rect x="40" y="${commentY}" width="640" height="${item.height}" fill="${index % 2 ? "#fbfcfe" : "#f4f8fd"}"/>`);
    svg.push(`<path d="M58 ${commentY + 23} v12 h12" fill="none" stroke="#7a90b0" stroke-width="2"/>`);
    svg.push(`<text x="84" y="${commentY + 33}" font-size="17" font-weight="700" fill="#536985">${esc(item.author)}</text>`);
    svg.push(textLines(item.lines, 84, commentY + 65, { size: 20, color: "#202b3e", gap: 31 }));
    commentY += item.height;
  });

  const output = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
  <defs>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#3a8fff" stroke-width="1" opacity="0.05"/></pattern>
    <linearGradient id="scoreBar"><stop stop-color="#3a8fff"/><stop offset="1" stop-color="#72b4ff"/></linearGradient>
  </defs>
  <g font-family="Arial, 'Noto Sans KR', 'Malgun Gothic', sans-serif">${svg.join("")}</g>
</svg>`;

  response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.status(200).send(output);
};
