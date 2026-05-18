import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../features/calendar/components/ConfirmDialog';
import { EventCreateModal } from '../../features/calendar/components/EventCreateModal';
import { EventDetailPanel } from '../../features/calendar/components/EventDetailPanel';
import { MonthCalendar } from '../../features/calendar/components/MonthCalendar';
import { TodaySidebar } from '../../features/calendar/components/TodaySidebar';
import {
  calendarCategoryOptions,
  calendarConfig,
  calendarLayoutTokens,
  calendarStyleTokens,
  calendarStatusOptions,
} from '../../features/calendar/constants/calendar.constants';
import { calendarEventsMock } from '../../features/calendar/mock/calendarEvents.mock';
import type {
  CalendarEvent,
  CalendarEventFormValues,
  ConfirmDialogTone,
} from '../../features/calendar/types/calendar.types';
import {
  addMonths,
  buildMonthGrid,
  formatDateKey,
  getEventsForDate,
  groupEventsByDate,
  parseDateKey,
  startOfMonth,
} from '../../features/calendar/utils/calendarDate.utils';
import { PageShell } from '../../shared/components/layout/PageShell';
import styles from './CalendarPage.module.css';

type ModalState = {
  open: boolean;
  mode: 'create' | 'edit';
  editingEventId: string | null;
  values: CalendarEventFormValues;
  initialValues: CalendarEventFormValues;
};

type ConfirmAction =
  | { type: 'save-create'; values: CalendarEventFormValues }
  | { type: 'save-edit'; eventId: string; values: CalendarEventFormValues }
  | { type: 'cancel-modal' }
  | { type: 'delete-event'; eventId: string }
  | { type: 'notice' }
  | null;

type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone: ConfirmDialogTone;
  action: ConfirmAction;
};

function createDefaultFormValues(dateKey: string): CalendarEventFormValues {
  return {
    title: '',
    date: dateKey,
    startTime: '19:00',
    endTime: '20:00',
    status: 'recruiting',
    category: 'escape',
    location: '',
    capacity: '4',
    currentParticipants: '1',
    description: '',
    organizer: '',
    isAllDay: false,
  };
}

function mapEventToFormValues(event: CalendarEvent): CalendarEventFormValues {
  return {
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    status: event.status,
    category: event.category,
    location: event.location,
    capacity: `${event.capacity}`,
    currentParticipants: `${event.currentParticipants}`,
    description: event.description ?? '',
    organizer: event.organizer ?? '',
    isAllDay: event.isAllDay ?? false,
  };
}

function buildEventFromForm(values: CalendarEventFormValues, existingEvent?: CalendarEvent): CalendarEvent {
  const currentParticipants = Number(values.currentParticipants || '0');
  const capacity = Number(values.capacity || '0');

  return {
    id: existingEvent?.id ?? `event-${values.date}-${Math.random().toString(36).slice(2, 8)}`,
    title: values.title.trim(),
    date: values.date,
    startTime: values.isAllDay ? '00:00' : values.startTime,
    endTime: values.isAllDay ? '23:59' : values.endTime,
    status: values.status,
    category: values.category,
    location: values.location.trim(),
    capacity,
    currentParticipants,
    description: values.description.trim(),
    organizer: values.organizer.trim(),
    participants: existingEvent?.participants ?? (values.organizer.trim() ? [values.organizer.trim()] : []),
    comments: existingEvent?.comments ?? [],
    isAllDay: values.isAllDay,
  };
}

function getValidationMessage(values: CalendarEventFormValues) {
  if (!values.title.trim()) {
    return '일정 제목을 입력해주세요.';
  }

  if (!values.date) {
    return '일정 날짜를 선택해주세요.';
  }

  if (!values.location.trim()) {
    return '장소를 입력해주세요.';
  }

  if (!values.isAllDay && (!values.startTime || !values.endTime)) {
    return '시작 시간과 종료 시간을 입력해주세요.';
  }

  if (!values.isAllDay && values.startTime > values.endTime) {
    return '종료 시간은 시작 시간 이후여야 합니다.';
  }

  if (Number(values.currentParticipants || '0') > Number(values.capacity || '0')) {
    return '현재 참가 인원은 정원을 초과할 수 없습니다.';
  }

  return null;
}

export function CalendarPage() {
  const mockToday = useMemo(() => parseDateKey(calendarConfig.mockToday), []);
  const [events, setEvents] = useState<CalendarEvent[]>(calendarEventsMock);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(mockToday));
  const [selectedDate, setSelectedDate] = useState<Date | null>(mockToday);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => getEventsForDate(calendarEventsMock, calendarConfig.mockToday)[0]?.id ?? null);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [modalHelperMessage, setModalHelperMessage] = useState<string | undefined>(undefined);
  const [modalState, setModalState] = useState<ModalState>(() => {
    const defaultValues = createDefaultFormValues(calendarConfig.mockToday);
    return {
      open: false,
      mode: 'create',
      editingEventId: null,
      values: defaultValues,
      initialValues: defaultValues,
    };
  });
  const [confirmDialogState, setConfirmDialogState] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '확인',
    cancelLabel: undefined,
    tone: 'brand',
    action: null,
  });

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null;
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const todayEvents = useMemo(() => getEventsForDate(events, calendarConfig.mockToday), [events]);
  const selectedDateEvents = useMemo(
    () => (selectedDateKey ? getEventsForDate(events, selectedDateKey) : []),
    [events, selectedDateKey],
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const monthCells = useMemo(
    () => buildMonthGrid(currentMonth, calendarConfig.mockToday),
    [currentMonth],
  );

  useEffect(() => {
    if (selectedEventId && !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(selectedDateEvents[0]?.id ?? null);
    }
  }, [events, selectedDateEvents, selectedEventId]);

  const pageStyle = {
    '--calendar-page-background': calendarStyleTokens.pageBackground,
    '--calendar-panel-background': calendarStyleTokens.panelBackground,
    '--calendar-selected-day-background': calendarStyleTokens.selectedDayBackground,
    '--calendar-selected-day-border': calendarStyleTokens.selectedDayBorder,
    '--calendar-event-pill-background': calendarStyleTokens.eventPillBackground,
    '--calendar-event-dot-background': calendarStyleTokens.eventDotBackground,
    '--calendar-today-text-color': calendarStyleTokens.todayTextColor,
    '--calendar-page-min-height': calendarLayoutTokens.pageMinHeight,
    '--calendar-sidebar-width': calendarLayoutTokens.todaySidebarWidth,
    '--calendar-center-width': calendarLayoutTokens.calendarMaxWidth,
    '--calendar-detail-width': calendarLayoutTokens.rightPanelWidth,
    '--calendar-brand-primary': calendarStyleTokens.brandPrimary,
    '--calendar-on-primary': calendarStyleTokens.onPrimary,
    '--calendar-text-primary': calendarStyleTokens.textPrimary,
    '--calendar-text-secondary': calendarStyleTokens.textSecondary,
    '--calendar-border-default': calendarStyleTokens.borderDefault,
    '--calendar-border-strong': calendarStyleTokens.borderStrong,
    '--calendar-border-subtle': calendarStyleTokens.borderSubtle,
    '--calendar-surface-elevated': calendarStyleTokens.surfaceElevated,
    '--calendar-accent-navy': calendarStyleTokens.accentNavy,
    '--calendar-focus-ring': calendarStyleTokens.focusRing,
    '--calendar-dim-background': calendarStyleTokens.dimBackground,
  } as CSSProperties;

  function closeConfirmDialog() {
    setConfirmDialogState((currentState) => ({
      ...currentState,
      open: false,
      action: null,
    }));
  }

  function openNotice(title: string, message: string) {
    setConfirmDialogState({
      open: true,
      title,
      message,
      confirmLabel: '확인',
      cancelLabel: undefined,
      tone: 'brand',
      action: { type: 'notice' },
    });
  }

  function handlePreviousMonth() {
    setCurrentMonth((previousMonth) => addMonths(previousMonth, -1));
  }

  function handleNextMonth() {
    setCurrentMonth((previousMonth) => addMonths(previousMonth, 1));
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    setCurrentMonth((previousMonth) => (previousMonth.getMonth() === date.getMonth() && previousMonth.getFullYear() === date.getFullYear()
      ? previousMonth
      : startOfMonth(date)));
  }

  function handleSelectEvent(eventId: string) {
    const nextSelectedEvent = events.find((event) => event.id === eventId);
    if (!nextSelectedEvent) {
      return;
    }

    setSelectedDate(parseDateKey(nextSelectedEvent.date));
    setSelectedEventId(eventId);
    setShowDetail(true);
    setCurrentMonth(startOfMonth(parseDateKey(nextSelectedEvent.date)));
  }

  function updateModalField<Key extends keyof CalendarEventFormValues>(field: Key, value: CalendarEventFormValues[Key]) {
    setModalState((currentState) => ({
      ...currentState,
      values: {
        ...currentState.values,
        [field]: value,
      },
    }));
  }

  function openCreateModal() {
    const defaultValues = createDefaultFormValues(selectedDateKey ?? calendarConfig.mockToday);
    setModalHelperMessage(undefined);
    setModalState({
      open: true,
      mode: 'create',
      editingEventId: null,
      values: defaultValues,
      initialValues: defaultValues,
    });
  }

  function openEditModal(event: CalendarEvent) {
    const initialValues = mapEventToFormValues(event);
    setModalHelperMessage(undefined);
    setModalState({
      open: true,
      mode: 'edit',
      editingEventId: event.id,
      values: initialValues,
      initialValues,
    });
  }

  function closeModalImmediately() {
    setModalHelperMessage(undefined);
    setModalState((currentState) => ({
      ...currentState,
      open: false,
    }));
  }

  function handleRequestModalClose() {
    const isDirty = JSON.stringify(modalState.values) !== JSON.stringify(modalState.initialValues);

    if (!isDirty) {
      closeModalImmediately();
      return;
    }

    setConfirmDialogState({
      open: true,
      title: modalState.mode === 'create' ? '일정 생성 취소' : '일정 수정 취소',
      message: '지금까지 작성한 내용이 저장되지 않습니다.\n정말 취소하시겠습니까?',
      confirmLabel: '확인',
      cancelLabel: '취소',
      tone: 'brand',
      action: { type: 'cancel-modal' },
    });
  }

  function handleSubmitModal() {
    const validationMessage = getValidationMessage(modalState.values);

    if (validationMessage) {
      setModalHelperMessage(validationMessage);
      return;
    }

    setConfirmDialogState({
      open: true,
      title: modalState.mode === 'create' ? '일정 저장' : '일정 수정',
      message: modalState.mode === 'create' ? '일정을 저장하시겠습니까?' : '수정한 내용을 저장하시겠습니까?',
      confirmLabel: modalState.mode === 'create' ? '저장' : '수정',
      cancelLabel: '취소',
      tone: 'brand',
      action: modalState.mode === 'create'
        ? { type: 'save-create', values: modalState.values }
        : { type: 'save-edit', eventId: modalState.editingEventId ?? '', values: modalState.values },
    });
  }

  function handleDeleteEvent(eventId: string) {
    setConfirmDialogState({
      open: true,
      title: '일정 삭제',
      message: '일정을 삭제하시겠습니까?\n삭제된 일정은 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
      action: { type: 'delete-event', eventId },
    });
  }

  function handleConfirmDialogConfirm() {
    const pendingAction = confirmDialogState.action;

    if (!pendingAction) {
      closeConfirmDialog();
      return;
    }

    if (pendingAction.type === 'notice') {
      closeConfirmDialog();
      return;
    }

    if (pendingAction.type === 'cancel-modal') {
      closeConfirmDialog();
      closeModalImmediately();
      return;
    }

    if (pendingAction.type === 'delete-event') {
      setEvents((currentEvents) => currentEvents.filter((event) => event.id !== pendingAction.eventId));
      setSelectedEventId(null);
      setShowDetail(false);
      // TODO: connect delete action to Supabase REST API.
      openNotice('일정 삭제 완료', '선택한 일정이 삭제되었습니다.');
      return;
    }

    if (pendingAction.type === 'save-create') {
      const nextEvent = buildEventFromForm(pendingAction.values);
      setEvents((currentEvents) => [...currentEvents, nextEvent]);
      setSelectedDate(parseDateKey(nextEvent.date));
      setSelectedEventId(nextEvent.id);
      setShowDetail(true);
      setCurrentMonth(startOfMonth(parseDateKey(nextEvent.date)));
      closeModalImmediately();
      // TODO: connect create action to Supabase REST API.
      openNotice('일정 생성 완료', '일정을 생성하였습니다.');
      return;
    }

    if (pendingAction.type === 'save-edit') {
      setEvents((currentEvents) => currentEvents.map((event) => (
        event.id === pendingAction.eventId ? buildEventFromForm(pendingAction.values, event) : event
      )));
      setSelectedDate(parseDateKey(pendingAction.values.date));
      setSelectedEventId(pendingAction.eventId);
      setShowDetail(true);
      setCurrentMonth(startOfMonth(parseDateKey(pendingAction.values.date)));
      closeModalImmediately();
      // TODO: connect update action to Supabase REST API.
      openNotice('일정 수정 완료', '일정이 수정되었습니다.');
    }
  }

  return (
    <PageShell>
      <section className={styles.page} style={pageStyle}>
        <div className={`${styles.layout} ${selectedDate && showDetail ? styles.layoutWithDetail : ''}`.trim()}>
          <div className={styles.sidebarColumn}>
            <TodaySidebar
              selectedDate={selectedDate ?? mockToday}
              selectedDateEvents={selectedDateEvents}
              onCreateClick={openCreateModal}
              onSelectEvent={handleSelectEvent}
              selectedEventId={selectedEventId}
            />
          </div>

          <div className={styles.centerColumn}>
            <MonthCalendar
              currentMonth={currentMonth}
              monthCells={monthCells}
              eventsByDate={eventsByDate}
              selectedDateKey={selectedDateKey}
              onSelectDate={handleSelectDate}
              onSelectEvent={handleSelectEvent}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
            />
          </div>

          {selectedDate && showDetail ? (
            <div className={styles.detailColumn}>
              <EventDetailPanel
                selectedDateKey={selectedDateKey}
                selectedEvent={selectedEvent}
                selectedDateEvents={selectedDateEvents}
                onSelectEvent={handleSelectEvent}
                onEditEvent={openEditModal}
                onDeleteEvent={handleDeleteEvent}
                onClose={() => {
                  // Only hide the detail panel and clear the selected event.
                  // Do NOT clear `selectedDate` so the left panel and calendar remain focused on the selected date.
                  setShowDetail(false);
                  setSelectedEventId(null);
                }}
              />
            </div>
          ) : null}
        </div>

        <EventCreateModal
          open={modalState.open}
          mode={modalState.mode}
          values={modalState.values}
          categoryOptions={calendarCategoryOptions}
          statusOptions={calendarStatusOptions}
          helperMessage={modalHelperMessage}
          onChange={updateModalField}
          onRequestClose={handleRequestModalClose}
          onSubmit={handleSubmitModal}
        />

        <ConfirmDialog
          open={confirmDialogState.open}
          title={confirmDialogState.title}
          message={confirmDialogState.message}
          confirmLabel={confirmDialogState.confirmLabel}
          cancelLabel={confirmDialogState.cancelLabel}
          tone={confirmDialogState.tone}
          onConfirm={handleConfirmDialogConfirm}
          onCancel={closeConfirmDialog}
        />
      </section>
    </PageShell>
  );
}