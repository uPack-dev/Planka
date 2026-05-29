/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria, { sort = ['name', 'id'] } = {}) =>
  BoardTemplate.find(criteria).sort(sort);

/* Query methods */

const createOne = (values) => BoardTemplate.create({ ...values }).fetch();

const getAll = ({ sort = ['name', 'id'] } = {}) => defaultFind({}, { sort });

const getOneById = (id) => BoardTemplate.findOne(id);

const getOneByBoardId = (boardId) =>
  BoardTemplate.findOne({
    boardId,
  });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => BoardTemplate.destroy(criteria).fetch();

const deleteOne = (criteria) => BoardTemplate.destroyOne(criteria);

module.exports = {
  createOne,
  getAll,
  getOneById,
  getOneByBoardId,
  deleteOne,
  delete: delete_,
};
