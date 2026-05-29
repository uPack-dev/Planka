/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
};

module.exports = {
  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn() {
    const { currentUser } = this.req;

    if (currentUser.role !== User.Roles.ADMIN) {
      const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);

      if (managerProjectIds.length === 0) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }
    }

    const boardTemplates = await BoardTemplate.qm.getAll();
    const boardIds = sails.helpers.utils.mapRecords(boardTemplates, 'boardId');

    const templateBoards =
      boardIds.length > 0 ? await Board.qm.getByIds(boardIds, { withTemplates: true }) : [];

    const templateBoardIdsSet = new Set(
      templateBoards.flatMap((board) => (board.isTemplate ? board.id : [])),
    );

    return {
      items: boardTemplates.filter((boardTemplate) =>
        templateBoardIdsSet.has(boardTemplate.boardId),
      ),
    };
  },
};
