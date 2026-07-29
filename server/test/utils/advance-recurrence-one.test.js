const { expect } = require('chai');

const advanceRecurrenceOne = require('../../api/helpers/cards/advance-recurrence-one');

describe('advance-recurrence-one', () => {
  it('creates one open occurrence in the previous active list with visible events', async () => {
    const sourceCard = {
      id: '10',
      boardId: '20',
      listId: '30',
      prevListId: '31',
      creatorUserId: '40',
      position: 1,
      startDate: '2026-07-29T09:00:00.000Z',
      endDate: '2026-07-29T10:00:00.000Z',
      dueDate: '2026-07-29T10:00:00.000Z',
      isAllDay: false,
      isClosed: true,
      recurrenceRule: 'FREQ=DAILY;COUNT=3',
      recurrenceTimezone: 'Europe/Kyiv',
      recurrenceSeriesId: '10',
      recurrenceSeriesStartAt: '2026-07-29T09:00:00.000Z',
      recurrenceOccurrenceAt: '2026-07-29T09:00:00.000Z',
      recurrenceNextAt: '2026-07-30T09:00:00.000Z',
    };

    const closedList = {
      id: '30',
      boardId: '20',
      type: 'closed',
    };
    const activeList = {
      id: '31',
      boardId: '20',
      type: 'active',
    };
    const creatorUser = {
      id: '40',
      subscribeToOwnCards: true,
    };
    const nextCard = {
      id: '11',
      boardId: '20',
    };

    const originals = {
      Card: global.Card,
      List: global.List,
      User: global.User,
      duplicateOne: sails.helpers.cards.duplicateOne,
      getPathToProjectById: sails.helpers.cards.getPathToProjectById,
      sockets: sails.sockets,
    };

    let duplicateInputs;

    try {
      global.Card = {
        qm: {
          getOneByRecurrenceSeriesIdAndOccurrenceAt: async () => null,
          updateOne: async () => ({
            card: {
              ...sourceCard,
              recurrenceRule: null,
            },
          }),
        },
      };
      global.List = {
        Types: {
          ACTIVE: 'active',
        },
        qm: {
          getOneById: async () => activeList,
          getByBoardId: async () => [activeList],
        },
      };
      global.User = {
        qm: {
          getOneById: async () => creatorUser,
        },
      };

      sails.helpers.cards.getPathToProjectById = async () => ({
        card: sourceCard,
        list: closedList,
        board: { id: '20' },
        project: { id: '50' },
      });
      sails.helpers.cards.duplicateOne = {
        with: async (inputs) => {
          duplicateInputs = inputs;
          return {
            card: nextCard,
          };
        },
      };
      sails.sockets = {
        broadcast() {},
      };

      const result = await advanceRecurrenceOne.fn({
        record: sourceCard,
      });

      expect(result.nextCard).to.equal(nextCard);
      expect(duplicateInputs).to.include({
        copyAttachments: false,
        copyCardSubscriptions: true,
        resetTaskCompletion: true,
      });
      expect(duplicateInputs.values).to.include({
        creatorUser,
        list: activeList,
        isClosed: false,
        isDueCompleted: false,
        recurrenceRule: sourceCard.recurrenceRule,
        recurrenceNextAt: '2026-07-31T09:00:00.000Z',
      });
    } finally {
      global.Card = originals.Card;
      global.List = originals.List;
      global.User = originals.User;
      sails.helpers.cards.duplicateOne = originals.duplicateOne;
      sails.helpers.cards.getPathToProjectById = originals.getPathToProjectById;
      sails.sockets = originals.sockets;
    }
  });
});
