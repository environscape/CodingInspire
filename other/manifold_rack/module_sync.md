# Manifold 参数/模块/接口名称同步指南

固件（`F:\Document\Arduino_prj\Eurorack_PGM\Pico_RP2040\Manifold`）会持续迭代，
本文档记录 **网页端 `module_info.js` 与固件保持一致的规则和流程**，下次固件更新后照此同步即可。

> 需要同步时，直接对 AI 说：
> **"按照 other/manifold_rack/MODULE_SYNC.md 同步固件命名"**

---

## 1. 权威数据源（以固件为准）

| 内容 | 固件位置 |
|---|---|
| 模块类型 ID | [ModularBase.h](file:///f:/Document/Arduino_prj/Eurorack_PGM/Pico_RP2040/Manifold/Src/ModularBase.h) 中的 `TYPE_xxx` 常量、`TYPE_LENGTH` |
| 类型选择顺序 | 同文件的 `TYPE_ORDER[]`（固件下拉顺序，**网页下拉必须与之一致**） |
| 模块显示名 / 输入名 / 参数名 | [Modular/](file:///f:/Document/Arduino_prj/Eurorack_PGM/Pico_RP2040/Manifold/Modular) 下各 `XxxImpl.h` 的 `getFuncName()` / `getInputName1/2()` / `getParamName1/2/3()` |
| 路由 ID 显示名 | [model.h](file:///f:/Document/Arduino_prj/Eurorack_PGM/Pico_RP2040/Manifold/model.h) 的 `routerParamList[19]` |
| 模块数量 / 输出口数量 | [Manifold.ino](file:///f:/Document/Arduino_prj/Eurorack_PGM/Pico_RP2040/Manifold/Manifold.ino) 的 `MODULAR_NUM = 12`、`OUTPUT_NUM = 6` |
| 参数取值范围 | `ModularBase.h` 的 `VALUE_MAX = 4095` |

---

## 2. 类名 → 类型 ID 映射

固件用类名区分模块，网页用数字 ID，映射关系**必须手工确认**（固件注释里有标注）：

```
EMPTYImpl=0   LFOImpl=1      ASRImpl=2     CLKDIVImpl=3  LOGICImpl=4
SNHImpl=5     RNDImpl=6      GENSEQImpl=7  EUCLDImpl=8   ARPImpl=9
BEATIImpl=10  MIXImpl=11     FADERImpl=12  VCAImpl=13    INVImpl=14
QUANTImpl=15  FOLDImpl=16    TIMERImpl=17  RNDSKPImpl=18 CMPImpl=19
DelayImpl=20
```

---

## 3. 一键提取脚本（跑完直接对照）

```js
// 存成 temp/extract_manifold_names.js, 用 node 运行
const fs = require('fs');
const path = require('path');
const dir = 'F:/Document/Arduino_prj/Eurorack_PGM/Pico_RP2040/Manifold/Modular';
const map = {
  EMPTYImpl: 0, LFOImpl: 1, ASRImpl: 2, CLKDIVImpl: 3, LOGICImpl: 4, SNHImpl: 5,
  RNDImpl: 6, GENSEQImpl: 7, EUCLDImpl: 8, ARPImpl: 9, BEATIImpl: 10, MIXImpl: 11,
  FADERImpl: 12, VCAImpl: 13, INVImpl: 14, QUANTImpl: 15, FOLDImpl: 16, TIMERImpl: 17,
  RNDSKPImpl: 18, CMPImpl: 19, DelayImpl: 20
};
function grab(src, fnName) {
  const re = new RegExp(fnName + '\\s*\\(\\)\\s*const\\s*override\\s*\\{([\\s\\S]*?)\\n\\s*\\}');
  const m = src.match(re);
  if (!m) return null;
  const rets = [...m[1].matchAll(/return\s*"([^"]*)"/g)].map(x => x[1]);
  return rets[0] || null;   // 只取第一个 return, 动态名需人工确认
}
const out = {};
for (const [cls, id] of Object.entries(map)) {
  const src = fs.readFileSync(path.join(dir, cls + '.h'), 'utf8');
  out[id] = {
    cls,
    name: grab(src, 'getFuncName'),
    in1: grab(src, 'getInputName1'), in2: grab(src, 'getInputName2'),
    p1: grab(src, 'getParamName1'), p2: grab(src, 'getParamName2'),
    p3: grab(src, 'getParamName3')
  };
}
console.log(JSON.stringify(out, null, 1));
```

```powershell
node temp\extract_manifold_names.js
```

若某个字段输出 `null` 或两个重复值，说明该函数是**动态返回**，必须点进源文件人工阅读：

| 已知动态项 | 固件写法 | 网页取值约定 |
|---|---|---|
| CLKDIV 参数2 | `isMultMode ? "Mult" : "Divide"` | `Mult/Divide` |
| DELAY 参数2 | `getMode() == FREE ? "Delay" : "Rate"` | `Delay/Rate` |
| TIMER 参数3 | `snprintf("State>")` 等 | `State>` |

---

## 4. 当前快照（2026-11-27 同步）

`TYPE_LENGTH = 21`（0~20），`MODULE_NUM = 12`，`OUTPUT_NUM = 6`，参数范围 `0~4095`。

| ID | 模块名 | 输入1 | 输入2 | 参数1 | 参数2 | 参数3 |
|---|---|---|---|---|---|---|
| 0 | --- | --- | --- | --- | --- | --- |
| 1 | LFO | RST | Freq | Freq | Phase | Type |
| 2 | ASR | Trig | Rel | Attack | Sustain | Dec&Rel |
| 3 | CLKDIV | CLK | --- | --- | Mult/Divide | Mode |
| 4 | LOGIC | In1 | In2 | --- | --- | Type |
| 5 | S&H | Trig | Sign | Clk | Smooth | Jitter |
| 6 | RANDOM | Trig | --- | --- | Pct | Mode |
| 7 | GENSEQ | CLK | RST | Min RG | Max RG | Steps |
| 8 | EUCLD | CLK | RST | Shift | Active | Steps |
| 9 | ARP | Trig | V/OCT | Chord | Mode | Oct |
| 10 | BEATI | CLK | RST | P1 | P2 | Steps |
| 11 | MIXER | In1 | In2 | Gain1 | Gain2 | Master |
| 12 | FADER | In1 | In2 | Gain1 | Cross | Gain2 |
| 13 | VCA | CV | In | --- | Offset | Atten |
| 14 | INVERT | Sign | --- | --- | --- | Amt |
| 15 | QUANT | Trig | Sign | Root | Scale | Note-> |
| 16 | FOLD | In | CV | Heap | DryWet | Mode |
| 17 | TIMER | Gate | RST | BPM | --- | State> |
| 18 | RNDSKP | CLK | --- | Len | Amt | Mode |
| 19 | CMP | In1 | In2 | Gain1 | Gain2 | Mode |
| 20 | DELAY | Trig | CV | Repeats | Delay/Rate | Mode |

### 下拉显示顺序（`TYPE_ORDER`）

固件 `ModularBase.h` 的 `TYPE_ORDER[21]` 决定类型选择菜单的排列顺序，
网页 `module_info.js` 的 `TYPE_ORDER` 必须**逐项照抄**（下标 = 显示位置，值 = 真实类型 ID）：

| 显示位置 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 类型 ID | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 20 | 7 | 8 | 18 | 10 | 9 | 11 | 13 | 12 | 14 | 19 | 16 | 15 | 17 |
| 模块名 | --- | LFO | ASR | CLKDIV | LOGIC | S&H | RANDOM | DELAY | GENSEQ | EUCLD | RNDSKP | BEATI | ARP | MIXER | VCA | FADER | INVERT | CMP | FOLD | QUANT | TIMER |

> 固件端有编译期自检（`isValidOrder()` + `static_assert`），要求该数组是 `0..TYPE_LENGTH-1` 的完整排列；
> 网页端不做校验，改错会表现为下拉缺项/重复项，务必逐项核对。

### 路由 ID（`ROUTER_IDS`）

| ID | 显示名 | 含义 |
|---|---|---|
| 0~11 | 1MD ~ 12MD | 12 个模块的输出 |
| 12~14 | Gate1 ~ Gate3 | 物理 Gate 输入 |
| 15~17 | CV1 ~ CV3 | 物理 CV 输入 |
| 18 | ---- | 未连接 |

### 物理端口（`PHYSICAL_INPUTS` / `PHYSICAL_OUTPUTS`）

- 左面板输入：Gate1(12) / Gate2(13) / Gate3(14) / CV1(15) / CV2(16) / CV3(17)
- 右面板输出：Out1~Out6（模块 `output` 字段 1~6，0 = 无）

---

## 5. 同步落点（改哪些地方）

| 文件 | 改什么 |
|---|---|
| [module_info.js](file:///f:/Document/Arduino_prj/CodingInspire/other/manifold_rack/module_info.js) | `MODULE_TYPES` / `TYPE_ORDER` / `ROUTER_IDS` / `PHYSICAL_INPUTS` / `PHYSICAL_OUTPUTS` |
| 无需改动 | `app.js` 中类型下拉（按 `MI.TYPE_ORDER` 遍历）、端口功能名标签、toast 文案都从 `module_info.js` 动态读取 |

新增模块时要在 `MODULE_TYPES` 里加一项，并在 `TYPE_ORDER` 的相同显示位置插入该 ID
（位置与固件 `TYPE_ORDER[]` 一致）；若固件新增了类型 ID，还要确认
`TYPE_LENGTH` 变化、并检查 [app.js](file:///f:/Document/Arduino_prj/CodingInspire/other/manifold_rack/app.js) 的
`genPreset()` 是否会自动覆盖新 ID（它按 `MODULE_TYPES` 的最大 key 取值，会自动包含）。

---

## 6. 卡片右上角缩略矩阵（8×16）

每张模块卡片右上角的 40×20px 小图，是固件 `DisplayMatrix`（**16 行 × 32 列**）的 **1/4 缩放示意**，
只取一个"典型值"用于快速识别模块类型，不参与任何通信。

- 数据来源：`module_info.js` 的 `matrixFor(type)`，返回 `8 行 × 16 列` 的 0/1 数组
- 绘制参考：各模块 `XxxImpl.h` 中向 `DisplayMatrix[r][c]` 写值的逻辑（波形 / 阶梯 / 节奏点）
- 渲染：`app.js` 的 `ModuleCard.matrixCells` 把 1 转成 SVG `<rect>`，viewBox 固定 `0 0 16 8`

**固件新增模块时**，在 `matrixFor()` 的 `switch` 里加一个 `case <新ID>:`，画一条典型曲线即可：

```js
case 21: plotAll(x => Math.sin(x) * 3 + 3.5); break;  // 例: 正弦
// 可用工具: set(x,y) / plot(x, 0..7) / bar(x, 高度) / bars(数组) / plotAll(函数)
```

未定义 `case` 时该类型显示空白矩阵，不会报错。

内置形状对照：LFO 正弦、ASR 包络、CLKDIV 方波、LOGIC 脉冲、S&H 阶梯、RANDOM 触发、GENSEQ 随机音高、
EUCLD 节奏点、ARP 上行、BEATI 鼓机格子（8×2 格，参考 `GRID_ROWS/GRID_COLS`）、MIXER 四路竖向推子、
FADER 横向推子轨道、VCA 包络、INVERT 反相、QUANT 键盘（参考固件静态 `DisplayMatrix`）、
FOLD 折叠三角、TIMER 四个节拍点（参考 `drawDot`）、RNDSKP 稀疏点、CMP 比较波形、DELAY 衰减回声。

> 推子类/键盘类/格子类是**按图形语义手工排版**（不是逐像素缩放的），固件改了排版样式时对照 `XxxImpl.h` 的
> `updateMatrix()` / 静态 `DisplayMatrix` 调整 `rows([...])` 里的 16×8 字符串即可。

---

## 7. 同步检查清单

1. `TYPE_LENGTH` 是否变化 → 网页 `MODULE_TYPES` 是否覆盖 `0 .. TYPE_LENGTH-1`
2. 每个模块的 `name / input_names / param_names` 与快照表逐项比对
3. 动态名称（Mult/Divide、Delay/Rate、State>）是否变化
4. `routerParamList` 是否仍是 19 项、显示名是否变化
5. `OUTPUT_NUM` / `MODULAR_NUM` 是否变化（影响面板数量与网格）
6. `TYPE_ORDER[]` 是否调整 → 网页 `TYPE_ORDER` 是否逐项一致（含新增类型的插入位置）
7. 新增类型时，在 `matrixFor()` 补一个 `case`，保证缩略矩阵不是空白
8. 改完刷新页面，检查：模块下拉 21 项且顺序与固件菜单一致、端口上方功能名、悬停 tooltip 路由名、卡片右上角缩略图
9. 更新本文档第 4 节快照与日期
