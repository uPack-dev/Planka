const { expect } = require('chai');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  getOccurrenceAtOrBefore,
  getRecurrenceMetadata,
  normalizeCardRecurrenceValues,
  normalizeRecurrenceRule,
} = require('../../utils/recurrence');

describe('recurrence', () => {
  it('normalizes lowercase rules and rejects conflicting end conditions', () => {
    expect(normalizeRecurrenceRule('rrule:freq=weekly;byday=mo,we')).to.equal(
      'FREQ=WEEKLY;BYDAY=MO,WE',
    );

    expect(() => normalizeRecurrenceRule('FREQ=DAILY;COUNT=2;UNTIL=20260801T000000Z')).to.throw();
    expect(() => normalizeRecurrenceRule('FREQ=HOURLY')).to.throw();
    expect(() => normalizeRecurrenceRule('FREQ=DAILY;INTERVAL=0')).to.throw();
    expect(() => normalizeRecurrenceRule('FREQ=DAILY;INTERVAL=1e2')).to.throw();
    expect(() => normalizeRecurrenceRule('FREQ=DAILY;COUNT=1001')).to.throw();
    expect(() => normalizeRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=32')).to.throw();
    expect(() => normalizeRecurrenceRule('FREQ=YEARLY;BYMONTH=13')).to.throw();
  });

  it('requires UTC UNTIL values for timed recurrences', () => {
    expect(() =>
      getRecurrenceMetadata({
        recurrenceRule: 'FREQ=DAILY;UNTIL=20260801',
        seriesStartAt: '2026-07-29T09:00:00.000Z',
        timeZone: 'Europe/Kyiv',
        isAllDay: false,
      }),
    ).to.throw('Timed recurrence UNTIL must be UTC');
  });

  it('keeps a timed recurrence at the same wall time across DST', () => {
    const metadata = getRecurrenceMetadata({
      recurrenceRule: 'FREQ=WEEKLY;COUNT=3;BYDAY=SA',
      seriesStartAt: '2026-03-28T10:00:00.000Z',
      timeZone: 'Europe/Kyiv',
      isAllDay: false,
    });

    expect(metadata.recurrenceNextAt).to.equal('2026-04-04T09:00:00.000Z');
    expect(metadata.recurrenceUntil).to.equal('2026-04-11T09:00:00.000Z');
  });

  it('keeps all-day occurrences at local midnight across DST', () => {
    const metadata = getRecurrenceMetadata({
      recurrenceRule: 'FREQ=DAILY;COUNT=3',
      seriesStartAt: '2026-03-28T22:00:00.000Z',
      timeZone: 'Europe/Kyiv',
      isAllDay: true,
    });

    expect(metadata.recurrenceNextAt).to.equal('2026-03-29T21:00:00.000Z');
    expect(metadata.recurrenceUntil).to.equal('2026-03-30T21:00:00.000Z');
  });

  it('derives server-owned metadata without mutating finite rules', () => {
    const values = {
      startDate: '2026-07-01T09:00:00.000Z',
      isAllDay: false,
      recurrenceRule: 'freq=daily;count=3',
      recurrenceUntil: '2099-01-01T00:00:00.000Z',
      recurrenceTimezone: 'UTC',
    };

    normalizeCardRecurrenceValues(values);

    expect(values).to.include({
      recurrenceRule: 'FREQ=DAILY;COUNT=3',
      recurrenceUntil: '2026-07-03T09:00:00.000Z',
      recurrenceNextAt: '2026-07-02T09:00:00.000Z',
    });

    expect(
      getRecurrenceMetadata({
        recurrenceRule: values.recurrenceRule,
        seriesStartAt: values.recurrenceSeriesStartAt,
        occurrenceAt: values.recurrenceNextAt,
        timeZone: values.recurrenceTimezone,
        isAllDay: values.isAllDay,
      }),
    ).to.include({
      recurrenceRule: 'FREQ=DAILY;COUNT=3',
      recurrenceNextAt: '2026-07-03T09:00:00.000Z',
    });
  });

  it('preserves advanced rules instead of simplifying them', () => {
    const metadata = getRecurrenceMetadata({
      recurrenceRule: 'FREQ=MONTHLY;COUNT=3;BYDAY=1MO',
      seriesStartAt: '2026-07-29T09:00:00.000Z',
      timeZone: 'UTC',
      isAllDay: false,
    });

    expect(metadata).to.deep.equal({
      recurrenceRule: 'FREQ=MONTHLY;COUNT=3;BYDAY=1MO',
      recurrenceUntil: '2026-10-05T09:00:00.000Z',
      recurrenceNextAt: '2026-08-03T09:00:00.000Z',
    });
  });

  it('rejects recurrences that end before the card starts', () => {
    expect(() =>
      getRecurrenceMetadata({
        recurrenceRule: 'FREQ=DAILY;UNTIL=20260701T000000Z',
        seriesStartAt: '2026-07-02T09:00:00.000Z',
        timeZone: 'UTC',
        isAllDay: false,
      }),
    ).to.throw('Recurrence must not end before it starts');
  });

  it('rejects rules that cannot produce a second occurrence', () => {
    expect(() =>
      normalizeCardRecurrenceValues({
        startDate: '2026-07-29T09:00:00.000Z',
        recurrenceRule: 'FREQ=DAILY;COUNT=1',
        recurrenceTimezone: 'UTC',
      }),
    ).to.throw('Recurrence never repeats');

    expect(() =>
      normalizeCardRecurrenceValues({
        startDate: '2026-07-29T09:00:00.000Z',
        recurrenceRule: 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30',
        recurrenceTimezone: 'UTC',
      }),
    ).to.throw('Recurrence never repeats');

    expect(() => normalizeRecurrenceRule('FREQ=DAILY;UNTIL=20260230')).to.throw(
      'Invalid recurrence rule',
    );
  });

  it('finds valid leap-day recurrences without scanning to year 9999', () => {
    const startedAt = Date.now();
    const metadata = getRecurrenceMetadata({
      recurrenceRule: 'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29',
      seriesStartAt: '2026-03-01T09:00:00.000Z',
      timeZone: 'UTC',
      isAllDay: false,
    });

    expect(metadata.recurrenceNextAt).to.equal('2028-02-29T09:00:00.000Z');
    expect(Date.now() - startedAt).to.be.lessThan(100);
  });

  it('fast-forwards to the latest due occurrence', () => {
    expect(
      getOccurrenceAtOrBefore({
        recurrenceRule: 'FREQ=DAILY',
        seriesStartAt: '2026-06-01T09:00:00.000Z',
        at: '2026-07-29T12:00:00.000Z',
        timeZone: 'UTC',
        isAllDay: false,
      }).toISOString(),
    ).to.equal('2026-07-29T09:00:00.000Z');
  });

  it('does not depend on the timezone of the server process', () => {
    const recurrencePath = path.resolve(__dirname, '../../utils/recurrence');
    const script = `
      const { getRecurrenceMetadata } = require(${JSON.stringify(recurrencePath)});
      process.stdout.write(JSON.stringify(getRecurrenceMetadata({
        recurrenceRule: 'FREQ=DAILY',
        seriesStartAt: '2026-07-29T09:00:00.000Z',
        timeZone: 'Europe/Kyiv',
        isAllDay: false,
      })));
    `;

    const results = ['UTC', 'Europe/Kyiv', 'America/New_York'].map((TZ) => {
      const result = spawnSync(process.execPath, ['-e', script], {
        env: {
          ...process.env,
          TZ,
        },
        encoding: 'utf8',
      });

      expect(result.status, result.stderr).to.equal(0);
      return JSON.parse(result.stdout);
    });

    expect(results[0].recurrenceNextAt).to.equal('2026-07-30T09:00:00.000Z');
    expect(results[1]).to.deep.equal(results[0]);
    expect(results[2]).to.deep.equal(results[0]);
  });
});
