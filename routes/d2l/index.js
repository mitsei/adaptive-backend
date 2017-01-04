let express = require('express');
let router = express.Router();
let _ = require('lodash')

const mockInstructorResponses = {
  'S99999994': {      // butter scotch
    whoami: require('./S99999994.whoami.json'),
    enrollments: require('./S99999994.enrollments.json'),
    courses: require('./S99999994.courses.json')
  }
}

const mockStudentResponses = {
  'S99999991': {    // 'nutter butter'
    whoami: require('./S99999991.whoami.json'),
    enrollments: require('./S99999991.enrollments.json'),
  }
}

/* ====
  This module provides a mock endpoint that substitutes for the call to d2l.
===== */

/*
  all routes at /mock-d2l/...
*/
router.get('/d2l/api/lp/1.14/enrollments/myenrollments*', getEnrollments)
router.get('/d2l/api/lp/1.5/courses*', getCourses)
router.get('/d2l/api/lp/1.5/users/whoami*', getWhoami)

/*
  expects a required field in req.body of ?mock-role=[student or instructor]
  also takes an optional body field of the sNumber for the student
*/
function getEnrollments(req, res) {
  let role = _parseRole(req);

  if (role === 'student') {
    let sNumber = req.body.sNumber || _.sample(_.keys(mockStudentResponses));

    return res.send(mockStudentResponses[sNumber].enrollments);

  } else if (role === 'instructor') {
    let sNumber = req.body.sNumber || 'S99999994';

    return res.send(mockInstructorResponses[sNumber].enrollments);

  } else {
    return res.status(400).send("must send in body the role of 'student' or 'instructor'");
  }
}

function getCourses(req, res) {
  let role = _parseRole(req);

  if (role === 'student') {
    res.status(400).send("Students don't have courses.");

  } else if (role === 'instructor') {
    let sNumber = req.body.sNumber || 'S99999994';

    return res.send(mockInstructorResponses[sNumber].courses);

  } else {
    return res.status(400).send("must send in body the role of 'student' or 'instructor'");
  }
}

function getWhoami(req, res) {
  let role = _parseRole(req);

  if (role === 'student') {
    let sNumber = req.body.sNumber || _.sample(_.keys(mockStudentResponses));

    return res.send(mockStudentResponses[sNumber].whoami);

  } else if (role === 'instructor') {
    let sNumber = req.body.sNumber || 'S99999994';

    return res.send(mockInstructorResponses[sNumber].whoami);

  } else {
    return res.status(400).send("must send in body the role of 'student' or 'instructor'");
  }
}

function _parseRole(req) {
  return req.query.role;
}



module.exports = router;
