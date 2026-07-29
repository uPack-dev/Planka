/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { getRecurrenceMetadata } = require('../../../utils/recurrence');

const CLEARED_RECURRENCE = {
  recurrenceRule: null,
  recurrenceUntil: null,
  recurrenceTimezone: null,
  recurrenceSeriesStartAt: null,
  recurrenceNextAt: null,
};

const shiftDate = (value, delta) =>
  value ? new Date(new Date(value).getTime() + delta).toISOString() : null;

// A finished occurrence is often sitting in a "done" list by the time the series advances, so
// the new one is placed back where work actually happens instead of being born already closed.
const getTargetList = async (card, list) => {
  if (list.type === List.Types.ACTIVE) {
    return list;
  }

  if (card.prevListId) {
    const prevList = await List.qm.getOneById(card.prevListId, { boardId: card.boardId });

    if (prevList && prevList.type === List.Types.ACTIVE) {
      return prevList;
    }
  }

  const [firstActiveList] = await List.qm.getByBoardId(card.boardId, {
    typeOrTypes: List.Types.ACTIVE,
  });

  return firstActiveList || null;
};

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const { record } = inputs;

    if (!record.recurrenceRule) {
      return {
        card: record,
        nextCard: null,
      };
    }

    const clearRecurrence = async () => {
      const { card } = await Card.qm.updateOne(record.id, CLEARED_RECURRENCE);

      if (card) {
        sails.sockets.broadcast(`board:${card.boardId}`, 'cardUpdate', {
          item: card,
        });
      }

      return card || record;
    };

    if (!record.recurrenceNextAt) {
      return {
        card: await clearRecurrence(),
        nextCard: null,
      };
    }

    const occurrenceAt = record.recurrenceOccurrenceAt || record.startDate || record.dueDate;
    const seriesStartAt = record.recurrenceSeriesStartAt || occurrenceAt;
    const nextOccurrenceAt = new Date(record.recurrenceNextAt);
    const delta = nextOccurrenceAt.getTime() - new Date(occurrenceAt).getTime();
    const recurrenceSeriesId = record.recurrenceSeriesId || record.id;
    const timeZone = record.recurrenceTimezone || 'UTC';

    let nextRecurrence = null;
    try {
      nextRecurrence = getRecurrenceMetadata({
        recurrenceRule: record.recurrenceRule,
        seriesStartAt,
        occurrenceAt: nextOccurrenceAt,
        timeZone,
        isAllDay: record.isAllDay,
      });
    } catch (error) {
      sails.log.warn(`Disabled invalid recurrence on card ${record.id}: ${error.message}`);

      return {
        card: await clearRecurrence(),
        nextCard: null,
      };
    }

    // The last occurrence of a series keeps its dates but drops the rule, so that neither the
    // scheduler nor the calendar keeps projecting occurrences beyond the end of the series.
    const isLastOccurrence = !nextRecurrence.recurrenceNextAt;

    let nextCard = await Card.qm.getOneByRecurrenceSeriesIdAndOccurrenceAt(
      recurrenceSeriesId,
      nextOccurrenceAt,
    );

    if (!nextCard) {
      const { card, list, board, project } = await sails.helpers.cards.getPathToProjectById(
        record.id,
      );

      const targetList = await getTargetList(card, list);
      if (!targetList) {
        sails.log.warn(`Disabled recurrence on card ${record.id}: board has no active list`);

        return {
          card: await clearRecurrence(),
          nextCard: null,
        };
      }

      const creatorUser = await User.qm.getOneById(card.creatorUserId);
      if (!creatorUser) {
        sails.log.warn(`Disabled recurrence on card ${record.id}: creator no longer exists`);

        return {
          card: await clearRecurrence(),
          nextCard: null,
        };
      }

      try {
        ({ card: nextCard } = await sails.helpers.cards.duplicateOne.with({
          record: card,
          project,
          board,
          list,
          copyAttachments: false,
          copyCardSubscriptions: true,
          resetTaskCompletion: true,
          values: {
            creatorUser,
            ...(targetList.id !== list.id && { list: targetList }),
            position: card.position === null ? 0 : card.position,
            isClosed: false,
            startDate: shiftDate(card.startDate, delta),
            endDate: shiftDate(card.endDate, delta),
            dueDate: shiftDate(card.dueDate, delta),
            recurrenceRule: isLastOccurrence ? null : record.recurrenceRule,
            recurrenceUntil: isLastOccurrence ? null : nextRecurrence.recurrenceUntil,
            recurrenceTimezone: isLastOccurrence ? null : timeZone,
            recurrenceSeriesId,
            recurrenceSeriesStartAt: new Date(seriesStartAt).toISOString(),
            recurrenceOccurrenceAt: nextOccurrenceAt.toISOString(),
            recurrenceNextAt: nextRecurrence.recurrenceNextAt,
            isDueCompleted: false,
            ...(card.stopwatch && {
              stopwatch: {
                startedAt: null,
                total: 0,
              },
            }),
          },
        }));
      } catch (error) {
        if (error.code !== 'E_UNIQUE') {
          throw error;
        }

        // Another worker materialized the same occurrence first.
        nextCard = await Card.qm.getOneByRecurrenceSeriesIdAndOccurrenceAt(
          recurrenceSeriesId,
          nextOccurrenceAt,
        );
      }
    }

    const card = await clearRecurrence();

    return {
      card,
      nextCard,
    };
  },
};
