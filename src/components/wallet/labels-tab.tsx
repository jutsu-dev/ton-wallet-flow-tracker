'use client';

import { useState, type FormEvent } from 'react';
import type { LabelDto } from '@/server/labels/service';
import { apiDelete, apiPost, ApiError } from '@/lib/client/api';
import { LABEL_TYPES } from '@/lib/validation';
import { errorMessage, LABEL_TYPE_LABELS } from '@/lib/i18n';
import { Badge, Button, Card, Field, Input, Select } from '@/components/ui';

export function LabelsTab({
  address,
  initialLabels,
  currentUser,
}: {
  address: string;
  initialLabels: LabelDto[];
  currentUser: { id: string; role: string };
}) {
  const [labels, setLabels] = useState<LabelDto[]>(initialLabels);
  const [labelType, setLabelType] = useState('UNKNOWN');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Введите название метки.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ label: LabelDto }>('/api/labels', {
        address,
        labelType,
        title: title.trim(),
        note: note.trim() || null,
      });
      setLabels([res.label, ...labels]);
      setTitle('');
      setNote('');
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.code : 'error'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await apiDelete(`/api/labels/${id}`);
      setLabels((prev) => prev.filter((label) => label.id !== id));
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.code : 'error'));
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Добавить метку</h3>
          <Field label="Тип" htmlFor="labelType">
            <Select id="labelType" value={labelType} onChange={(e) => setLabelType(e.target.value)}>
              {LABEL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {LABEL_TYPE_LABELS[type] ?? type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Название" htmlFor="labelTitle">
            <Input
              id="labelTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label="Заметка" htmlFor="labelNote">
            <Input id="labelNote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
          {error ? <p className="text-sm font-medium">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'Сохранение…' : 'Добавить метку'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Метка добавлена пользователем и не является подтверждённой системой.
          </p>
        </form>
      </Card>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Метки адреса</h3>
        {currentUser.role === 'OWNER' ? (
          <p className="text-xs text-muted-foreground">Владелец может удалять любые метки.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Вы можете удалять свои метки.</p>
        )}
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Меток пока нет.</p>
        ) : (
          labels.map((label) => (
            <div
              key={label.id}
              className="flex items-start justify-between gap-2 rounded border border-border px-3 py-2"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge>{LABEL_TYPE_LABELS[label.labelType] ?? label.labelType}</Badge>
                  <span className="text-sm font-medium">{label.title}</span>
                </div>
                {label.note ? <p className="text-xs text-muted-foreground">{label.note}</p> : null}
                {label.createdBy ? (
                  <p className="text-[10px] text-muted-foreground">Автор: {label.createdBy}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(label.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
