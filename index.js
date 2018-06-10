// This code base means freedom.

'use strict';

const
	assert   = require('assert'),
	Skiplist = require('skiplist'),
	Xxhash   = require('xxhashjs').h64
	;

class Lightcycle
{
	constructor(settings)
	{
		settings = settings || {};

		this.seed = settings.seed || 0xcafed00d;
		this.size = Math.round(settings.size) || 128;
		assert(this.size > 0, 'you must pass in a positive integer for size');

		this.replicas = settings.replicas || this.size;
		this.resources = new Skiplist(this.size * this.replicas + 16); // a little padding
		this.cache = {};
		this.entries = {};
	}

	add(resource, id)
	{
		assert(resource);
		assert(id && typeof id === 'string');
		if (!this.cache[id])
			this.cache[id] = [];
		let key;

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
	}

	remove(id)
	{
		assert(id && typeof id === 'string');
		if (!Array.isArray(this.cache[id]))
			return;

		for (var i = 0; i < this.replicas; i++)
		{
			const key = this.cache[id][i];
			this.resources.remove(key);
		}

		delete this.entries[id];
	}

	locate(id)
	{
		const key = this.hashit(id);
		let results = this.resources.findWithCount(key, 1);

		if (results.length === 0)
			results = this.resources.findWithCount(null, 1);

		if (results.length > 0)
			return results[0][1];

		return null;
	}

	hashit(input)
	{
		if (!Buffer.isBuffer(input))
			input = new Buffer.from(input);

		const hash = Xxhash(this.seed);
		hash.update(input);
		let result = hash.digest().toString(16);
		while (result.length < 8) result = '0' + result;

		return result;
	}

	all()
	{
		return this.entries;
	}

	rebalance()
	{
		const ids = Object.keys(this.entries);

		this.size = ids.length + Lightcycle.SIZE_PAD;
		this.replicas =  ids.length + Lightcycle.REPLICAS_PAD;
		this.resources = new Skiplist(this.size * this.replicas);

		for (var i = 0; i < ids.length; i++)
			this.add(this.entries[ids[i]], ids[i]);
	}
}

// Constants used when rebalancing to leave space.
Lightcycle.SIZE_PAD     = 16;
Lightcycle.REPLICAS_PAD = 8;

module.exports = Lightcycle;
