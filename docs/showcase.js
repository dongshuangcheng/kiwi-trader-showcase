import { stages, scenarios, createState, advance, duplicateSubmit, reconcile, freshness } from './demo-model.mjs';
const $ = (id) => document.getElementById(id);
const stageLabels = ['当时的信息', '研究建议', '条件检查', '记录操作', '收到反馈'];
const stepCopy = [
 ['先知道，建议基于什么。', '保留当时的信息，让你之后还能回头理解：这条建议是在什么条件下产生的。', '信息看得见，也应看得懂它的来源与时效。'],
 ['这是建议，还不是已经做了。', '把分析意见与后续操作分开表达，避免“给出了建议”被误读成“已经执行”。', '清楚说明现在走到哪一步，以及哪些事情还没发生。'],
 ['继续之前，先说清适用条件。', '检查当前信息是否仍适用。遇到缺失或过期，保留原来的内容，同时解释为什么暂停。', '不让使用者靠猜测判断系统是否还正常。'],
 ['先保留这次操作的上下文。', '记录正在做的事。即使后续反馈中断，也有依据核对进度，而不是让你从头再来。', '避免一次重复点击，变成一次额外操作。'],
 ['收到结果，也留下前因后果。', '把收到的反馈与原来的建议放在一起，方便理解过程，也方便之后复盘。', '收到回执不等于已成交；状态表达应与实际含义一致。'],
];
const statusNames = { reviewing: '处理中', blocked: '已暂停，等待新信息', unknown: '结果待核对', acknowledged: '已收到回执', reconciled: '已核对' };
let flow = createState();
let failure = makeFailure();
let timer = null;
function makeFailure() { let s = createState('timeout'); for (let i = 0; i < 4; i++) s = advance(s); return s; }
function stop() { if (timer !== null) clearInterval(timer); timer = null; $('autoplay').textContent = '自动回放'; }
function renderFlow() {
 $('pipeline').replaceChildren(...stages.map((label, i) => {
  const li = document.createElement('li'); const n = document.createElement('span');
  n.className = 'stage-number'; n.textContent = `0${i + 1}`;
  li.append(n, document.createTextNode(stageLabels[i]));
  li.className = i < flow.step ? 'done' : i === flow.step ? (flow.status === 'blocked' ? 'current blocked' : 'current') : '';
  if (i === flow.step) li.setAttribute('aria-current', 'step');
  return li;
 }));
 let copy = stepCopy[flow.step];
 if (flow.status === 'blocked') copy = ['内容还在，下一步先暂停。', '旧信息仍可查看，但它已不适合继续操作。页面解释原因，而不是清空内容或假装一切正常。', '让使用者同时知道：我还能看什么，现在还可以做什么。'];
 if (flow.status === 'unknown') copy = ['没收到反馈，不等于没发生。', '这里明确表达“结果待核对”，而不是直接提示失败，减少再次点击带来的误操作。', '切换到「异常对账」，看看怎样让下一步更明确。'];
 $('step-number').textContent = `第 ${flow.step + 1} 步 / 共 5 步`;
 ['step-title', 'step-description', 'step-boundary'].forEach((id, i) => $(id).textContent = copy[i]);
 $('scenario-hint').textContent = scenarios[flow.scenario].hint;
 $('event-log').replaceChildren(...flow.events.map((event, i) => { const li = document.createElement('li'); const n = document.createElement('span'); const text = document.createElement('span'); n.textContent = `0${i+1}`; text.textContent = event.replace('快照已冻结 · SYNTHETIC-001', '已保留当时的信息').replace('研究建议已记录 · 不持有执行权限', '已形成建议 · 尚未执行').replace('行情与账户边界校验通过', '当前条件允许继续').replace('订单意图已写入 · DEMO-INTENT-001', '本次操作已记录').replace('收到明确模拟回执', '已收到明确反馈').replace('响应含糊 · 保留 unknown，等待对账', '没有明确反馈 · 结果待核对').replace('数据已过期 · 执行闸门关闭', '信息已过期 · 暂停下一步'); li.append(n, text); return li; }));
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
 $('reconcile-status').textContent = failure.status === 'reconciled' ? '已核对' : '结果待核对';
 $('reconcile-count').textContent = `${failure.calls} 次`;
 $('reconcile-explanation').textContent = failure.status === 'reconciled' ? '已找回这次操作的结果。无需再次提交，也没有额外产生一次操作。' : '暂时没有明确反馈，先核对已有操作，而不是引导你再点一次。';
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
 $('freshness-status').textContent = quality.allowed ? '信息仍在演示有效期' : '信息已过期，暂停下一步';
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
 market: ['01','先讲清依据','先解决“为什么”，再展示“是什么”。','单独给出结论会增加判断负担。把依据、阶段和下一步放在一起，比增加更多指标更有助于形成理解。','计划让试用者解释一条建议的依据与当前阶段，记录是否需要额外提示、在哪些信息间反复查找。',['问题假设','信息组织','待用户验证']],
 research: ['02','分清建议与行动','防止“系统建议了”被误读成“系统已经做了”。','建议与执行在系统中本就分开，界面也应保留这个差别。宁可多解释一次阶段，也不让状态模糊带来错误预期。','计划给出一条研究建议，请试用者判断哪些动作已经发生、哪些仍待检查；观察是否把建议当作成交。',['心理模型','清楚的状态','待用户验证']],
 execution: ['03','把异常说清楚','一个警报，应该回答“发生了什么”和“现在怎么办”。','把“明确失败”与“结果待核对”分开。结果不明确时保留进度、说明核对路径，而不是把重复操作变成默认选择。','原型已验证重复请求不增加模拟提交。下一步观察试用者是否理解待核对、是否仍会反复尝试提交。',['异常反馈','防止误操作','原型已走查']],
 ledger: ['04','保留决策上下文','方便回头理解，而不只是追问最终结果。','结果与当时的信息、判断和操作阶段一起保留。避免只看最终状态时失去原因，也避免用后来的信息重解释当时的决定。','计划让试用者回看一条已结束流程，复述当时的依据、发生的动作和结果；记录找信息所需的路径与求助。',['可追溯','上下文','待用户验证']],
 review: ['05','信息逐层展开','把更多细节留给真正需要它的人。','第一层回答当前发生什么、下一步是什么；取舍和系统边界再逐层展开。牺牲一次性展示的完整感，优先降低初次理解负担。','桌面与手机已做布局走查。下一步比较首次任务中是否频繁展开次级内容，再判断哪些信息值得上移。',['渐进披露','任务优先','布局已走查']],
 viewer: ['06','隐私默认有边界','能展示产品，不等于要展示个人信息。','公开体验使用合成场景，真实账户与运行信息保持私有。将演示能力与真实连接分开，避免展示需求扩大数据暴露范围。','已检查公开文件与页面连接边界。下一步测试使用者能否明确分辨演示与真实环境，避免对权限和数据来源产生误解。',['隐私设计','场景隔离','公开内容已检查']],
};
document.querySelectorAll('[data-module]').forEach(button => button.addEventListener('click', () => {
 document.querySelectorAll('[data-module]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
 const [n, title, summary, responsibility, boundary, tags] = modules[button.dataset.module];
 $('module-number').textContent = `DECISION ${n}`; $('module-title').textContent = title; $('module-summary').textContent = summary; $('module-do').textContent = responsibility; $('module-boundary').textContent = boundary;
 $('module-tech').replaceChildren(...tags.map(tag => { const span = document.createElement('span'); span.textContent = tag; return span; }));
}));
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
renderFlow(); renderFailure(); renderFreshness();
