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

    cycle.add(r1);
    cycle.add(r2);
    cycle.add(r3);

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

        it('respects the hash seed setting', function()
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

    describe('add', function()
    {
        it('demands that resources have a name function', function()
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

            cycle.add(resource);

            var key1 = cycle.hashit(resource.name() + '0');
            var item = cycle.resources.match(key1);

            assert.ok(item, 'did not find expected entry in skiplist structure');
            assert.equal(item, resource, 'item stored was not the passed-in resource');
        });

        it('adds `replicas` count replicas to the cycle', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var resource = new MockResource('kiwi');

            cycle.add(resource);

            var allEntries = cycle.resources.find();
            assert.equal(allEntries.length, 3);
        });

        it('handles hash collisions');



    });

    describe('remove', function()
    {
        it('removes all replicas from the cycle', function()
        {
            var cycle = new Lightcycle({ size: 10, replicas: 3 });
            var r1 = new MockResource('kiwi');
            var r2 = new MockResource('papaya');

            cycle.add(r1);
            cycle.add(r2);

            var allItems = cycle.resources.find();
            assert.equal(allItems.length, 6);

            cycle.remove(r1);

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

            cycle.add(r1);
            cycle.add(r2);

            cycle.remove(r3);
        });

    });

    describe('locate', function()
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
            var allResources = cycle.resources.find();

            var originalLoc = cycle.locate('pomegranate');
            cycle.remove(originalLoc);

            var newLoc = cycle.locate('pomegranate');
            assert.ok(newLoc);
            assert(newLoc.name() !== originalLoc.name());
        });
    });




});
