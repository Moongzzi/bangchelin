import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { Dropdown } from '../../../shared/components/dropdown/Dropdown';
import { InputField } from '../../../shared/components/input-field/InputField';
import { ToggleSwitch } from './ToggleSwitch';
import type {
  CalendarEventCategory,
  CalendarEventFormValues,
  CalendarLocationRegion,
  CalendarEventStatus,
} from '../types/calendar.types';
import {
  addMonths,
  buildMonthGrid,
  formatDateKey,
  parseDateKey,
  startOfMonth,
} from '../utils/calendarDate.utils';
import styles from './CalendarShared.module.css';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

type EventCreateModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  values: CalendarEventFormValues;
  regionOptions: Array<{ value: CalendarLocationRegion; label: string }>;
  categoryOptions: Array<{ value: CalendarEventCategory; label: string }>;
  statusOptions: Array<{ value: CalendarEventStatus; label: string }>;
  helperMessage?: string;
  onChange: <Key extends keyof CalendarEventFormValues>(field: Key, value: CalendarEventFormValues[Key]) => void;
  onRequestClose: () => void;
  onSubmit: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function EventCreateModal({
  open,
  mode,
  values,
  regionOptions,
  categoryOptions,
  statusOptions,
  helperMessage,
  onChange,
  onRequestClose,
  onSubmit,
}: EventCreateModalProps) {
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const selectedHourRef = useRef<HTMLButtonElement | null>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'startDate' | 'endDate'>('startDate');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'startTime' | 'endTime'>('startTime');
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(values.startDate ? parseDateKey(values.startDate) : new Date()));
  const [participantSearchValue, setParticipantSearchValue] = useState('');

  const selectedStartDate = useMemo(
    () => (values.startDate ? parseDateKey(values.startDate) : null),
    [values.startDate],
  );
  const selectedEndDate = useMemo(
    () => (values.endDate ? parseDateKey(values.endDate) : null),
    [values.endDate],
  );

  const formatDateLabel = useMemo(() => (
    (date: Date | null) => {
      if (!date) {
        return '날짜를 선택해주세요.';
      }

      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date);

      return `${year}. ${month}. ${day} ${weekday}`;
    }
  ), []);

  const selectedStartDateLabel = useMemo(() => {
    if (!selectedStartDate) {
      return '날짜를 선택해주세요.';
    }

    return formatDateLabel(selectedStartDate);
  }, [formatDateLabel, selectedStartDate]);

  const selectedEndDateLabel = useMemo(() => formatDateLabel(selectedEndDate), [formatDateLabel, selectedEndDate]);

  const formatTimeLabel = useMemo(() => (
    (time: string) => {
      if (!time) {
        return '시간 선택';
      }

      const [hourString, minuteString] = time.split(':');
      const hours = Number(hourString ?? '0');
      const minutes = Number(minuteString ?? '0');
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);

      return new Intl.DateTimeFormat('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    }
  ), []);

  const startTimeLabel = useMemo(() => formatTimeLabel(values.startTime), [formatTimeLabel, values.startTime]);
  const endTimeLabel = useMemo(() => formatTimeLabel(values.endTime), [formatTimeLabel, values.endTime]);
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, hour) => `${hour}`.padStart(2, '0')), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, minute) => `${minute}`.padStart(2, '0')), []);
  const activeTimeValue = activeTimeField === 'startTime' ? values.startTime : values.endTime;
  const [activeHour = '00', activeMinute = '00'] = activeTimeValue.split(':');

  const displayMonthLabel = useMemo(() => new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(displayMonth), [displayMonth]);
  const monthCells = useMemo(() => buildMonthGrid(displayMonth), [displayMonth]);

  const participantLimit = useMemo(() => Number(values.participantLimit || '0'), [values.participantLimit]);
  const externalGuestCount = useMemo(() => Number(values.externalGuestCount || '0'), [values.externalGuestCount]);
  const participantCount = values.participantNames.length + externalGuestCount;
  const canIncreaseExternalGuests = participantCount < participantLimit;
  const participantExceeded = participantLimit > 0 && participantCount > participantLimit;
  const compactDropdownStyle = useMemo(() => ({
    '--dropdown-trigger-min-height': '35px',
    '--dropdown-trigger-padding-x': '12px',
    '--dropdown-option-min-height': '35px',
    '--dropdown-option-padding-x': '12px',
    '--dropdown-menu-offset': '0px',
  }) as CSSProperties, []);

  useEffect(() => {
    if (!open) {
      setIsDatePickerOpen(false);
      setActiveDateField('startDate');
      setIsTimePickerOpen(false);
      setActiveTimeField('startTime');
      setParticipantSearchValue('');
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isDatePickerOpen) {
          setIsDatePickerOpen(false);
          return;
        }

        if (isTimePickerOpen) {
          setIsTimePickerOpen(false);
          return;
        }

        onRequestClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDatePickerOpen, isTimePickerOpen, open, onRequestClose]);

  useEffect(() => {
    if (!open) return undefined;

    // manage body scroll lock with a modal counter to support multiple modals
    const prevCount = Number(document.body.dataset.modalCount ?? '0');
    const count = prevCount + 1;
    document.body.dataset.modalCount = String(count);

    // If this is the first modal, lock scroll and add padding to avoid layout shift
    if (prevCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // store previous padding-right to restore later
      document.body.dataset.prevPaddingRight = document.body.style.paddingRight || '';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
    }

    return () => {
      const next = Number(document.body.dataset.modalCount ?? '1') - 1;
      if (next <= 0) {
        delete document.body.dataset.modalCount;
        // restore previous padding-right
        const prev = document.body.dataset.prevPaddingRight ?? '';
        document.body.style.paddingRight = prev;
        delete document.body.dataset.prevPaddingRight;
        document.body.style.overflow = '';
      } else {
        document.body.dataset.modalCount = String(next);
      }
    };
  }, [open]);

  useEffect(() => {
    const activeDateKey = activeDateField === 'startDate' ? values.startDate : values.endDate;

    if (!open || !activeDateKey) {
      return;
    }

    setDisplayMonth(startOfMonth(parseDateKey(activeDateKey)));
  }, [activeDateField, open, values.endDate, values.startDate]);

  useEffect(() => {
    if (!isDatePickerOpen && !isTimePickerOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
        setIsTimePickerOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isDatePickerOpen, isTimePickerOpen]);

  useEffect(() => {
    if (!isTimePickerOpen) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      selectedHourRef.current?.scrollIntoView({ block: 'center' });
      selectedMinuteRef.current?.scrollIntoView({ block: 'center' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeHour, activeMinute, isTimePickerOpen]);

  if (!open) {
    return null;
  }

  function handleSelectDate(nextDate: Date) {
    const nextDateKey = formatDateKey(nextDate);

    if (activeDateField === 'startDate') {
      onChange('startDate', nextDateKey);

      if (values.endDate < nextDateKey) {
        onChange('endDate', nextDateKey);
      }
    } else {
      if (nextDateKey < values.startDate) {
        return;
      }

      onChange('endDate', nextDateKey);
    }

    setDisplayMonth(startOfMonth(nextDate));
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
  }

  function handleDateTextClick(field: 'startDate' | 'endDate') {
    setActiveDateField(field);
    setIsDatePickerOpen(true);
    setIsTimePickerOpen(false);
    const targetDate = field === 'startDate' ? selectedStartDate : selectedEndDate;
    if (targetDate) {
      setDisplayMonth(startOfMonth(targetDate));
    }
  }

  function handleTimeTextClick(field: 'startTime' | 'endTime') {
    if (values.isAllDay) {
      return;
    }

    setActiveTimeField(field);
    setIsTimePickerOpen((currentValue) => (activeTimeField === field ? !currentValue : true));
    setIsDatePickerOpen(false);
  }

  function handleSelectTimePart(part: 'hour' | 'minute', nextValue: string) {
    const nextTime = part === 'hour' ? `${nextValue}:${activeMinute}` : `${activeHour}:${nextValue}`;
    onChange(activeTimeField, nextTime);
  }

  function sanitizeNumberInput(nextValue: string) {
    return nextValue.replace(/\D/g, '').slice(0, 3);
  }

  function updateParticipantLimit(nextValue: string) {
    onChange('participantLimit', sanitizeNumberInput(nextValue));
  }

  function updateExternalGuestCount(nextValue: number) {
    const clampedValue = Math.max(0, Math.min(nextValue, 999));

    if (clampedValue > externalGuestCount && clampedValue + values.participantNames.length > participantLimit) {
      return;
    }

    onChange('externalGuestCount', `${clampedValue}`);
  }

  function addParticipantName(rawValue: string) {
    const nextName = rawValue.trim();

    if (!nextName || values.participantNames.includes(nextName) || participantCount >= participantLimit) {
      return;
    }

    onChange('participantNames', [...values.participantNames, nextName]);
    setParticipantSearchValue('');
  }

  function removeParticipantName(targetName: string) {
    onChange('participantNames', values.participantNames.filter((name) => name !== targetName));
  }

  function handleParticipantSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    addParticipantName(participantSearchValue);
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
        <div className={styles.modalCardContent}>
          <div className={styles.modalHeader}>
            <h2 id="calendar-modal-title" className={styles.modalTitle}>{mode === 'create' ? '일정 생성' : '일정 수정'}</h2>
            <button type="button" className={styles.modalCloseButton} onClick={onRequestClose} aria-label="일정 생성 모달 닫기">
              <CloseIcon />
            </button>
          </div>

          <div className={styles.modalForm}>
          <div className={styles.modalGrid}>
            <label className={styles.fieldLabel} htmlFor="calendar-event-title">제목</label>
            <InputField
              id="calendar-event-title"
              label="일정 제목"
              hideLabel
              placeholder="제목을 입력해주세요."
              variant="default"
              value={values.title}
              onChange={(event) => onChange('title', event.target.value)}
              rootStyle={{
                '--input-control-min-height-underline': '30px',
                '--input-padding-underline': '0',
                '--input-line-height': '30px',
              } as CSSProperties}
              className={styles.modalTitleInputRoot}
            />

            <span className={styles.fieldLabel}>일시</span>
            <div className={styles.fieldControl}>
              <div className={styles.modalTimeRow}>
                <ToggleSwitch
                  checked={values.isAllDay}
                  onChange={(checked) => {
                    onChange('isAllDay', checked);
                    if (checked) {
                      setIsTimePickerOpen(false);
                    }
                  }}
                  ariaLabel="하루 종일 토글"
                  onLabel=""
                  offLabel=""
                />
                <span className={styles.toggleLabel}>하루 종일</span>
              </div>

              <div ref={datePickerRef} className={styles.datePickerShell}>
                <div className={styles.dateTimeGrid}>
                  <div className={styles.dateTimeTextRow}>
                    <button
                      type="button"
                      className={styles.dateTimeTextButton}
                      onClick={() => handleDateTextClick('startDate')}
                      aria-label="시작 날짜 편집"
                    >
                      {selectedStartDateLabel}
                    </button>
                    <button
                      type="button"
                      className={`${styles.dateTimeTextButton} ${styles.dateTimeTextButtonTime}`}
                      onClick={() => handleTimeTextClick('startTime')}
                      aria-label="시작 시간 편집"
                    >
                      {values.isAllDay ? '하루 종일' : startTimeLabel}
                    </button>
                  </div>
                  <div className={styles.dateTimeTextRow}>
                    <button
                      type="button"
                      className={styles.dateTimeTextButton}
                      onClick={() => handleDateTextClick('endDate')}
                      aria-label="종료 날짜 편집"
                    >
                      {selectedEndDateLabel}
                    </button>
                    <button
                      type="button"
                      className={`${styles.dateTimeTextButton} ${styles.dateTimeTextButtonTime}`}
                      onClick={() => handleTimeTextClick('endTime')}
                      aria-label="종료 시간 편집"
                    >
                      {values.isAllDay ? '하루 종일' : endTimeLabel}
                    </button>
                  </div>
                </div>

                {isDatePickerOpen ? (
                  <div className={styles.datePickerPopover} role="dialog" aria-label="일정 날짜 달력 선택기">
                    <div className={styles.datePickerHeader}>
                      <strong className={styles.datePickerMonthLabel}>{displayMonthLabel}</strong>
                      <div className={styles.datePickerNav}>
                        <button
                          type="button"
                          className={styles.datePickerNavButton}
                          onClick={() => setDisplayMonth((currentValue) => addMonths(currentValue, -1))}
                          aria-label="이전 달 보기"
                        >
                          {'<' }
                        </button>
                        <button
                          type="button"
                          className={styles.datePickerNavButton}
                          onClick={() => setDisplayMonth((currentValue) => addMonths(currentValue, 1))}
                          aria-label="다음 달 보기"
                        >
                          {'>' }
                        </button>
                      </div>
                    </div>

                    <div className={styles.datePickerWeekdays} aria-hidden="true">
                      {weekdayLabels.map((label) => (
                        <span key={label} className={styles.datePickerWeekday}>{label}</span>
                      ))}
                    </div>

                    <div className={styles.datePickerGrid}>
                      {monthCells.map((cell) => {
                        const isSelected = (activeDateField === 'startDate' ? values.startDate : values.endDate) === cell.dateKey;
                        const isDisabled = activeDateField === 'endDate' && cell.dateKey < values.startDate;
                        const dayButtonClassName = [
                          styles.datePickerDayButton,
                          !cell.inCurrentMonth ? styles.datePickerDayOutside : '',
                          isSelected ? styles.datePickerDaySelected : '',
                          cell.isToday ? styles.datePickerDayToday : '',
                          isDisabled ? styles.datePickerDayDisabled : '',
                        ].filter(Boolean).join(' ');

                        return (
                          <button
                            key={cell.dateKey}
                            type="button"
                            className={dayButtonClassName}
                            onClick={() => handleSelectDate(cell.date)}
                            aria-pressed={isSelected}
                            disabled={isDisabled}
                          >
                            {cell.dayNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {!values.isAllDay && isTimePickerOpen ? (
                  <div className={styles.timePickerPopover} role="dialog" aria-label="시간 선택">
                    <div className={styles.timePickerHeader}>
                      <strong className={styles.timePickerTitle}>
                        {activeTimeField === 'startTime' ? '시작 시간' : '종료 시간'}
                      </strong>
                      <span className={styles.timePickerValue}>{activeHour}:{activeMinute}</span>
                    </div>

                    <div className={styles.timePickerWheelWrap}>
                      <div className={styles.timePickerSelectionBar} aria-hidden="true" />
                      <div className={styles.timePickerWheel} role="listbox" aria-label="시">
                        {hourOptions.map((hour) => (
                          <button
                            key={hour}
                            ref={hour === activeHour ? selectedHourRef : undefined}
                            type="button"
                            className={`${styles.timePickerOption} ${hour === activeHour ? styles.timePickerOptionSelected : ''}`}
                            onClick={() => handleSelectTimePart('hour', hour)}
                            aria-selected={hour === activeHour}
                          >
                            {hour}
                          </button>
                        ))}
                      </div>
                      <span className={styles.timePickerDivider} aria-hidden="true">:</span>
                      <div className={styles.timePickerWheel} role="listbox" aria-label="분">
                        {minuteOptions.map((minute) => (
                          <button
                            key={minute}
                            ref={minute === activeMinute ? selectedMinuteRef : undefined}
                            type="button"
                            className={`${styles.timePickerOption} ${minute === activeMinute ? styles.timePickerOptionSelected : ''}`}
                            onClick={() => handleSelectTimePart('minute', minute)}
                            aria-selected={minute === activeMinute}
                          >
                            {minute}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <span className={styles.fieldLabel}>장소</span>
            <div className={styles.fieldSplitRow}>
              <Dropdown
                label="지역 선택"
                hideLabel
                placeholder="지역 선택"
                options={regionOptions}
                value={values.locationRegion || undefined}
                onChange={(value) => onChange('locationRegion', value as CalendarLocationRegion)}
                rootStyle={compactDropdownStyle}
                className={styles.modalCompactDropdown}
              />
              <InputField
                id="calendar-event-location"
                label="상세 위치"
                hideLabel
                placeholder="상세 위치를 입력해주세요. (선택)"
                variant="default"
                value={values.locationDetail}
                onChange={(event) => onChange('locationDetail', event.target.value)}
                rootStyle={{
                  '--input-control-min-height-underline': '35px',
                  '--input-line-height': '35px',
                  '--input-padding-underline': '0',
                } as CSSProperties}
                className={styles.modalLocationInputRoot}
              />
            </div>

            <span className={styles.fieldLabel}>모집 상태</span>
            <Dropdown
              label="모집 상태"
              hideLabel
              placeholder="모집 상태"
              options={statusOptions}
              value={values.status}
              onChange={(value) => onChange('status', value as CalendarEventStatus)}
              rootStyle={compactDropdownStyle}
              className={styles.modalCompactDropdown}
            />

            <span className={styles.fieldLabel}>카테고리</span>
            <Dropdown
              label="카테고리"
              hideLabel
              placeholder="카테고리"
              options={categoryOptions}
              value={values.category}
              onChange={(value) => onChange('category', value as CalendarEventCategory)}
              rootStyle={compactDropdownStyle}
              className={styles.modalCompactDropdown}
            />

            <span className={styles.fieldLabel}>참석자</span>
            <div className={styles.fieldColumn}>
              <div className={styles.participantSummaryRow}>
                <span className={styles.participantCountText}>{participantCount}/</span>
                <InputField
                  label="참석 정원"
                  hideLabel
                  placeholder="0"
                  variant="outlined"
                  inputMode="numeric"
                  maxLength={3}
                  value={values.participantLimit}
                  onChange={(event) => updateParticipantLimit(event.target.value)}
                  rootStyle={{
                    '--input-control-min-height-outlined': '24px',
                    '--input-outlined-padding-x': '6px',
                    '--input-padding-outlined': '0',
                    '--input-font-size': '1.25rem',
                    '--input-line-height': '1',
                  } as CSSProperties}
                  className={styles.participantLimitInput}
                />
              </div>

              <div className={styles.participantControlRow}>
                <InputField
                  label="닉네임 검색"
                  hideLabel
                  placeholder="닉네임을 검색해주세요."
                  variant="default"
                  value={participantSearchValue}
                  onChange={(event) => setParticipantSearchValue(event.target.value)}
                  onKeyDown={handleParticipantSearchKeyDown}
                  rootStyle={{
                    '--input-control-min-height-underline': '35px',
                    '--input-line-height': '35px',
                    '--input-padding-underline': '0',
                  } as CSSProperties}
                  className={styles.participantSearchInputRoot}
                />

                <div className={styles.externalGuestControl}>
                  <button
                    type="button"
                    className={styles.externalGuestButton}
                    onClick={() => updateExternalGuestCount(externalGuestCount - 1)}
                    disabled={externalGuestCount <= 0}
                    aria-label="외부인 수 감소"
                  >
                    -
                  </button>
                  <span className={styles.externalGuestText}>외부인 {externalGuestCount}</span>
                  <button
                    type="button"
                    className={styles.externalGuestButton}
                    onClick={() => updateExternalGuestCount(externalGuestCount + 1)}
                    disabled={!canIncreaseExternalGuests}
                    aria-label="외부인 수 증가"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.participantChipList}>
                {values.participantNames.map((participantName) => (
                  <span key={participantName} className={styles.participantEditorChip}>
                    <span className={styles.participantEditorChipDot} aria-hidden="true" />
                    <span>{participantName}</span>
                    <button
                      type="button"
                      className={styles.participantChipRemoveButton}
                      onClick={() => removeParticipantName(participantName)}
                      aria-label={`${participantName} 삭제`}
                    >
                      <CloseIcon />
                    </button>
                  </span>
                ))}
              </div>

              {participantExceeded ? <p className={`${styles.fieldHint} ${styles.helperError}`}>참석자 수가 정원을 초과했습니다.</p> : null}
            </div>

            <label className={styles.fieldLabel} htmlFor="calendar-event-description">내용</label>
            <div className={styles.fieldColumn}>
              <InputField
                label="내용"
                hideLabel
                placeholder="상세 일정 또는 참고 사항 등을 입력해주세요."
                variant="outlined"
                value={values.description}
                onChange={(event) => onChange('description', event.target.value)}
                multiline
                rows={6}
              />
              {helperMessage ? <p className={`${styles.fieldHint} ${styles.helperError}`}>{helperMessage}</p> : null}
            </div>
          </div>
        </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.modalSecondaryButton} onClick={onRequestClose}>취소</button>
            <button type="button" className={styles.modalPrimaryButton} onClick={onSubmit}>{mode === 'create' ? '생성' : '수정'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
