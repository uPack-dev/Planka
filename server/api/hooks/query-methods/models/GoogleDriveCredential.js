/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const createOne = (values) => GoogleDriveCredential.create({ ...values }).fetch();

const getOneByUserId = (userId) =>
  GoogleDriveCredential.findOne({
    userId,
  });

const updateOneByUserId = (userId, values) =>
  GoogleDriveCredential.updateOne({
    userId,
  }).set({ ...values });

const deleteOneByUserId = (userId) =>
  GoogleDriveCredential.destroyOne({
    userId,
  });

module.exports = {
  createOne,
  getOneByUserId,
  updateOneByUserId,
  deleteOneByUserId,
};
