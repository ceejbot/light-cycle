// This code base means freedom.

var
    assert   = require('assert'),
    Skiplist = require('skiplist'),
    Xxhash   = require('xxhash');


var Lightcycle = module.exports = function Lightcycle(settings)
{
    settings = settings || {};

    this.seed = settings.seed || 0xcafed00d;
    this.size = Math.round(settings.size) || 128;
    assert(this.size > 0, 'you must pass in a positive integer for size');

    this.replicas = settings.replicas || (settings.size > 0 ? settings.size : 128);
    this.resources = new Skiplist(this.size * this.replicas);
    this.cache = {};
    this.entries = 0;
};

Lightcycle.SIZE_PAD = 32;
Lightcycle.REPLICAS_PAD = 16;

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

    this.entries++;
    if (this.entries >= this.size)
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

    this.entries--;
};

Lightcycle.prototype.locate = function(id)
{
    var key = this.hashit(id);
    var results = this.resources.findWithCount(key, 1);

    if (results.length === 0)
    {
        results = this.resources.findWithCount(null, 1);
    }

    if (results.length)
        return results[0][1]

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

Lightcycle.prototype.rebalance = function()
{
    var resources = this.resources.find();
    this.size = resources.length + Lightcycle.SIZE_PAD;
    this.replicas = resources.length + Lightcycle.REPLICAS_PAD;
    this.resources = new Skiplist(this.size * this.replicas);

    for (var i = 0; i < resources.length; i++)
        this.add(resources[i][1], resources[i][0]);
};

