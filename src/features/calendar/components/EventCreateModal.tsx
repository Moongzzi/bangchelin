import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { Dropdown } from '../../../shared/components/dropdown/Dropdown';
import { InputField } from '../../../shared/components/input-field/InputField';
import { ToggleSwitch } from './ToggleSwitch';
import type {
  CalendarEventCategory,
  CalendarEventFormValues,
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
  categoryOptions,
  statusOptions,
  helperMessage,
  onChange,
  onRequestClose,
  onSubmit,
}: EventCreateModalProps) {
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(values.date ? parseDateKey(values.date) : new Date()));

  const selectedDate = useMemo(
    () => (values.date ? parseDateKey(values.date) : null),
    [values.date],
  );
  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) {
      return '날짜를 선택해주세요.';
    }

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(selectedDate);
  }, [selectedDate]);
  const [showTimeEditor, setShowTimeEditor] = useState(false);

  const displayMonthLabel = useMemo(() => new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(displayMonth), [displayMonth]);
  const monthCells = useMemo(() => buildMonthGrid(displayMonth), [displayMonth]);

  const formattedTimeLabel = useMemo(() => {
    const formatTime = (time: string) => {
      const [hourString, minuteString] = time.split(':');
      const hours = Number(hourString ?? '0');
      const minutes = Number(minuteString ?? '0');
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return new Intl.DateTimeFormat('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    };

    if (!values.startTime && !values.endTime) {
      return '시간을 선택해주세요.';
    }

    if (!values.endTime) {
      return formatTime(values.startTime);
    }

    return `${formatTime(values.startTime)} - ${formatTime(values.endTime)}`;
  }, [values.startTime, values.endTime]);

  useEffect(() => {
    if (values.isAllDay) {
      setShowTimeEditor(false);
    }
  }, [values.isAllDay]);

  useEffect(() => {
    if (!open) {
      setIsDatePickerOpen(false);
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isDatePickerOpen) {
          setIsDatePickerOpen(false);
          return;
        }

        onRequestClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDatePickerOpen, open, onRequestClose]);

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
    if (!open || !values.date) {
      return;
    }

    setDisplayMonth(startOfMonth(parseDateKey(values.date)));
  }, [open, values.date]);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isDatePickerOpen]);

  if (!open) {
    return null;
  }

  function handleSelectDate(nextDate: Date) {
    onChange('date', formatDateKey(nextDate));
    setDisplayMonth(startOfMonth(nextDate));
    setIsDatePickerOpen(false);
  }

  function handleDateTextClick() {
    setIsDatePickerOpen(true);
    setShowTimeEditor(false);
  }

  function handleTimeTextClick() {
    if (!values.isAllDay) {
      setShowTimeEditor((currentValue) => !currentValue);
    }
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
                <span className={styles.toggleLabel}>하루 종일</span>
                <ToggleSwitch
                  checked={values.isAllDay}
                  onChange={(checked) => onChange('isAllDay', checked)}
                  ariaLabel="하루 종일 토글"
                  onLabel="On"
                  offLabel="Off"
                />
              </div>

              <div ref={datePickerRef} className={styles.datePickerShell}>
                <div className={styles.dateTimeRow}>
                  <button
                    type="button"
                    className={styles.dateTimeTextButton}
                    onClick={handleDateTextClick}
                    aria-label="일정 날짜 편집"
                  >
                    {selectedDateLabel}
                  </button>
                  {!values.isAllDay ? (
                    <button
                      type="button"
                      className={styles.dateTimeTextButton}
                      onClick={handleTimeTextClick}
                      aria-label="일정 시간 편집"
                    >
                      {formattedTimeLabel}
                    </button>
                  ) : null}
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
                        const isSelected = values.date === cell.dateKey;
                        const dayButtonClassName = [
                          styles.datePickerDayButton,
                          !cell.inCurrentMonth ? styles.datePickerDayOutside : '',
                          isSelected ? styles.datePickerDaySelected : '',
                          cell.isToday ? styles.datePickerDayToday : '',
                        ].filter(Boolean).join(' ');

                        return (
                          <button
                            key={cell.dateKey}
                            type="button"
                            className={dayButtonClassName}
                            onClick={() => handleSelectDate(cell.date)}
                            aria-pressed={isSelected}
                          >
                            {cell.dayNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {!values.isAllDay && showTimeEditor ? (
                <div className={styles.fieldSplitRow}>
                  <InputField
                    label="시작 시간"
                    hideLabel
                    placeholder="시작 시간"
                    variant="outlined"
                    type="time"
                    value={values.startTime}
                    onChange={(event) => onChange('startTime', event.target.value)}
                    className={styles.fieldInlineInput}
                  />
                  <InputField
                    label="종료 시간"
                    hideLabel
                    placeholder="종료 시간"
                    variant="outlined"
                    type="time"
                    value={values.endTime}
                    onChange={(event) => onChange('endTime', event.target.value)}
                    className={styles.fieldInlineInput}
                  />
                </div>
              ) : null}
            </div>

            <label className={styles.fieldLabel} htmlFor="calendar-event-location">장소</label>
            <InputField
              id="calendar-event-location"
              label="장소"
              hideLabel
              placeholder="상세 위치를 입력해주세요."
              variant="outlined"
              value={values.location}
              onChange={(event) => onChange('location', event.target.value)}
            />

            <span className={styles.fieldLabel}>모집 상태</span>
            <Dropdown
              label="모집 상태"
              hideLabel
              placeholder="모집 상태"
              options={statusOptions}
              value={values.status}
              onChange={(value) => onChange('status', value as CalendarEventStatus)}
            />

            <span className={styles.fieldLabel}>카테고리</span>
            <Dropdown
              label="카테고리"
              hideLabel
              placeholder="카테고리"
              options={categoryOptions}
              value={values.category}
              onChange={(value) => onChange('category', value as CalendarEventCategory)}
            />

            <label className={styles.fieldLabel} htmlFor="calendar-event-organizer">작성자</label>
            <InputField
              id="calendar-event-organizer"
              label="작성자"
              hideLabel
              placeholder="작성자 닉네임"
              variant="outlined"
              value={values.organizer}
              onChange={(event) => onChange('organizer', event.target.value)}
            />

            <span className={styles.fieldLabel}>정원</span>
            <div className={styles.fieldSplitRow}>
              <InputField
                label="정원"
                hideLabel
                placeholder="정원"
                variant="outlined"
                type="number"
                min={1}
                value={values.capacity}
                onChange={(event) => onChange('capacity', event.target.value)}
                className={styles.fieldInlineInput}
              />
              <InputField
                label="현재 참가 인원"
                hideLabel
                placeholder="현재 참가 인원"
                variant="outlined"
                type="number"
                min={0}
                value={values.currentParticipants}
                onChange={(event) => onChange('currentParticipants', event.target.value)}
                className={styles.fieldInlineInput}
              />
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
