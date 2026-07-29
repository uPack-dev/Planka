/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const {
  normalizeCardRecurrenceValues,
  getOccurrenceAtOrBefore,
} = require('../../../utils/recurrence');

const ADVISORY_LOCK_ID = 740113221;

const CLEARED_RECURRENCE = {
  recurrenceRule: null,
  recurrenceUntil: null,
  recurrenceTimezone: null,
  recurrenceSeriesStartAt: null,
  recurrenceNextAt: null,
};

// After downtime a series can have many occurrences in the past. Materializing all of them would
// bury the board, so everything but the most recent one is skipped and the series continues from
// there. Returns the card the scheduler should advance, or null if it cannot recur any more.
const skipMissedOccurrences = async (card, at) => {
  const occurrenceAt = card.recurrenceOccurrenceAt || card.startDate || card.dueDate;
  const nextAt = new Date(card.recurrenceNextAt);

  let latestDueAt;
  try {
    latestDueAt = getOccurrenceAtOrBefore({
      recurrenceRule: card.recurrenceRule,
      seriesStartAt: card.recurrenceSeriesStartAt || occurrenceAt,
      at,
      timeZone: card.recurrenceTimezone || 'UTC',
      isAllDay: card.isAllDay,
    });
  } catch (error) {
    sails.log.warn(`Could not evaluate recurrence of card ${card.id}: ${error.message}`);
    return card;
  }

  if (!latestDueAt || latestDueAt.getTime() <= nextAt.getTime()) {
    return card;
  }

  sails.log.info(
    `Skipping missed occurrences of card ${card.id}, continuing from ${latestDueAt.toISOString()}`,
  );

  const { card: nextCard } = await Card.qm.updateOne(card.id, {
    recurrenceNextAt: latestDueAt.toISOString(),
  });

  return nextCard || null;
};

const backfillOne = async (card) => {
  const values = {
    recurrenceRule: card.recurrenceRule,
    recurrenceTimezone: card.recurrenceTimezone || 'UTC',
  };

  try {
    normalizeCardRecurrenceValues(values, card);
  } catch (error) {
    Object.assign(values, CLEARED_RECURRENCE);
    sails.log.warn(`Disabled invalid recurrence on card ${card.id}: ${error.message}`);
  }

  await Card.qm.updateOne(card.id, {
    ...values,
    recurrenceSeriesId: values.recurrenceRule ? card.recurrenceSeriesId || card.id : null,
  });
};

module.exports = {
  inputs: {
    backfill: {
      type: 'boolean',
      defaultsTo: false,
    },
    record: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    if (inputs.record) {
      if (!inputs.record.recurrenceRule) {
        return {
          card: inputs.record,
          nextCard: null,
        };
      }

      const card = await skipMissedOccurrences(inputs.record, new Date());
      if (!card) {
        return {
          card: inputs.record,
          nextCard: null,
        };
      }

      return sails.helpers.cards.advanceRecurrenceOne.with({
        record: card,
      });
    }

    // The advisory lock is transaction scoped, so the connection has to stay open for the whole
    // run. Writes intentionally go through the pool: they are individually idempotent thanks to
    // the (series, occurrence) unique constraint, and a single long transaction holding every
    // card of every board would be far worse than a partially applied catch-up.
    return sails.getDatastore().transaction(async (db) => {
      const [{ locked }] = (
        await sails
          .sendNativeQuery('SELECT pg_try_advisory_xact_lock($1) AS locked', [ADVISORY_LOCK_ID])
          .usingConnection(db)
      ).rows;

      if (!locked) {
        sails.log.debug('Skipping recurring card run, another instance holds the lock');
        return undefined;
      }

      if (inputs.backfill) {
        const recurringCards = await Card.qm.getRecurring();

        // eslint-disable-next-line no-restricted-syntax
        for (const card of recurringCards) {
          if (!card.recurrenceSeriesStartAt || !card.recurrenceNextAt) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await backfillOne(card);
            } catch (error) {
              sails.log.error(
                `Could not backfill recurrence on card ${card.id}: ${error.stack || error}`,
              );
            }
          }
        }
      }

      // getDueRecurring is capped at 50. Each series is fast-forwarded before one card is copied,
      // so downtime can create at most 50 cards per minute instead of an unbounded backlog.
      const dueCards = await Card.qm.getDueRecurring(new Date().toISOString());

      // eslint-disable-next-line no-restricted-syntax
      for (const dueCard of dueCards) {
        // eslint-disable-next-line no-await-in-loop
        const card = await skipMissedOccurrences(dueCard, new Date());

        if (card) {
          // eslint-disable-next-line no-await-in-loop
          await sails.helpers.cards.advanceRecurrenceOne.with({
            record: card,
          });
        }
      }

      return undefined;
    });
  },
};
