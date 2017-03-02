const credentials = require('../credentials');
const qbank = require('../lib/qBankFetch')(credentials);

/**
  get the takens given an assessment offered
*/
module.exports = function _deleteOffered(offeredId, bankId) {
  if (!offeredId || !bankId) return null;

  const options = {
    method: 'DELETE',
    path: `assessment/banks/${bankId}/assessmentsoffered/${offeredId}`
  };

  return qbank(options);
};
