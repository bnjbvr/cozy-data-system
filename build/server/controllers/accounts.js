// Generated by CoffeeScript 1.9.3
var Client, CryptoTools, User, apps, async, checkProxyHome, correctWitness, cryptoTools, db, encryption, errors, randomString, restartApp, user,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

db = require('../helpers/db_connect_helper').db_connect();

encryption = require('../lib/encryption');

async = require('async');

Client = require("request-json").JsonClient;

CryptoTools = require('../lib/crypto_tools');

User = require('../lib/user');

randomString = require('../lib/random').randomString;

checkProxyHome = require('../lib/token').checkProxyHome;

errors = require('../middlewares/errors');

cryptoTools = new CryptoTools();

user = new User();

correctWitness = "Encryption is correct";

apps = [];

restartApp = function(app, cb) {
  var homeClient;
  homeClient = new Client('http://localhost:9103');
  return homeClient.post("api/applications/" + app + "/stop", {}, function(err, res) {
    if (err != null) {
      console.log(err);
    }
    return db.view('application/byslug', {
      key: app
    }, function(err, appli) {
      var descriptor, url;
      if (appli[0] != null) {
        appli = appli[0].value;
        descriptor = {
          user: appli.slug,
          name: appli.slug,
          domain: "127.0.0.1",
          repository: {
            type: "git",
            url: appli.git
          },
          scripts: {
            start: "server.coffee"
          },
          password: appli.password
        };
        url = "api/applications/" + app + "/start";
        return homeClient.post(url, {
          start: descriptor
        }, function(err, res) {
          if (err != null) {
            console.log(err);
          }
          return cb();
        });
      } else {
        return cb();
      }
    });
  });
};

module.exports.addApp = function(app) {
  if (indexOf.call(apps, app) < 0) {
    return apps.push(app);
  }
};

module.exports.checkPermissions = function(req, res, next) {
  return checkProxyHome(req.header('authorization'), function(err, isAuthorized) {
    if (!isAuthorized) {
      return next(errors.notAuthorized());
    } else {
      return next();
    }
  });
};

module.exports.initializeKeys = function(req, res, next) {
  if (req.body.password == null) {
    return next(errors.http(400, "No password field in request's body"));
  }
  return user.getUser(function(err, user) {
    var isLog;
    if (err) {
      console.log("[initializeKeys] err: " + err);
      return next(err);
    }
    if ((user.salt != null) && (user.slaveKey != null)) {
      isLog = encryption.isLog();
      return encryption.logIn(req.body.password, user, function(err) {
        if (err) {
          return next(err);
        }
        if (isLog) {
          return res.send(200, {
            success: true
          });
        } else {
          return async.forEach(apps, function(app, cb) {
            return restartApp(app, cb);
          }, function(err) {
            if (err != null) {
              console.log(err);
            }
            return res.send(200, {
              success: true
            });
          });
        }
      });
    } else {
      return encryption.init(req.body.password, user, function(err) {
        if (err) {
          return next(err);
        }
        return res.send(200, {
          success: true
        });
      });
    }
  });
};

module.exports.updateKeys = function(req, res, next) {
  if (req.body.password == null) {
    return next(errors.http(400, "No password field in request's body"));
  }
  return user.getUser(function(err, user) {
    if (err) {
      console.log("[updateKeys] err: " + err);
      return next(err);
    } else {
      return encryption.update(req.body.password, user, function(err) {
        if (err) {
          return next(err);
        } else {
          return res.send(200, {
            success: true
          });
        }
      });
    }
  });
};

module.exports.resetKeys = function(req, res, next) {
  return user.getUser(function(err, user) {
    if (err) {
      console.log("[initializeKeys] err: " + err);
      return next(err);
    }
    return encryption.reset(user, function(err) {
      if (err) {
        return next(err);
      }
      return res.send(204, {
        success: true
      });
    });
  });
};

module.exports.deleteKeys = function(req, res) {
  return res.send(204, {
    sucess: true
  });
};
