// Load the twilio module
let TWILIO_TOKEN, TWILIO_ACCOUNT_SID;
if (process.NODE_ENV === 'production') {
  TWILIO_ACCOUNT_SID = 'AC5c085dd5265e9754e0c1961c64e31a09';
  TWILIO_TOKEN = 'a07716ee8744037c1ef9081ad8f21aa4';
} else {
  TWILIO_ACCOUNT_SID = 'ACbf3b015341520032423d3b63fd61f8a4';
  TWILIO_TOKEN = '3da8725b986ecedc4a3d47e3ee8a270c';
}
const TWILIO_NUMBER = '+16172450536';

const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_TOKEN);
const Q = require('q');

module.exports = {
  send
}


/**
  texts a
*/
function send(number, content) {
  let deferred = Q.defer();

  client.messages.create({
    to: number,
    from: TWILIO_NUMBER,
    body: content
  }, function(error, message) {
    if (!error) {
        console.log('Success! The SID for this SMS message is:');
        console.log(message.sid);
        console.log('Message sent on:');
        console.log(message.dateCreated);

      deferred.resolve(message);
    } else {
      console.log('Oops! There was an error.', error);
      deferred.reject(error);
    }
  });

  return deferred.promise;
}
