let qbank = require('../lib/qBankFetch')(credentials);

module.exports = function _deleteTaken(takenId, bankId) {
  let deleteTakenOptions = {
    method: 'DELETE',
    path: `assessment/banks/${bankId}/assessmentstaken/${takenId}`
  }

  return qbank(deleteTakenOptions);
}
