import { Alert, Button, Form, Input, Modal, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { getErrorMessage, getJobConflict, jobFieldText } from '../utils/conflict';

/**
 * 职位编辑弹窗：打开时带上当前 version，保存时提交该 version；
 * 若期间被他人改过（409），保留对方内容、列出已变化字段，可一键载入最新内容后继续编辑。
 */
export default function JobEditModal({ job, onClose, onSaved }: { job: Job | null; onClose: () => void; onSaved: (job: Job) => void }) {
  const [form] = Form.useForm();
  const [base, setBase] = useState<Job | null>(job);
  const [conflict, setConflict] = useState<JobVersionConflict>();
  const [saving, setSaving] = useState(false);

  useEffect(() => { setBase(job); setConflict(undefined); if (job) form.setFieldsValue(job); }, [job, form]);

  const save = async (values: Partial<Job>) => {
    if (!base) return;
    setSaving(true);
    try {
      const payload = { ...values, headcount: Number(values.headcount), hiringManagerId: Number(values.hiringManagerId), version: base.version };
      const { data } = await api.patch<Job>(`/jobs/${base.id}`, payload);
      message.success('职位已保存');
      setConflict(undefined);
      onSaved(data);
    } catch (err) {
      const c = getJobConflict(err);
      if (c) setConflict(c); else message.error(getErrorMessage(err, '保存失败'));
    } finally { setSaving(false); }
  };

  const loadLatest = () => {
    if (!conflict) return;
    setBase(conflict.current);
    form.setFieldsValue(conflict.current);
    setConflict(undefined);
    message.success('已载入对方最新内容，可继续修改后保存');
  };

  return (
    <Modal title={`编辑职位${base ? `（版本 v${base.version}）` : ''}`} open={!!job} onCancel={onClose} footer={null} destroyOnClose={false}>
      {conflict && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={conflict.message}
          description={
            <div>
              <div>已变化字段（对方当前内容）：</div>
              <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                {conflict.changedFields.map((f) => (
                  <li key={f}><b>{jobFieldText[f] || f}</b>：{String(conflict.current[f as keyof Job] ?? '—')}</li>
                ))}
              </ul>
              <Button size="small" type="primary" onClick={loadLatest}>载入最新内容</Button>
            </div>
          }
        />
      )}
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item label="职位名称" name="title" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="部门" name="department" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="地点" name="location" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="薪资" name="salaryRange" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="招聘人数" name="headcount"><Input type="number" /></Form.Item>
        <Form.Item label="职位描述" name="description"><Input.TextArea /></Form.Item>
        <Form.Item label="任职要求" name="requirements"><Input.TextArea /></Form.Item>
        <Form.Item label="招聘经理 ID" name="hiringManagerId"><Input /></Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          <Button onClick={onClose}>取消</Button>
        </Space>
      </Form>
    </Modal>
  );
}
