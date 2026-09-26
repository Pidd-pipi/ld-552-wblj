import { Modal } from 'antd';
import { jobFieldLabels } from '../constants/enums';

// 版本冲突提示：展示失败原因与已变化字段，确认后重新载入最新数据
export function showVersionConflict(data: { message?: string; changedFields?: string[] }, onReload: () => void) {
  const fields = (data.changedFields || []).map((f) => jobFieldLabels[f] || f).join('、');
  Modal.warning({
    title: '操作被拒绝',
    content: `${data.message || '该职位已被他人修改'}${fields ? `（已变化字段：${fields}）` : ''}，请重新载入后再试。`,
    onOk: onReload,
  });
}
