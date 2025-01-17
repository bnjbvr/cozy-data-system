// Generated by CoffeeScript 1.9.3
var async, db, dbHelper, encryption, errors, log, request, util;

async = require("async");

db = require('../helpers/db_connect_helper').db_connect();

request = require('../lib/request');

encryption = require('../lib/encryption');

dbHelper = require('../lib/db_remove_helper');

errors = require('../middlewares/errors');

util = require('util');

log = require('printit')({
  prefix: 'requests'
});

module.exports.doctypes = function(req, res, next) {
  var out, query;
  query = {
    group: true
  };
  out = [];
  return db.view("doctypes/all", query, function(err, docs) {
    if (err) {
      return next(err);
    } else {
      docs.forEach(function(key, row, id) {
        return out.push(key);
      });
      return res.send(200, out);
    }
  });
};

module.exports.tags = function(req, res, next) {
  var out, query;
  query = {
    group: true
  };
  out = [];
  return db.view("tags/all", query, function(err, docs) {
    if (err) {
      return next(err);
    } else {
      docs.forEach(function(key, row, id) {
        return out.push(key);
      });
      return res.send(200, out);
    }
  });
};

module.exports.results = function(req, res, next) {
  var sendRev;
  sendRev = req.body.show_revs;
  delete req.body.show_revs;
  return request.get(req.appName, req.params, function(path) {
    return db.view((req.params.type + "/") + path, req.body, function(err, docs) {
      if (err) {
        log.error(err);
        return next(err);
      } else if (util.isArray(docs)) {
        docs.forEach(function(value) {
          var password, ref, ref1;
          if (!sendRev) {
            delete value._rev;
          }
          if ((value.password != null) && ((ref = !((ref1 = value.docType) != null ? ref1.toLowerCase() : void 0)) === 'application' || ref === 'user')) {
            try {
              password = encryption.decrypt(value.password);
            } catch (_error) {}
            if (err == null) {
              return value.password = password;
            }
          }
        });
        return res.send(docs);
      } else {
        return res.send(docs);
      }
    });
  });
};

module.exports.removeResults = function(req, res, next) {
  var delFunc, options, viewName;
  options = JSON.parse(JSON.stringify(req.body));
  options.limit = 100;
  viewName = null;
  delFunc = function() {
    return db.view(viewName, options, function(err, docs) {
      if (err) {
        if (err.error === "not_found") {
          return next(errors.http(404, "Request " + viewName + " was not found"));
        } else {
          log.error("Deletion by request failed for " + viewName);
          log.error(err);
          if (options.startkey != null) {
            return res.send(204, {
              success: true
            });
          } else {
            return next(err);
          }
        }
      } else {
        if (docs.length > 0) {
          return dbHelper.removeAll(docs, function() {
            return setTimeout(delFunc, 500);
          });
        } else {
          return res.send(204, {
            success: true
          });
        }
      }
    });
  };
  return request.get(req.appName, req.params, function(path) {
    viewName = req.params.type + "/" + path;
    return delFunc();
  });
};

module.exports.definition = function(req, res, next) {
  return db.get("_design/" + req.params.type, function(err, docs) {
    var design_doc, views;
    if (err && err.error === 'not_found') {
      design_doc = {};
      design_doc[req.params.req_name] = req.body;
      return db.save("_design/" + req.params.type, design_doc, function(err, response) {
        if (err) {
          console.log("[Definition] err: " + JSON.stringify(err));
          return next(err);
        } else {
          res.send(200, {
            success: true
          });
          return next();
        }
      });
    } else if (err) {
      return next(err);
    } else {
      views = docs.views;
      return request.create(req.appName, req.params, views, req.body, function(err, path) {
        views[path] = req.body;
        return db.merge("_design/" + req.params.type, {
          views: views
        }, function(err, response) {
          if (err) {
            console.log("[Definition] err: " + JSON.stringify(err));
            return next(err);
          } else {
            res.send(200, {
              success: true
            });
            return next();
          }
        });
      });
    }
  });
};

module.exports.remove = function(req, res, next) {
  return db.get("_design/" + req.params.type, function(err, docs) {
    var views;
    if (err && err.error === 'not_found') {
      return next(errors.http(404, "Not Found"));
    } else if (err) {
      return next(err);
    } else {
      views = docs.views;
      return request.get(req.appName, req.params, function(path) {
        if (path === ("" + req.params.req_name)) {
          res.send(204, {
            success: true
          });
          return next();
        } else {
          delete views["" + path];
          return db.merge("_design/" + req.params.type, {
            views: views
          }, function(err, response) {
            if (err) {
              console.log("[Definition] err: " + err.message);
              return next(err);
            } else {
              res.send(204, {
                success: true
              });
              return next();
            }
          });
        }
      });
    }
  });
};
