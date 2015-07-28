// This code base means freedom.

var
	assert   = require('assert'),
	Skiplist = require('skiplist'),
	Xxhash   = require('xxhashjs')
;

var Lightcycle = module.exports = function Lightcycle(settings)
{
	settings = settings || {};

	this.seed = settings.seed || 0xcafed00d;
	this.size = Math.round(settings.size) || 128;
	assert(this.size > 0, 'you must pass in a positive integer for size');

	this.replicas = settings.replicas || this.size;
	this.resources = new Skiplist(this.size * this.replicas + 16); // a little padding
	this.cache = {};
	this.entries = {};
};

Lightcycle.prototype.seed      = 0xcafed00d;
Lightcycle.prototype.size      = 128;
Lightcycle.prototype.replicas  = 128;
Lightcycle.prototype.resources = null;
Lightcycle.prototype.cache     = null;
Lightcycle.prototype.entries   = null;

// Constants used when rebalancing to leave space.
Lightcycle.SIZE_PAD     = 16;
Lightcycle.REPLICAS_PAD = 8;

Lightcycle.prototype.add = function(resource, id)
{
	assert(resource);
	assert(id && typeof id === 'string');
	if (!this.cache[id])
		this.cache[id] = [];
	var key;

	for (var i = 0; i < this.replicas; i++)
	{
		if (this.cache[id][i])
			key = this.cache[id][i];
		else
		{
			key = this.hashit(id + String(i));
			this.cache[id][i] = key;
		}
		this.resources.insert(key, resource);
	}

	this.entries[id] = resource;
	if (Object.keys(this.entries).length > this.size)
		this.rebalance();
};

Lightcycle.prototype.remove = function(id)
{
	assert(id && typeof id === 'string');
	if (!Array.isArray(this.cache[id]))
		return;
	var key;

	for (var i = 0; i < this.replicas; i++)
	{
		key = this.cache[id][i];
		this.resources.remove(key);
	}

	delete this.entries[id];
};

Lightcycle.prototype.locate = function(id)
{
	var key = this.hashit(id);
	var results = this.resources.findWithCount(key, 1);

	if (results.length === 0)
		results = this.resources.findWithCount(null, 1);

	if (results.length)
		return results[0][1];

	return null;
};

Lightcycle.prototype.hashit = function(input)
{
	if (!Buffer.isBuffer(input))
		input = new Buffer(input);

	var hash = new Xxhash(this.seed);
	hash.update(input);
	var result = hash.digest().toString(16);
	while (result.length < 8) result = '0' + result;

	return result;
};

Lightcycle.prototype.all = function()
{
	return this.entries;
};

Lightcycle.prototype.rebalance = function()
{
	var ids = Object.keys(this.entries);

	this.size = ids.length + Lightcycle.SIZE_PAD;
	this.replicas =  ids.length + Lightcycle.REPLICAS_PAD;
	this.resources = new Skiplist(this.size * this.replicas);

	for (var i = 0; i < ids.length; i++)
		this.add(this.entries[ids[i]], ids[i]);
};
