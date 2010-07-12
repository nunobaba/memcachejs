var sys = require('sys');

var extend = function (o1, o2) {
  for (var k in o2) o1[k] = o2[k];
  return o1;
};

Memcache = function(host, port){
	this.host = host ? host : 'localhost';
	this.port = port ? port : 11211;
};

Memcache.Connection = require('./connection');
Memcache.Pool = require('./pool');

Memcache.pooling = true;

Memcache.prototype.getConnection = function(){
	if (!this.connection) {
		this.connection = new Memcache.Connection(this.host, this.port);
	}
	return this.connection;
	return this.getPool().getConnection();
};

Memcache.prototype.processRequest = function(request){
	if (Memcache.pooling) {
		return this.getPool().processRequest(request);
	} else {
		return this.getConnection().processRequest(request);
	}
};

Memcache.prototype.getPool = function(){
	if (!this.pool) {
		this.pool = new Memcache.Pool({
			host:this.host,
			port:this.port
		});
	}
	return this.pool;
};

/**
 * Get and group multiple values, apply callback function on parsed Json
 * @param {cue: Object} contains key or keys, act and err functions
 */
Memcache.prototype.get = function (cue) {
  var _ = this;
  cue.keys = (cue.key) ? [cue.key] : cue.keys;
  cue.keys.forEach(function (k) {
  	var request = {command:'get ' + k};
    request.callback = function (it) { 
      if (it.data) cue.act(JSON.parse(it.data));
      else if (cue.err) cue.err(k, it);
    };
	  _.processRequest(request);
  }); 
};

/**
 * Find multiple keys at once, apply callback function eventually
 * @param {cue: Object} contains key or keys
 * @param {options: Object}
 */
Memcache.prototype.set = function (payload, options) {
  options = extend({expires: 0, flags: 0}, options);
  for (var k in payload) {
    var v = JSON.stringify(payload[k]);
    if (v) {
      var request = { command: ['set', k, options.flags, options.expires, v.length].join(' ')
                    , data: v
                    };
      if (options.callback) request.callback = options.callback;
      this.processRequest(request);
    };
  };
};

Memcache.prototype.add = function(key, value, options){
  options = extend({expires: 0, flags: 0}, options);
	var request = {
		command:'add ' + key + ' ' + options.flags + ' ' + options.expires + ' ' + value.length,
		data:value
	};
	if (options.callback) request.callback = options.callback;
	this.processRequest(request);
};

Memcache.prototype.append = function(key, value, options){
	var request = {
		command:'append ' + key + ' 0 0 ' + value.length,
		data:value
	};
	if (options.callback) request.callback = options.callback;
	this.processRequest(request);
};

Memcache.prototype.prepend = function(key, value, options){
	var request = {
		command:'prepend ' + key + ' 0 0 ' + value.length,
		data:value
	};
	if (options.callback) request.callback = options.callback;
	this.processRequest(request);
};

Memcache.prototype.del = function(key, options){
	var request = {
		command:'delete ' + key
	};
	if (options.callback) request.callback = options.callback;
	this.processRequest(request);
};

Memcache.prototype.shutdown = function(){
	if (this.connection) this.connection.close();
};

module.exports = Memcache;

