// Generated by CoffeeScript 1.6.3
var Account, Client, CryptoTools, User, accountManager, checkDocType, checkProxyHome, correctWitness, cryptoTools, db, encryptPassword, encryption, initPassword, randomString, toString, user,
  _this = this;

load('application');

Client = require("request-json").JsonClient;

Account = require('./lib/account');

CryptoTools = require('./lib/crypto_tools');

User = require('./lib/user');

randomString = require('./lib/random').randomString;

accountManager = new Account();

checkProxyHome = require('./lib/token').checkProxyHome;

checkDocType = require('./lib/token').checkDocType;

cryptoTools = new CryptoTools();

user = new User();

encryption = require('./lib/encryption');

initPassword = require('./lib/init').initPassword;

db = require('./helpers/db_connect_helper').db_connect();

correctWitness = "Encryption is correct";

before('permission_keys', function() {
  var _this = this;
  return checkProxyHome(req.header('authorization'), function(err, isAuthorized) {
    if (!isAuthorized) {
      err = new Error("Application is not authorized");
      return send({
        error: err
      }, 403);
    } else {
      return next();
    }
  });
}, {
  only: ['initializeKeys', 'updateKeys', 'deleteKeys', 'resetKeys']
});

before('permission', function() {
  var auth,
    _this = this;
  auth = req.header('authorization');
  return checkDocType(auth, "Account", function(err, appName, isAuthorized) {
    if (!appName) {
      err = new Error("Application is not authenticated");
      return send({
        error: err
      }, 401);
    } else if (!isAuthorized) {
      err = new Error("Application is not authorized");
      return send({
        error: err
      }, 403);
    } else {
      compound.app.feed.publish('usage.application', appName);
      return next();
    }
  });
}, {
  only: ['createAccount', 'findAccount', 'existAccount', 'updateAccount', 'upsertAccount', 'deleteAccount', 'deleteAllAccounts', 'mergeAccount']
});

before('get doc with witness', function() {
  var _this = this;
  return db.get(params.id, function(err, doc) {
    var slaveKey, witness;
    if (err && err.error === "not_found") {
      return send(404);
    } else if (err) {
      console.log("[Get doc] err: " + err);
      return send(500);
    } else if (doc != null) {
      if ((app.crypto != null) && app.crypto.masterKey && app.crypto.slaveKey) {
        slaveKey = cryptoTools.decrypt(app.crypto.masterKey, app.crypto.slaveKey);
        if (doc.witness != null) {
          try {
            witness = cryptoTools.decrypt(slaveKey, doc.witness);
            if (witness === correctWitness) {
              _this.doc = doc;
              return next();
            } else {
              console.log("[Get doc] err: data are corrupted");
              return send(402);
            }
          } catch (_error) {
            err = _error;
            console.log("[Get doc] err: data are corrupted");
            return send(402);
          }
        } else {
          witness = cryptoTools.encrypt(slaveKey, correctWitness);
          return db.merge(params.id, {
            witness: witness
          }, function(err, res) {
            if (err) {
              console.log("[Merge] err: " + err);
              return send(500);
            } else {
              _this.doc = doc;
              return next();
            }
          });
        }
      } else {
        console.log("err : master key and slave key don't exist");
        return send(500);
      }
    } else {
      return send(404);
    }
  });
}, {
  only: ['findAccount', 'updateAccount', 'mergeAccount']
});

before('get doc', function() {
  var _this = this;
  return db.get(params.id, function(err, doc) {
    if (err && err.error === "not_found") {
      return send(404);
    } else if (err) {
      console.log("[Get doc] err: " + err);
      return send(500);
    } else if (doc != null) {
      _this.doc = doc;
      return next();
    } else {
      return send(404);
    }
  });
}, {
  only: ['deleteAccount']
});

encryptPassword = function(body, callback) {
  var app, newPwd, slaveKey, witness;
  app = compound.app;
  if (body.password) {
    if ((app.crypto != null) && app.crypto.masterKey && app.crypto.slaveKey) {
      slaveKey = cryptoTools.decrypt(app.crypto.masterKey, app.crypto.slaveKey);
      newPwd = cryptoTools.encrypt(slaveKey, body.password);
      body.password = newPwd;
      body.docType = "Account";
      witness = cryptoTools.encrypt(slaveKey, correctWitness);
      body.witness = witness;
      return callback(true);
    } else {
      return callback(false, new Error("master key and slave key don't exist"));
    }
  } else {
    return callback(false);
  }
};

toString = function() {
  return "[Account for model: " + this.id + "]";
};

action('initializeKeys', function() {
  return user.getUser(function(err, user) {
    if (err) {
      console.log("[initializeKeys] err: " + err);
      return send(500);
    } else {
      if ((user.salt != null) && (user.slaveKey != null)) {
        return encryption.logIn(body.password, user, function(err) {
          var _this = this;
          if (err != null) {
            send({
              error: err
            }, 500);
          }
          return initPassword(function() {
            return send({
              success: true
            });
          });
        });
      } else {
        return encryption.init(body.password, user, function(err) {
          if (err) {
            return send({
              error: err
            }, 500);
          } else {
            return send({
              success: true
            });
          }
        });
      }
    }
  });
});

action('updateKeys', function() {
  if (body.password != null) {
    return user.getUser(function(err, user) {
      if (err) {
        console.log("[updateKeys] err: " + err);
        return send(500);
      } else {
        return encryption.update(body.password, user, function(err) {
          if ((err != null) && err === 400) {
            return send(400);
          } else if (err) {
            return send({
              error: err
            }, 500);
          } else {
            return send({
              success: true
            });
          }
        });
      }
    });
  } else {
    return send(500);
  }
});

action('resetKeys', function() {
  return user.getUser(function(err, user) {
    if (err) {
      console.log("[initializeKeys] err: " + err);
      return send(500);
    } else {
      return encryption.reset(user, function(err) {
        if (err) {
          return send({
            error: err
          }, 500);
        } else {
          return send({
            success: true
          }, 204);
        }
      });
    }
  });
});

action('deleteKeys', function() {
  return encryption.logOut(function(err) {
    if (err) {
      return send({
        error: err
      }, 500);
    } else {
      return send({
        sucess: true
      }, 204);
    }
  });
});
