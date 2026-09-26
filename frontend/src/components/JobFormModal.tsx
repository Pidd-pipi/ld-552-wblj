import { Alert, Button, Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { JobStatus, jobFieldLabels } from '../constants/enums';
import { api, errorMessage, isVersionConflict } from '../utils/api';

type Conflict = { message: string; current: Job; changedFields: string[] };
type Props = { open: boolean; jobId?: number; onClose: () => void; onSaved: () => void };

// 职位新建/编辑表单。编辑时打开即载入当前 version，保存提交该 version；
// 若期间被他人修改（409），保留对方内容并列出已变化字段，重新载入后可继续编辑。
export default function JobFormModal({ open, jobId, onClose, onSaved }: Props) {
  const [form] = Form.useForm();
  const [version, setVersion] = useState<number>();
  const [conflict, setConflict] = useState<Conflict>();
  const [saving, setSaving] = useState(false);
  const isEdit = jobId !== undefined;

  const load = async () => {
    setConflict(undefined);
    if (!isEdit) { form.resetFields(); setVersion(undefined); return; }
    const { data } = await api.get(`/jobs/${jobId}`);
    setVersion(data.version);
    form.setFieldsValue(data);
  };
  useEffect(() => { if (open) load(); }, [open, jobId]);

  const submit = async (v: any) => {
    setSaving(true);
    try {
      const payload = { ...v, headcount: Number(v.headcount), hiringManagerId: Number(v.hiringManagerId) };
      if (isEdit) await api.patch(`/jobs/${jobId}`, { ...payload, version });
      else await api.post('/jobs', { ...payload, status: JobStatus.DRAFT });
      message.success(isEdit ? '职位已保存' : '职位已创建');
      onSaved();
      onClose();
    } catch (e: any) {
      if (isVersionConflict(e)) setConflict(e.response.data);
      else message.error(errorMessage(e));
    } finally { setSaving(false); }
  };

  return <Modal title={isEdit ? '编辑职位' : '新建职位'} open={open} onCancel={onClose} footer={null} destroyOnClose>
    {conflict && <Alert type="error" showIcon style={{ marginBottom: 16 }}
      message={conflict.message}
      description={<>
        <div>以下字段已被他人修改（显示为对方当前内容）：</div>
        <ul style={{ margin: '8px 0', paddingLeft: 18 }}>
          {conflict.changedFields.map((f) => <li key={f}><b>{jobFieldLabels[f] || f}</b>：{String(conflict.current?.[f as keyof Job] ?? '（空）')}</li>)}
        </ul>
        <Button size="small" onClick={load}>重新载入最新内容后继续编辑</Button>
      </>} />}
    <Form form={form} layout="vertical" onFinish={submit} initialValues={{ status: JobStatus.DRAFT, hiringManagerId: 3 }}>
      <Form.Item label="职位名称" name="title" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="部门" name="department" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="地点" name="location" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="薪资" name="salaryRange" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="招聘人数" name="headcount"><Input type="number" /></Form.Item>
      <Form.Item label="职位描述" name="description"><Input.TextArea /></Form.Item>
      <Form.Item label="任职要求" name="requirements"><Input.TextArea /></Form.Item>
      <Form.Item label="招聘经理 ID" name="hiringManagerId"><Input /></Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
    </Form>
  </Modal>;
}
