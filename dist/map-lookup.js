"use strict";

const PostcodeMap = (() => {
  const region = "岬汀群岛";
  const destinations = [
    { name: "渡安中心医院", address: "岬汀群岛渡安港船坞路 21 号", postal: "962418", point: [208, 292] },
    { name: "白沙湾康复医院", address: "岬汀群岛白沙湾潮生路 8 号", postal: "965307", point: [145, 172] },
    { name: "河埠联合医院", address: "岬汀群岛河埠区石桥街 36 号", postal: "968152", point: [434, 305] },
    { name: "北岬综合医院", address: "岬汀群岛北岬区雾塔路 17 号", postal: "961784", point: [465, 115] },
    { name: "东汐临港医院", address: "岬汀群岛东汐港灯塔大道 62 号", postal: "969623", point: [732, 252] },
  ];
  const islands = [
    [
      [52, 169], [71, 128], [115, 100], [156, 105], [185, 88], [229, 112], [262, 151],
      [280, 187], [256, 201], [231, 191], [193, 215], [202, 245], [239, 252],
      [264, 275], [233, 299], [215, 330], [178, 346], [159, 323], [123, 335],
      [94, 308], [100, 267], [77, 250], [83, 212], [49, 208],
    ],
    [
      [342, 133], [385, 101], [417, 104], [431, 72], [483, 61], [525, 82], [543, 117],
      [515, 142], [510, 174], [536, 198], [520, 222], [479, 214], [459, 239],
      [467, 264], [505, 279], [543, 279], [558, 314], [532, 347], [488, 347],
      [461, 376], [405, 365], [380, 331], [353, 309], [362, 274], [339, 235],
      [354, 213], [334, 181],
    ],
    [
      [647, 178], [680, 148], [715, 161], [755, 153], [778, 170], [811, 181],
      [822, 211], [801, 233], [759, 222], [744, 246], [772, 263], [799, 255],
      [819, 283], [799, 312], [756, 329], [730, 312], [698, 327], [674, 307],
      [683, 271], [654, 245], [660, 223], [639, 206],
    ],
    [[254, 381], [273, 362], [300, 368], [309, 388], [286, 401], [262, 396]],
    [[603, 347], [626, 341], [641, 361], [629, 384], [601, 377], [590, 361]],
    [[721, 87], [746, 80], [761, 94], [755, 109], [731, 116], [712, 103]],
  ];
  const roads = [
    [[75, 177], [121, 158], [145, 172], [168, 194], [150, 231], [163, 270], [208, 292], [232, 279]],
    [[112, 290], [163, 270], [177, 297], [170, 323]],
    [[116, 179], [157, 141], [184, 123], [222, 138], [250, 161]],
    [[371, 159], [412, 129], [465, 115], [509, 115]],
    [[465, 115], [477, 161], [446, 196], [422, 234], [419, 275], [434, 305], [454, 340]],
    [[377, 282], [419, 275], [434, 305], [480, 319], [519, 300]],
    [[675, 202], [714, 187], [765, 184], [793, 200]],
    [[714, 187], [714, 224], [732, 252], [721, 285], [751, 304], [790, 285]],
  ];
  const ferries = [
    [[243, 274], [286, 269], [325, 272], [356, 288]],
    [[531, 198], [577, 201], [611, 211], [656, 231]],
  ];

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function normalize(text) {
    return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function searchable(place) {
    return [place.name, place.address, place.address.replaceAll(" ", ""), place.postal].join(" ");
  }

  function find(query) {
    const normalized = normalize(query);
    const compact = normalized.replaceAll(" ", "");
    const postal = /^\d+$/u.test(compact) ? compact : "";
    if (postal && postal.length !== 6) return { matches: [], message: "请输入六位邮编，或输入街道地址。" };
    if (!normalized) return { matches: [], message: "请输入地址或六位邮编。" };
    const terms = normalized.split(/\s+/u);
    const matches = destinations.filter(place => {
      if (postal) return place.postal === postal;
      const index = normalize(searchable(place));
      return terms.every(term => index.includes(term));
    });
    return { matches, message: matches.length ? `找到 ${matches.length} 个地点。` : "地图里没有找到这个地址或邮编。" };
  }

  function path(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
  }

  function drawMap(canvas, matches) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#dcecf3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const island of islands) {
      path(ctx, island);
      ctx.closePath();
      ctx.fillStyle = "#eef0df";
      ctx.fill();
      ctx.strokeStyle = "#a2bfc1";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#87aeb9";
    ctx.lineWidth = 1.5;
    for (const ferry of ferries) {
      path(ctx, ferry);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const road of roads) {
      path(ctx, road);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#dedcc5";
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#fffdf5";
      ctx.stroke();
    }
    ctx.fillStyle = "#537281";
    ctx.font = "600 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("岬汀湾", 432, 413);
    ctx.fillText("雾岬水道", 599, 123);
    ctx.textAlign = "left";
    ctx.fillText("北 ↑", 820, 54);

    for (const { point: [x, y], postal } of matches) {
      ctx.fillStyle = "#2c65af";
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x - 9, y - 5);
      ctx.arc(x, y - 8, 10, Math.PI * .92, Math.PI * .08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y - 9, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "700 17px system-ui";
      const width = ctx.measureText(postal).width + 14;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 14, y - 22, width, 27);
      ctx.fillStyle = "#24476b";
      ctx.fillText(postal, x + 21, y - 3);
    }
  }

  function resultCard(place) {
    const card = element("article", "", "map-result-card");
    card.append(element("h3", place.name));
    const fields = element("dl", "", "map-result");
    fields.append(element("dt", "地址"), element("dd", place.address),
      element("dt", "邮编"), element("dd", place.postal, "map-result-postcode"));
    card.append(fields);
    return card;
  }

  function mount(body, query, onSearch) {
    const heading = element("h2", region + "地图", "map-site-title");
    heading.tabIndex = -1;
    const form = element("form", "", "map-lookup-form lookup-form");
    form.setAttribute("role", "search");
    const label = element("label", "地址或邮编");
    label.htmlFor = "map-lookup-input";
    const input = element("input");
    input.type = "search";
    input.id = label.htmlFor;
    input.autocomplete = "off";
    input.maxLength = 160;
    input.placeholder = "输入地址或六位邮编";
    input.value = query;
    const submit = element("button", "查询");
    submit.type = "submit";
    form.append(label, input, submit);
    form.addEventListener("submit", event => {
      event.preventDefault();
      onSearch(input.value.trim());
    });

    const { matches, message } = query ? find(query) : { matches: [], message: "输入转运单上的地址或邮编，查看对应地点。" };
    const layout = element("div", "", "map-lookup-layout");
    const figure = element("figure", "", "map-lookup-figure");
    const canvas = element("canvas", "", "map-canvas");
    canvas.width = 900;
    canvas.height = 480;
    canvas.setAttribute("aria-hidden", "true");
    drawMap(canvas, matches);
    figure.append(canvas, element("figcaption", region));
    const panel = element("section", "", "map-lookup-panel");
    const feedback = element("p", message, "map-lookup-feedback");
    feedback.setAttribute("role", "status");
    panel.append(feedback, ...matches.map(resultCard));
    layout.append(figure, panel);
    const toolbar = element("header", "", "map-site-toolbar");
    toolbar.append(heading, form);
    body.append(toolbar, layout);
  }

  return { mount, region, destinations, keywords: destinations.map(searchable) };
})();
