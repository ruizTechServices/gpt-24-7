// components/ModelSelect.tsx
'use client';

export default function ModelSelect({
  onChange,
}: {
  onChange: (p: { provider: string; model?: string }) => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <label className="text-sm">Model:</label>
      <select
        className="border rounded px-2 py-1"
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'auto') onChange({ provider: 'gpt-4o-mini', model: '' });
          else if (v === 'openai') onChange({ provider: 'gpt-4o-mini', model: 'gpt-4o-mini' });
          else onChange({ provider: 'Claude Sonnet 3.5', model: 'claude-3-5-sonnet-20241022' });
        }}
        defaultValue="auto"
      >
        <option value="auto">Auto</option>
        <option value="openai">GPT-4o-mini</option>
        <option value="anthropic">Claude Sonnet 3.5</option>
      </select>
    </div>
  );
}
