/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /lists/{listId}/cards:
 *   post:
 *     summary: Create card
 *     description: Creates a card within a list. Requires board editor permissions.
 *     tags:
 *       - Cards
 *     operationId: createCard
 *     parameters:
 *       - name: listId
 *         in: path
 *         required: true
 *         description: ID of the list to create the card in
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - name
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [project, story]
 *                 description: Type of the card
 *                 example: project
 *               position:
 *                 type: number
 *                 minimum: 0
 *                 nullable: true
 *                 description: Position of the card within the list
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
 *     responses:
 *       200:
 *         description: Card created successfully
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
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
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
};

module.exports = {
  inputs: {
    listId: {
      ...idInput,
      required: true,
    },
    type: {
      type: 'string',
      isIn: Object.values(Card.Types),
      required: true,
    },
    position: {
      type: 'number',
      min: 0,
      allowNull: true,
    },
    name: {
      type: 'string',
      maxLength: 1024,
      required: true,
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
    isDueCompleted: {
      type: 'boolean',
      allowNull: true,
    },
    stopwatch: {
      type: 'json',
      custom: isStopwatch,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    listNotFound: {
      responseType: 'notFound',
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
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { list, board, project } = await sails.helpers.lists
      .getPathToProjectById(inputs.listId)
      .intercept('pathNotFound', () => Errors.LIST_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.LIST_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    if (sails.helpers.boards.isReadOnly(project, board)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, [
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
    ]);

    if (
      values.startDate &&
      values.endDate &&
      !isCalendarEndDate(values.endDate, values.startDate)
    ) {
      throw Errors.END_DATE_MUST_BE_AFTER_START_DATE;
    }

    if ((_.has(values, 'startDate') || _.has(values, 'endDate')) && _.isUndefined(values.dueDate)) {
      const isAllDay = _.isUndefined(values.isAllDay) ? true : values.isAllDay;
      values.dueDate = isAllDay ? values.startDate : values.endDate || values.startDate;
    }

    try {
      normalizeCardRecurrenceValues(values);
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

    const card = await sails.helpers.cards.createOne
      .with({
        project,
        values: {
          ...values,
          board,
          list,
          creatorUser: currentUser,
        },
        request: this.req,
      })
      .intercept('positionMustBeInValues', () => Errors.POSITION_MUST_BE_PRESENT);

    return {
      item: card,
    };
  },
};
