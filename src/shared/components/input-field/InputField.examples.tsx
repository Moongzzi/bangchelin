import { useState } from 'react';

import { InputField } from './InputField';

export function InputFieldExamples() {
  const [defaultValue, setDefaultValue] = useState('');
  const [valueWithClear, setValueWithClear] = useState('user_01');
  const [errorValue, setErrorValue] = useState('bangchelin');
  const [successValue, setSuccessValue] = useState('tester_id');
  const [outlinedValue, setOutlinedValue] = useState('');
  const [bareValue, setBareValue] = useState('아이디 입력');

  return (
    <div style={{ display: 'grid', gap: '2rem', maxWidth: '42rem' }}>
      <InputField
        label="아이디"
        placeholder="아이디 입력"
        value={defaultValue}
        onChange={(event) => setDefaultValue(event.target.value)}
        variant="default"
      />

      <InputField
        label="아이디"
        placeholder="아이디 입력"
        value={valueWithClear}
        onChange={(event) => setValueWithClear(event.target.value)}
        variant="defaultWithValue"
        showClearButton
        onClear={() => setValueWithClear('')}
      />

      <InputField
        label="아이디"
        placeholder=""
        value="|"
        onChange={() => undefined}
        variant="focused"
      />

      <InputField
        label="아이디"
        placeholder="아이디 입력"
        value="아이디 입력"
        onChange={() => undefined}
        variant="disabled"
        disabled
      />

      <InputField
        label="아이디"
        placeholder="아이디 입력"
        value={errorValue}
        onChange={(event) => setErrorValue(event.target.value)}
        variant="error"
        message="*확인되지 않은 아이디입니다."
        showClearButton
        onClear={() => setErrorValue('')}
      />

      <InputField
        label="아이디"
        placeholder="아이디 입력"
        value={successValue}
        onChange={(event) => setSuccessValue(event.target.value)}
        variant="success"
        message="*사용 가능한 아이디입니다."
        showClearButton
        onClear={() => setSuccessValue('')}
      />

      <InputField
        label="아이디"
        placeholder="아이디 입력"
        value={outlinedValue}
        onChange={(event) => setOutlinedValue(event.target.value)}
        variant="outlined"
      />

      <InputField
        label="아이디 입력"
        placeholder="아이디 입력"
        value={bareValue}
        onChange={(event) => setBareValue(event.target.value)}
        variant="bare"
        hideLabel
      />
    </div>
  );
}