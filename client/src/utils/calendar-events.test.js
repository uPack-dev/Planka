/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import {
  cardToCalendarEvent,
  eventDropToCardData,
  parseRecurrenceRule,
  selectionToCardDefaults,
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

  it('parses RRULE strings into FullCalendar RRule objects', () => {
    const start = new Date('2026-05-23T09:00:00.000Z');
    const rrule = parseRecurrenceRule('FREQ=WEEKLY;INTERVAL=2;COUNT=6;BYDAY=MO,WE', start, false);

    expect(rrule).toEqual({
      dtstart: start,
      freq: 'weekly',
      interval: 2,
      count: 6,
      byweekday: ['mo', 'we'],
    });
  });
});
