const { expect } = require('chai');

const processDueRecurrences = require('../../api/helpers/cards/process-due-recurrences');

describe('process-due-recurrences', () => {
  it('fast-forwards a stale series and advances it only once', async () => {
    const sourceCard = {
      id: '10',
      startDate: '2026-01-01T09:00:00.000Z',
      isAllDay: false,
      recurrenceRule: 'FREQ=DAILY',
      recurrenceTimezone: 'UTC',
      recurrenceSeriesStartAt: '2026-01-01T09:00:00.000Z',
      recurrenceOccurrenceAt: '2026-01-01T09:00:00.000Z',
      recurrenceNextAt: '2026-01-02T09:00:00.000Z',
    };

    const originals = {
      Card: global.Card,
      advanceRecurrenceOne: sails.helpers.cards.advanceRecurrenceOne,
    };

    let updateValues;
    const advancedRecords = [];

    try {
      global.Card = {
        qm: {
          updateOne: async (id, values) => {
            expect(id).to.equal(sourceCard.id);
            updateValues = values;

            return {
              card: {
                ...sourceCard,
                ...values,
              },
            };
          },
        },
      };
      sails.helpers.cards.advanceRecurrenceOne = {
        with: async ({ record }) => {
          advancedRecords.push(record);

          return {
            card: record,
            nextCard: {
              id: '11',
            },
          };
        },
      };

      const result = await processDueRecurrences.fn({
        record: sourceCard,
      });

      expect(new Date(updateValues.recurrenceNextAt).getTime()).to.be.greaterThan(
        new Date(sourceCard.recurrenceNextAt).getTime(),
      );
      expect(advancedRecords).to.have.length(1);
      expect(advancedRecords[0].recurrenceNextAt).to.equal(updateValues.recurrenceNextAt);
      expect(result.nextCard.id).to.equal('11');
    } finally {
      global.Card = originals.Card;
      sails.helpers.cards.advanceRecurrenceOne = originals.advanceRecurrenceOne;
    }
  });

  it('does not take the global lock for a non-recurring card', async () => {
    const card = {
      id: '10',
      recurrenceRule: null,
    };

    const result = await processDueRecurrences.fn({
      record: card,
    });

    expect(result).to.deep.equal({
      card,
      nextCard: null,
    });
  });
});
