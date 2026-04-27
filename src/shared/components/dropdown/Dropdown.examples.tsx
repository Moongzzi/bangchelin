import { useState } from 'react';

import { Dropdown, type DropdownOptionData } from './Dropdown';

const baseOptions: DropdownOptionData[] = [
  { value: 'item-1', label: 'labelitem' },
  { value: 'item-2', label: 'labelitem 2' },
  { value: 'item-3', label: 'labelitem 3' },
];

export function DropdownExamples() {
  const [defaultValue, setDefaultValue] = useState('item-1');
  const [placeholderValue, setPlaceholderValue] = useState<string | undefined>(undefined);
  const [openValue, setOpenValue] = useState('item-1');
  const [selectedValue, setSelectedValue] = useState('item-2');

  return (
    <div style={{ display: 'grid', gap: '3rem', maxWidth: '56rem' }}>
      <Dropdown
        label="label"
        value={defaultValue}
        options={baseOptions}
        onChange={setDefaultValue}
        placeholder="항목을 선택해주세요"
      />

      <Dropdown
        label="label"
        value={placeholderValue}
        options={baseOptions}
        onChange={setPlaceholderValue}
        placeholder="항목을 선택해주세요"
      />

      <Dropdown
        label="label"
        value={openValue}
        options={baseOptions}
        onChange={setOpenValue}
        placeholder="항목을 선택해주세요"
        defaultOpen
      />

      <Dropdown
        label="label"
        value={selectedValue}
        options={baseOptions}
        onChange={setSelectedValue}
        placeholder="항목을 선택해주세요"
      />

      <Dropdown
        label="label"
        value="item-1"
        options={baseOptions}
        onChange={() => undefined}
        placeholder="항목을 선택해주세요"
        disabled
      />
    </div>
  );
}