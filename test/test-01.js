/*global describe:true, it:true, before:true, after:true */

var
    chai       = require('chai'),
    assert     = chai.assert,
    expect     = chai.expect,
    should     = chai.should(),
    Lightcycle = require('../index'),
    Xxhash     = require('xxhash')
    ;


function MockResource(name)
{
    this._name = name;
}

MockResource.prototype.name = function()
{
    return this._name;
};

function makeFruitCycle()
{
    var cycle = new Lightcycle({ size: 10, replicas: 3 });
    var r1 = new MockResource('kiwi');
    var r2 = new MockResource('papaya');
    var r3 = new MockResource('litchi');

    cycle.add(r1, r1.name());
    cycle.add(r2, r2.name());
    cycle.add(r3, r3.name());

    return cycle;
}

describe('light-cycle', function()
{
    describe('constructor', function()
    {
        it('demands a positive integer size setting', function()
        {
            function shouldThrow()
            {
                var cycle = new Lightcycle({ size: -3 });
            }
            shouldThrow.should.throw(Error);
        });

        it('provides a default hash seed', function()
        {
            var cycle = new Lightcycle({ });
            assert.equal(cycle.seed, 0xcafed00d);
        });

        it('respects the hash seed setting', function()
        {
            var cycle = new Lightcycle({ seed: 0xdeadbeef });
            assert.equal(cycle.seed, 0xdeadbeef);
        });

        it('defaults size to 128', function()
        {
            var cycle = new Lightcycle({ });
            assert.equal(cycle.size, 128);
        });

        it('defaults replica count to 128', function()
        {
            var cycle = new Lightcycle({ });
            assert.equal(cycle.replicas, 128);
        });

        it('defaults replica count to size if size is passed in', function()
        {
            var cycle = new Lightcycle({ size: 1024 });
            assert.equal(cycle.replicas, 1024);
        });

        it('obeys both size & replica settings if provided', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            assert.equal(cycle.size, 10);
            assert.equal(cycle.replicas, 3);
        });
    });

    describe('add()', function()
    {
        it('demands both resource and id parameters', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var resource = { name: 'nameless' };

            function shouldThrow()
            {
                cycle.add(resource);
            }

            shouldThrow.should.throw(Error);
        });

        it('adds a resource to the cycle', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var resource = new MockResource('kiwi');

            cycle.add(resource, resource.name());

            var key1 = cycle.hashit(resource.name() + '0');
            var item = cycle.resources.match(key1);

            assert.ok(item, 'did not find expected entry in skiplist structure');
            assert.equal(item, resource, 'item stored was not the passed-in resource');
        });

        it('adds `replicas` count replicas to the cycle', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var resource = new MockResource('kiwi');

            cycle.add(resource, resource.name());

            var allEntries = cycle.resources.find();
            assert.equal(allEntries.length, 3);
        });

        it('adding twice has no ill effect', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var resource = new MockResource('kiwi');

            cycle.add(resource, resource.name());
            cycle.add(resource, resource.name());
            var allEntries = cycle.resources.find();
            assert.equal(allEntries.length, 3);
        });
    });

    describe('all()', function()
    {
        it('returns a hash of the resources & ids', function()
        {
            var cycle = makeFruitCycle();
            var entries = cycle.all();

            assert.equal(typeof entries, 'object');
            assert.equal(Object.keys(entries).length, 3);
            assert.ok(entries.kiwi);
            assert.ok(entries.papaya);
            assert.ok(entries.litchi);
        });
    });

    describe('remove()', function()
    {
        it('removes all replicas from the cycle', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var r1 = new MockResource('kiwi');
            var r2 = new MockResource('papaya');

            cycle.add(r1, r1.name());
            cycle.add(r2, r2.name());

            var allItems = cycle.resources.find();
            assert.equal(allItems.length, 6);

            cycle.remove(r1.name());

            var afterItems = cycle.resources.find();
            assert.equal(afterItems.length, 3);

            var key1 = cycle.hashit(r1.name() + '0');

            var found = cycle.resources.match(key1);
            assert.equal(found, null, 'resource was not actually removed!');
        });

        it('silently ignores items that are not in the cycle', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var r1 = new MockResource('kiwi');
            var r2 = new MockResource('papaya');
            var r3 = new MockResource('litchi');

            cycle.add(r1, r1.name());
            cycle.add(r2, r2.name());

            cycle.remove(r3.name());
        });
    });

    describe('locate()', function()
    {
        it('returns a single resource for a given id', function()
        {
            var cycle = makeFruitCycle();
            var loc = cycle.locate('pomegranate');
            assert.ok(loc);
        });

        it('handles the case of resources at the end of the circle by returning the first resource', function()
        {
            var cycle = new Lightcycle();

            var r1 = new MockResource('durian');
            var r2 = new MockResource('gooseberry');

            cycle.resources.insert('a', r1);
            cycle.resources.insert('b', r2);

            var key = cycle.hashit('pomegranate');
            var loc = cycle.locate('pomegranate');
            assert.equal(loc, r1);
        });

        it('handles ids that are buffers', function()
        {
            var cycle = makeFruitCycle();
            var loc = cycle.locate(new Buffer('mangosteen'));
            assert.ok(loc);
        });

        it('returns null when asked to locate an id when no resources are in the cycle', function()
        {
            var cycle = new Lightcycle();
            var location = cycle.locate('kumquat');
            assert.equal(location, null, 'the universe puzzles me');
        });

        it('gives the correct new location for items that used to live on the removed resource', function()
        {
            var cycle = makeFruitCycle();

            var originalLoc = cycle.locate('pomegranate');
            cycle.remove(originalLoc.name());

            var newLoc = cycle.locate('pomegranate');
            assert.ok(newLoc);
            assert(newLoc.name() !== originalLoc.name());
        });
    });

    describe('rebalance', function()
    {
        it('is triggered when adding makes the number of entries greater than the size', function()
        {
            var cycle = new Lightcycle({ size: 2, replicas: 2 });
            var r1 = new MockResource('durian');
            var r2 = new MockResource('gooseberry');
            var r3 = new MockResource('kumquat');

            cycle.add(r1, r1.name());
            cycle.add(r2, r2.name());
            cycle.add(r3, r3.name());

            assert.equal(cycle.size, 3 + Lightcycle.SIZE_PAD,
                    'expected size to be ' + Lightcycle.SIZE_PAD + ' + the number of entries');
            assert.equal(cycle.replicas, 3 + Lightcycle.REPLICAS_PAD,
                    'expected replica count to be ' + Lightcycle.REPLICAS_PAD + ' + the number of entries');
        });
    });
});
