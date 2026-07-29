/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = function defineRecurringCardsHook(sails) {
  let interval;

  const run = (backfill = false) =>
    sails.helpers.cards.processDueRecurrences.with({ backfill }).catch((error) => {
      sails.log.error(`Could not process recurring cards: ${error.stack || error}`);
    });

  return {
    initialize() {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      sails.after('lifted', () => {
        run(true);
        interval = setInterval(run, 60 * 1000);
        interval.unref();
      });
    },

    teardown(done) {
      clearInterval(interval);
      done();
    },
  };
};
