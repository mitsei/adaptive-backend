// Load the twilio module
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || '';
const TWILIO_NUMBER = process.env.TWILIO_NUMBER || '';

const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_TOKEN);
const Q = require('q');


/**
  texts a
*/
function send(number, content) {
  const deferred = Q.defer();

  client.messages.create({
    to: number,
    from: TWILIO_NUMBER,
    body: content
  }, (error, message) => {
    if (!error) {
      deferred.resolve(message);
    } else {
      deferred.reject(error);
    }
  });

  return deferred.promise;
}

module.exports = {
  send
};
