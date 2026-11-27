// module_info.js - Manifold 模块类型定义
// 与固件 Src/ModularBase.h 保持一致，20 种类型 (0-19)
// 路由 ID 与 Module_Definitions.md 保持一致

const MODULE_TYPES = {
  0: { name: '---',      input_names: ['-', '-'],      param_names: ['-', '-', '-'] },
  1: { name: 'LFO',      input_names: ['RST', 'Freq'],  param_names: ['Freq', 'Param2', 'Type'] },
  2: { name: 'ASR',      input_names: ['Trig', 'Rel'],  param_names: ['Attack', 'Sustain', 'Dec&Rel'] },
  3: { name: 'CLKDIV',   input_names: ['CLK', 'RST'],   param_names: ['---', 'Mode', 'Divide'] },
  4: { name: 'LOGIC',    input_names: ['In1', 'In2'],   param_names: ['---', '---', 'Type'] },
  5: { name: 'SNH',      input_names: ['Trig', 'Sign'], param_names: ['Clk', 'Smooth', 'Jitter'] },
  6: { name: 'RND',      input_names: ['Trig', '---'],  param_names: ['---', 'Param2', 'Mode'] },
  7: { name: 'GENSEQ',   input_names: ['CLK', 'RST'],   param_names: ['Min RG', 'Max RG', 'Steps'] },
  8: { name: 'EUCLD',    input_names: ['CLK', 'RST'],   param_names: ['Shift', 'Active', 'Steps'] },
  9: { name: 'ARP',      input_names: ['Trig', 'V/OCT'], param_names: ['Chord', 'Mode', 'Oct'] },
  10: { name: 'BEATI',   input_names: ['CLK', 'RST'],   param_names: ['P1', 'P2', 'Steps'] },
  11: { name: 'MIX',     input_names: ['In1', 'In2'],   param_names: ['Gain1', 'Gain2', 'Master'] },
  12: { name: 'FADER',   input_names: ['In1', 'In2'],   param_names: ['Param1', 'Param2', 'Param3'] },
  13: { name: 'VCA',     input_names: ['CV', 'In'],     param_names: ['---', 'Offset', 'Atten'] },
  14: { name: 'INV',     input_names: ['Sign', '---'],  param_names: ['---', '---', 'Amt'] },
  15: { name: 'QUNT',    input_names: ['In1', 'In2'],   param_names: ['Param1', 'Param2', 'Param3'] },
  16: { name: 'OVERFL',  input_names: ['Sign', 'CV'],   param_names: ['---', 'Heap', 'Mode'] },
  17: { name: 'TIMER',   input_names: ['Gate', 'RST'],  param_names: ['BPM', '---', 'State>'] },
  18: { name: 'RNDSKP',  input_names: ['CLK', '---'],   param_names: ['Len', 'Amt', 'Mode'] },
  19: { name: 'CMP',     input_names: ['In1', 'In2'],   param_names: ['Gain1', 'Gain2', 'Mode'] }
};

const ROUTER_IDS = {
  0: 'Modular0', 1: 'Modular1', 2: 'Modular2', 3: 'Modular3',
  4: 'Modular4', 5: 'Modular5', 6: 'Modular6', 7: 'Modular7',
  8: 'Modular8', 9: 'Modular9', 10: 'Modular10', 11: 'Modular11',
  12: 'Gate1', 13: 'Gate2', 14: 'Gate3',
  15: 'CV1', 16: 'CV2', 17: 'CV3',
  18: '---'
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
  MODULE_TYPES, ROUTER_IDS, OUTPUT_IDS,
  PHYSICAL_INPUTS, PHYSICAL_OUTPUTS,
  routerSourceType
};
