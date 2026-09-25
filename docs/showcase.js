import { stages, scenarios, createState, advance, duplicateSubmit, reconcile, freshness } from './demo-model.mjs';
const $ = (id) => document.getElementById(id);
const stepCopy = [
 ['先确定，我们看到了什么。', '冻结行情来源、周期与时点，后续研究引用同一份快照。', '数据到达系统，不代表它就具备决策资格。'],
 ['模型给出建议，而不是订单。', '候选分析引用快照和策略版本，研究与执行权限保持分离。', '模型输出不直接触达模拟交易适配器。'],
 ['让规则，而不是信心，守住入口。', '检查行情时效、账户状态与风险条件，满足约束再继续。', '缺失与过期保持原样，不用其他时点的信息填补。'],
 ['先留下意图，再发起请求。', '在模拟请求前记录唯一意图，给重复请求与故障恢复一个稳定依据。', '持久化的意图先于远端副作用。'],
 ['明确的回执，才是明确的结果。', '记录模拟回执，并保留决策、订单意图和后续账户证据的关联。', '这里演示的是回执，不代表订单已经成交。'],
];
const statusNames = { reviewing: '研究中', blocked: '已拦截', unknown: 'unknown / 待对账', acknowledged: '已确认回执', reconciled: '已对账' };
let flow = createState();
let failure = makeFailure();
let timer = null;
function makeFailure() { let s = createState('timeout'); for (let i = 0; i < 4; i++) s = advance(s); return s; }
function stop() { if (timer !== null) clearInterval(timer); timer = null; $('autoplay').textContent = '自动回放'; }
function renderFlow() {
 $('pipeline').replaceChildren(...stages.map((label, i) => {
  const li = document.createElement('li'); const n = document.createElement('span');
  n.className = 'stage-number'; n.textContent = `0${i + 1}`;
  li.append(n, document.createTextNode(label));
  li.className = i < flow.step ? 'done' : i === flow.step ? (flow.status === 'blocked' ? 'current blocked' : 'current') : '';
  if (i === flow.step) li.setAttribute('aria-current', 'step');
  return li;
 }));
 let copy = stepCopy[flow.step];
 if (flow.status === 'blocked') copy = ['过期的数据，停在执行之前。', '研究结果仍然保留，但当前快照未通过新鲜度检查，模拟提交次数保持为零。', '刷新界面不等于刷新行情，历史数据不伪装成实时数据。'];
 if (flow.status === 'unknown') copy = ['响应丢失，先保留不确定。', '这次合成请求没有明确响应。系统保留 unknown，等待订单与账户证据。', '切换到「异常对账」，试试重复请求与补充证据。'];
 $('step-number').textContent = `STEP 0${flow.step + 1} / 05`;
 ['step-title', 'step-description', 'step-boundary'].forEach((id, i) => $(id).textContent = copy[i]);
 $('scenario-hint').textContent = scenarios[flow.scenario].hint;
 $('event-log').replaceChildren(...flow.events.map((event, i) => { const li = document.createElement('li'); const n = document.createElement('span'); const text = document.createElement('span'); n.textContent = `0${i+1}`; text.textContent = event; li.append(n, text); return li; }));
 $('flow-status').textContent = statusNames[flow.status];
 $('submit-count').textContent = `模拟提交 ${flow.calls} 次`;
 const ended = flow.status !== 'reviewing';
 $('next-step').disabled = ended; $('autoplay').disabled = ended;
 if (ended) stop();
}
$('next-step').addEventListener('click', () => { stop(); flow = advance(flow); renderFlow(); });
$('reset-flow').addEventListener('click', () => { stop(); flow = createState($('scenario').value); renderFlow(); });
$('scenario').addEventListener('change', () => { stop(); flow = createState($('scenario').value); renderFlow(); });
$('autoplay').addEventListener('click', () => {
 if (timer !== null) { stop(); return; }
 $('autoplay').textContent = '暂停回放';
 timer = setInterval(() => { flow = advance(flow); renderFlow(); }, 1300);
});
function renderFailure() {
 $('reconcile-status').textContent = failure.status === 'reconciled' ? 'reconciled' : 'unknown';
 $('reconcile-count').textContent = `${failure.calls} 次`;
 $('reconcile-explanation').textContent = failure.status === 'reconciled' ? '合成证据匹配同一订单。状态已收敛，模拟提交次数仍为 1。' : '结果尚不确定。系统保留 unknown，等待证据，而不是重新发起订单。';
 $('reconcile').disabled = failure.status === 'reconciled';
 $('duplicate-result').textContent = failure.duplicateChecks ? `已识别 ${failure.duplicateChecks} 次重复请求；仍只有 ${failure.calls} 次模拟提交。` : '试着重复请求：提交次数应保持不变。';
}
$('duplicate').addEventListener('click', () => { failure = duplicateSubmit(failure); renderFailure(); });
$('reconcile').addEventListener('click', () => { failure = reconcile(failure); renderFailure(); });
$('reset-reconcile').addEventListener('click', () => { failure = makeFailure(); renderFailure(); });
function renderFreshness() {
 const age = Number($('age').value); const quality = freshness(age);
 $('age-value').textContent = age;
 $('age').setAttribute('aria-valuetext', `${age} 秒，${quality.label}`);
 $('freshness-status').textContent = quality.label;
 $('freshness-status').classList.toggle('amber', !quality.allowed);
 $('execution-eligible').textContent = quality.allowed ? '允许' : '已拦截';
 $('freshness-explanation').textContent = quality.allowed ? '在演示的新鲜度范围内。' : '保留展示，暂停新执行。';
}
$('age').addEventListener('input', renderFreshness);
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
 stop();
 document.querySelectorAll('[data-view]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
 document.querySelectorAll('.demo-panel').forEach(panel => panel.hidden = panel.id !== `${button.dataset.view}-panel`);
}));
const modules = {
 market: ['01','行情与快照','先保存当时看到的事实，再让分析发生。','记录数据来源、周期、复权方式、快照时间和质量状态，为研究提供一致的输入。','缺失就是缺失；补采历史数据不伪装成实时行情。',['Parquet','数据合同','时间语义']],
 research: ['02','模型与候选','让模型参与研究，不给它无边界的执行权限。','组织候选分析、跟踪观察与研究建议，并保留它们引用的快照和策略版本。','模型建议与执行权限分开；新的回复仍需经过当前数据和风险检查。',['模型适配器','结构化输出','候选生命周期']],
 execution: ['03','规划与执行','用明确规则，约束每一次模拟执行。','组合规划、账户检查、硬风控和订单意图持久化，由唯一执行服务调用模拟适配器。','先记录意图，再提交请求；unknown 先对账再决定后续动作。',['ExecutionService','幂等意图','执行权校验']],
 ledger: ['04','事务账本','实验与执行，各自留下完整记录。','SQLite 保存事务状态与事件；不同实验与模拟账户保持账本隔离，决策保留版本归属。','JSON 只用于交换；接口采用业务单位，避免暴露存储内部定标值。',['SQLite','SQLAlchemy','Alembic']],
 review: ['05','复盘与演进','记录结果，也保留当时为什么这样做。','关联决策与后续结果；策略改进创建新版本，逐级经过回放、影子验证与灰度门槛。','不拿未来信息改写过去，不把实验结果直接当作执行指令。',['结果归因','不可变版本','回放约束']],
 viewer: ['06','独立 Viewer','远程只看状态，本地继续掌握执行。','通过认证与字段白名单导出快照，单向传递给独立只读展示模块。','不直接连接交易账本或执行入口；真实快照仍是私密信息，本作品集从不加载它。',['单向快照','白名单','读写分离']],
};
document.querySelectorAll('[data-module]').forEach(button => button.addEventListener('click', () => {
 document.querySelectorAll('[data-module]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
 const [n, title, summary, responsibility, boundary, tags] = modules[button.dataset.module];
 $('module-number').textContent = `MODULE ${n}`; $('module-title').textContent = title; $('module-summary').textContent = summary; $('module-do').textContent = responsibility; $('module-boundary').textContent = boundary;
 $('module-tech').replaceChildren(...tags.map(tag => { const span = document.createElement('span'); span.textContent = tag; return span; }));
}));
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
renderFlow(); renderFailure(); renderFreshness();
