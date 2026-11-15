"use strict";

const recordsSiteIdentity = {
  archive: { skin: "archive", label: "个人档案", source: "只读副本", mark: "档" },
  evidence: { skin: "evidence", label: "京海案件资料", source: "材料室", mark: "证" },
  transfer: { skin: "transport", label: "院外康复转运", source: "回执查询", mark: "运" },
  endings: { skin: "receipt", label: "联络记录", source: "消息回执", mark: "信" },
};

const recordsContactIdentity = {
  "": { skin: "authority", label: "京海警方", source: "网上服务", mark: "京" },
  group: { skin: "corporate", label: "林氏集团", source: "公众反馈", mark: "林" },
  mother: { skin: "chat", label: "冯如", source: "私人联络", mark: "冯", photo: "feng-ru" },
  ping: { skin: "chat", label: "冯萍", source: "私信", mark: "冯", photo: "feng-ping" },
  katty: { skin: "chat", label: "Katty", source: "独立联络", mark: "K", photo: "katty" },
  police: { skin: "authority", label: "京海警方", source: "紧急求助", mark: "京" },
  report: { skin: "authority", label: "京海警方", source: "调查补证", mark: "京" },
};

function createRecordsMark(identity) {
  const mark = node("span", identity.mark, "records-mark");
  mark.setAttribute("aria-hidden", "true");
  if (identity.photo) {
    const portrait = node("img", "", "records-portrait");
    portrait.alt = "";
    portrait.addEventListener("error", () => portrait.remove(), { once: true });
    portrait.src = "assets/portraits/" + identity.photo + ".webp";
    mark.append(portrait);
  }
  return mark;
}

function groupRecordsMessages(content) {
  const messages = [...content.children].filter(element => element.matches(".web-reply, .forum-outgoing"));
  if (!messages.length) return;

  const conversation = node("section", "", "records-conversation");
  conversation.setAttribute("aria-label", "对话记录");
  messages[0].before(conversation);
  conversation.append(...messages);
}

function renderRecordsSite(container, section, id, params, renderContent) {
  const identity = section === "contacts" ? recordsContactIdentity[id ?? ""] : recordsSiteIdentity[section];
  if (!identity) {
    renderContent(container);
    return;
  }

  const site = node("div", "", "records-site");
  site.dataset.records = identity.skin;
  if (id) site.dataset.recordId = id;

  const masthead = node("div", "", "records-masthead");
  masthead.append(createRecordsMark(identity), node("strong", identity.label), node("span", identity.source, "records-context"));
  const content = node("div", "", "records-content");
  site.append(masthead, content);
  container.append(site);
  renderContent(content);

  if (identity.skin === "chat") groupRecordsMessages(content);
}
