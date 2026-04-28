import { useState } from 'react';

import { SearchBox } from './SearchBox';

export function SearchBoxExamples() {
  const [filledValue, setFilledValue] = useState('검색어 내용');
  const [focusedValue, setFocusedValue] = useState('');
  const [transparentValue, setTransparentValue] = useState('검색어 내용');

  return (
    <div style={{ display: 'grid', gap: '2.75rem', maxWidth: '48rem' }}>
      <SearchBox value="" onChange={() => undefined} placeholder="검색어 내용" />

      <SearchBox
        value={filledValue}
        onChange={(event) => setFilledValue(event.target.value)}
        placeholder="검색어 내용"
      />

      <SearchBox
        value={focusedValue}
        onChange={(event) => setFocusedValue(event.target.value)}
        placeholder="검색어 내용"
        autoFocus
      />

      <SearchBox
        value="검색어 내용"
        onChange={() => undefined}
        placeholder="검색어 내용"
        disabled
      />

      <SearchBox
        value={transparentValue}
        onChange={(event) => setTransparentValue(event.target.value)}
        placeholder="검색어 내용"
        backgroundVariant="transparent"
      />
    </div>
  );
}