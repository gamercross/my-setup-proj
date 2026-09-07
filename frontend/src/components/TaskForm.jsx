// 할일 추가 폼
// - 제출 payload 는 snake_case: { title, priority, due_date }
// - due_date 가 비어 있으면 키 자체를 보내지 않는다.
// - onSubmit 은 Promise 를 반환하며 resolve(true) 된 뒤에만 폼을 초기화한다.

import React, { useState } from 'react';

export default function TaskForm({ onSubmit, disabled }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [hint, setHint] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setHint('제목을 입력하세요');
      return;
    }
    setHint('');

    const payload = { title: title.trim(), priority };
    if (dueDate) payload.due_date = dueDate;

    // onSubmit 성공 시에만 입력값 초기화, 실패 시 보존
    const ok = await onSubmit(payload);
    if (ok) {
      setTitle('');
      setPriority('medium');
      setDueDate('');
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
        placeholder="할 일 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={disabled}
        style={{ ...inputStyle, flex: 1, minWidth: '140px' }}
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        disabled={disabled}
        style={inputStyle}
      >
        <option value="high">high</option>
        <option value="medium">medium</option>
        <option value="low">low</option>
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={disabled}
        style={inputStyle}
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
        + 할일 추가
      </button>
      {hint && (
        <p style={{ width: '100%', margin: '2px 0 0', color: 'var(--bad)', fontSize: '12px' }}>{hint}</p>
      )}
    </form>
  );
}
