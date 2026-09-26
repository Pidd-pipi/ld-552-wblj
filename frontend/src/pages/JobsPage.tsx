import { AppstoreOutlined, BarsOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Select, Space, Table, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JobFormModal from '../components/JobFormModal';
import { JobStatus, UserRole, statusText } from '../constants/enums';
import { useAuthStore } from '../stores/authStore';
import { useJobStore } from '../stores/jobStore';
import { errorMessage, isVersionConflict } from '../utils/api';
import { showVersionConflict } from '../utils/conflict';

export default function JobsPage() {
  const { jobs, loadJobs, changeStatus } = useJobStore();
  const can = useAuthStore((s) => s.can);
  const [card, setCard] = useState(true);
  const [filters, setFilters] = useState<{ status?: JobStatus }>({});
  const [modal, setModal] = useState<{ open: boolean; jobId?: number }>({ open: false });
  const canEdit = can([UserRole.HR, UserRole.HIRING_MANAGER, UserRole.ADMIN]);
  const reload = () => loadJobs(filters);
  useEffect(() => { loadJobs(filters); }, [loadJobs]);

  // 状态流转携带当前 version；版本对不上时提示并重新载入列表
  const onChangeStatus = async (j: Job, status: JobStatus) => {
    try { await changeStatus(j.id, status, j.version); await reload(); }
    catch (e: any) {
      if (isVersionConflict(e)) { showVersionConflict(e.response.data, reload); await reload(); }
      else message.error(errorMessage(e));
    }
  };

  const statusSelect = (j: Job) => <Select size="small" value={j.status} style={{ width: 120 }} onChange={(s) => onChangeStatus(j, s)} options={Object.values(JobStatus).map((v) => ({ value: v, label: statusText[v] }))} />;

  return <>
    <div><h1 className="page-title">职位管理</h1><p className="subtle">按部门、状态和招聘进度管理岗位。</p></div>
    <div className="toolbar">
      <Space>
        <Select allowClear placeholder="状态" style={{ width: 140 }} onChange={(status) => { const f = { status }; setFilters(f); loadJobs(f); }} options={Object.values(JobStatus).map((v) => ({ value: v, label: statusText[v] }))} />
        <Button icon={card ? <BarsOutlined /> : <AppstoreOutlined />} onClick={() => setCard(!card)}>{card ? '表格' : '卡片'}</Button>
      </Space>
      {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>新建职位</Button>}
    </div>
    {card
      ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
          {jobs.map((j) => <Card className="tf-card" key={j.id} title={<Link to={`/jobs/${j.id}`}>{j.title}</Link>} extra={<Tag color="green">{statusText[j.status]}</Tag>}>
            <p>{j.department} · {j.location} · {j.salaryRange}</p>
            <p>{j.description}</p>
            <Space>
              <Tag>简历 {j._count?.resumes ?? j.resumes?.length ?? 0}</Tag>
              <Tag>HC {j.headcount}</Tag>
              {statusSelect(j)}
              {canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, jobId: j.id })}>编辑</Button>}
            </Space>
          </Card>)}
        </div>
      : <Table rowKey="id" dataSource={jobs} columns={[
          { title: '职位', dataIndex: 'title', render: (t, r) => <Link to={`/jobs/${r.id}`}>{t}</Link> },
          { title: '部门', dataIndex: 'department' },
          { title: '状态', dataIndex: 'status', render: (v, r) => canEdit ? statusSelect(r as Job) : <Tag>{statusText[v]}</Tag> },
          { title: '简历数', render: (_, r) => r._count?.resumes || 0 },
          { title: '薪资', dataIndex: 'salaryRange' },
          { title: '操作', render: (_, r) => canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, jobId: r.id })}>编辑</Button> },
        ]} />}
    <JobFormModal open={modal.open} jobId={modal.jobId} onClose={() => setModal({ open: false })} onSaved={reload} />
  </>;
}
