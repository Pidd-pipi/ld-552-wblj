import { AppstoreOutlined, BarsOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JobEditModal from '../components/JobEditModal';
import { JobStatus, UserRole, statusText } from '../constants/enums';
import { useAuthStore } from '../stores/authStore';
import { useJobStore } from '../stores/jobStore';
import { api } from '../utils/api';
import { getErrorMessage, getJobConflict } from '../utils/conflict';

export default function JobsPage() {
  const { jobs, loadJobs, changeStatus } = useJobStore();
  const can = useAuthStore((s) => s.can);
  const editable = can([UserRole.HR, UserRole.HIRING_MANAGER, UserRole.ADMIN]);
  const [card, setCard] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  const create = async (v: Partial<Job>) => {
    await api.post('/jobs', { ...v, headcount: Number(v.headcount), hiringManagerId: Number(v.hiringManagerId) });
    message.success('职位已创建');
    setOpen(false);
    loadJobs();
  };

  /** 状态流转携带该职位当前 version；版本对不上时提示并重新载入列表 */
  const handleStatus = async (job: Job, status: JobStatus) => {
    try {
      await changeStatus(job.id, status, job.version);
      message.success(`已流转为「${statusText[status]}」`);
    } catch (err) {
      const conflict = getJobConflict(err);
      message.error(conflict ? conflict.message : getErrorMessage(err, '状态流转失败'));
      loadJobs();
    }
  };

  const statusSelect = (j: Job) => (
    <Select size="small" value={j.status} style={{ width: 120 }} disabled={!editable} onChange={(s) => handleStatus(j, s)} options={Object.values(JobStatus).map((v) => ({ value: v, label: statusText[v] }))} />
  );

  return (
    <>
      <div>
        <h1 className="page-title">职位管理</h1>
        <p className="subtle">按部门、状态和招聘进度管理岗位。</p>
      </div>
      <div className="toolbar">
        <Space>
          <Select allowClear placeholder="状态" style={{ width: 140 }} onChange={(status) => loadJobs({ status })} options={Object.values(JobStatus).map((v) => ({ value: v, label: statusText[v] }))} />
          <Button icon={card ? <BarsOutlined /> : <AppstoreOutlined />} onClick={() => setCard(!card)}>{card ? '表格' : '卡片'}</Button>
        </Space>
        {editable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建职位</Button>}
      </div>
      {card ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
          {jobs.map((j) => (
            <Card className="tf-card" key={j.id} title={<Link to={`/jobs/${j.id}`}>{j.title}</Link>} extra={<Tag color="green">{statusText[j.status]}</Tag>}>
              <p>{j.department} · {j.location} · {j.salaryRange}</p>
              <p>{j.description}</p>
              <Space wrap>
                <Tag>简历 {j._count?.resumes ?? j.resumes?.length ?? 0}</Tag>
                <Tag>HC {j.headcount}</Tag>
                {statusSelect(j)}
                {editable && <Button size="small" onClick={() => setEditing(j)}>编辑</Button>}
              </Space>
            </Card>
          ))}
        </div>
      ) : (
        <Table
          rowKey="id"
          dataSource={jobs}
          columns={[
            { title: '职位', dataIndex: 'title', render: (t, r) => <Link to={`/jobs/${r.id}`}>{t}</Link> },
            { title: '部门', dataIndex: 'department' },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag>{statusText[v as JobStatus]}</Tag> },
            { title: '简历数', render: (_, r) => r._count?.resumes || 0 },
            { title: '薪资', dataIndex: 'salaryRange' },
            { title: '操作', render: (_, r) => <Space>{statusSelect(r)}{editable && <Button size="small" onClick={() => setEditing(r)}>编辑</Button>}</Space> },
          ]}
        />
      )}
      <Modal title="新建职位" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={create} initialValues={{ status: JobStatus.DRAFT, hiringManagerId: 3 }}>
          <Form.Item label="职位名称" name="title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="部门" name="department" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="地点" name="location" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="薪资" name="salaryRange" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="招聘人数" name="headcount"><Input type="number" /></Form.Item>
          <Form.Item label="职位描述" name="description"><Input.TextArea /></Form.Item>
          <Form.Item label="任职要求" name="requirements"><Input.TextArea /></Form.Item>
          <Form.Item label="招聘经理 ID" name="hiringManagerId"><Input /></Form.Item>
          <Button type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
      <JobEditModal job={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadJobs(); }} />
    </>
  );
}
