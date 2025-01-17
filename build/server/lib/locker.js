// Generated by CoffeeScript 1.9.3
var DataLock,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

DataLock = (function() {
  function DataLock() {
    this.wrap = bind(this.wrap, this);
    this.locks = {};
  }

  DataLock.prototype.isLock = function(lock) {
    return this.locks[lock] != null;
  };

  DataLock.prototype.addLock = function(lock) {
    if (!this.isLock[lock]) {
      return this.locks[lock] = setTimeout((function(_this) {
        return function() {
          if (_this.isLock(lock)) {
            return delete _this.locks[lock];
          }
        };
      })(this), 2000);
    }
  };

  DataLock.prototype.removeLock = function(lock) {
    if (this.isLock(lock)) {
      clearTimeout(this.locks[lock]);
      return delete this.locks[lock];
    }
  };

  DataLock.prototype.runIfUnlock = function(lock, callback) {
    var handleCallback;
    handleCallback = (function(_this) {
      return function() {
        if (_this.isLock(lock)) {
          return setTimeout(handleCallback, 10);
        } else {
          return callback();
        }
      };
    })(this);
    return handleCallback();
  };

  DataLock.prototype.wrap = function(lock, fn) {
    return (function(_this) {
      return function() {
        var args, callback;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        callback = args.pop();
        return _this.runIfUnlock(lock, function() {
          var newCallback;
          _this.addLock(lock);
          args.push(newCallback = function() {
            _this.removeLock(lock);
            return callback.apply(null, arguments);
          });
          return fn.apply(_this, args);
        });
      };
    })(this);
  };

  return DataLock;

})();

module.exports = new DataLock();
