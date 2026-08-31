const WIDTH = 720;

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(text, maxUnits) {
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

    const charUnits = /[\u0000-\u00ff]/.test(char) ? 0.55 : 1;
    if (units + charUnits > maxUnits && line) {
      lines.push(line);
      line = char;
      units = charUnits;
    } else {
      line += char;
      units += charUnits;
    }
  }

  if (line || lines.length === 0) lines.push(line || " ");
  return lines;
}

function textBlock(lines, x, y, options = {}) {
  const {
    size = 24,
    color = "#182235",
    weight = 400,
    lineHeight = Math.round(size * 1.55),
  } = options;

  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("")}</text>`;
}

function getPosts(searchParams) {
  const fallback = {
    title: "요즘 히어로 출동 진짜 늦어진 것 같지 않냐",
    body: "오늘도 경보 울리고 한참 뒤에 왔음. 시민 대피 안내부터 제대로 했으면 좋겠다.",
    comments: [
      "익명1|거기 관할 요즘 인원 부족하다는 말 있더라",
      "익명2|그래도 오늘은 피해 없이 끝난 게 어디냐",
      "익명3|현장에 있었는데 안내 방송도 계속 끊겼음",
      "익명4|히어로보다 관리국 운영이 문제인 듯",
      "익명5|다음부터 영상부터 찍어 둬",
    ],
    likes: "27",
  };

  const posts = [];
  for (let index = 1; index <= 2; index += 1) {
    const title = searchParams.get(`t${index}`);
    const body = searchParams.get(`b${index}`);
    const comments = searchParams.getAll(`c${index}`);

    if (title || body || comments.length) {
      posts.push({
        title: title || "제목 없음",
        body: body || "",
        comments: comments.slice(0, 8).map((comment, commentIndex) => {
          const separator = comment.indexOf("|");
          if (separator < 0) return `익명${commentIndex + 1}|${comment}`;
          return comment;
        }),
        likes: searchParams.get(`l${index}`) || "0",
      });
    }
  }

  return posts.length ? posts : [fallback];
}

function renderPost(post, startY, postNumber) {
  const titleLines = wrapText(post.title, 38);
  const bodyLines = wrapText(post.body, 43);
  const comments = post.comments.length ? post.comments : ["익명1|아직 댓글이 없습니다."];
  const commentData = comments.map((raw, index) => {
    const separator = raw.indexOf("|");
    const author = separator >= 0 ? raw.slice(0, separator) : `익명${index + 1}`;
    const content = separator >= 0 ? raw.slice(separator + 1) : raw;
    const lines = wrapText(content, 40);
    return { author, lines, height: 48 + lines.length * 32 };
  });

  const titleHeight = titleLines.length * 40;
  const bodyHeight = bodyLines.length * 36;
  const commentsHeight = commentData.reduce((sum, comment) => sum + comment.height, 0);
  const height = 86 + titleHeight + bodyHeight + 80 + commentsHeight + 22;
  let y = startY;
  const svg = [];

  svg.push(`<rect x="24" y="${y}" width="672" height="${height}" rx="8" fill="#ffffff" stroke="#cbd8e8"/>`);
  svg.push(`<rect x="24" y="${y}" width="672" height="8" rx="4" fill="#3a8fff"/>`);
  y += 54;
  svg.push(`<text x="52" y="${y}" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="1.5" fill="#7a90b0">POST // ${String(postNumber).padStart(4, "0")} · 익명</text>`);
  y += 45;
  svg.push(textBlock(titleLines, 52, y, { size: 29, weight: 700, color: "#080c14", lineHeight: 40 }));
  y += titleHeight + 26;
  svg.push(textBlock(bodyLines, 52, y, { size: 23, color: "#253044", lineHeight: 36 }));
  y += bodyHeight + 30;
  svg.push(`<line x1="52" y1="${y}" x2="668" y2="${y}" stroke="#d7e2ef"/>`);
  y += 38;
  svg.push(`<text x="52" y="${y}" font-size="20" font-weight="700" fill="#3a8fff">REPLY ${comments.length}</text>`);
  svg.push(`<text x="648" y="${y}" text-anchor="end" font-size="20" fill="#ff4d6d">♥ ${escapeXml(post.likes)}</text>`);
  y += 26;

  commentData.forEach((comment, index) => {
    svg.push(`<rect x="40" y="${y}" width="640" height="${comment.height}" fill="${index % 2 ? "#fbfcfe" : "#f4f8fd"}"/>`);
    svg.push(`<rect x="40" y="${y}" width="3" height="${comment.height}" fill="${index % 2 ? "#d7e7fb" : "#3a8fff"}" opacity="0.75"/>`);
    svg.push(`<path d="M58 ${y + 25} h12 v12" fill="none" stroke="#7a90b0" stroke-width="2"/>`);
    svg.push(`<text x="84" y="${y + 34}" font-size="18" font-weight="700" fill="#536985">${escapeXml(comment.author || `익명${index + 1}`)}</text>`);
    svg.push(textBlock(comment.lines, 84, y + 68, { size: 21, color: "#202b3e", lineHeight: 32 }));
    y += comment.height;
  });

  return { svg: svg.join(""), height };
}

module.exports = function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  const posts = getPosts(url.searchParams);
  const rendered = [];
  let y = 118;

  posts.forEach((post, index) => {
    const result = renderPost(post, y, index + 1);
    rendered.push(result.svg);
    y += result.height + 24;
  });

  const height = y + 24;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
  <defs>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3a8fff" stroke-width="1" opacity="0.055"/>
    </pattern>
  </defs>
  <rect width="720" height="${height}" fill="#f7f9fc"/>
  <rect width="720" height="${height}" fill="url(#grid)"/>
  <rect width="720" height="92" fill="#080c14"/>
  <rect y="91" width="720" height="2" fill="#3a8fff" opacity="0.75"/>
  <rect x="30" y="26" width="4" height="35" fill="#3a8fff"/>
  <text x="48" y="54" font-family="Arial, 'Noto Sans KR', sans-serif" font-size="26" font-weight="700" letter-spacing="1" fill="#e8edf5">히어로·빌런 갤러리</text>
  <text x="686" y="42" text-anchor="end" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2" fill="#3a8fff">K·HERO // BOARD</text>
  <text x="686" y="62" text-anchor="end" font-family="Arial, sans-serif" font-size="11" letter-spacing="1.5" fill="#7a90b0">ANONYMOUS ACCESS</text>
  <g font-family="Arial, 'Noto Sans KR', 'Malgun Gothic', sans-serif">${rendered.join("")}</g>
</svg>`;

  response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.status(200).send(svg);
};
