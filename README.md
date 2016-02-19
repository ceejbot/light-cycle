Light-cycle
============

A consistent hashringcycle for sharding your dataz, with 100% more blue glow and 50% less Wagner.

[![npm](http://img.shields.io/npm/v/light-cycle.svg?style=flat)](https://www.npmjs.org/package/light-cycle) [![Tests](http://img.shields.io/travis/ceejbot/light-cycle.svg?style=flat)](http://travis-ci.org/ceejbot/light-cycle) [![Coverage Status](https://img.shields.io/coveralls/ceejbot/light-cycle.svg?style=flat)](https://coveralls.io/github/ceejbot/light-cycle?branch=master)    [![Dependencies](https://david-dm.org/ceejbot/light-cycle.svg)](https://david-dm.org/ceejbot/light-cycle)

## Usage

To install:

`npm install light-cycle`

Sample usage:

```javascript
var Lightcycle = require('light-cycle');

var cycle = new Lightcycle(
{
    seed: 0xdeadbeef,
    size: 50
});

// Create entries in the hash ring for each of our redis caches, using redis:host:port as
// their unique ids in the ring.
for (var i = 0; i < myRedisInstances.length; i++)
{
    var redisShard = myRedisInstances[i];
    cycle.add(redisShard, ['redis', redisShard.host, redisShard.port].join(':'));
}

// Now we have something to cache in one of our shards.
var dataToStore =
{
    id: '3421',
    data: 'This is very important data that must be cached in our redises.',
    timestamp: Date.now()
};

// Where shall we store this?
var whichRedis = cycle.locate(dataToStore.id);
whichRedis.hmset(dataToStore.id, dataToStore, callback);
```

## API

Resources are any object or identifier you wish to store. You can store an open database connection, a resource identifier, or something else. This module does not attempt to inspect or use the resource. It just implements a sharding scheme based on the resource's id.

### new Lightcycle(settings)

Construct a cycle.

Settings may include the following fields:

`seed`: seed for the hash function; must be a positive integer; defaults to `0xcafed00d`  
`size`: expected number of resources you'll be storing; defaults to 128  
`replicas`: number of replicas to store in the cycle for each resource; defaults to `size`

If you want your light-cycle to behave identically to other invocations, pass the same hash seed.

### cycle.add(resource, id)

Add a resource to the cycle. This will create *replicas* entries in the underlying data structure. The `id` parameter must be a string.

### cycle.remove(id)

Remove the resource with the given id from the cycle. This removes all replica entries.

### cycle.locate(id)

Given the id of some data you wish to locate, return the resource where it should reside. `id` may be a string or a buffer.

### cycle.rebalance()

Resize the cycle to accomodate the current number of entries plus some padding.

This is called automatically if the number of entries added exceeds the size option passed in at configuration. Rebalance is not automatically called when resources are removed.

Hash keys are cached, so rebalancing shouldn't be too slow, but to avoid thrash rebalancing pads out the size and the replica count by `Lightcycle.SIZE_PAD` and `Lightcycle.REPLICAS_PAD` respectively. For best results, choose a size setting at start that can accomodate the number of resources you intend to use.

## See Also

[Wikipedia](http://en.wikipedia.org/wiki/Consistent_hashing) is informative.

[This page is another good introduction](http://www.martinbroadhurst.com/Consistent-Hash-Ring.html) to consistent hash rings.

[So is this one.](http://www.tom-e-white.com/2007/11/consistent-hashing.html)

And there's always [the original paper](http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.147.1879).
