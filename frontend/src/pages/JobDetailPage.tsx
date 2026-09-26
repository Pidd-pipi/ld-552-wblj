import { CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Space, Tabs, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CandidateCard from '../components/CandidateCard';
import JobEditModal from '../components/JobEditModal';
import PipelineKanban from '../components/PipelineKanban';
import { JobStatus, UserRole, statusText } from '../constants/enums';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { getErrorMessage, getJobConflict } from '../utils/conflict';

/** 与后端一致的职位状态机：发布 / 暂停 / 关闭 / 重新打开 / 归档 */
const jobActions: Partial<Record<JobStatus, { to: JobStatus; label: string }[]>> = {
  [JobStatus.DRAFT]: [{ to: JobStatus.OPEN, label: '发布职位' }],
  [JobStatus.OPEN]: [{ to: JobStatus.PAUSED, label: '暂停招聘' }, { to: JobStatus.CLOSED, label: '关闭职位' }],
  [JobStatus.PAUSED]: [{ to: JobStatus.OPEN, label: '恢复开放' }, { to: JobStatus.CLOSED, label: '关闭职位' }],
  [JobStatus.CLOSED]: [{ to: JobStatus.OPEN, label: '重新打开' }, { to: JobStatus.ARCHIVED, label: '归档职位' }],
};

export default function JobDetailPage() {
  const { id } = useParams();
  const can = useAuthStore((s) => s.can);
  const editable = can([UserRole.HR, UserRole.HIRING_MANAGER, UserRole.ADMIN]);
  const [job, setJob] = useState<Job>();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const load = async () => {
    const [j, r, i] = await Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/resumes`), api.get(`/jobs/${id}/interviews`)]);
    setJob(j.data); setResumes(r.data); setInterviews(i.data);
  };
  useEffect(() => { load(); }, [id]);

  /** 发布/暂停/关闭等流转：提交当前 version，版本对不上时提示重新载入 */
  const doAction = async (to: JobStatus, label: string) => {
    if (!job) return;
    try {
      await api.patch(`/jobs/${job.id}/status`, { status: to, version: job.version, reason: `详情页${label}` });
      message.success(`已${label}`);
      setActionError(undefined);
      load();
    } catch (err) {
      const conflict = getJobConflict(err);
      setActionError(conflict ? conflict.message : getErrorMessage(err, '操作失败'));
    }
  };

  return (
    <>
      <h1 className="page-title">{job?.title}</h1>
      {actionError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="操作失败"
          description={actionError}
          action={<Button size="small" onClick={() => { setActionError(undefined); load(); }}>重新载入</Button>}
        />
      )}
      <Card
        className="tf-card"
        style={{ margin: '18px 0' }}
        extra={editable && job && (
          <Space>
            {(jobActions[job.status] || []).map((a) => <Button key={a.to} size="small" onClick={() => doAction(a.to, a.label)}>{a.label}</Button>)}
            <Button size="small" type="primary" onClick={() => setEditing(true)}>编辑</Button>
          </Space>
        )}
      >
        <Tag color="green">{job && statusText[job.status]}</Tag> {job?.department} · {job?.location} · {job?.salaryRange}
        {job && <Tag style={{ marginLeft: 8 }}>版本 v{job.version}</Tag>}
        <p>{job?.description}</p>
        <p className="subtle">{job?.requirements}</p>
      </Card>
      <Tabs
        items={[
          { key: 'candidates', label: <><UnorderedListOutlined />候选人列表</>, children: <div style={{ display: 'grid', gap: 12 }}>{resumes.map((r) => r.candidate && <CandidateCard key={r.id} candidate={{ ...r.candidate, resumes: [r] }} />)}</div> },
          { key: 'kanban', label: 'PipelineKanban 看板', children: <PipelineKanban resumes={resumes} onMove={async (rid, status) => { await api.patch(`/resumes/${rid}/status`, { status, reason: '看板拖拽' }); load(); }} /> },
          { key: 'calendar', label: <><CalendarOutlined />面试日历</>, children: <div style={{ display: 'grid', gap: 10 }}>{interviews.map((i) => <Card key={i.id} size="small">{i.resume?.candidate?.name} · 第 {i.round} 轮 · {new Date(i.scheduledAt).toLocaleString()} · {statusText[i.result]}</Card>)}</div> },
        ]}
      />
      <JobEditModal job={editing ? job ?? null : null} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />
    </>
  );
}
