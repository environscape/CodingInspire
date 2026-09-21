# News.json 自动更新流程（AI 执行指南）

> 本文件是 AI 可读取的"脚本"。当用户要求"更新 news.json"、"从 git 拉取产品版本节点贴到 news.json"、"按流程更新新闻"等需求时，AI 必须完整读取本文件，并严格按下列步骤执行。
>
> 文件路径：`f:/Document/Arduino_prj/CodingInspire/data/news-update-procedure.md`
> 数据目标：`f:/Document/Arduino_prj/CodingInspire/data/news.json`
> Git 源：`f:/Document/Arduino_prj/Eurorack_PGM`

---

## 0. 角色与边界

- 你是 Coding Inspire 网站的"新闻编辑助手"。
- 你的职责是：从 `Eurorack_PGM` 仓库的 git 提交记录中，**只挑选已上架产品**的版本关键节点，生成中英文新闻条目，**保守地往后推迟发布日期**，并安全地写入 `news.json`。
- 你**不得**收录未上架产品或纯模拟模块（无固件）的更新。
- 你**不得**直接使用 git 提交时间作为新闻日期，必须按 §4 规则推迟。

### 不可变约束（**最高优先级，违反即失败**）

1. **旧内容只读，永不修改**：`news.json` 中已存在的 `articles[]` 元素，**任何字段都不允许改动**——包括 `id`、`title`、`title_en`、`summary`、`summary_en`、`content`、`content_en`、`cover`、`images`、`date`、`tags`、字段顺序、空格、换行。
2. **仅允许增量追加**：本次执行只能向 `articles[]` 数组末尾**追加**新元素，不允许重排、删除、重写已有元素。即使在数组中插入也视为修改，必须 append。
3. **刊登内容不得重复**：新条目在写入前必须通过 §2 步骤 7 的重复检测，未通过的丢弃；已存在的旧条目之间若发现重复也**不主动修复**，留给用户决定。
4. **写入后保持文件结构**：保持原有缩进（2 空格）、UTF-8 无 BOM、`articles` 数组与顶层 `}` 结构不变。

---

## 1. 已上架产品 → git 关键字映射表

> 这是筛选规则的核心。只处理以下产品对应的提交，其他全部忽略。

| 产品ID | 产品名称 | git 提交关键字（正则，大小写不敏感） | 固件目录（参考） | 当前已发布版本 | 封面图 |
|--------|----------|--------------------------------------|------------------|----------------|--------|
| 1  | Manifold       | `^Manifold`、`^Maniflod`、`^Cybernetics`、`^Mainfold` | Pico_RP2040/Manifold       | v1.10  | src/Manifold.jpg |
| 2  | MIDI2CV MK2    | `MIDI2CV`、`Midi2CV`                              | Arduino_Nano/Midi2CV       | v4.2   | src/MIDI2CV_MK2.webp |
| 3  | CV2MIDI        | `CV2MIDI`、`CV2MDI`                                | Arduino_Nano/CV2MIDI       | v2.2   | src/CV2MIDI.jpg |
| 5  | Convergence    | `Convergence`、`^Con v`、`^Con `                  | Arduino_Nano/Convergence   | v2.0   | src/Convergence.webp |
| 4  | Quantizer      | `Quantizer`                                       | Pico_RP2040/Quantizer      | v1.0   | src/Quantizer.jpg |
| 12 | VFAM           | `VFAM`、`vfam`                                    | Arduino_Nano/VFAM          | v2.0   | src/VFAM.webp |
| 15 | RandomSkip     | `RandomSkip`、`RandomSKip`、`Randomskip`           | Arduino_Nano/RandomSkip    | v1.0   | src/RandomSkip.jpg |
| 16 | Modulus8+4     | `Modulus84`、`Modulus8_4`、`Modulus8\+4`           | Pico_RP2040/Modulus84      | v1.0   | src/Modulus.png |

### 不收录的产品代号（一律忽略）

`AMInst`、`AMINst`、`AMI`、`Daisy granmodular`、`GranModular`、`Granmodular`、`Granmodularn`、`GM128`、`ESP32C3 MIDI INST`、`ESP32C3_MIDI_INST`、`ESP32Synth`、`POSC`、`NB v2.0`、`NB `、`MXGate`、`MXGATE`、`GateSeq`、`CounterLine`、`ContourlineExt`、`MILKV`、`MilkV`、`Pi_Zero_2W`、`RV1103`、`strudel`、`Panel Art`、`PCBART`、`Helper`、`Daisy test`、`Daisy patchtest`、`OneKnobLfo`、`MIDI2GATE`、`MXGate`、`84SEQ`、`NanoPinTest`、`PinTest`、`Pintest`、`BKP`、`TS`、`daisy`、`ESP32C3`、`Arduino_Nano`、`SpinFV1`、`Spin FV1`、`GM128`、`daisysp`、`MIDIINST`、`MIDI INST`、`MIDI_INST`、`MIDI2CV2.0`（仅 CV2MIDI2.0 这种写法才归入 CV2MIDI）。

### 纯模拟模块（不在 git 仓库，无固件，永不收录）

ADSR Envelope、4CH-Mixer&Send、Buffer Mult、MS-20 VCF、RatioMixer、4CH-Mixer、S&H LFO、VCA-2CH。

---

## 2. 执行流程

### 步骤 1：询问用户查询时间范围（**必须**）

使用 `AskUserQuestion` 工具，提出问题：

> "请选择要从 git 历史中查询的时间范围："

选项（按推荐顺序）：

| 选项 | since 参数 |
|------|-----------|
| 近 3 个月到现在 | `3 months ago` |
| 近半年到现在（推荐） | `6 months ago` |
| 近 1 年到现在 | `1 year ago` |
| 近 2 年到现在 | `2 years ago` |

并允许"自定义"——若用户选自定义，请追问起止日期。

**不要跳过这一步直接执行后续命令。** 用户必须先确认时间范围。

### 步骤 2：拉取 git 提交记录

使用 `Shell` 工具执行：

```powershell
git -C "f:/Document/Arduino_prj/Eurorack_PGM" log --pretty=format:"%h|%ai|%s" --since="<since>" --all
```

其中 `<since>` 用步骤 1 的对应值替换。

### 步骤 3：按 §1 映射表筛选

逐行扫描提交信息，**只保留**匹配 §1 表中"git 提交关键字"的行。
对每一行匹配到的产品，记录：
- 产品名称（中文/英文）
- 提交哈希 `%h`
- 提交日期 `%ai`（ISO 格式，截取到日）
- 提交信息原文（用于后续判断是否为版本节点）

### 步骤 4：识别版本关键节点

对每个产品的提交列表，**仅**保留满足下列任一条件的提交作为"版本关键节点"：

1. 提交信息中包含明确的版本号 `vX.X` 或 `vX.X.X`（如 `v1.0`、`v1.10`、`v2.2`），**且**同时出现以下"发布类"关键词：
   - `正式`、`公测`、`正式包`、`正式uf`、`发布`、`上线`、`上线发布`
   - `uf2上传`、`上传uf2`、`更新uf2`、`增加uf2`、`提交uf2`
   - `适配成功`、`完成`、`完成请测试`、`已上传`
   - `uf2 beta固件`、`beta固件`、`公测`、`正式固件`
2. 提交信息中包含版本号 + "完成"/"重构代码结构"/"重构"/"最终版本"，视为该版本的关键里程碑。
3. **同一版本多个提交**：合并为一条新闻，**取该版本范围内最早一次提交日期**作为"开发完成日"，再按 §4 推迟作为新闻发布日期。

### 不视为版本节点的情况（丢弃）

- 仅出现 `TS`、`TS yll`、`TS yb`、`TS 1` 等无意义提交。
- 仅为 bug 修复、文案修改、日志调整、性能优化、文档更新等无版本号提交。
- 包含"暂时"、"未调通"、"还未验证"、"待测试"、"还没调通"、"还没"等表示未完成的字样的提交。
- 提交信息中没有版本号的，一律不作为版本节点。

### 步骤 5：时间推迟规则（保守发布）

由于独立开发者无法保证固件发布日期绝对准确，**强制**对新闻日期做推迟：

- 推迟天数：**默认 7 天**（可询问用户是否调整：3 / 7 / 14 天）
- 取该版本范围内**最晚一次**符合步骤 4 条件的提交日期，加上推迟天数，作为新闻 `date` 字段
- 日期格式：`YYYY-MM-DD`
- 若推迟后日期晚于今天（`Asia/Shanghai` 当前日期），则**截断到今天**（不允许未来日期）

### 步骤 6：生成 news.json 条目（中英双语）

每条版本关键节点生成一个 `articles[]` 元素，模板如下：

```json
{
  "id": "<product-lower>-v<version-no-dot>",
  "title": "<产品中文名> 固件 v<version> 发布",
  "title_en": "<Product EN> Firmware v<version> Released",
  "summary": "<30~60 字中文摘要，描述这个版本的核心改进>",
  "summary_en": "<30~60 字英文摘要>",
  "content": "<p>第一段：背景说明</p><p>第二段：本次版本的具体改进点</p><p>第三段：升级方式（如适用）</p>",
  "content_en": "<p>EN translation of content</p>",
  "cover": "<封面图路径，见 §1 表>",
  "images": ["<封面图路径>"],
  "date": "<推迟后的日期 YYYY-MM-DD>",
  "tags": ["固件", "产品"]
}
```

#### id 命名规则

- 产品名小写，去掉空格、`+`、`-`、`.`：`Manifold` → `manifold`，`MIDI2CV MK2` → `midi2cvmk2`，`Modulus8+4` → `modulus84`，`CV2MIDI` → `cv2midi`
- 版本号去掉点：`v1.10` → `v110`，`v2.2` → `v22`
- 完整示例：`manifold-v110`、`convergence-v20`、`modulus84-v10`

#### 摘要撰写要点

- 中文摘要：突出"这个版本带来了什么"——新模块、新功能、bug 修复、性能改进。
- 英文摘要：用主动语态、过去时（"Added"、"Fixed"、"Released"）。
- 不要照搬 git commit message 原文，要重新组织成面向用户的新闻语言。
- 避免出现"测试"、"调试"等内部用词，改用"完成"、"优化"、"增强"。

#### 链接使用规则（support 页面跳转）

当 content / content_en 中需要让用户"下载固件"、"查看说明书"、"查阅用户手册"、"访问支持页面"时，**必须**使用 HTML 锚点链接到 support 页面，而不是纯文字描述。

- 链接路径固定为 `support.html`（相对路径，与 news.html / news-item 同级，已确认）
- 中文 content 写法示例：`<p>固件文件与说明书已上传至 <a href=\"support.html\">支持页面</a>，前往下载与查阅。</p>`
- 英文 content_en 写法示例：`<p>Firmware files and documentation are available on the <a href=\"support.html\">support page</a>.</p>`
- 不要使用"已上传至支持页面"等纯文字而不带链接
- 若条目本身不涉及固件下载或说明书查阅（如纯技术解析类），可省略此段

> ⚠️ **JSON 转义（必读）**：content / content_en 是 JSON 字符串，HTML 属性里的双引号 `"` **必须**转义为 `\"`，否则 JSON 解析失败、news 页面渲染崩溃。
>
> 写入文件时的字面文本应为：`<a href=\"support.html\">支持页面</a>`（反斜杠是字面字符，不是转义字符）。
>
> 自检：写回后用 `node -e "JSON.parse(require('fs').readFileSync('news.json','utf8'))"` 或 `python -c "import json;json.load(open('news.json'))"` 验证一次，再算成功。

> 注：此规则仅适用于本次及之后新增的条目；旧条目按 §0 不可变约束不得修改。

### 步骤 7：写入 news.json（**严格遵守不可变约束**）

#### 7.1 读取与快照

1. 使用 `Read` 读取 `f:/Document/Arduino_prj/CodingInspire/data/news.json`
2. 解析 `articles` 数组，记下原始条目数 `N_old` 与原始内容快照（用于写回前 diff 自检）

#### 7.2 重复检测（多维度，**任一命中即视为重复**）

对每个待写入的新条目 `newItem`，遍历已有 `articles[]`，依次执行下列 5 项检查：

| 检查项 | 判定方法 | 命中处理 |
|--------|----------|----------|
| (a) `id` 完全相同 | 字符串等值比较 | 丢弃 newItem |
| (b) `title` 完全相同 | 字符串等值比较（去首尾空格） | 丢弃 newItem |
| (c) `id` 同产品同版本 | 解析 id 中的 `<product>` 与 `<version>`，若两者都相同 | 丢弃 newItem |
| (d) `date` + `cover` 相同 | 同一产品同一天已刊登 | 丢弃 newItem |
| (e) 标题相似度 ≥ 0.8 | 按词级 Jaccard 相似度计算，中文按字切分 | 标记为"疑似重复"，询问用户是否保留 |

未命中任何一项的新条目，进入"待追加队列"。

#### 7.3 增量追加（**不允许修改旧元素**）

1. 将"待追加队列"中的新条目**逐一 push 到 `articles[]` 数组末尾**——绝不插入到中间、绝不替换、绝不删除既有元素
2. **不重排旧条目顺序**；新条目之间的顺序按 §2 步骤 5 计算出的 `date` 升序追加（最早的先 push）
3. **禁止**按日期重排整个数组；前端 `news.html` 已有按日期降序渲染逻辑，无需在 JSON 层排序

#### 7.4 写回前自检（**写回前必做**）

在调用 `Write` 之前，对将要写入的新 JSON 文本做下列断言，全部通过才允许写：

- [ ] 旧条目数 `N_old` 个元素的字节内容（除末尾追加的新元素外）与读取时**完全一致**
- [ ] 新 JSON 的 `articles` 数组长度 = `N_old + len(待追加队列)`
- [ ] 旧条目的 `id` 集合 = 读取时的 `id` 集合（无丢失、无新增）
- [ ] 旧条目的 `date` 集合 = 读取时的 `date` 集合
- [ ] 文件以 `{` 开头、以 `}` 结尾，2 空格缩进

任一项失败，**立即中止写入**，向用户报告失败原因与 diff 摘要，等待人工介入。

#### 7.5 写回

- 使用 `Write` 工具写回 `f:/Document/Arduino_prj/CodingInspire/data/news.json`
- 保持 2 空格缩进，UTF-8 无 BOM
- 写入后立即 `Read` 一次回读，确认旧条目未被破坏（再次跑 7.4 自检）

#### 7.6 报告

向用户展示：

- ✅ 新增条目列表：`id` + `title` + `date`
- ⏭️ 因重复跳过的条目列表：`id` + 命中的检查项 (a)~(e)
- ❓ 疑似重复待用户裁决的条目列表
- 📊 总条目数变化：`N_old` → `N_new`

### 步骤 8：用户确认

- 向用户报告新增条目数与跳过条目数
- 询问用户是否需要：
  - 调整推迟天数（默认 7 天）
  - 删除本次新增的某条目（**仅允许删除本次新增的，禁止动旧条目**）
  - 修改本次新增条目的标题/摘要（**仅允许改本次新增的**）
- 如用户无修改，流程结束

---

## 3. 完整执行示例（供 AI 参考）

假设用户选择"近半年到现在"，AI 应当：

1. 执行 `git log --since="6 months ago"` 拉取提交
2. 筛选出包含 `Manifold`、`Convergence`、`Quantizer`、`Modulus84`、`RandomSkip`、`CV2MIDI`、`VFAM`、`MIDI2CV` 的行
3. 忽略所有 `AMInst`、`Daisy granmodular`、`GM128`、`POSC`、`TS`、`ESP32C3` 等无关提交
4. 识别版本节点（如 `Manifold v1.1 正式uf提交`、`Manifold v1.2`、`Convergence v2.0 适配成功` 等）
5. 每个版本取最早关键节点提交日期 + 7 天 = 新闻日期（不晚于今天）
6. 按模板生成中英文条目
7. 写回 news.json，按日期降序

---

## 4. 常见问题

**Q: git 提交信息里有"Manifold"但没有版本号，要收录吗？**
A: 不要。版本节点必须有明确的 `vX.X` 版本号 + 发布类关键词。

**Q: 同一版本有多次"正式"提交（如 v1.1 先公测后正式），算几条新闻？**
A: 一条。取最晚一次提交日期 + 推迟天数。

**Q: 用户希望调整推迟天数怎么办？**
A: 在步骤 1 询问时间范围后，可以追加一问："是否调整推迟天数？默认 7 天，可选 3 / 7 / 14 天。"

**Q: 推迟后日期超过今天怎么办？**
A: 截断到今天，不允许未来日期出现在 news.json 中。

**Q: 已经在 news.json 中的版本还要再写一遍吗？**
A: 不要。`id` 重复则跳过，避免重复条目。

**Q: 用户要求只更新某个产品怎么办？**
A: 在 §1 映射表中只处理该产品对应的行，其他产品的提交忽略。

---

## 5. 版本历史

- 2026-09-21 v1.0：初版流程文档，覆盖 8 个已上架数字产品。
