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
};

Lightcycle.prototype.add = function(resource, id)
{
    assert(resource);
    assert(id && typeof id === 'string');

    for (var i = 0; i < this.replicas; i++)
    {
        var key = this.hashit(id + String(i));
        this.resources.insert(key, resource);
    }
};

Lightcycle.prototype.remove = function(id)
{
    assert(id && typeof id === 'string');

    for (var i = 0; i < this.replicas; i++)
    {
        this.resources.remove(this.hashit(id + String(i)));
    }
};

Lightcycle.prototype.locate = function(id)
{
    var key = this.hashit(id);
    var results = this.resources.find(key);

    if (results.length === 0)
    {
        results = this.resources.find();
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
    return  hash.digest().toString(16);
};
