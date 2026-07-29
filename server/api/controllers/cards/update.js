/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /cards/{id}:
 *   patch:
 *     summary: Update card
 *     description: Updates a card. Board editors can update all fields, viewers can only subscribe/unsubscribe.
 *     tags:
 *       - Cards
 *     operationId: updateCard
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the card to update
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               boardId:
 *                 type: string
 *                 description: ID of the board to move the card to
 *                 example: "1357158568008091265"
 *               listId:
 *                 type: string
 *                 description: ID of the list to move the card to
 *                 example: "1357158568008091266"
 *               coverAttachmentId:
 *                 type: string
 *                 nullable: true
 *                 description: ID of the attachment used as cover
 *                 example: "1357158568008091267"
 *               type:
 *                 type: string
 *                 enum: [project, story]
 *                 description: Type of the card
 *                 example: project
 *               position:
 *                 type: number
 *                 minimum: 0
 *                 nullable: true
 *                 description: Position of the card within the list (required when moving card to new list)
 *                 example: 65536
 *               name:
 *                 type: string
 *                 maxLength: 1024
 *                 description: Name/title of the card
 *                 example: Implement user authentication
 *               description:
 *                 type: string
 *                 maxLength: 1048576
 *                 nullable: true
 *                 description: Detailed description of the card
 *                 example: Add JWT-based authentication system...
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Due date for the card
 *                 example: 2024-01-01T00:00:00.000Z
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Calendar start date/time for the card
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Calendar end date/time for the card
 *               isAllDay:
 *                 type: boolean
 *                 description: Whether the calendar schedule is an all-day event
 *               recurrenceRule:
 *                 type: string
 *                 nullable: true
 *                 description: RFC 5545 RRULE for future occurrences; a schedule is required
 *                 example: FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR
 *               recurrenceUntil:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 readOnly: true
 *                 description: Derived last occurrence used for range filtering
 *               recurrenceTimezone:
 *                 type: string
 *                 nullable: true
 *                 description: IANA timezone used to calculate recurring occurrences
 *                 example: Europe/Kyiv
 *               recurrenceScope:
 *                 type: string
 *                 enum: [current, series]
 *                 description: Detach and update only this materialized card, or update future series
 *               isDueCompleted:
 *                 type: boolean
 *                 nullable: true
 *                 description: Whether the due date is completed
 *                 example: false
 *               stopwatch:
 *                 type: object
 *                 required:
 *                   - startedAt
 *                   - total
 *                 nullable: true
 *                 description: Stopwatch data for time tracking
 *                 properties:
 *                   startedAt:
 *                     type: string
 *                     format: date-time
 *                     description: When the stopwatch was started
 *                     example: 2024-01-01T00:00:00.000Z
 *                   total:
 *                     type: number
 *                     description: Total time in seconds
 *                     example: 3600
 *               isSubscribed:
 *                 type: boolean
 *                 description: Whether the current user is subscribed to the card
 *     responses:
 *       200:
 *         description: Card updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Card'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const {
  isCalendarDate,
  isCalendarEndDate,
  isDueDate,
  isRecurrenceRule,
  isStopwatch,
  isTimezone,
} = require('../../../utils/validators');
const { idInput } = require('../../../utils/inputs');
const {
  RecurrenceErrorCodes,
  normalizeCardRecurrenceValues,
} = require('../../../utils/recurrence');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  COVER_ATTACHMENT_NOT_FOUND: {
    coverAttachmentNotFound: 'Cover attachment not found',
  },
  LIST_MUST_BE_PRESENT: {
    listMustBePresent: 'List must be present',
  },
  COVER_ATTACHMENT_MUST_CONTAIN_IMAGE: {
    coverAttachmentMustContainImage: 'Cover attachment must contain image',
  },
  POSITION_MUST_BE_PRESENT: {
    positionMustBePresent: 'Position must be present',
  },
  END_DATE_MUST_BE_AFTER_START_DATE: {
    endDateMustBeAfterStartDate: 'End date must be after start date',
  },
  INVALID_RECURRENCE: {
    invalidRecurrence: 'Invalid recurrence',
  },
  RECURRENCE_START_DATE_REQUIRED: {
    recurrenceStartDateRequired: 'A recurring card must have a start date',
  },
  RECURRENCE_NEVER_REPEATS: {
    recurrenceNeverRepeats: 'Recurrence never repeats',
  },
  RECURRENCE_OCCURRENCE_ALREADY_EXISTS: {
    recurrenceOccurrenceAlreadyExists: 'Another card of this series already starts at that time',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    boardId: idInput,
    listId: idInput,
    coverAttachmentId: {
      ...idInput,
      allowNull: true,
    },
    type: {
      type: 'string',
      isIn: Object.values(Card.Types),
    },
    position: {
      type: 'number',
      min: 0,
      allowNull: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 1024,
    },
    description: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 1048576,
      allowNull: true,
    },
    dueDate: {
      type: 'string',
      custom: isDueDate,
      allowNull: true,
    },
    startDate: {
      type: 'string',
      custom: isCalendarDate,
      allowNull: true,
    },
    endDate: {
      type: 'string',
      custom: isCalendarDate,
      allowNull: true,
    },
    isAllDay: {
      type: 'boolean',
    },
    recurrenceRule: {
      type: 'string',
      custom: isRecurrenceRule,
      allowNull: true,
    },
    recurrenceUntil: {
      type: 'string',
      custom: isCalendarDate,
      allowNull: true,
    },
    recurrenceTimezone: {
      type: 'string',
      custom: isTimezone,
      allowNull: true,
    },
    recurrenceScope: {
      type: 'string',
      isIn: ['current', 'series'],
    },
    isDueCompleted: {
      type: 'boolean',
      allowNull: true,
    },
    stopwatch: {
      type: 'json',
      custom: isStopwatch,
    },
    isSubscribed: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    boardNotFound: {
      responseType: 'notFound',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    coverAttachmentNotFound: {
      responseType: 'notFound',
    },
    listMustBePresent: {
      responseType: 'unprocessableEntity',
    },
    coverAttachmentMustContainImage: {
      responseType: 'unprocessableEntity',
    },
    positionMustBePresent: {
      responseType: 'unprocessableEntity',
    },
    endDateMustBeAfterStartDate: {
      responseType: 'unprocessableEntity',
    },
    invalidRecurrence: {
      responseType: 'unprocessableEntity',
    },
    recurrenceStartDateRequired: {
      responseType: 'unprocessableEntity',
    },
    recurrenceNeverRepeats: {
      responseType: 'unprocessableEntity',
    },
    recurrenceOccurrenceAlreadyExists: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const pathToProject = await sails.helpers.cards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    let { card } = pathToProject;
    const wasDueCompleted = card.isDueCompleted;
    const { list, board, project } = pathToProject;

    let boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
    }

    if (sails.helpers.boards.isReadOnly(project, board)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const availableInputKeys = ['id', 'isSubscribed'];
    if (boardMembership.role === BoardMembership.Roles.EDITOR) {
      availableInputKeys.push(
        'boardId',
        'listId',
        'coverAttachmentId',
        'type',
        'position',
        'name',
        'description',
        'dueDate',
        'startDate',
        'endDate',
        'isAllDay',
        'recurrenceRule',
        'recurrenceUntil',
        'recurrenceTimezone',
        'recurrenceScope',
        'isDueCompleted',
        'stopwatch',
      );
    }

    if (_.difference(Object.keys(inputs), availableInputKeys).length > 0) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let nextProject;
    let nextBoard;

    if (!_.isUndefined(inputs.boardId)) {
      ({ board: nextBoard, project: nextProject } = await sails.helpers.boards
        .getPathToProjectById(inputs.boardId)
        .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND));

      boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
        nextBoard.id,
        currentUser.id,
      );

      if (!boardMembership) {
        throw Errors.BOARD_NOT_FOUND; // Forbidden
      }

      if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }

      if (sails.helpers.boards.isReadOnly(nextProject, nextBoard)) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }
    }

    let nextList;
    if (!_.isUndefined(inputs.listId)) {
      nextList = await List.qm.getOneById(inputs.listId, {
        boardId: (nextBoard || board).id,
      });

      if (!nextList) {
        throw Errors.LIST_NOT_FOUND;
      }
    }

    let nextCoverAttachment;
    if (inputs.coverAttachmentId) {
      nextCoverAttachment = await Attachment.qm.getOneById(inputs.coverAttachmentId, {
        cardId: card.id,
      });

      if (!nextCoverAttachment || nextCoverAttachment.type !== Attachment.Types.FILE) {
        throw Errors.COVER_ATTACHMENT_NOT_FOUND;
      }
    }

    const values = _.pick(inputs, [
      'coverAttachmentId',
      'type',
      'position',
      'name',
      'description',
      'dueDate',
      'startDate',
      'endDate',
      'isAllDay',
      'recurrenceRule',
      'recurrenceUntil',
      'recurrenceTimezone',
      'isDueCompleted',
      'stopwatch',
      'isSubscribed',
    ]);

    const movesRecurrenceOutOfActiveLists =
      nextList && sails.helpers.lists.isArchiveOrTrash(nextList) && card.recurrenceRule;
    const updatesCurrentOccurrenceOnly =
      inputs.recurrenceScope === 'current' && card.recurrenceRule;

    if (updatesCurrentOccurrenceOnly) {
      values.recurrenceRule = null;
      values.recurrenceTimezone = null;
    }

    const nextStartDate = _.isUndefined(values.startDate) ? card.startDate : values.startDate;
    const nextEndDate = _.isUndefined(values.endDate) ? card.endDate : values.endDate;

    if (nextStartDate && nextEndDate && !isCalendarEndDate(nextEndDate, nextStartDate)) {
      throw Errors.END_DATE_MUST_BE_AFTER_START_DATE;
    }

    if ((_.has(values, 'startDate') || _.has(values, 'endDate')) && _.isUndefined(values.dueDate)) {
      const nextIsAllDay = _.isUndefined(values.isAllDay) ? card.isAllDay : values.isAllDay;
      values.dueDate = nextIsAllDay ? nextStartDate : nextEndDate || nextStartDate;
    }

    try {
      normalizeCardRecurrenceValues(values, card);
    } catch (error) {
      if (error.code === RecurrenceErrorCodes.START_DATE_REQUIRED) {
        throw Errors.RECURRENCE_START_DATE_REQUIRED;
      }

      if (error.code === RecurrenceErrorCodes.NEVER_REPEATS) {
        throw Errors.RECURRENCE_NEVER_REPEATS;
      }

      throw {
        invalidRecurrence: error.message,
      };
    }

    if (updatesCurrentOccurrenceOnly) {
      Object.assign(values, {
        recurrenceSeriesId: null,
        recurrenceSeriesStartAt: null,
        recurrenceOccurrenceAt: null,
        recurrenceNextAt: null,
      });
    }

    // Validate the complete update before advancing ownership of the series. Otherwise an invalid
    // date or recurrence could still materialize the next occurrence before this request fails.
    if (updatesCurrentOccurrenceOnly || movesRecurrenceOutOfActiveLists) {
      ({ card } = await sails.helpers.cards.advanceRecurrenceOne.with({
        record: card,
      }));
    }

    try {
      card = await sails.helpers.cards.updateOne
        .with({
          project,
          board,
          list,
          record: card,
          values: {
            ...values,
            project: nextProject,
            board: nextBoard,
            list: nextList,
            coverAttachment: nextCoverAttachment,
          },
          actorUser: currentUser,
          request: this.req,
        })
        .intercept('positionMustBeInValues', () => Errors.POSITION_MUST_BE_PRESENT)
        .intercept('listMustBeInValues', () => Errors.LIST_MUST_BE_PRESENT)
        .intercept(
          'coverAttachmentInValuesMustContainImage',
          () => Errors.COVER_ATTACHMENT_MUST_CONTAIN_IMAGE,
        );
    } catch (error) {
      // The (series, occurrence) unique constraint: the new schedule collides with an occurrence
      // of the same series that already exists.
      if (error.code === 'E_UNIQUE' && values.recurrenceOccurrenceAt) {
        throw Errors.RECURRENCE_OCCURRENCE_ALREADY_EXISTS;
      }

      throw error;
    }

    if (!card) {
      throw Errors.CARD_NOT_FOUND;
    }

    if (card.recurrenceRule && values.isDueCompleted === true && wasDueCompleted !== true) {
      ({ card } = await sails.helpers.cards.processDueRecurrences.with({
        record: card,
      }));
    }

    return {
      item: card,
    };
  },
};
