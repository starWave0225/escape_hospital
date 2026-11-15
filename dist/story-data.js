const HospitalCase = (() => {
  const nurseBirthday = { month: 7, day: 14 };
  const nursePhonePin = [nurseBirthday.month, nurseBirthday.day].map((part) => String(part).padStart(2, "0")).join("");
  const opening = [
    { shot: "airport", seconds: 7, text: "我叫林一。2026 年 6 月，我在国外办完毕业手续，买了回京海的机票。" },
    { shot: "airport", seconds: 7.8, text: "我妈有一阵没接电话。冯萍说她住过几天院，又劝我别回来，说家里不安全。" },
    { shot: "airport", seconds: 7, text: "我还是回来了。我想先看看我妈，再去问我爸，家里到底出了什么事。" },
    { shot: "car", seconds: 8.3, text: "落地以后，有人来接我。我记得自己坐在车后座，看着路灯一盏盏往后退。后来我睡着了。" },
    { shot: "black", seconds: 7.4, text: "中间我好像醒过一次。头顶有盏白灯，有人按着我的胳膊。再往后，我就记不清了。" },
  ];

  const documents = {
    wrist: ["林一的入院腕带", "201 病房", "林一，25 岁。床位 201。入院日期：2026 年 6 月。腕带背面有行小字：随身物品暂存一楼挂号室。"],
    note: ["冯萍的字条", "201 病房", "哥，刀留给你。那通电话里叫你别回来，原本是表叔让我说的。后来我看见他们把你的名字写进名单，才知道你回来会出什么事。别等人来接。要找我留下的东西，翻一下床尾的旧书。"],
    rounds: ["夜间巡查单", "201 病房", "201 床的病人醒后须送处置室复查。交接期间不得离开病区。附注：如遇林先生来电，直接转值班室。"],
    pickup: ["机场接送回执", "103 挂号室", "接机人受林博览委派，接到林一后送京海市立医院住院部。回执附有航班抵达时间 18:40，安排确认于返国前三日。"],
    photo: ["林海的家庭合照", "103 挂号室", "林海站在三个孩子中间。背面依次写着林晨、林心雨、林画。最右边的女孩就是刚才在二楼见到的人。"],
    contacts: ["值班号码簿", "202 值班室", "家属接送联系人：冯如、林博览。海外办公室总机附在林氏集团的回访联系人一栏。向院外拨号可用通讯室座机。"],
    nurseBirthday: ["夜班护士的交班便笺", "202 值班室 · 值班桌抽屉", `手机在 303 的推车上充电，换班时帮我拿一下。\n另一种笔迹在下面补了一句：${nurseBirthday.month} 月 ${nurseBirthday.day} 日你生日，别换班，我们给你留块蛋糕。`],
    consent: ["提前签好的入院同意记录", "203 处置室", "患者林一。办理时间 17:10。就诊原因栏写着‘家族病史’，意愿一栏已经勾选‘本人同意’。这份文件是在飞机降落前填完的。"],
    escort: ["冯如的接送确认", "203 处置室", "返国前一日，冯如确认林一可以由林博览安排送院。附注写着：林一若主动联系家里，由本人接回，后续交林博览安排。"],
    maintenance: ["住院部夜间维修交接单", "101 检查室", "地下室铁门钥匙暂存 101 检查室。三楼应急照明熔断器已拆下，备件在 B03 设备间。取到备件后，带到 B01 配电室恢复供电。"],
    lab: ["送检回执与签收单", "102 药房", "送检物来自林海、林晨和林心雨收到的同一批补品。回执注明检出同一种未列明的外来成分。签收人林博览。另一份留样标着冯如的名字，出自同一批货。"],
    route: ["后勤动线图", "B02 洗衣房", "救护车可以从东侧后勤门靠近住院楼。内门锁着，备用钥匙与应急照明备件都由 B03 设备间保管。图上标出了三楼还在使用的病房。"],
    wristHua: ["林画的五月入院腕带", "与林画交谈", "入院日期 2026 年 5 月。林画说那天被送进来的还有林海、林晨和林心雨。她的登记事由也是‘家族病史’。"],
    morning: ["林晨的口述", "301 旧病房", "林晨说林博览常催他们用同一批补品，几人的异常是后来才陆续出现的。他认出了林画，还记得父亲被送去观察室。林心雨当夜病情恶化，已被从 301 转走。"],
    admissions: ["五月住院名册", "302 档案室", "林海、林晨、林心雨、林画四人于五月登记入院。内页的送院安排由林博览签字。六月林一的入院号新添在同一页。"],
    transfer: ["当夜转送单", "302 档案室", "地址：京海市立医院东院区，松桥路 18 号。林晨仍在 301，林海留在 303，林心雨转入 303 内侧监护间。家属与院外人员询问时统一转林博览处理。"],
    original: ["被抽走的原始交班页", "303 观察室", "林海在四月前已有失神和步态异常。林晨、林心雨后来也出现类似症状，均曾收到同批补品。原页还有一条：林博览要求对来访者隐去房号。落款下方写着‘此页不随正式记录归档’。"],
    surgery: ["王多丽的手术改期消息", "林画保存的消息", "4 月，王多丽发给林画：你冯阿姨说博览替我改了时间。等做完这个小手术，我带你回去吃饭。日期与王多丽死亡当天的记录相符。"],
    recording: ["冯萍留下的录音", "201 床尾旧书", "冯如：我照你说的劝她改期。你说那场手术出了事也只会按事故算，怎么还有人在问？\n林博览：王多丽的手术是我安排的。你当时肯帮忙，难道没想过她要是活着，回去还会继续做林太太？\n冯如：林一在国外。你答应过我，他只要留在那儿，你就不动他。"],
    letter: ["林博览写给冯萍的信", "201 床尾旧书", "你姓冯，是因为当年的事不能让人知道。你始终是我的女儿。公司里现在没人知道这个关系，你先好好实习。等我把国内的事定下来，最后坐那个位置的人会是你。"],
    board: ["2024 年董事会纪要", "Katty 回传", "林海卸下日常管理，保留集团重大决策权。拟安排林一留学归来后参与国内管理，由现任负责人林博览带教交接。林博览对培养方案保留异议。"],
    forumPost: ["林一的论坛求救帖", `303 观察室 · 论坛账号「${HospitalForum.author}」`, HospitalForum.post],
    call: ["给 Katty 的密电", "303 观察室", "林一和林画用护士的手机拨给 Katty。林画亲口确认她和哥哥都还在医院，林一按转送单报出院区地址和病房号。Katty 从海外联系京海的同事报警、叫救护车，并通知他们在东侧后勤门接应。"],
  };

  const tools = {
    knife: ["餐刀", "从 201 床垫下找到。冯萍留给林一脱困的餐刀。"],
    phoneKey: ["通讯室钥匙", "打开 202 值班室内侧的通讯室。和门互动时自动使用。"],
    archiveKey: ["档案室钥匙", "打开三楼 302 档案室。和门互动时自动使用。"],
    basementKey: ["地下室钥匙", "从 101 检查室找到。打开一楼楼梯口通往地下室的铁门。"],
    fuse: ["应急照明备件", "从 B03 设备间找到。带去 B01 配电室，接通三楼的应急照明。"],
    exitKey: ["后勤门钥匙", "打开 B02 洗衣房外的后勤门。和门互动时自动使用。"],
  };

  const findings = [
    { title: "林一为何被送进医院", documents: ["wrist", "pickup", "consent", "admissions"], conclusion: "林博览提前安排接机和送院。所谓‘本人同意’的登记早于航班落地。" },
    { title: "所谓的家族遗传", documents: ["lab", "original", "morning", "transfer"], conclusion: "几人的症状与同一批补品有关。住院记录被删改，病房号被隐去。冯如自己的补品也牵涉其中。" },
    { title: "王多丽之死与冯如的选择", documents: ["surgery", "recording", "escort"], conclusion: "林博览策划了王多丽之死，冯如参与了改期，后来也同意把林一送进医院。" },
    { title: "林博览的夺权目的", documents: ["board", "letter"], conclusion: "林海要把国内业务交给林一。林博览打算掌权后让自己的亲生女儿冯萍接班。" },
    { title: "两个妹妹各自做过什么", documents: ["note", "letter", "wristHua", "photo", "call"], conclusion: "冯萍留刀和录音救哥哥。林画也在五月入院，她亲口向生母 Katty 求援。" },
  ];

  const memories = {
    "1F-vision": {
      title: "门廊的灯",
      object: "钥匙",
      x: 598,
      top: 283,
      relations: [["冯如", "母亲", "我以为家里真出了事，她一定会打电话告诉我。"]],
      detail: "出国前，妈妈在门廊替我扣上领口那颗扣子。\n\n「你到那边把书念好。家里的事，我来管。」\n\n她没问我什么时候回来。我以为只要真出了事，她总会打电话告诉我。",
    },
    "2F-vision": {
      title: "切歪的蛋糕",
      object: "生日纸牌",
      x: 537,
      top: 338,
      relations: [["冯萍", "同母异父的妹妹", "我以为她随妈妈姓，是因为她爸爸一直没回来。"]],
      detail: "我把切得厚的那一块推给她。她低头用叉子拨着奶油。\n\n「哥，为什么你姓林，我姓冯？」\n「你随妈妈姓呀。来，看看下午那道题。」\n\n我当时以为，她只是又听谁问起那个从没回来过的人。",
    },
    "3F-vision": {
      title: "答应过的事",
      object: "袖扣",
      x: 617,
      top: 310,
      relations: [["林博览", "表叔", "爸爸不在的时候，我总觉得先找表叔就对了。他答应我的事都记得。"]],
      detail: "打雷的那晚，我从被子底下攥住他的袖口。\n\n「你明天还来吗？」\n「来。你安心睡，我答应你的事什么时候忘过？」\n\n第二天他果然赶来了。后来有事找不到爸爸，我也总是先给表叔打电话。",
    },
    "B1-vision": {
      title: "电话那头的碗筷",
      object: "听筒",
      x: 742,
      top: 331,
      relations: [
        ["林海", "父亲", "我以为回去吃顿饭，就能认识他在海外的家。"],
        ["林晨、林心雨、林画", "同父异母的弟妹", "我只在电话里听过他们的名字，以为他们都是王多丽的孩子。"],
        ["王多丽", "父亲的妻子", "我那时一直把她当成三个弟妹的妈妈。"],
      ],
      detail: "电话里有人摆了碗筷。爸爸用手捂了下话筒，又把声音放轻。\n\n「林晨、心雨，还有林画。等你回来，咱们一起吃顿饭。」\n\n我记住了三个名字。听他说起王阿姨，我顺口以为三个孩子都是她生的。我还以为那顿饭很快就能吃上。",
    },
  };

  function spot(id, label, x, top, icon = "档") {
    return { id, label, x, top, icon };
  }

  const locations = {
    "2F-hall": [spot("meet", "和林画说话", 1690, 358, "人")],
    "2F-room-2": [spot("phone", "打开通讯室并拨号", 778, 375, "话")],
    "1F-room-3": [spot("front", "查看正门", 773, 348, "门")],
    "3F-room-1": [spot("morning", "和林晨说话", 598, 395, "人")],
    "3F-room-3": [spot("surgery", "和林画核对手术改期", 587, 397, "人"), spot("rescue", "查看护士留下的手机", 746, 359, "话")],
    "B1-room-1": [spot("power", "接通应急照明", 612, 345, "电")],
    "B1-room-2": [spot("exit", "打开后勤门", 754, 325, "门")],
  };

  function container(id, label, outline, contents, options = {}) {
    return { id, label, outline, contents, art: "drawer", ...options };
  }

  const storage = {
    "2F-room-1": [
      container("bedside", "床头柜抽屉", [331, 353, 63, 47], ["battery", "wrist", "note", "rounds"]),
      container("old-book", "床尾的旧书", [258, 360, 45, 26], ["recording", "letter"], { art: "book", requires: "note" }),
    ],
    "2F-room-2": [container("desk", "值班桌抽屉", [658, 342, 61, 124], ["phoneKey", "archiveKey", "contacts", "nurseBirthday"])],
    "2F-room-3": [container("treatment", "处置台下的铁盒", [280, 376, 66, 40], ["consent", "escort", "medicine-2F-room-3"], { art: "case" })],
    "1F-room-1": [container("exam-drawer", "检查室柜子抽屉", [529, 338, 88, 35], ["spare-battery", "maintenance", "basementKey"], { cabinet: [521, 311, 104, 153] })],
    "1F-room-2": [container("pharmacy", "药柜抽屉", [812, 372, 79, 63], ["lab", "medicine-1F-room-2"])],
    "1F-room-3": [container("reception", "挂号台下面的抽屉", [473, 324, 203, 37], ["pickup", "photo"])],
    "3F-room-2": [container("filing", "档案柜抽屉", [812, 297, 73, 148], ["admissions", "transfer"])],
    "3F-room-3": [container("observation", "观察室床边柜", [477, 360, 117, 101], ["original"])],
    "B1-room-2": [container("linen", "洗衣房置物架上的铁盒", [780, 372, 60, 40], ["route"], { art: "case" })],
    "B1-room-3": [container("toolbox", "设备间工具箱", [567, 353, 91, 45], ["exitKey", "fuse"], { art: "case" })],
  };

  const icons = {
    memory: "memory",
    wrist: "wristband", wristHua: "wristband", note: "note", photo: "photo", nurseBirthday: "note",
    recording: "cassette", letter: "letter", contacts: "notebook", admissions: "notebook", route: "plan",
    morning: "transcript", surgery: "transcript", call: "transcript", forumPost: "transcript",
    phoneKey: "key", archiveKey: "key", basementKey: "key", exitKey: "key", knife: "knife", fuse: "fuse",
  };

  return { opening, documents, tools, findings, memories, locations, storage, icons, nursePhonePin };
})();
