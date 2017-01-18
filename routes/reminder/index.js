
let text = require('./text')

module.exports = {
  sendPhaseIAnnouncement,
}


/**
  sends an announcement to ALL students in the class when Phase I is opened
*/
function sendPhaseIAnnouncement() {
  let students;
  let message = 'Class announcement: FbW Phase I mission is now open. Go to http://fbw-student.mit.edu on your computer today to start.';

  return Q.all(_.map(students, student => text.send(student.mobile, message)))
  .then( res => {
    return res;
  })
  .catch( err => {
    return err;
  })
}

function sendPhaseIIReminders() {
  
}

function sendPhaseIIAnnouncement() {

}
