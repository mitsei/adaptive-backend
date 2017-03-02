const express = require('express');

const router = express.Router();

const _ = require('lodash');

const S99999994WhoAmI = require('./S99999994.whoami.json');
const S99999994Enrollments = require('./S99999994.enrollments.json');
const S99999994Courses = require('./S99999994.courses.json');

const S99999991WhoAmI = require('./S99999991.whoami.json');
const S99999991Enrollments = require('./S99999991.enrollments.json');

const S99999992WhoAmI = require('./S99999992.whoami.json');
const S99999992Enrollments = require('./S99999992.enrollments.json');


const mockInstructorResponses = {
  S99999994: {      // butter scotch
    whoami: S99999994WhoAmI,
    enrollments: S99999994Enrollments,
    courses: S99999994Courses
  }
};

const mockStudentResponses = {
  S99999991: {    // 'nutter butter'
    whoami: S99999991WhoAmI,
    enrollments: S99999991Enrollments,
  },
  S99999992: {
    whoami: S99999992WhoAmI,
    enrollments: S99999992Enrollments,
  }
};

const mockClassList = require('./mockClassList.json');

function parseRole(req) {
  return req.query.role;
}

/*
  expects a required field in req.body of ?mock-role=[student or instructor]
  also takes an optional body field of the sNumber for the student
*/
function getEnrollments(req, res) {
  const role = parseRole(req);

  if (role === 'student') {
    const sNumber = req.body.sNumber || _.sample(_.keys(mockStudentResponses));

    return res.send(mockStudentResponses[sNumber].enrollments);

  } else if (role === 'instructor') {
    const sNumber = req.body.sNumber || 'S99999994';

    return res.send(mockInstructorResponses[sNumber].enrollments);

  }
  return res.status(400).send("must send in body the role of 'student' or 'instructor'");
}

function getCourses(req, res) {
  const role = parseRole(req);

  if (role === 'student') {
    res.status(400).send("Students don't have courses.");

  } else if (role === 'instructor') {
    const sNumber = req.body.sNumber || 'S99999994';

    return res.send(mockInstructorResponses[sNumber].courses);

  }
  return res.status(400).send("must send in query the role of 'student' or 'instructor'");
}

function getWhoami(req, res) {
  const role = parseRole(req);

  if (role === 'student') {
    const sNumber = req.query.sNumber || _.sample(_.keys(mockStudentResponses));

    return res.send(mockStudentResponses[sNumber].whoami);

  } else if (role === 'instructor') {
    const sNumber = req.body.sNumber || 'S99999994';

    return res.send(mockInstructorResponses[sNumber].whoami);

  }
  return res.status(400).send("must send in query the role of 'student' or 'instructor'");
}

function getClassList(req, res) {
  const role = parseRole(req);

  if (role === 'instructor') {
    return res.send(mockClassList);

  }
  return res.status(401).send('Only a query with role=instructor is allowed to see the classlist');
}

/* ====
  This module provides a mock endpoint that substitutes for the call to d2l.
===== */

/*
  all routes at /mock-d2l/...
*/
router.get('/d2l/api/lp/1.14/enrollments/myenrollments*', getEnrollments);
router.get('/d2l/api/lp/1.5/courses*', getCourses);
router.get('/d2l/api/lp/1.5/users/whoami*', getWhoami);
router.get('/d2l/api/le/1.5/:orgUnitId/classlist/', getClassList);

module.exports = router;
