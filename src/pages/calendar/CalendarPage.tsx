import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../features/calendar/components/ConfirmDialog';
import { EventCreateModal } from '../../features/calendar/components/EventCreateModal';
import { EventDetailPanel } from '../../features/calendar/components/EventDetailPanel';
import { MonthCalendar } from '../../features/calendar/components/MonthCalendar';
import { TodaySidebar } from '../../features/calendar/components/TodaySidebar';
import {
  createCalendarEvent,
  createCalendarEventComment,
  deleteCalendarEvent,
  getCalendarEvent,
  getCalendarEventsByRange,
  joinCalendarEvent,
  leaveCalendarEvent,
  updateCalendarEvent,
} from '../../features/calendar/calendar.api';
import {
  calendarCategoryOptions,
  calendarConfig,
  calendarLayoutTokens,
  calendarLocationRegionLabels,
  calendarLocationRegionOptions,
  calendarStyleTokens,
  calendarStatusOptions,
} from '../../features/calendar/constants/calendar.constants';
import { calendarEventsMock } from '../../features/calendar/mock/calendarEvents.mock';
import type {
  CalendarEvent,
  CalendarEventFormValues,
  CalendarLocationRegion,
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

const seoulLocationKeywords = ['강남', '건대', '대학로', '성수', '송파', '잠실', '연남', '합정', '홍대', '혜화'];
const gyeonggiLocationKeywords = ['분당', '수원', '성남', '안양', '일산', '판교'];
const incheonLocationKeywords = ['인천', '송도', '부평', '구월'];

function detectLocationRegion(location: string): CalendarLocationRegion | '' {
  if (seoulLocationKeywords.some((keyword) => location.includes(keyword))) {
    return 'seoul';
  }

  if (gyeonggiLocationKeywords.some((keyword) => location.includes(keyword))) {
    return 'gyeonggi';
  }

  if (incheonLocationKeywords.some((keyword) => location.includes(keyword))) {
    return 'incheon';
  }

  return '';
}

function getParticipantCount(values: CalendarEventFormValues) {
  const externalGuestCount = Number(values.externalGuestCount || '0');
  return values.participantNames.length + externalGuestCount;
}

function formatEventLocation(values: CalendarEventFormValues) {
  const regionLabel = values.locationRegion ? calendarLocationRegionLabels[values.locationRegion] : '';
  return [regionLabel, values.locationDetail.trim()].filter(Boolean).join(' ');
}

type ModalState = {
  open: boolean;
  mode: 'create' | 'edit';
  editingEventId: string | null;
  values: CalendarEventFormValues;
  initialValues: CalendarEventFormValues;
};

type CalendarPageStatus = 'loading' | 'ready' | 'saving' | 'error' | 'success' | 'empty';

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
    startDate: dateKey,
    endDate: dateKey,
    startTime: '19:00',
    endTime: '20:00',
    status: 'recruiting',
    category: 'escape',
    locationRegion: 'seoul',
    locationDetail: '',
    participantLimit: '8',
    externalGuestCount: '0',
    participantNames: [],
    description: '',
    isAllDay: false,
  };
}

function mapEventToFormValues(event: CalendarEvent): CalendarEventFormValues {
  const participantNames = event.participants ?? [];
  const externalGuestCount = Math.max(event.currentParticipants - participantNames.length, 0);

  return {
    title: event.title,
    startDate: event.date,
    endDate: event.endDate ?? event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    status: event.status,
    category: event.category,
    locationRegion: event.locationRegion ?? detectLocationRegion(event.location),
    locationDetail: event.location,
    participantLimit: `${event.capacity}`,
    externalGuestCount: `${externalGuestCount}`,
    participantNames,
    description: event.description ?? '',
    isAllDay: event.isAllDay ?? false,
  };
}

function buildEventFromForm(values: CalendarEventFormValues, existingEvent?: CalendarEvent): CalendarEvent {
  const participantNames = values.participantNames.map((name) => name.trim()).filter(Boolean);
  const currentParticipants = getParticipantCount({
    ...values,
    participantNames,
  });
  const capacity = Number(values.participantLimit || '0');
  const organizer = participantNames[0] ?? '';

  return {
    id: existingEvent?.id ?? `event-${values.startDate}-${Math.random().toString(36).slice(2, 8)}`,
    title: values.title.trim(),
    date: values.startDate,
    endDate: values.endDate,
    startTime: values.isAllDay ? '00:00' : values.startTime,
    endTime: values.isAllDay ? '23:59' : values.endTime,
    status: values.status,
    category: values.category,
    locationRegion: values.locationRegion,
    location: formatEventLocation(values),
    capacity,
    currentParticipants,
    description: values.description.trim(),
    organizer,
    participants: participantNames,
    comments: existingEvent?.comments ?? [],
    isAllDay: values.isAllDay,
  };
}

function isEventInDateRange(event: CalendarEvent, startDate: string, endDate: string) {
  return event.date <= endDate && (event.endDate ?? event.date) >= startDate;
}

function getValidationMessage(values: CalendarEventFormValues) {
  const todayKey = formatDateKey(new Date());

  if (!values.title.trim()) {
    return '일정 제목을 입력해주세요.';
  }

  if (!values.startDate || !values.endDate) {
    return '시작 날짜와 종료 날짜를 선택해주세요.';
  }

  if (values.endDate < values.startDate) {
    return '종료 날짜는 시작 날짜보다 이전일 수 없습니다.';
  }

  if (values.startDate < todayKey || values.endDate < todayKey) {
    return '과거 날짜는 선택할 수 없습니다.';
  }

  if (!values.locationRegion) {
    return '지역을 선택해주세요.';
  }

  if (!values.isAllDay && (!values.startTime || !values.endTime)) {
    return '시작 시간과 종료 시간을 입력해주세요.';
  }

  if (!values.isAllDay && values.startDate === values.endDate && values.startTime > values.endTime) {
    return '종료 시간은 시작 시간 이후여야 합니다.';
  }

  if (!values.participantLimit) {
    return '참석 정원을 입력해주세요.';
  }

  if (Number(values.participantLimit || '0') > 999) {
    return '참석 정원은 최대 999명까지 설정할 수 있습니다.';
  }

  if (getParticipantCount(values) > Number(values.participantLimit || '0')) {
    return '참석자 수는 정원을 초과할 수 없습니다.';
  }

  return null;
}

export function CalendarPage() {
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const today = useMemo(() => parseDateKey(todayKey), [todayKey]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [modalHelperMessage, setModalHelperMessage] = useState<string | undefined>(undefined);
  const [pageStatus, setPageStatus] = useState<CalendarPageStatus>('loading');
  const [statusMessage, setStatusMessage] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [modalState, setModalState] = useState<ModalState>(() => {
    const defaultValues = createDefaultFormValues(todayKey);
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
  const selectedDateEvents = useMemo(
    () => (selectedDateKey ? getEventsForDate(events, selectedDateKey) : []),
    [events, selectedDateKey],
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const monthCells = useMemo(
    () => buildMonthGrid(currentMonth, todayKey),
    [currentMonth, todayKey],
  );
  const visibleRange = useMemo(() => ({
    startDate: monthCells[0]?.dateKey ?? formatDateKey(currentMonth),
    endDate: monthCells[monthCells.length - 1]?.dateKey ?? formatDateKey(currentMonth),
  }), [currentMonth, monthCells]);

  useEffect(() => {
    let isMounted = true;

    async function loadMonthEvents() {
      setPageStatus('loading');
      setStatusMessage('');

      try {
        const nextEvents = await getCalendarEventsByRange(visibleRange.startDate, visibleRange.endDate);

        if (!isMounted) {
          return;
        }

        setEvents((currentEvents) => [
          ...currentEvents.filter((event) => !isEventInDateRange(event, visibleRange.startDate, visibleRange.endDate)),
          ...nextEvents,
        ]);
        setSelectedEventId((currentEventId) => {
          if (currentEventId) {
            return currentEventId;
          }

          return selectedDateKey ? getEventsForDate(nextEvents, selectedDateKey)[0]?.id ?? null : null;
        });
        setPageStatus(nextEvents.length ? 'ready' : 'empty');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setEvents((currentEvents) => (currentEvents.length ? currentEvents : calendarEventsMock));
        setPageStatus('error');
        setStatusMessage(error instanceof Error ? error.message : '일정을 불러오지 못했습니다.');
      }
    }

    void loadMonthEvents();

    return () => {
      isMounted = false;
    };
  }, [visibleRange.endDate, visibleRange.startDate]);

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

  function handleTodayClick() {
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
    setShowDetail(false);
    setSelectedEventId(null);
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    setCurrentMonth((previousMonth) => (previousMonth.getMonth() === date.getMonth() && previousMonth.getFullYear() === date.getFullYear()
      ? previousMonth
      : startOfMonth(date)));
  }

  async function handleSelectEvent(eventId: string) {
    const nextSelectedEvent = events.find((event) => event.id === eventId);
    if (!nextSelectedEvent) {
      return;
    }

    setSelectedDate(parseDateKey(nextSelectedEvent.date));
    setSelectedEventId(eventId);
    setShowDetail(true);
    setAttendanceError('');
    setCommentError('');
    setCurrentMonth(startOfMonth(parseDateKey(nextSelectedEvent.date)));

    try {
      const freshEvent = await getCalendarEvent(eventId);

      if (!freshEvent) {
        return;
      }

      setEvents((currentEvents) => currentEvents.map((event) => (
        event.id === freshEvent.id ? freshEvent : event
      )));
    } catch {
      // The cached month data already has enough fields for the detail panel.
    }
  }

  async function handleSubmitComment(content: string, parentId?: string | null) {
    if (!selectedEventId) {
      return;
    }

    setCommentSubmitting(true);
    setCommentError('');

    try {
      const updatedEvent = await createCalendarEventComment(selectedEventId, content, parentId);

      if (!updatedEvent) {
        throw new Error('댓글 작성 결과를 확인할 수 없습니다.');
      }

      setEvents((currentEvents) => currentEvents.map((event) => (
        event.id === updatedEvent.id ? updatedEvent : event
      )));
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : '댓글 작성에 실패했습니다.');
      throw error;
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleJoinEvent(eventId: string) {
    setAttendanceSubmitting(true);
    setAttendanceError('');

    try {
      const updatedEvent = await joinCalendarEvent(eventId);

      if (!updatedEvent) {
        throw new Error('참석 결과를 확인할 수 없습니다.');
      }

      setEvents((currentEvents) => currentEvents.map((event) => (
        event.id === updatedEvent.id ? updatedEvent : event
      )));
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : '참석 처리에 실패했습니다.');
    } finally {
      setAttendanceSubmitting(false);
    }
  }

  async function handleLeaveEvent(eventId: string) {
    setAttendanceSubmitting(true);
    setAttendanceError('');

    try {
      const updatedEvent = await leaveCalendarEvent(eventId);

      if (!updatedEvent) {
        throw new Error('불참 결과를 확인할 수 없습니다.');
      }

      setEvents((currentEvents) => currentEvents.map((event) => (
        event.id === updatedEvent.id ? updatedEvent : event
      )));
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : '불참 처리에 실패했습니다.');
    } finally {
      setAttendanceSubmitting(false);
    }
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
    const defaultValues = createDefaultFormValues(selectedDateKey ?? todayKey);
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

  async function handleConfirmDialogConfirm() {
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
      setPageStatus('saving');

      try {
        await deleteCalendarEvent(pendingAction.eventId);
        setEvents((currentEvents) => currentEvents.filter((event) => event.id !== pendingAction.eventId));
        setSelectedEventId(null);
        setShowDetail(false);
        setPageStatus('success');
        openNotice('일정 삭제 완료', '선택한 일정이 삭제되었습니다.');
      } catch (error) {
        setPageStatus('error');
        openNotice('일정 삭제 실패', error instanceof Error ? error.message : '일정 삭제에 실패했습니다.');
      }
      return;
    }

    if (pendingAction.type === 'save-create') {
      setPageStatus('saving');

      try {
        const nextEvent = await createCalendarEvent(pendingAction.values);

        if (!nextEvent) {
          throw new Error('일정 생성 결과를 확인할 수 없습니다.');
        }

        setEvents((currentEvents) => [...currentEvents.filter((event) => event.id !== nextEvent.id), nextEvent]);
        setSelectedDate(parseDateKey(nextEvent.date));
        setSelectedEventId(nextEvent.id);
        setShowDetail(true);
        setCurrentMonth(startOfMonth(parseDateKey(nextEvent.date)));
        setPageStatus('success');
        closeModalImmediately();
        openNotice('일정 생성 완료', '일정을 생성하였습니다.');
      } catch (error) {
        setPageStatus('error');
        openNotice('일정 생성 실패', error instanceof Error ? error.message : '일정 생성에 실패했습니다.');
      }
      return;
    }

    if (pendingAction.type === 'save-edit') {
      setPageStatus('saving');

      try {
        const nextEvent = await updateCalendarEvent(pendingAction.eventId, pendingAction.values);

        if (!nextEvent) {
          throw new Error('일정 수정 결과를 확인할 수 없습니다.');
        }

        setEvents((currentEvents) => currentEvents.map((event) => (
          event.id === pendingAction.eventId ? nextEvent : event
        )));
        setSelectedDate(parseDateKey(nextEvent.date));
        setSelectedEventId(nextEvent.id);
        setShowDetail(true);
        setCurrentMonth(startOfMonth(parseDateKey(nextEvent.date)));
        setPageStatus('success');
        closeModalImmediately();
        openNotice('일정 수정 완료', '일정이 수정되었습니다.');
      } catch (error) {
        setPageStatus('error');
        openNotice('일정 수정 실패', error instanceof Error ? error.message : '일정 수정에 실패했습니다.');
      }
    }
  }

  return (
    <PageShell>
      <section className={styles.page} style={pageStyle}>
        {pageStatus === 'loading' || pageStatus === 'saving' || statusMessage ? (
          <div className={styles.statusBanner} role={pageStatus === 'error' ? 'alert' : 'status'}>
            {pageStatus === 'loading' ? '일정을 불러오는 중입니다.' : null}
            {pageStatus === 'saving' ? '일정을 저장하는 중입니다.' : null}
            {pageStatus !== 'loading' && pageStatus !== 'saving' ? statusMessage : null}
          </div>
        ) : null}
        <div className={`${styles.layout} ${selectedDate && showDetail ? styles.layoutWithDetail : ''}`.trim()}>
          <div className={styles.sidebarColumn}>
            <TodaySidebar
              selectedDate={selectedDate ?? today}
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
              onTodayClick={handleTodayClick}
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
                onJoinEvent={handleJoinEvent}
                onLeaveEvent={handleLeaveEvent}
                attendanceSubmitting={attendanceSubmitting}
                attendanceError={attendanceError}
                onSubmitComment={handleSubmitComment}
                commentSubmitting={commentSubmitting}
                commentError={commentError}
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
            regionOptions={calendarLocationRegionOptions}
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
