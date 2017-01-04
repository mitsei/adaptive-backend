process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');
const should = chai.should();
const _ = require('lodash')
const Q = require('q')
chai.use(chaiHttp);


describe('d2l', () => {

    it('should get enrollments of a student', done => {
      chai.request(server)
     .get(`/mock-d2l/d2l/api/lp/1.14/enrollments/myenrollments/`)
     .send({
       role: 'student'
     })
     .end((err, res) => {
       let result = JSON.parse(res.text);
       (result).Items[0].Access.LISRoles.should.contain("urn:lti:instrole:ims/lis/Student");

       done();
     });
    });

    it('should get enrollments of an instructor', done => {
      chai.request(server)
     .get(`/mock-d2l/d2l/api/lp/1.14/enrollments/myenrollments/?isActive=true`)
     .send({
       role: 'instructor'
     })
     .end((err, res) => {
       let result = JSON.parse(res.text);
       (result).Items[0].Access.ClasslistRoleName.should.eql("Instructor");

       done();
     });
    });

    it('should get whoami of an instructor', done => {
      chai.request(server)
     .get(`/mock-d2l/d2l/api/lp/1.5/users/whoami?blah=blah`)
     .send({
       role: 'instructor'
     })
     .end((err, res) => {
      //  console.log(res)
       let result = JSON.parse(res.text);
       (result).FirstName.should.be.eql("Butter");

       done();
     });
    });

    it('should get whoami of a student', done => {
      chai.request(server)
     .get(`/mock-d2l/d2l/api/lp/1.5/users/whoami`)
     .send({
       role: 'student'
     })
     .end((err, res) => {
      //  console.log(res)
       let result = JSON.parse(res.text);
       (result).FirstName.should.be.eql("Nutter");

       done();
     });
    });

    it('should get courses of an instructor', done => {
      chai.request(server)
     .get(`/mock-d2l/d2l/api/lp/1.5/courses/blahblahblah`)
     .send({
       role: 'instructor'
     })
     .end((err, res) => {
       let result = JSON.parse(res.text);
       (result).Name.should.be.eql("Fly-by-wire MAT121");

       done();
     });
    });

})
