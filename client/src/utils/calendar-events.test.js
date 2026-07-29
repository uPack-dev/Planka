/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import {
  cardToCalendarEvent,
  eventDropToCardData,
  eventResizeToCardData,
  parseRecurrenceRule,
  selectionToCardDefaults,
  validateRecurrenceRule,
} from './calendar-events';

describe('calendar-events', () => {
  it('maps due-date-only cards to one-day all-day events', () => {
    const dueDate = new Date('2026-05-23T00:00:00.000Z');
    const event = cardToCalendarEvent({
      id: '1',
      boardId: '10',
      listId: '20',
      name: 'Due only',
      dueDate,
      isDueCompleted: false,
    });

    expect(event).toMatchObject({
      id: '1',
      title: 'Due only',
      allDay: true,
      start: dueDate,
    });

    expect(event.end.toISOString()).toBe('2026-05-24T00:00:00.000Z');
  });

  it('builds timed card defaults from a selected range', () => {
    const start = new Date('2026-05-23T09:00:00.000Z');
    const end = new Date('2026-05-23T10:30:00.000Z');
    const defaults = selectionToCardDefaults({
      start,
      end,
      allDay: false,
    });

    expect(defaults).toEqual({
      startDate: start,
      endDate: end,
      isAllDay: false,
      dueDate: end,
    });
  });

  it('converts dragged all-day events into explicit scheduled card data', () => {
    const start = new Date('2026-05-23T00:00:00.000Z');
    const end = new Date('2026-05-24T00:00:00.000Z');
    const data = eventDropToCardData({
      event: {
        allDay: true,
        start: new Date('2026-05-25T00:00:00.000Z'),
        extendedProps: {},
      },
      oldEvent: {
        allDay: true,
        start,
        end,
      },
    });

    expect(data.startDate.toISOString()).toBe('2026-05-25T00:00:00.000Z');
    expect(data.endDate.toISOString()).toBe('2026-05-26T00:00:00.000Z');
    expect(data.dueDate.toISOString()).toBe('2026-05-25T00:00:00.000Z');
  });

  it('applies calendar-day drag and resize deltas to recurring base dates', () => {
    const startDate = new Date(2026, 2, 28, 12);
    const endDate = new Date(2026, 2, 28, 13);
    const dropped = eventDropToCardData({
      delta: {
        days: 1,
      },
      event: {
        allDay: false,
        start: new Date(2026, 2, 29, 12),
        extendedProps: {
          startDate,
          endDate,
        },
      },
      oldEvent: {
        allDay: false,
        start: startDate,
        end: endDate,
      },
    });

    expect(dropped.startDate.getDate()).toBe(29);
    expect(dropped.startDate.getHours()).toBe(12);

    const resized = eventResizeToCardData({
      endDelta: {
        days: 1,
      },
      event: {
        allDay: false,
        start: startDate,
        end: new Date(2026, 2, 29, 13),
        extendedProps: {
          startDate,
          endDate,
        },
      },
    });

    expect(resized.endDate.getDate()).toBe(29);
    expect(resized.endDate.getHours()).toBe(13);
  });

  it('passes normalized RRULE strings and timezone data to FullCalendar', () => {
    const start = new Date('2026-03-28T10:00:00.000Z');
    const rrule = parseRecurrenceRule('rrule:freq=monthly;byday=1mo', start, false, 'Europe/Kyiv');

    expect(rrule).toBe('DTSTART;TZID=Europe/Kyiv:20260328T120000\nRRULE:FREQ=MONTHLY;BYDAY=1MO');

    expect(parseRecurrenceRule('FREQ=DAILY', start, true, 'Europe/Kyiv')).toBe(
      'DTSTART;TZID=Europe/Kyiv:20260328T000000\nRRULE:FREQ=DAILY',
    );
  });

  it('uses the same recurrence policy as the API', () => {
    const start = new Date('2026-03-28T10:00:00.000Z');

    expect(() =>
      validateRecurrenceRule('FREQ=MONTHLY;BYDAY=1MO', start, false, 'Europe/Kyiv'),
    ).not.toThrow();
    expect(() =>
      validateRecurrenceRule('FREQ=DAILY;COUNT=2;UNTIL=20260801T000000Z', start, false, 'UTC'),
    ).toThrow();
    expect(() => validateRecurrenceRule('FREQ=HOURLY', start, false, 'UTC')).toThrow();
    expect(() => validateRecurrenceRule('FREQ=YEARLY;BYMONTH=13', start, false, 'UTC')).toThrow();
  });
});
