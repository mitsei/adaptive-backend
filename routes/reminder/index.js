const Q = require('q');
const _ = require('lodash');
const text = require('./text');

/**
  sends an announcement to ALL students in the class when Phase I is opened
*/
function sendPhaseIAnnouncement() {
  let students;
  const message = 'Class announcement: FbW Phase I mission is now open. Go to http://fbw-student.mit.edu on your computer today to start.';

  return Q.all(_.map(students, student => text.send(student.mobile, message)))
  .then(res => (res))
  .catch(err => (err));
}

function sendPhaseIIReminders() {

}

function sendPhaseIIAnnouncement() {

}

module.exports = {
  sendPhaseIAnnouncement,
  sendPhaseIIReminders,
  sendPhaseIIAnnouncement
};
