/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

var threadId, replyId;

chai.use(chaiHttp);

suite('Functional Tests', function () {

  suite('API ROUTING FOR /api/threads/:board', function () {

    suite('POST', function () {
      test('Add new thread to board', function (done) {
        chai.request(server)
          .post('/api/threads/testBoard')
          .send({
            text: "Sample Text",
            delete_password: "Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            done();
          })
      })
      test("Add second thread to board", function (done) {
        chai.request(server)
          .post('/api/threads/testBoard')
          .send({
            text: "Sample Text 2",
            delete_password: "Password 2"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            done();
          })
      })
    });

    suite('GET', function () {
      test('Ensure new thread is on board', function (done) {
        chai.request(server)
          .get('/api/threads/testBoard')
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.body[0].text, 'Sample Text');
            assert.property(res.body[0], 'created_on');
            assert.property(res.body[0], 'bumped_on');
            assert.equal(res.body[1].text, "Sample Text 2");
            assert.property(res.body[1], 'created_on');
            assert.property(res.body[1], 'bumped_on');
            threadId = res.body[0]._id;
            replyId = res.body[1]._id;
            done();
          })
      })
    });

    suite('DELETE', function () {
      test('Ensure deletion is successful', function (done) {
        chai.request(server)
          .delete('/api/threads/testBoard')
          .send({
            thread_id: threadId,
            delete_password: "Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
          })
      })

      test("Ensure deletion with invalid id fails", function (done) {
        chai.request(server)
          .delete('/api/threads/testBoard')
          .send({
            thread_id: threadId,
            delete_password: "Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "thread does not exist");
            done();
          })
      })

      test("Ensure deletion with invalid password fails", function (done) {
        chai.request(server)
          .delete('/api/threads/testBoard')
          .send({
            thread_id: replyId,
            delete_password: "Not The Right Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password");
            threadId = replyId;
            replyId = "";
            done();
          })
      })
    });

    suite('PUT', function () {
      test("Ensure can report thread", function (done) {
        chai.request(server)
          .put('/api/threads/testBoard')
          .send({
            thread_id: threadId
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
          })
      })
    });


  });

  suite('API ROUTING FOR /api/replies/:board', function () {

    suite('POST', function () {
      test('Add new reply to thread', function (done) {
        chai.request(server)
          .post('/api/replies/testBoard')
          .send({
            thread_id: threadId,
            text: "Sample Reply Text",
            delete_password: "Reply Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            done();
          })
      })
    });

    suite('GET', function () {
      test('Ensure thread with reply is on board', function (done) {
        chai.request(server)
          .get('/api/replies/testBoard?thread_id='+threadId)
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.body.text, 'Sample Text 2');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            assert.equal(res.body.replies[0].text, "Sample Reply Text");
            assert.property(res.body.replies[0], 'created_on');
            assert.property(res.body.replies[0], 'bumped_on');
            replyId = res.body.replies[0]._id;
            done();
          })
      })
    });

    suite('PUT', function () {
      test("Ensure can report reply", function (done) {
        chai.request(server)
          .put('/api/replies/testBoard')
          .send({
            thread_id: threadId,
            reply_id: replyId
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
          })
      })
    });

    suite('DELETE', function () {

      test("Ensure deletion with invalid reply id fails", function (done) {
        chai.request(server)
          .delete('/api/replies/testBoard')
          .send({
            thread_id: threadId,
            reply_id: "Wrong Reply Id",
            delete_password: "Reply Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reply does not exist");
            done();
          })
      })

      test("Ensure deletion with invalid password fails", function (done) {
        chai.request(server)
          .delete('/api/replies/testBoard')
          .send({
            thread_id: threadId,
            reply_id: replyId,
            delete_password: "Not The Right Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password");
            done();
          })
      })

      test('Ensure deletion is successful', function (done) {
        chai.request(server)
          .delete('/api/replies/testBoard')
          .send({
            thread_id: threadId,
            reply_id: replyId,
            delete_password: "Reply Password"
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
          })
      })
    });

  });

});
