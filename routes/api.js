/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var mongodb = require('mongodb');
var mongoose = require('mongoose');

module.exports = function (app) {

  mongoose.connect(process.env.DATABASE, { useNewUrlParser: true, useUnifiedTopology: true });

  const ReplySchema = new mongoose.Schema({ text: String, created_on: Date, bumped_on: Date, reported: Boolean, delete_password: String});
  const ThreadSchema = new mongoose.Schema({ text: String, created_on: Date, bumped_on: Date, reported: Boolean, delete_password: String, replies: [ReplySchema]});
  const BoardSchema = new mongoose.Schema({ name: String, threads: [ThreadSchema] });

  const REPLY = mongoose.model("REPLY", ReplySchema);
  const THREAD = mongoose.model("THREAD", ThreadSchema);
  const BOARD = mongoose.model("BOARD", BoardSchema);

  function hideFieldsFromThread(thread, isReply) {
    if(isReply) {
      return { _id: thread._id, text: thread.text, created_on: thread.created_on, bumped_on: thread.bumped_on};
    } else {
      let replies = thread.replies;
      let replycount = replies.length;
      for (let i = 0; i < replies.length; i++) {
        replies[i] = hideFieldsFromThread(replies[i], true);
      }
      return { _id: thread._id, text: thread.text, created_on: thread.created_on, bumped_on: thread.bumped_on, replies: replies, replycount: replycount };
    }
  }

  app.route('/api/reset').get(function (req, res) {
    THREAD.deleteMany({}, function (err, data) {
      BOARD.deleteMany({}, function (err2, data2) {
        console.log("Successfully reset database");
        res.redirect('/');
      })
    })
  })

  app.route('/api/threads/:board')

    //I can GET an array of the most recent 10 bumped threads on the board with only the most recent 3 replies from /api/threads/{board}. The reported and delete_passwords fields will not be sent.
    .get(function (req, res) {
      console.log("GET detected");
      let boardName = req.params.board;
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            return res.json([]);
          } else {
            if (board.threads.length < 1) {
              console.log("board has no threads");
              return res.json([]);
            } else {
              console.log("Current Board: " + board);
              let maxThreads = Math.min(board.threads.length, 10);
              let threads = board.threads.slice(0, maxThreads);
              for (let i = 0; i < threads.length; i++) {
                threads[i] = hideFieldsFromThread(threads[i], false);
              }
              return res.json(threads);
            }
          }
        }
      })
    })

    //I can POST a thread to a specific message board by passing form data text and delete_password to /api/threads/{board}.
    //(Recommend res.redirect to board page /b/{board}) Saved will be _id, text, created_on(date&time), bumped_on(date&time, starts same as created_on), reported(boolean), delete_password, & replies(array).
    .post(function (req, res) {
      let boardName = req.params.board;
      let threadText = req.body.text;
      let password = req.body.delete_password;
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            board = new BOARD({ name: boardName, threads: [] });
          }
          let newThread = new THREAD({ text: threadText, created_on: new Date(), bumped_on: new Date(), reported: false, delete_password: password, replies: [] });
          newThread.save((err, data) => {
            if (err) {
              console.log(err);
            }
            board.threads.push(newThread);
            board.save((err, data) => {
              if (err) {
                console.log(err);
              }
              console.log("redirecting");
              res.redirect('/b/' + boardName);
            });
          });
        }
      })
    })

    //I can report a thread and change it's reported value to true by sending a PUT request to /api/threads/{board} and pass along the thread_id. (Text response will be 'success')
    .put(function (req, res) {
      let boardName = req.params.board;
      let threadId = req.body.thread_id;
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            return res.json({});
          } else {
            console.log("check");
            console.log(threadId);
            console.log(board.threads);
            console.log("check end");
            let thread = board.threads.id(threadId);
            if (thread == null) {
              console.log("thread not found on this board");
              return res.json({});
            } else {
              thread.reported = true;
              thread.save((err) => {
                if (err) {
                  console.log(err);
                }
                board.save((err) => {
                  if (err) {
                    console.log(err);
                  } else {
                    res.send("success");
                  }
                })
              })
            }
          }
        }
      });
    })

    //I can delete a thread completely if I send a DELETE request to /api/threads/{board} and pass along the thread_id & delete_password. (Text response will be 'incorrect password' or 'success')
    .delete(function (req, res) {
      let boardName = req.params.board;
      let threadId = req.body.thread_id;
      let password = req.body.delete_password;
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            return res.json({});
          } else {
            let thread = board.threads.id(threadId);
            if(thread == null) {
              return res.send("thread does not exist");
            }
            let correctPassword = false;
            if (thread.delete_password === password) {
              thread.remove();
              correctPassword = true;
            }
            board.save((err) => {
              if (err) {
                console.log(err);
              }
              if (correctPassword) {
                return res.send("success");
              } else {
                return res.send("incorrect password");
              }
            })
          }
        }
      });
    });

  app.route('/api/replies/:board')

    //I can GET an entire thread with all it's replies from /api/replies/{board}?thread_id={thread_id}. Also hiding the same fields.
    .get(function (req, res) {
      let boardName = req.params.board;
      let threadId = req.query.thread_id;
      console.log("Thread id: " + threadId);
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            return res.json({});
          } else {
            if (board.threads.length < 1) {
              console.log("board has no threads");
              return res.json({});
            } else {
              let thread = board.threads.id(threadId);
              if (thread == null) {
                console.log("thread not found on this board");
                return res.json({});
              } else {
                return res.json(hideFieldsFromThread(thread, false));
              }
            }
          }
        }
      });
    })

    //I can POST a reply to a thead on a specific board by passing form data text, delete_password, & thread_id to /api/replies/{board} and it will also update the bumped_on date to the comments date.
    //(Recommend res.redirect to thread page /b/{board}/{thread_id}) In the thread's 'replies' array will be saved _id, text, created_on, delete_password, & reported.
    .post(function (req, res) {
      let boardName = req.params.board;
      let threadText = req.body.text;
      let password = req.body.delete_password;
      let threadId = req.body.thread_id;
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            return res.json({});
          } else {
            let thread = board.threads.id(threadId);
            let reply = new REPLY({ text: threadText, created_on: new Date(), bumped_on: new Date(), reported: false, delete_password: password });
            reply.save((err) => {
              if (err) {
                console.log(err);
              }
              thread.replies.push(reply);
              thread.bumped_on = new Date();
              thread.save((err) => {
                if (err) {
                  console.log(err);
                }
                board.save((err) => {
                  console.log(err);
                  res.redirect('/b/' + boardName + '/' + threadId);
                })
              })
            })
          }
        }
      })
    })

    //I can report a reply and change it's reported value to true by sending a PUT request to /api/replies/{board} and pass along the thread_id & reply_id. (Text response will be 'success')
    .put(function (req, res) {
      let boardName = req.params.board;
      let threadId = req.body.thread_id;
      let replyId = req.body.reply_id;
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            return res.json({});
          } else {
            let thread = board.threads.id(threadId);
            if (thread == null) {
              return res.send("no thread with this id available")
            }
            let reply = thread.replies.id(replyId);
            if (reply == null) {
              return res.send("no reply with this id available");
            }
            reply.reported = true;
            reply.save((err) => {
              if (err) { console.log(err) }
              thread.save((err) => {
                if (err) { console.log(err) }
                board.save((err) => {
                  if (err) { console.log(err) }
                  return res.send("success");
                })
              })
            })
          }
        }
      })
    })

    //I can delete a post(just changing the text to '[deleted]') if I send a DELETE request to /api/replies/{board} and pass along the thread_id, reply_id, & delete_password. (Text response will be 'incorrect password' or 'success')
    .delete(function (req, res) {
      let boardName = req.params.board;
      let threadId = req.body.thread_id;
      let replyId = req.body.reply_id;
      let password = req.body.delete_password;
      BOARD.findOne({ name: boardName }, function (err, board) {
        if (err) {
          console.log(err);
        } else {
          if (board == null) {
            return res.json({});
          } else {
            let thread = board.threads.id(threadId);
            if (thread == null) {
              return res.send("thread does not exist");
            }
            let reply = thread.replies.id(replyId);
            if (reply == null) {
              return res.send("reply does not exist");
            }
            let correctPassword = false;
            if (reply.delete_password === password) {
              reply.remove();
              correctPassword = true;
            }
            thread.save((err) => {
              if (err) {
                console.log(err);
              }
              board.save((err) => {
                if (err) {
                  console.log(err);
                }
                if (correctPassword) {
                  return res.send("success");
                } else {
                  return res.send("incorrect password");
                }
              })
            })
          }
        }
      });
    });
};
