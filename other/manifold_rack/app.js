// app.js - Manifold Rack Web App (Vue 3 CDN mode)
// 使用 window.ManifoldInfo 中的常量 (module_info.js 先加载)

const { createApp, ref, reactive, computed, watch, onMounted, h } = Vue;
const MI = window.ManifoldInfo;

// ============================================================
// 多语言 (中/英), 参照官网语言切换的交互方式
// ============================================================
const I18N = {
  zh: {
    langName: '中文',
    connect: '连接串口', disconnect: '断开',
    fetch: '拉取预设', upload: '上传当前预设',
    gen: '随机生成预设', init: '初始化预设', clear: '清除所有线缆',
    preset: '预设', exportJson: '导出JSON', importJson: '导入JSON',
    inputs: '输入', outputs: '输出',
    toSwitched: (n) => `已切换到 ${n}`,
    toRestored: '已恢复本地保存的预设',
    toInitDone: '已初始化预设: #1 = TIMER, 其余模块为空',
    toGenDone: '已随机生成预设',
    toCleared: '已清除所有线缆, 恢复默认输出',
    toNoSerial: '当前浏览器不支持 Web Serial API（需 Chrome/Edge）',
    toConnected: '串口已连接',
    toConnectFail: (m) => '连接失败: ' + m,
    toDisconnected: '串口已断开',
    toSynced: (n) => `同步完成！共 ${n} 组预设`,
    toRequested: '已请求模块导出预设，请在固件 preset 界面查看',
    toUploaded: (n) => `已上传 ${n}`,
    toImported: (n) => `已导入 ${n} 组预设`,
    toImportFail: (m) => '导入失败: ' + m,
    toUnplugged: '已断开连线',
    toOutToIn: '只能把输出接到输入上',
    toNoPhysDirect: '物理输入不能直接连到物理输出',
    toTakeover: (a, n, b) => `模块${a} → Out${n} 已断开, 模块${b} 接管`,
    toRouted: (a, f, s) => `模块${a} ${f} ← ${s}`,
    toOut: (a, n) => `模块${a} → Out${n}`
  },
  en: {
    langName: 'English',
    connect: 'Connect', disconnect: 'Disconnect',
    fetch: 'Pull Presets', upload: 'Upload Preset',
    gen: 'Randomize', init: 'Init Preset', clear: 'Clear Wires',
    preset: 'Preset', exportJson: 'Export JSON', importJson: 'Import JSON',
    inputs: 'Inputs', outputs: 'Outputs',
    toSwitched: (n) => `Switched to ${n}`,
    toRestored: 'Restored presets saved locally',
    toInitDone: 'Preset initialized: #1 = TIMER, others empty',
    toGenDone: 'Preset randomized',
    toCleared: 'All wires cleared, default outputs restored',
    toNoSerial: 'Web Serial not supported (use Chrome/Edge)',
    toConnected: 'Serial connected',
    toConnectFail: (m) => 'Connection failed: ' + m,
    toDisconnected: 'Serial disconnected',
    toSynced: (n) => `Sync complete! ${n} presets`,
    toRequested: 'Export requested — keep the module on the PRESET screen',
    toUploaded: (n) => `Uploaded ${n}`,
    toImported: (n) => `Imported ${n} presets`,
    toImportFail: (m) => 'Import failed: ' + m,
    toUnplugged: 'Wire removed',
    toOutToIn: 'Outputs can only connect to inputs',
    toNoPhysDirect: 'Physical input cannot connect to physical output',
    toTakeover: (a, n, b) => `Module ${a} → Out${n} disconnected, module ${b} took over`,
    toRouted: (a, f, s) => `Module ${a} ${f} ← ${s}`,
    toOut: (a, n) => `Module ${a} → Out${n}`
  }
};

// ============================================================
// Mock 数据 (和 Python module_viewer.py 里一致)
// ============================================================
function createMockPresets() {
  const sample = {
    "factory_name": "preset_01",
    "data": []
  };
  for (let i = 0; i < 12; i++) {
    sample.data.push({
      num: i, type: 1,
      param1: Math.floor(Math.random() * 4095),
      param2: Math.floor(Math.random() * 4095),
      param3: Math.floor(Math.random() * 4095),
      atten1: Math.floor(Math.random() * 4095),
      atten2: Math.floor(Math.random() * 4095),
      router1: i === 0 ? 12 : i - 1,
      router2: i === 0 ? 15 : i + 11,
      output: [1,2,3,4,5,6,0,0,0,0,0,0][i]
    });
  }
  const presets = [sample];
  for (let p = 2; p <= 16; p++) {
    const factoryName = p < 10 ? `preset_0${p}` : `preset_${p}`;
    const data = [];
    for (let i = 0; i < 12; i++) {
      const t = (i + p) % 17;
      data.push({
        num: i, type: t,
        param1: Math.floor(Math.random() * 4095),
        param2: Math.floor(Math.random() * 4095),
        param3: Math.floor(Math.random() * 4095),
        atten1: Math.floor(Math.random() * 4095),
        atten2: Math.floor(Math.random() * 4095),
        router1: 18, router2: 18,
        output: 0
      });
    }
    presets.push({ factory_name: factoryName, data });
  }
  return presets.sort((a, b) => a.factory_name.localeCompare(b.factory_name));
}

// ============================================================
// 旋钮组件
// ============================================================
const KnobComp = {
  props: ['modelValue', 'max', 'label', 'isAtten', 'labelPos'],
  emits: ['update:modelValue'],
  template: `
    <div class="knob" :class="{ atten: isAtten, active: dragging }">
      <div v-if="labelPos === 'top'" class="knob-label">{{ label }}</div>
      <div class="knob-circle"
           @mousedown="startDrag"
           :style="knobStyle">
        <div class="knob-pointer" :style="pointerStyle"></div>
      </div>
      <div class="knob-value">{{ modelValue }}</div>
      <div v-if="labelPos !== 'top'" class="knob-label">{{ label }}</div>
    </div>
  `,
  data() { return { dragging: false, startY: 0, startVal: 0 }; },
  computed: {
    angle() {
      // 0-4095 → 0-270度 (-135 到 +135)
      const v = this.modelValue / (this.max || 4095);
      return v * 270 - 135;
    },
    pointerStyle() {
      return { transform: `rotate(${this.angle}deg)` };
    },
    knobStyle() { return {}; }
  },
  methods: {
    startDrag(e) {
      this.dragging = true;
      this.startY = e.clientY;
      this.startVal = this.modelValue;
      const onMove = (ev) => {
        if (!this.dragging) return;
        const dy = this.startY - ev.clientY;
        // 30 像素 / 4095 → 灵敏度
        const delta = Math.round(dy * 4095 / 150);
        let v = this.startVal + delta;
        v = Math.max(0, Math.min(this.max || 4095, v));
        this.$emit('update:modelValue', v);
        ev.preventDefault();
      };
      const onUp = () => {
        this.dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    }
  }
};

// ============================================================
// 模块卡片组件
// ============================================================
const ModuleCard = {
  components: { KnobComp },
  props: ['module', 'index', 'hl'],
  emits: ['update:module', 'port-mousedown', 'port-mouseup'],
  template: `
    <div class="module-card" :class="{ empty: module.type === 0 }">
      <div class="mod-head">
        <span class="mod-num">#{{ index + 1 }}</span>
        <select class="mod-type" :value="module.type" @change="update('type', +$event.target.value)">
          <option v-for="tid in MI.TYPE_ORDER" :key="tid" :value="tid">{{ MI.MODULE_TYPES[tid].name }}</option>
        </select>
        <svg class="mx-preview" viewBox="0 0 16 8" preserveAspectRatio="none" aria-hidden="true">
          <rect v-for="(c, i) in matrixCells" :key="i" :x="c.x" :y="c.y" width="1" height="1" />
        </svg>
      </div>

      <!-- row 1: 3 个参数旋钮 (大) —— 空模块保留占位, 不塌陷布局 -->
      <div class="knob-row param-row" :class="{ 'knobs-hidden': module.type === 0 }">
        <knob-comp :model-value="module.param1" @update:model-value="update('param1', $event)"
                   :label="typeInfo.param_names[0]" />
        <knob-comp :model-value="module.param2" @update:model-value="update('param2', $event)"
                   :label="typeInfo.param_names[1]" />
        <knob-comp :model-value="module.param3" @update:model-value="update('param3', $event)"
                   :label="typeInfo.param_names[2]" />
      </div>

      <!-- row 2: 衰减旋钮 (小) —— label 在旋钮下方, 第三列空 -->
      <div class="knob-row atten-row" :class="{ 'knobs-hidden': module.type === 0 }">
        <knob-comp :model-value="module.atten1" @update:model-value="update('atten1', $event)"
                   :label="'Atn1'" :is-atten="true" :label-pos="'bottom'" />
        <knob-comp :model-value="module.atten2" @update:model-value="update('atten2', $event)"
                   :label="'Atn2'" :is-atten="true" :label-pos="'bottom'" />
        <div class="port-out-slot"></div>
      </div>

      <!-- row 3: 三个端口齐高 —— r1 + r2 + out, 上方显示路由源名 -->
      <div class="ports-row inputs-row">
        <div class="port-col" data-port-role="r1" :data-module-index="index"
             :class="{ hl: hl.includes('m' + index + '-r1') }"
             @pointerdown="startInDrag($event, 'r1')">
          <div class="port-label">{{ typeInfo.input_names[0] }}</div>
          <div class="port-body">
            <div class="port-dot input"
                 :data-port-type="'in'"
                 :data-port-id="'r1'"
                 :title="'router1: ' + routerLabel(module.router1)"></div>
          </div>
        </div>
        <div class="port-col" data-port-role="r2" :data-module-index="index"
             :class="{ hl: hl.includes('m' + index + '-r2') }"
             @pointerdown="startInDrag($event, 'r2')">
          <div class="port-label">{{ typeInfo.input_names[1] }}</div>
          <div class="port-body">
            <div class="port-dot input"
                 :data-port-type="'in'"
                 :data-port-id="'r2'"
                 :title="'router2: ' + routerLabel(module.router2)"></div>
          </div>
        </div>
        <div class="port-col" data-port-role="out" :data-module-index="index"
             :class="{ hl: hl.includes('m' + index + '-out') }"
             @pointerdown="startOutDrag">
          <div class="port-label">OUT</div>
          <div class="port-body">
            <div class="out-frame">
              <div class="port-dot output"
                   :data-port-type="'out'"
                   :data-port-id="'out'"
                   title="module output"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    typeInfo() { return this.MI.MODULE_TYPES[this.module.type] || this.MI.MODULE_TYPES[0]; },
    // 8x16 缩略矩阵 → 实心格子坐标 (SVG rect)
    matrixCells() {
      const m = this.typeInfo.matrix || [];
      const cells = [];
      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (m[y][x]) cells.push({ x, y });
        }
      }
      return cells;
    }
  },
  data() {
    return { MI: window.ManifoldInfo, dragging: false, startY: 0, startVal: 0 };
  },
  methods: {
    routerLabel(id) { return this.MI.ROUTER_IDS[id] || '---'; },
    update(field, val) {
      const m = { ...this.module, [field]: val };
      this.$emit('update:module', m);
    },
    // 整个输出端口列都是拖拽起点, 不必精确按住 14px 小圆点
    startOutDrag(e) {
      e.preventDefault();
      e.stopPropagation();
      this.$emit('port-mousedown', {
        moduleIndex: this.index, portType: 'out', portId: 'out',
        clientX: e.clientX, clientY: e.clientY
      });
    },
    // 输入端口也可以作为拖拽起点 (反向拉线)
    startInDrag(e, role) {
      e.preventDefault();
      e.stopPropagation();
      this.$emit('port-mousedown', {
        moduleIndex: this.index, portType: 'in', portId: role,
        clientX: e.clientX, clientY: e.clientY
      });
    }
  }
};

// ============================================================
// 根 App
// ============================================================
const App = {
  components: { ModuleCard },
  template: `
    <div id="app" @mouseover="onHoverOver" @mousemove="onIdleMove" @mouseleave="onPointerLeave">
      <!-- 顶栏 -->
      <header class="topbar">
        <div>
          <span class="brand">Manifold Rack</span>
          <a class="brand-sub" href="../../index.html">by Coding Inspire</a>
        </div>

        <div class="serial-group">
          <button :disabled="isConnected" @click="requestPort">{{ L.connect }}</button>
          <button :disabled="!isConnected" @click="disconnectPort">{{ L.disconnect }}</button>
          <button class="success" :disabled="!isConnected" @click="fetchPresets">{{ L.fetch }}</button>
          <button class="primary" :disabled="!isConnected" @click="uploadCurrent">{{ L.upload }}</button>
        </div>

        <!-- 语言切换 (样式参照官网 lang-switcher) -->
        <div class="lang-switcher" @mouseleave="langMenu = false">
          <button class="lang-toggle" @click="langMenu = !langMenu" :title="L.langName">
            {{ L.langName }} ▾
          </button>
          <div class="lang-menu" :class="{ active: langMenu }">
            <button type="button" :class="{ active: lang === 'zh' }" @click="setLang('zh')">中文</button>
            <button type="button" :class="{ active: lang === 'en' }" @click="setLang('en')">English</button>
          </div>
        </div>
      </header>

      <!-- 面板上方快捷操作 -->
      <div class="toolbar">
        <button @click="genPreset">{{ L.gen }}</button>
        <button @click="initPreset">{{ L.init }}</button>
        <button @click="clearAllWires">{{ L.clear }}</button>

        <div class="preset-group">
          <span class="label">{{ L.preset }}</span>
          <select v-model="currentPresetIndex">
            <option v-for="(p, i) in presets" :key="i" :value="i">
              {{ p.factory_name }}
            </option>
          </select>
          <button @click="exportJSON">{{ L.exportJson }}</button>
          <button @click="importJSON = true">{{ L.importJson }}</button>
        </div>
      </div>

      <!-- 主体 -->
      <main class="main">
        <!-- 左面板: 物理输入 -->
        <div class="side-panel left">
          <div class="panel-title">{{ L.inputs }}</div>
          <div v-for="inp in MI.PHYSICAL_INPUTS" :key="inp.id"
               class="phys-port source"
               :class="{ hl: hoverRelated.ports.includes('phys-in-' + inp.id) }"
               :data-port-type="'out'"
               :data-port-id="'phys-in-' + inp.id"
               @pointerdown="startPhysPortDrag($event, 'phys-in-' + inp.id, 'out')">
            <div class="dot"></div>
            <div class="label">{{ inp.label }}</div>
          </div>
        </div>

        <!-- 中间: 12 模块卡片 -->
        <div class="module-grid">
          <module-card v-for="(m, i) in currentPresetData"
                       :key="i"
                       :module="m"
                       :index="i"
                       :hl="hoverRelated.ports"
                       @update:module="(nm) => updateModule(i, nm)"
                       @port-mousedown="onPortMouseDown"
                       @port-mouseup="onPortMouseUp" />
        </div>

        <!-- 右面板: 物理输出 -->
        <div class="side-panel right">
          <div v-for="outp in MI.PHYSICAL_OUTPUTS" :key="outp.id"
               class="phys-port target"
               :class="{ hl: hoverRelated.ports.includes('phys-out-' + outp.id) }"
               :data-port-type="'in'"
               :data-port-id="'phys-out-' + outp.id"
               @pointerdown="startPhysPortDrag($event, 'phys-out-' + outp.id, 'in')">
            <div class="out-frame">
              <div class="dot"></div>
            </div>
            <div class="label">{{ outp.label }}</div>
          </div>
          <div class="panel-title">{{ L.outputs }}</div>
        </div>
      </main>

      <!-- SVG 连线层 -->
      <svg class="wire-layer" ref="wireLayer">
        <path v-for="w in wirePaths" :key="w.key" :d="w.d"
              :class="['wire', w.kind, {
                hl: hoverRelated.wires.includes(w.key),
                hover: hoverWire === w.key,
                pulling: wirePull && wirePull.key === w.key && wirePull.pulling
              }]" />
        <path v-if="dragPreview.path"
              :d="dragPreview.path"
              class="drag-preview"
              :stroke="dragPreview.valid ? '#6b7280' : '#ff6b35'" />
      </svg>

      <!-- Toast -->
      <div v-if="toast.msg" class="toast" :class="toast.type">{{ toast.msg }}</div>
    </div>
  `,
  data() {
    return {
      MI: window.ManifoldInfo,
      presets: createMockPresets(),
      currentPresetIndex: 0,
      isConnected: false,
      serialPort: null,
      serialReader: null,
      dragState: null,      // { startX, startY, startPortType, startPortId, startModuleIndex }
      dragPreview: { path: '', valid: false },
      wirePaths: [],        // 渲染用: [{ key, d }]
      hoverEp: null,        // 当前悬停的端点 id: 'm3-r1' / 'phys-in-12' ...
      hoverWire: null,      // 当前悬停的导线 key
      wirePull: null,       // 正在"拔出"的导线 { key, x0, y0, pulling }
      toast: { msg: '', type: '' },
      importJSON: false,
      lang: localStorage.getItem('manifold_lang') || 'zh',
      langMenu: false
    };
  },
  computed: {
    L() { return I18N[this.lang] || I18N.zh; },
    currentPresetData() {
      const p = this.presets[this.currentPresetIndex];
      return p ? p.data : [];
    },
    // 连线描述 (纯数据, 不读 DOM) —— 真正的坐标在 DOM 渲染后再测量
    wireDefs() {
      const defs = [];
      this.currentPresetData.forEach((m, modIdx) => {
        // router1 / router2: 0-11 模块输出, 12-17 物理输入
        if (Number.isInteger(m.router1) && m.router1 >= 0 && m.router1 <= 17) {
          defs.push({ key: modIdx + '-r1', targetModule: modIdx, targetRole: 'r1', source: m.router1 });
        }
        if (Number.isInteger(m.router2) && m.router2 >= 0 && m.router2 <= 17) {
          defs.push({ key: modIdx + '-r2', targetModule: modIdx, targetRole: 'r2', source: m.router2 });
        }
        // output: 1-6 表示连到物理 Out1-6
        if (Number.isInteger(m.output) && m.output >= 1 && m.output <= 6) {
          defs.push({ key: modIdx + '-out', outModule: modIdx, outId: m.output });
        }
      });
      return defs;
    },
    // 悬停高亮: 与当前悬停端口有关的所有端口 + 连线
    hoverRelated() {
      const ports = [];
      const wires = [];
      if (!this.hoverEp) return { ports, wires };
      ports.push(this.hoverEp);
      for (const d of this.wireDefs) {
        let a, b;
        if (d.outId) {
          a = `m${d.outModule}-out`;
          b = `phys-out-${d.outId}`;
        } else {
          a = `m${d.targetModule}-${d.targetRole}`;
          b = d.source <= 11 ? `m${d.source}-out` : `phys-in-${d.source}`;
        }
        if (a === this.hoverEp || b === this.hoverEp) {
          wires.push(d.key);
          ports.push(a, b);
        }
      }
      return { ports, wires };
    }
  },
  watch: {
    wireDefs() { this.rebuildWires(); },
    currentPresetIndex() {
      this.showToast(this.L.toSwitched(this.presets[this.currentPresetIndex]?.factory_name));
      this.rebuildWires();
    }
  },
  mounted() {
    // localStorage 恢复
    const saved = localStorage.getItem('manifold_presets');
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        if (obj.presets && obj.presets.length) {
          this.presets = obj.presets;
          this.currentPresetIndex = obj.currentPresetIndex || 0;
          this.showToast(this.L.toRestored);
        }
      } catch (e) { console.warn('localStorage restore failed', e); }
    }

    // 布局变化时重算连线坐标 (窗口尺寸变化时同时重新对齐工具行)
    this._onViewportChange = () => this.rebuildWires();
    this._onResize = () => { this.rebuildWires(); this.alignToolbar(); };
    window.addEventListener('resize', this._onResize);
    window.addEventListener('scroll', this._onViewportChange, true);

    // 首次绘制连线
    this.rebuildWires();
    // 预设组右缘对齐到 Out 面板右缘
    this.$nextTick(() => setTimeout(() => this.alignToolbar(), 60));

    // 按住悬停中的导线 → 进入"拔线"状态
    this._onWireDown = (e) => {
      if (this.dragState || this.wirePull || !this.hoverWire) return;
      this.startWirePull(e);
    };
    window.addEventListener('pointerdown', this._onWireDown);
    // 首帧后再补一次, 确保初始加载就能看到已有跳线
    requestAnimationFrame(() => this.measureWires());
  },
  beforeUnmount() {
    window.removeEventListener('resize', this._onViewportChange);
    window.removeEventListener('scroll', this._onViewportChange, true);
    this.endDrag();
  },
  methods: {
    // ==== 语言切换 ====
    setLang(lang) {
      this.lang = lang;
      this.langMenu = false;
      localStorage.setItem('manifold_lang', lang);
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    },
    // ==== 模块数据更新 ====
    updateModule(index, newModule) {
      const preset = this.presets[this.currentPresetIndex];
      if (!preset) return;
      preset.data[index] = { ...newModule };
      this.saveLocal();
    },
    saveLocal() {
      localStorage.setItem('manifold_presets', JSON.stringify({
        presets: this.presets,
        currentPresetIndex: this.currentPresetIndex
      }));
    },
    // 初始化预设: 除 #1 = TIMER 外, 其余模块全部清空, 无任何接线
    initPreset() {
      const preset = this.presets[this.currentPresetIndex];
      if (!preset) return;
      preset.data.forEach((m, i) => {
        m.type = i === 0 ? 17 : 0;   // #1 = TIMER, 其余为 ---
        m.param1 = 0;
        m.param2 = 0;
        m.param3 = 0;
        m.atten1 = 0;
        m.atten2 = 0;
        m.router1 = 18;              // 18 = 未连接
        m.router2 = 18;
        // 默认输出: #1/#3/#5/#7/#9/#11 → Out1~Out6
        m.output = i % 2 === 0 ? (i / 2 + 1) : 0;
      });
      this.saveLocal();
      this.rebuildWires();
      this.showToast(this.L.toInitDone);
    },
    // 随机生成预设 —— 对应固件 genModularPreset()
    // 类型 1..N (不含空模块), 参数/衰减随机, 路由 0..13 (13→CV1), 输出为默认六个
    genPreset() {
      const preset = this.presets[this.currentPresetIndex];
      if (!preset) return;
      const typeIds = Object.keys(MI.MODULE_TYPES).map(Number).filter(t => t > 0);
      const maxType = Math.max(...typeIds);
      const rnd = n => Math.floor(Math.random() * n);
      // 与固件一致: random(0, MODULAR_NUM+2) 后再把最后一个值换成 CV1(15)
      const pickRouter = () => {
        const r = rnd(14);          // 0..13
        return r === 13 ? 15 : r;   // 13 → CV1
      };
      preset.data.forEach((m, i) => {
        m.type   = 1 + rnd(maxType);   // 不含 EMPTY
        m.param1 = rnd(4096);
        m.param2 = rnd(4096);
        m.param3 = rnd(4096);
        m.atten1 = 4095;
        m.atten2 = 4095;
        m.router1 = pickRouter();
        m.router2 = pickRouter();
        // 默认输出: #1/#3/#5/#7/#9/#11 → Out1~Out6
        m.output = i % 2 === 0 ? (i / 2 + 1) : 0;
      });
      this.saveLocal();
      this.rebuildWires();
      this.showToast(this.L.toGenDone);
    },
    // 清除所有线缆, 恢复默认状态: #1/#3/#5/#7/#9/#11 → Out1~Out6
    clearAllWires() {
      const preset = this.presets[this.currentPresetIndex];
      if (!preset) return;
      preset.data.forEach((m, i) => {
        m.router1 = 18;   // 18 = 未连接
        m.router2 = 18;
        m.output = i % 2 === 0 ? (i / 2 + 1) : 0;
      });
      this.saveLocal();
      this.rebuildWires();
      this.showToast(this.L.toCleared);
    },

    // ==== 串口 ====
    async requestPort() {
      if (!navigator.serial) { this.showToast(this.L.toNoSerial, 'error'); return; }
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        this.serialPort = port;
        this.isConnected = true;
        this.showToast(this.L.toConnected);
        // 启动接收循环
        this.readLoop();
      } catch (e) { this.showToast(this.L.toConnectFail(e.message), 'error'); }
    },
    async disconnectPort() {
      if (this.serialPort) {
        try { await this.serialPort.close(); } catch (e) {}
        this.serialPort = null;
      }
      this.isConnected = false;
      this.showToast(this.L.toDisconnected);
    },
    async readLoop() {
      if (!this.serialPort) return;
      const reader = this.serialPort.readable.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          while (buffer.includes('\n')) {
            const line = buffer.slice(0, buffer.indexOf('\n')).trim();
            buffer = buffer.slice(buffer.indexOf('\n') + 1);
            this.handleIncomingLine(line);
          }
          if (buffer.length > 8192) buffer = buffer.slice(-4096);
        }
      } catch (e) { console.warn('readLoop error', e); }
      finally { reader.releaseLock(); }
    },
    handleIncomingLine(line) {
      if (!line.startsWith('ManifoldHelper=')) return;
      const rest = line.slice('ManifoldHelper='.length);
      if (rest === 'done') {
        this.presets.sort((a, b) => a.factory_name.localeCompare(b.factory_name));
        this.currentPresetIndex = 0;
        this.showToast(this.L.toSynced(this.presets.length));
        return;
      }
      const eq2 = rest.indexOf('=');
      if (eq2 < 0) return;
      const idStr = rest.slice(0, eq2);
      const jsonStr = rest.slice(eq2 + 1);
      try {
        const obj = JSON.parse(jsonStr);
        obj.factory_name = obj.factory_name || (`preset_0${idStr}`);
        obj._importedId = +idStr;
        // 替换已有或新增
        const existing = this.presets.findIndex(p => p.factory_name === obj.factory_name);
        if (existing >= 0) this.presets.splice(existing, 1, obj);
        else this.presets.push(obj);
      } catch (e) { console.warn('JSON parse failed', e); }
    },
    async sendLine(line) {
      if (!this.serialPort || !this.serialPort.writable) return;
      const writer = this.serialPort.writable.getWriter();
      await writer.write(new TextEncoder().encode(line + '\n'));
      writer.releaseLock();
    },
    async fetchPresets() {
      if (!this.isConnected) return;
      this.presets = []; // 清空旧数据
      await this.sendLine('ManifoldSync=GET');
      this.showToast(this.L.toRequested);
    },
    async uploadCurrent() {
      if (!this.isConnected) return;
      const preset = this.presets[this.currentPresetIndex];
      if (!preset) return;
      const jsonStr = JSON.stringify({
        factory_name: preset.factory_name,
        data: preset.data
      });
      const idMatch = preset.factory_name.match(/(\d+)/);
      const id = idMatch ? parseInt(idMatch[1]) : this.currentPresetIndex + 1;
      await this.sendLine(`ManifoldSync=${id}=${jsonStr}`);
      await this.sendLine('ManifoldSync=done');
      this.showToast(this.L.toUploaded(preset.factory_name), 'success');
    },

    // ==== JSON 导入导出 ====
    exportJSON() {
      const blob = new Blob([JSON.stringify({ presets: this.presets }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'manifold_presets.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    importJSON() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const obj = JSON.parse(reader.result);
            if (obj.presets) {
              this.presets = obj.presets;
              this.showToast(this.L.toImported(obj.presets.length), 'success');
              this.saveLocal();
            }
          } catch (err) { this.showToast(this.L.toImportFail(err.message), 'error'); }
        };
        reader.readAsText(f);
      };
      input.click();
    },

    // ==== 连线计算 ====
    // ==== 连线坐标测量 (必须在 DOM 渲染完成后调用) ====
    getElementCenter(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    },
    // 计算贝塞尔控制点 (供绘制与命中检测共用)
    bezierCps(p1, p2, sag = 0) {
      const dx = Math.abs(p2.x - p1.x);
      const offset = Math.max(40, dx * 0.5);
      const cx1 = p1.x + (p2.x >= p1.x ? offset : -offset);
      const cx2 = p2.x + (p2.x >= p1.x ? -offset : offset);
      return {
        x0: p1.x, y0: p1.y,
        c1x: cx1, c1y: p1.y + sag,
        c2x: cx2, c2y: p2.y + sag,
        x1: p2.x, y1: p2.y
      };
    },
    bezier(p1, p2, sag = 0) {
      const c = this.bezierCps(p1, p2, sag);
      return `M ${c.x0} ${c.y0} C ${c.c1x} ${c.c1y}, ${c.c2x} ${c.c2y}, ${c.x1} ${c.y1}`;
    },

    // 模块端口中心 (role: 'r1' | 'r2' | 'out')
    portCenter(modIdx, role) {
      const card = document.querySelectorAll('.module-card')[modIdx];
      if (!card) return null;
      if (role === 'out') {
        return this.getElementCenter(card.querySelector('.port-col[data-port-role="out"] .out-frame'));
      }
      return this.getElementCenter(card.querySelector(`.port-col[data-port-role="${role}"] .port-dot`));
    },
    // 路由源中心 (0-11 模块输出, 12-17 物理输入)
    routerCenter(routerId) {
      if (routerId >= 0 && routerId <= 11) return this.portCenter(routerId, 'out');
      return this.getElementCenter(document.querySelector(`[data-port-id="phys-in-${routerId}"] .dot`));
    },
    physOutCenter(outId) {
      return this.getElementCenter(document.querySelector(`[data-port-id="phys-out-${outId}"] .out-frame`));
    },

    // DOM 渲染后统一重算所有连线; 若布局还没就绪则短间隔重试, 保证首次加载可见
    rebuildWires() {
      let tries = 0;
      const attempt = () => {
        this.measureWires();
        tries++;
        if (this.wirePaths.length < this.wireDefs.length && tries < 15) {
          setTimeout(attempt, 50);
        }
      };
      this.$nextTick(attempt);
    },
    measureWires() {
      const paths = [];
      for (const d of this.wireDefs) {
        let p1 = null, p2 = null;
        // kind: 'phys' = 连到物理输入/输出, 'mod' = 模块与模块之间
        let kind = 'mod';
        let sag = 0;
        if (d.outId) {
          p1 = this.portCenter(d.outModule, 'out');
          p2 = this.physOutCenter(d.outId);
          kind = 'phys';
        } else {
          p1 = this.routerCenter(d.source);
          p2 = this.portCenter(d.targetModule, d.targetRole);
          if (d.source >= 12) {
            kind = 'phys';           // Gate1-3 / CV1-3 源
          } else {
            // 模块 → 模块: 下垂弧度, 便于区分上下两排
            const dx = p1 && p2 ? Math.abs(p2.x - p1.x) : 0;
            sag = Math.max(16, Math.min(44, dx * 0.16));
          }
        }
        if (p1 && p2) paths.push({ key: d.key, d: this.bezier(p1, p2, sag), cps: this.bezierCps(p1, p2, sag), kind });
      }
      this.wirePaths = paths;
    },

    // 工具行右侧预设组的右缘, 对齐到 Out 面板右缘 (而不是窗口最右侧)
    alignToolbar() {
      const toolbar = document.querySelector('.toolbar');
      const rightPanel = document.querySelector('.side-panel.right');
      if (!toolbar || !rightPanel) return;
      const t = toolbar.getBoundingClientRect();
      const r = rightPanel.getBoundingClientRect();
      // 内容被水平滚动/窗口过窄时保持默认留白
      const pr = (r.right <= t.right - 8) ? Math.round(t.right - r.right) : 32;
      toolbar.style.paddingRight = pr + 'px';
    },

    onPointerLeave() {
      this.hoverEp = null;
      this.hoverWire = null;
    },
    // 空闲时鼠标移动: 检测是否悬停在导线上 (贝塞尔采样, 8px 容差)
    onIdleMove(e) {
      if (this.dragState || this.wirePull) return;
      this.hoverWire = this.findWireAt(e.clientX, e.clientY);
    },
    findWireAt(x, y) {
      let best = null;
      let bestD2 = 64;   // 8px 容差
      const N = 14;
      for (const w of this.wirePaths) {
        const c = w.cps;
        if (!c) continue;
        for (let i = 0; i <= N; i++) {
          const t = i / N, u = 1 - t;
          const px = u*u*u*c.x0 + 3*u*u*t*c.c1x + 3*u*t*t*c.c2x + t*t*t*c.x1;
          const py = u*u*u*c.y0 + 3*u*u*t*c.c1y + 3*u*t*t*c.c2y + t*t*t*c.y1;
          const d2 = (px - x) * (px - x) + (py - y) * (py - y);
          if (d2 < bestD2) { bestD2 = d2; best = w.key; }
        }
      }
      return best;
    },
    // 点到某条导线的最短距离平方 (8px 命中判定用)
    wireDist2(key, x, y) {
      const w = this.wirePaths.find(p => p.key === key);
      if (!w || !w.cps) return Infinity;
      const c = w.cps;
      const N = 14;
      let best = Infinity;
      for (let i = 0; i <= N; i++) {
        const t = i / N, u = 1 - t;
        const px = u*u*u*c.x0 + 3*u*u*t*c.c1x + 3*u*t*t*c.c2x + t*t*t*c.x1;
        const py = u*u*u*c.y0 + 3*u*u*t*c.c1y + 3*u*t*t*c.c2y + t*t*t*c.y1;
        const d2 = (px - x) * (px - x) + (py - y) * (py - y);
        if (d2 < best) best = d2;
      }
      return best;
    },
    // 按住导线拖一下 → 松手断开该连线
    startWirePull(e) {
      if (!this.hoverWire) return;
      e.preventDefault();
      this.wirePull = { key: this.hoverWire, x0: e.clientX, y0: e.clientY, pulling: false };
      document.body.style.cursor = 'grabbing';
      this._wp = (ev) => {
        if (!this.wirePull) return;
        // 拖离导线超过 8px 才算"拔出"; 拖回导线附近则恢复悬停态, 松手不删除
        this.wirePull.pulling = this.wireDist2(this.wirePull.key, ev.clientX, ev.clientY) > 64;
      };
      this._wu = () => this.finishWirePull();
      window.addEventListener('pointermove', this._wp, true);
      window.addEventListener('pointerup', this._wu, true);
      window.addEventListener('mousemove', this._wp, true);
      window.addEventListener('mouseup', this._wu, true);
    },
    finishWirePull() {
      if (this._wp) {
        window.removeEventListener('pointermove', this._wp, true);
        window.removeEventListener('mousemove', this._wp, true);
      }
      if (this._wu) {
        window.removeEventListener('pointerup', this._wu, true);
        window.removeEventListener('mouseup', this._wu, true);
      }
      this._wp = this._wu = null;
      document.body.style.cursor = '';
      const st = this.wirePull;
      this.wirePull = null;
      if (st && st.pulling) this.removeWire(st.key);
    },
    removeWire(key) {
      const preset = this.presets[this.currentPresetIndex];
      if (!preset) return;
      const parts = String(key).split('-');
      const idx = parseInt(parts[0], 10);
      const role = parts[1];
      const mod = preset.data[idx];
      if (!mod) return;
      if (role === 'out') mod.output = 0;
      else if (role === 'r1') mod.router1 = 18;
      else if (role === 'r2') mod.router2 = 18;
      else return;
      this.hoverWire = null;
      this.saveLocal();
      this.rebuildWires();
      this.showToast(this.L.toUnplugged);
    },

    // ==== 悬停高亮 ====
    onHoverOver(e) {
      const el = e.target;
      if (!el || !el.closest) { this.hoverEp = null; return; }
      const col = el.closest('.port-col');
      if (col && col.dataset.portRole) {
        this.hoverEp = `m${col.dataset.moduleIndex}-${col.dataset.portRole}`;
        return;
      }
      const phys = el.closest('.phys-port');
      if (phys && phys.dataset.portId) {
        this.hoverEp = phys.dataset.portId;
        return;
      }
      this.hoverEp = null;
    },

    // ==== 拖拽逻辑 (双向: 从 out 或 in 任一端都能起手) ====
    onPortMouseDown(info) {
      this.beginDrag({
        startModuleIndex: info.moduleIndex,
        startPortType: info.portType,   // 'out' | 'in'
        startPortId: info.portId,       // 'out' | 'r1' | 'r2'
        physSource: false
      });
    },
    onPortMouseUp() { /* 拖拽结束统一由 window pointerup 处理 */ },
    startPhysPortDrag(e, portId, portType) {
      e.preventDefault();
      e.stopPropagation();
      this.beginDrag({
        startPortType: portType,        // phys-in → 'out', phys-out → 'in'
        startPortId: portId,
        physSource: true
      });
    },
    endPhysPortDrag() {},

    // 开始拖拽: 在 window 上用 capture 监听, 任何元素都拦不住
    beginDrag(state) {
      this.dragState = state;
      this.hoverWire = null;
      this.dragPreview = { path: '', valid: false };
      document.body.style.cursor = 'crosshair';
      this._pm = (ev) => this.onGlobalMouseMove(ev);
      this._pu = (ev) => this.onGlobalMouseUp(ev);
      window.addEventListener('pointermove', this._pm, true);
      window.addEventListener('pointerup', this._pu, true);
      // 鼠标事件兜底 (个别环境 pointer 事件缺失)
      window.addEventListener('mousemove', this._pm, true);
      window.addEventListener('mouseup', this._pu, true);
    },
    endDrag() {
      if (this._pm) {
        window.removeEventListener('pointermove', this._pm, true);
        window.removeEventListener('mousemove', this._pm, true);
      }
      if (this._pu) {
        window.removeEventListener('pointerup', this._pu, true);
        window.removeEventListener('mouseup', this._pu, true);
      }
      this._pm = this._pu = null;
      this.dragState = null;
      this.dragPreview = { path: '', valid: false };
      document.body.style.cursor = '';
    },

    onGlobalMouseMove(e) {
      if (!this.dragState) return;
      const target = this.findDropTargetAt(e.clientX, e.clientY);
      const p1 = this.dragStartPoint();
      // 用新对象赋值, 确保必定触发重渲染
      this.dragPreview = {
        path: p1 ? this.bezier(p1, { x: e.clientX, y: e.clientY }) : '',
        valid: this.isValidPair(this.startEndpoint(), target)
      };
    },
    onGlobalMouseUp(e) {
      if (!this.dragState) return;
      const dropTarget = this.findDropTargetAt(e.clientX, e.clientY);
      if (dropTarget) this.tryConnect(this.startEndpoint(), dropTarget);
      this.endDrag();
      // 兜底: 无论数据变化是否触发监听, 松手后都重算一次
      this.rebuildWires();
    },
    // 起点端点描述
    startEndpoint() {
      if (!this.dragState) return null;
      return {
        portType: this.dragState.startPortType,
        portId: this.dragState.startPortId,
        moduleIndex: this.dragState.physSource ? null : this.dragState.startModuleIndex
      };
    },
    // 合法性: 必须一端 out 一端 in, 且不是同一个端口
    isValidPair(startEp, endEp) {
      if (!startEp || !endEp) return false;
      if (startEp.portType === endEp.portType) return false;
      if (startEp.portId === endEp.portId && startEp.moduleIndex === endEp.moduleIndex) return false;
      return true;
    },
    // 拖拽起点坐标
    dragStartPoint() {
      if (!this.dragState) return null;
      if (this.dragState.physSource) {
        return this.getElementCenter(document.querySelector(`[data-port-id="${this.dragState.startPortId}"] .dot`));
      }
      return this.portCenter(this.dragState.startModuleIndex, this.dragState.startPortId);
    },
    findDropTargetAt(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      // 模块端口列 (整列都是投放区)
      const col = el.closest('.port-col');
      if (col && col.dataset.portRole) {
        const role = col.dataset.portRole;
        return {
          portType: role === 'out' ? 'out' : 'in',
          portId: role,
          moduleIndex: parseInt(col.dataset.moduleIndex, 10)
        };
      }
      // 物理端口: phys-in-* 是源(out), phys-out-* 是目标(in)
      const phys = el.closest('.phys-port');
      if (phys && phys.dataset.portId) {
        const id = phys.dataset.portId;
        return {
          portType: id.startsWith('phys-out-') ? 'in' : 'out',
          portId: id,
          moduleIndex: null
        };
      }
      return null;
    },
    // 连接两端 (顺序无关)
    tryConnect(startEp, endEp) {
      if (!this.isValidPair(startEp, endEp)) {
        this.showToast(this.L.toOutToIn, 'warn');
        return;
      }
      const preset = this.presets[this.currentPresetIndex];
      if (!preset) return;

      const outEp = startEp.portType === 'out' ? startEp : endEp;
      const inEp  = startEp.portType === 'out' ? endEp : startEp;

      // 情况 A: 目标端是模块输入 r1/r2
      if (inEp.portId === 'r1' || inEp.portId === 'r2') {
        if (inEp.moduleIndex == null) return;
        let routerId;
        if (String(outEp.portId).startsWith('phys-in-')) {
          routerId = parseInt(outEp.portId.replace('phys-in-', ''), 10);
        } else if (outEp.portId === 'out') {
          routerId = outEp.moduleIndex;
        } else {
          return;
        }
        if (routerId == null || isNaN(routerId)) return;
        const field = inEp.portId === 'r1' ? 'router1' : 'router2';
        preset.data[inEp.moduleIndex][field] = routerId;
        this.saveLocal();
        this.showToast(this.L.toRouted(inEp.moduleIndex + 1, field, MI.ROUTER_IDS[routerId]));
        return;
      }

      // 情况 B: 目标端是物理输出 Out1-6 (只能来自模块输出)
      if (String(inEp.portId).startsWith('phys-out-')) {
        if (outEp.portId !== 'out' || outEp.moduleIndex == null) {
          this.showToast(this.L.toNoPhysDirect, 'warn');
          return;
        }
        const outIndex = parseInt(inEp.portId.replace('phys-out-', ''), 10);
        const modIdx = outEp.moduleIndex;
        let freed = -1;
        for (let i = 0; i < preset.data.length; i++) {
          if (i !== modIdx && preset.data[i].output === outIndex) {
            preset.data[i].output = 0;
            freed = i;
          }
        }
        preset.data[modIdx].output = outIndex;
        this.saveLocal();
        if (freed >= 0) {
          this.showToast(this.L.toTakeover(freed + 1, outIndex, modIdx + 1), 'warn');
        } else {
          this.showToast(this.L.toOut(modIdx + 1, outIndex));
        }
      }
    },

    // ==== Toast ====
    showToast(msg, type = '') {
      this.toast = { msg, type };
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { this.toast = { msg: '', type: '' }; }, 3000);
    }
  }
};

// ============================================================
// 启动
// ============================================================
createApp(App).mount('#app');
