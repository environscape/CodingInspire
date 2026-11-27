// module_info.js - Manifold 模块类型定义
// 与固件 Src/ModularBase.h + Modular/*Impl.h 保持一致, 21 种类型 (0-20)
// 同步方法见同目录 MODULE_SYNC.md

const MODULE_TYPES = {
  0:  { name: '---',     input_names: ['---', '---'],   param_names: ['---', '---', '---'] },
  1:  { name: 'LFO',     input_names: ['RST', 'Freq'],  param_names: ['Freq', 'Phase', 'Type'] },
  2:  { name: 'ASR',     input_names: ['Trig', 'Rel'],  param_names: ['Attack', 'Sustain', 'Dec&Rel'] },
  3:  { name: 'CLKDIV',  input_names: ['CLK', '---'],   param_names: ['---', 'Mult/Divide', 'Mode'] },
  4:  { name: 'LOGIC',   input_names: ['In1', 'In2'],   param_names: ['---', '---', 'Type'] },
  5:  { name: 'S&H',     input_names: ['Trig', 'Sign'], param_names: ['Clk', 'Smooth', 'Jitter'] },
  6:  { name: 'RANDOM',  input_names: ['Trig', '---'],  param_names: ['---', 'Pct', 'Mode'] },
  7:  { name: 'GENSEQ',  input_names: ['CLK', 'RST'],   param_names: ['Min RG', 'Max RG', 'Steps'] },
  8:  { name: 'EUCLD',   input_names: ['CLK', 'RST'],   param_names: ['Shift', 'Active', 'Steps'] },
  9:  { name: 'ARP',     input_names: ['Trig', 'V/OCT'], param_names: ['Chord', 'Mode', 'Oct'] },
  10: { name: 'BEATI',   input_names: ['CLK', 'RST'],   param_names: ['P1', 'P2', 'Steps'] },
  11: { name: 'MIXER',   input_names: ['In1', 'In2'],   param_names: ['Gain1', 'Gain2', 'Master'] },
  12: { name: 'FADER',   input_names: ['In1', 'In2'],   param_names: ['Gain1', 'Cross', 'Gain2'] },
  13: { name: 'VCA',     input_names: ['CV', 'In'],     param_names: ['---', 'Offset', 'Atten'] },
  14: { name: 'INVERT',  input_names: ['Sign', '---'],  param_names: ['---', '---', 'Amt'] },
  15: { name: 'QUANT',   input_names: ['Trig', 'Sign'], param_names: ['Root', 'Scale', 'Note->'] },
  16: { name: 'FOLD',    input_names: ['In', 'CV'],     param_names: ['Heap', 'DryWet', 'Mode'] },
  17: { name: 'TIMER',   input_names: ['Gate', 'RST'],  param_names: ['BPM', '---', 'State>'] },
  18: { name: 'RNDSKP',  input_names: ['CLK', '---'],   param_names: ['Len', 'Amt', 'Mode'] },
  19: { name: 'CMP',     input_names: ['In1', 'In2'],   param_names: ['Gain1', 'Gain2', 'Mode'] },
  20: { name: 'DELAY',   input_names: ['Trig', 'CV'],   param_names: ['Repeats', 'Delay/Rate', 'Mode'] }
};

// 8x16 缩略矩阵: 参考固件 Modular/*Impl.h 的 DisplayMatrix(16x32) 绘制逻辑,
// 每个类型取一个典型值, 仅用于卡片右上角快速识别模块类型
function matrixFor(type) {
  const W = 16, H = 8;
  const g = Array.from({ length: H }, () => new Array(W).fill(0));
  const set = (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = 1; };
  const plot = (x, v) => set(x, H - 1 - Math.max(0, Math.min(H - 1, Math.round(v))));
  const bar = (x, h) => { for (let i = 0; i < Math.min(h, H); i++) set(x, H - 1 - i); };
  const bars = (arr) => arr.forEach((v, x) => bar(x, v));
  const plotAll = (fn) => { for (let x = 0; x < W; x++) plot(x, fn(x)); };
  const rows = (arr) => arr.forEach((s, y) => { for (let x = 0; x < W; x++) if (s[x] === '1') g[y][x] = 1; });
  const sine = (x, amp = 3) => 3.5 + amp * Math.sin(x / W * Math.PI * 4);

  switch (type) {
    case 0: break;                                            // 空
    case 1: plotAll(x => sine(x)); break;                     // LFO: 正弦
    case 2: bars([0, 3, 5, 6, 7, 7, 7, 7, 7, 6, 5, 4, 3, 2, 1, 0]); break;  // ASR: 包络
    case 3: plotAll(x => (Math.floor(x / 4) % 2 ? 7 : 1)); break;          // CLKDIV: 方波
    case 4: plotAll(x => ([1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1][x] ? 7 : 1)); break; // LOGIC
    case 5: bars([1, 1, 4, 4, 4, 2, 2, 6, 6, 3, 3, 3, 7, 7, 5, 5]); break; // S&H: 阶梯
    case 6: bars([0, 0, 6, 0, 0, 2, 0, 0, 5, 0, 0, 7, 0, 0, 3, 0]); break; // RANDOM: 随机触发
    case 7: bars([2, 3, 1, 5, 4, 2, 6, 3, 7, 2, 4, 1, 5, 3, 2, 6]); break; // GENSEQ: 随机音高
    case 8: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0].forEach((v, x) => { if (v) bar(x, 5); }); break; // EUCLD
    case 9: bars([1, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 3, 4, 5]); break; // ARP: 上行
    // BEATI: 鼓机格子 4列x2行, 两格触发(实心)
    case 10: rows([
      '1110111011101110',
      '1010111010101010',
      '1110111011101110',
      '0000000000000000',
      '1110111011101110',
      '1010101011101010',
      '1110111011101110',
      '0000000000000000'
    ]); break;
    // MIXER: 四路竖向推子(轨道+推子头)
    case 11: rows([
      '0100010001000100',
      '1110010001000100',
      '1110010001001110',
      '0100111001001110',
      '0100111001000100',
      '0100010011100100',
      '0100010011100100',
      '0100010001000100'
    ]); break;
    // FADER: 一条横向推子轨道 + 推子头
    case 12: rows([
      '0000000000000000',
      '0000001100000000',
      '1111111111111111',
      '1000001100000001',
      '1111111111111111',
      '0000001100000000',
      '0000000000000000',
      '0000000000000000'
    ]); break;
    case 13: plotAll(x => sine(x) * (1 - x / 18)); break;     // VCA: 幅度包络
    case 14: plotAll(x => 7 - sine(x)); break;                // INVERT: 反相
    // QUANT: 键盘(白键分隔 + 黑键缺口)
    case 15: rows([
      '1111111111111111',
      '1001100110011001',
      '1111111111111111',
      '1000100010001000',
      '1000100010001000',
      '1000100010001000',
      '1000100010001000',
      '1111111111111111'
    ]); break;
    case 16: plotAll(x => Math.abs((x % 8) - 4) * 1.75); break; // FOLD: 折叠三角
    // TIMER: 四个节拍点
    case 17: rows([
      '0000000000000000',
      '0000000000000000',
      '0000000000000000',
      '0110011001100110',
      '0110011001100110',
      '0000000000000000',
      '0000000000000000',
      '0000000000000000'
    ]); break;
    case 18: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0].forEach((v, x) => { if (v) bar(x, 6); }); break; // RNDSKP
    case 19: plotAll(x => (Math.sin(x / W * Math.PI * 4) > 0 ? 6 : 2)); break; // CMP: 比较后波形
    case 20: bars([7, 0, 0, 6, 0, 0, 5, 0, 0, 4, 0, 0, 3, 0, 0, 2]); break; // DELAY: 衰减回声
    default: break;
  }
  return g;
}
Object.keys(MODULE_TYPES).forEach(id => { MODULE_TYPES[id].matrix = matrixFor(+id); });

// 下拉显示顺序, 与固件 ModularBase.h 的 TYPE_ORDER[] 完全一致
// 下标 = 显示位置, 值 = 真实类型 ID (必须是 0..TYPE_LENGTH-1 的完整排列)
const TYPE_ORDER = [
  0,   // ---
  1,   // LFO
  2,   // ASR
  3,   // CLKDIV
  4,   // LOGIC
  5,   // S&H
  6,   // RANDOM
  20,  // DELAY
  7,   // GENSEQ
  8,   // EUCLD
  18,  // RNDSKP
  10,  // BEATI
  9,   // ARP
  11,  // MIXER
  13,  // VCA
  12,  // FADER
  14,  // INVERT
  19,  // CMP
  16,  // FOLD
  15,  // QUANT
  17   // TIMER
];

// 路由 ID 显示名, 与固件 model.h routerParamList 保持一致
const ROUTER_IDS = {
  0: '1MD', 1: '2MD', 2: '3MD', 3: '4MD',
  4: '5MD', 5: '6MD', 6: '7MD', 7: '8MD',
  8: '9MD', 9: '10MD', 10: '11MD', 11: '12MD',
  12: 'Gate1', 13: 'Gate2', 14: 'Gate3',
  15: 'CV1', 16: 'CV2', 17: 'CV3',
  18: '----'
};

const OUTPUT_IDS = {
  0: '无', 1: 'Out1', 2: 'Out2', 3: 'Out3',
  4: 'Out4', 5: 'Out5', 6: 'Out6'
};

// 物理输入面板路由 ID (左) —— 统一输入色
const PHYSICAL_INPUTS = [
  { id: 12, label: 'Gate1' },
  { id: 13, label: 'Gate2' },
  { id: 14, label: 'Gate3' },
  { id: 15, label: 'CV1' },
  { id: 16, label: 'CV2' },
  { id: 17, label: 'CV3' }
];

// 物理输出面板目标 (右) —— 统一输出色 + 外框
const PHYSICAL_OUTPUTS = [
  { id: 1, label: 'Out1' },
  { id: 2, label: 'Out2' },
  { id: 3, label: 'Out3' },
  { id: 4, label: 'Out4' },
  { id: 5, label: 'Out5' },
  { id: 6, label: 'Out6' }
];

// 路由 ID 分类 (用于判断连线颜色和约束)
function routerSourceType(routerId) {
  if (routerId >= 0 && routerId <= 11) return 'module';
  if (routerId >= 12 && routerId <= 14) return 'gate';
  if (routerId >= 15 && routerId <= 17) return 'cv';
  return 'none';
}

// 导出到全局 (Vue 3 CDN 模式用)
window.ManifoldInfo = {
  MODULE_TYPES, TYPE_ORDER, ROUTER_IDS, OUTPUT_IDS,
  PHYSICAL_INPUTS, PHYSICAL_OUTPUTS,
  routerSourceType
};
