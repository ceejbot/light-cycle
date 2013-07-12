Light-cycle
============

A consistent hash ringcycle for sharding your dataz, with 100% more blue glow and 50% less Wagner.

[![Build Status](https://secure.travis-ci.org/ceejbot/light-cycle.png)](http://travis-ci.org/ceejbot/light-cycle) [![Dependencies](https://david-dm.org/ceejbot/light-cycle.png)](https://david-dm.org/ceejbot/light-cycle) [![NPM version](https://badge.fury.io/js/light-cycle.png)](http://badge.fury.io/js/light-cycle)

## API

Reources are any object or identifier you wish to store. You can store an open database connection, a resource identifier, or something else. This module does not attempt to inspect or use the resource. It just implements a sharding scheme based on the resource's id.

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

## See Also

[Wikipedia](http://en.wikipedia.org/wiki/Consistent_hashing) is informative.

[This page is another good introduction](http://www.martinbroadhurst.com/Consistent-Hash-Ring.html) to consistent hash rings.

[So is this one.](http://www.tom-e-white.com/2007/11/consistent-hashing.html)

And there's always [the original paper](http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.147.1879).
