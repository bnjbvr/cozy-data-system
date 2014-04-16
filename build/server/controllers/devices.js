// Generated by CoffeeScript 1.7.1
var async, createFilter, db, dbHelper, feed, filter, randomString, request;

async = require("async");

feed = require('../lib/feed');

db = require('../helpers/db_connect_helper').db_connect();

request = require('../lib/request');

filter = require('../lib/default_filter');

dbHelper = require('../lib/db_remove_helper');

randomString = function(length) {
  var string;
  string = "";
  while (string.length < length) {
    string = string + Math.random().toString(36).substr(2);
  }
  return string.substr(0, length);
};

createFilter = function(id, callback) {
  return db.get("_design/" + id, function(err, res) {
    var designDoc, filterDocTypeFunction, filterFunction, filterName, options;
    if (err && err.error === 'not_found') {
      designDoc = {};
      filterFunction = filter.get(id);
      designDoc.filter = filterFunction;
      filterDocTypeFunction = filter.getDocType(id);
      designDoc.filterDocType = filterDocTypeFunction;
      options = {
        views: {},
        filters: designDoc
      };
      return db.save("_design/" + id, options, function(err, res) {
        if (err) {
          console.log("[Definition] err: " + JSON.stringify(err));
          return callback(err.message);
        } else {
          return callback(null);
        }
      });
    } else if (err) {
      return callback(err.message);
    } else {
      designDoc = res.filters;
      filterName = id + "filter";
      filterFunction = filter.get(id);
      designDoc.filter = filterFunction;
      return db.merge("_design/" + id, {
        filters: designDoc
      }, function(err, res) {
        if (err) {
          console.log("[Definition] err: " + JSON.stringify(err));
          return callback(err.message);
        } else {
          return callback(null);
        }
      });
    }
  });
};

module.exports.create = function(req, res, next) {
  var device;
  device = {
    login: req.body.login,
    password: randomString(32),
    docType: "Device",
    configuration: {
      "File": "all",
      "Folder": "all"
    }
  };
  return db.view('device/byLogin', {
    key: device.login
  }, function(err, response) {
    if (err != null) {
      return next(new Error(err));
    } else if (response.length !== 0) {
      err = new Error("This name is already used");
      err.status = 400;
      return next(err);
    } else {
      return db.save(device, function(err, docInfo) {
        return createFilter(docInfo._id, function(err) {
          if (err != null) {
            return next(new Error(err));
          } else {
            device.id = docInfo._id;
            return res.send(200, device);
          }
        });
      });
    }
  });
};

module.exports.remove = function(req, res, next) {
  var id, send_success;
  send_success = function() {
    res.send(200, {
      success: true
    });
    return next();
  };
  id = req.params.id;
  return db.remove("_design/" + id, function(err, response) {
    if (err != null) {
      console.log("[Definition] err: " + JSON.stringify(err));
      next(new Error(err.error));
      return next();
    } else {
      return dbHelper.remove(req.doc, function(err, response) {
        if (err != null) {
          console.log("[Definition] err: " + JSON.stringify(err));
          return next(new Error(err.error));
        } else {
          return send_success();
        }
      });
    }
  });
};