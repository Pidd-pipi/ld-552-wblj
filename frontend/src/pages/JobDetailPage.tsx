import { CalendarOutlined, EditOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Space, Tabs, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CandidateCard from '../components/CandidateCard';
import JobFormModal from '../components/JobFormModal';
import PipelineKanban from '../components/PipelineKanban';
import { JobStatus, UserRole, statusText } from '../constants/enums';
import { useAuthStore } from '../stores/authStore';
import { api, errorMessage, isVersionConflict } from '../utils/api';
import { showVersionConflict } from '../utils/conflict';

// 与后端一致的职位状态流转
const nextStatus: Partial<Record<JobStatus, JobStatus[]>> = {
  [JobStatus.DRAFT]: [JobStatus.OPEN],
  [JobStatus.OPEN]: [JobStatus.PAUSED, JobStatus.CLOSED],
  [JobStatus.PAUSED]: [JobStatus.CLOSED, JobStatus.OPEN],
  [JobStatus.CLOSED]: [JobStatus.OPEN, JobStatus.ARCHIVED],
};
const actionText = (from: JobStatus, to: JobStatus) => to === JobStatus.OPEN ? (from === JobStatus.CLOSED ? '重新打开' : '发布') : statusText[to];

export default function JobDetailPage() {
  const { id } = useParams();
  const can = useAuthStore((s) => s.can);
  const canEdit = can([UserRole.HR, UserRole.HIRING_MANAGER, UserRole.ADMIN]);
  const [job, setJob] = useState<Job>();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [editing, setEditing] = useState(false);
  const load = async () => { const [j, r, i] = await Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/resumes`), api.get(`/jobs/${id}/interviews`)]); setJob(j.data); setResumes(r.data); setInterviews(i.data); };
  useEffect(() => { load(); }, [id]);

  // 发布/暂停/关闭等操作携带当前 version；版本对不上时提示并重新载入
  const changeStatus = async (status: JobStatus) => {
    if (!job) return;
    try { await api.patch(`/jobs/${job.id}/status`, { status, version: job.version, reason: '职位详情页操作' }); await load(); }
    catch (e: any) {
      if (isVersionConflict(e)) { showVersionConflict(e.response.data, load); await load(); }
      else message.error(errorMessage(e));
    }
  };

  return <>
    <h1 className="page-title">{job?.title}</h1>
    <Card className="tf-card" style={{ margin: '18px 0' }}>
      <Space wrap>
        <Tag color="green">{job && statusText[job.status]}</Tag> {job?.department} · {job?.location} · {job?.salaryRange}
        {canEdit && job && <>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>编辑</Button>
          {(nextStatus[job.status] || []).map((s) => <Button size="small" key={s} onClick={() => changeStatus(s)}>{actionText(job.status, s)}</Button>)}
        </>}
      </Space>
      <p>{job?.description}</p>
      <p className="subtle">{job?.requirements}</p>
    </Card>
    <Tabs items={[
      { key: 'candidates', label: <><UnorderedListOutlined />候选人列表</>, children: <div style={{ display: 'grid', gap: 12 }}>{resumes.map((r) => r.candidate && <CandidateCard key={r.id} candidate={{ ...r.candidate, resumes: [r] }} />)}</div> },
      { key: 'kanban', label: 'PipelineKanban 看板', children: <PipelineKanban resumes={resumes} onMove={async (rid, status) => { await api.patch(`/resumes/${rid}/status`, { status, reason: '看板拖拽' }); load(); }} /> },
      { key: 'calendar', label: <><CalendarOutlined />面试日历</>, children: <div style={{ display: 'grid', gap: 10 }}>{interviews.map((i) => <Card key={i.id} size="small">{i.resume?.candidate?.name} · 第 {i.round} 轮 · {new Date(i.scheduledAt).toLocaleString()} · {statusText[i.result]}</Card>)}</div> },
    ]} />
    <JobFormModal open={editing} jobId={job?.id} onClose={() => setEditing(false)} onSaved={load} />
  </>;
}
