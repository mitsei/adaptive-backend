let credentials = require('../credentials');
let qbank = require('../lib/qBankFetch')(credentials);

module.exports = function _deleteTaken(takenId, bankId) {
  if (!takenId || !bankId) return null;

  let deleteTakenOptions = {
    method: 'DELETE',
    path: `assessment/banks/${bankId}/assessmentstaken/${takenId}`
  }

  return qbank(deleteTakenOptions);
}
