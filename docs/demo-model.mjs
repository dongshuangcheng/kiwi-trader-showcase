// Standalone presentation model. Not imported from the private trading runtime.
export const stages = ['行情快照', '模型研究', '风险校验', '持久化意图', '模拟回执'];
export const scenarios = {
  normal: { label: '正常流程', hint: '沿着一次决策，查看每一道边界。' },
  timeout: { label: '响应超时', hint: '远端已接收，但本地没有得到明确回执。' },
  stale: { label: '行情过期', hint: '保留研究结果，在风险校验处阻止执行。' },
};
export function createState(scenario = 'normal') {
  if (!Object.hasOwn(scenarios, scenario)) throw new Error('Unknown demo scenario');
  return { scenario, step: 0, status: 'reviewing', calls: 0, duplicateChecks: 0, events: ['快照已冻结 · SYNTHETIC-001'] };
}
export function advance(s) {
  if (s.status !== 'reviewing' || s.step >= 4) return s;
  const next = { ...s, step: s.step + 1, events: [...s.events] };
  const messages = ['', '研究建议已记录 · 不持有执行权限', '行情与账户边界校验通过', '订单意图已写入 · DEMO-INTENT-001', '收到明确模拟回执'];
  if (next.step === 2 && s.scenario === 'stale') {
    next.status = 'blocked'; next.events.push('数据已过期 · 执行闸门关闭'); return next;
  }
  if (next.step === 4) {
    next.calls = 1;
    next.status = s.scenario === 'timeout' ? 'unknown' : 'acknowledged';
    messages[4] = s.scenario === 'timeout' ? '响应含糊 · 保留 unknown，等待对账' : messages[4];
  }
  next.events.push(messages[next.step]); return next;
}
export function duplicateSubmit(s) {
  if (s.calls === 0) return s;
  return { ...s, duplicateChecks: s.duplicateChecks + 1, events: [...s.events.slice(-8), '重复请求已识别 · 模拟提交次数保持 1'] };
}
export function reconcile(s) {
  if (s.status !== 'unknown') return s;
  return { ...s, status: 'reconciled', events: [...s.events.slice(-8), '合成证据确认同一订单 · 状态已收敛，无新增提交'] };
}
// 60 seconds is a presentation-only threshold, not a production setting.
export function freshness(age) {
  if (!Number.isFinite(age) || age < 0) return { allowed: false, label: '时间无效' };
  return { allowed: age <= 60, label: age <= 60 ? '通过演示闸门' : '过期，阻止新执行' };
}
