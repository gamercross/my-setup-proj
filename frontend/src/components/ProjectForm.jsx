// 프로젝트 추가 폼 (TaskForm 패턴 복제)
// - 제출 payload 는 snake_case: { name, progress? }
// - progress 가 비어 있으면 키 자체를 보내지 않는다. 값이 있으면 Number() 로 변환해 전송한다.
// - onSubmit 은 Promise<boolean> 을 반환하며 true 인 뒤에만 폼을 초기화한다.

import React, { useState } from 'react';

export default function ProjectForm({ onSubmit, disabled }) {
  const [name, setName] = useState('');
  const [progress, setProgress] = useState('');
  const [hint, setHint] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setHint('이름을 입력하세요');
      return;
    }
    setHint('');

    const payload = { name: name.trim() };
    if (progress !== '') payload.progress = Number(progress);

    const ok = await onSubmit(payload);
    if (ok) {
      setName('');
      setProgress('');
    }
  };

  const inputStyle = {
    background: 'var(--panel)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 8px',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
      <input
        type="text"
        placeholder="프로젝트 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        style={{ ...inputStyle, flex: 1, minWidth: '140px' }}
      />
      <input
        type="number"
        min={0}
        max={100}
        placeholder="진행도"
        value={progress}
        onChange={(e) => setProgress(e.target.value)}
        disabled={disabled}
        style={{ ...inputStyle, width: '90px' }}
      />
      <button
        type="submit"
        disabled={disabled}
        style={{
          background: 'var(--accent)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          cursor: 'pointer',
        }}
      >
        + 프로젝트 추가
      </button>
      {hint && (
        <p style={{ width: '100%', margin: '2px 0 0', color: 'var(--bad)', fontSize: '12px' }}>{hint}</p>
      )}
    </form>
  );
}
