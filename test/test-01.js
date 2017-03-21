/*global describe:true, it:true, before:true, after:true */

var
	demand = require('must'),
	Lightcycle = require('../index')
	;

function MockResource(name)
{
	this._name = name;
}

MockResource.prototype.name = function name()
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

describe('light-cycle', () =>
{
	describe('constructor', () =>
	{
		it('demands a positive integer size setting', () =>
		{
			function mustThrow()
			{
				return new Lightcycle({ size: -3 });
			}
			mustThrow.must.throw(Error);
		});

		it('provides a default hash seed', () =>
		{
			var cycle = new Lightcycle({ });
			cycle.seed.must.equal(0xcafed00d);
		});

		it('respects the hash seed setting', () =>
		{
			var cycle = new Lightcycle({ seed: 0xdeadbeef });
			cycle.seed.must.equal(0xdeadbeef);
		});

		it('defaults size to 128', () =>
		{
			var cycle = new Lightcycle({ });
			cycle.size.must.equal(128);
		});

		it('defaults replica count to 128', () =>
		{
			var cycle = new Lightcycle({ });
			cycle.replicas.must.equal(128);
		});

		it('defaults replica count to size if size is passed in', () =>
		{
			var cycle = new Lightcycle({ size: 1024 });
			cycle.replicas.must.equal(1024);
		});

		it('obeys both size & replica settings if provided', () =>
		{
			var cycle = new Lightcycle({ size: 10, replicas: 3 });
			cycle.size.must.equal(10);
			cycle.replicas.must.equal(3);
		});
	});

	describe('add()', () =>
	{
		it('demands both resource and id parameters', () =>
		{
			var cycle = new Lightcycle({ size: 10, replicas: 3 });
			var resource = { name: 'nameless' };

			function mustThrow()
			{
				cycle.add(resource);
			}

			mustThrow.must.throw(Error);
		});

		it('adds a resource to the cycle', () =>
		{
			var cycle = new Lightcycle({ size: 10, replicas: 3 });
			var resource = new MockResource('kiwi');

			cycle.add(resource, resource.name());

			var key1 = cycle.hashit(resource.name() + '0');
			var item = cycle.resources.match(key1);

			item.must.exist();
			item.must.equal(resource);
		});

		it('adds `replicas` count replicas to the cycle', () =>
		{
			var cycle = new Lightcycle({ size: 10, replicas: 3 });
			var resource = new MockResource('kiwi');

			cycle.add(resource, resource.name());

			var allEntries = cycle.resources.find();
			allEntries.length.must.equal(3);
		});

		it('adding twice has no ill effect', () =>
		{
			var cycle = new Lightcycle({ size: 10, replicas: 3 });
			var resource = new MockResource('kiwi');

			cycle.add(resource, resource.name());
			cycle.add(resource, resource.name());
			var allEntries = cycle.resources.find();
			allEntries.length.must.equal(3);
		});
	});

	describe('all()', () =>
	{
		it('returns a hash of the resources & ids', () =>
		{
			var cycle = makeFruitCycle();
			var entries = cycle.all();

			entries.must.be.an.object();
			Object.keys(entries).length.must.equal(3);
			entries.kiwi.must.exist();
			entries.papaya.must.exist();
			entries.litchi.must.exist();
		});
	});

	describe('remove()', () =>
	{
		it('removes all replicas from the cycle', () =>
		{
			var cycle = new Lightcycle({ size: 10, replicas: 3 });
			var r1 = new MockResource('kiwi');
			var r2 = new MockResource('papaya');

			cycle.add(r1, r1.name());
			cycle.add(r2, r2.name());

			var allItems = cycle.resources.find();
			allItems.length.must.equal(6);

			cycle.remove(r1.name());

			var afterItems = cycle.resources.find();
			afterItems.length.must.equal(3);

			var key1 = cycle.hashit(r1.name() + '0');

			var found = cycle.resources.match(key1);
			demand(found).be.null();
		});

		it('silently ignores items that are not in the cycle', () =>
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

	describe('locate()', () =>
	{
		it('returns a single resource for a given id', () =>
		{
			var cycle = makeFruitCycle();
			var loc = cycle.locate('pomegranate');
			loc.must.exist();
		});

		it('handles the case of resources at the end of the circle by returning the first resource', () =>
		{
			var cycle = new Lightcycle();

			var r1 = new MockResource('durian');
			var r2 = new MockResource('gooseberry');

			cycle.resources.insert('a', r1);
			cycle.resources.insert('b', r2);

			var key = cycle.hashit('pomegranate');
			key.must.be.a.string();
			var loc = cycle.locate('pomegranate');
			loc.must.equal(r1);
		});

		it('handles ids that are buffers', () =>
		{
			var cycle = makeFruitCycle();
			var loc = cycle.locate(new Buffer('mangosteen'));
			loc.must.exist();
		});

		it('returns null when asked to locate an id when no resources are in the cycle', () =>
		{
			var cycle = new Lightcycle();
			var location = cycle.locate('kumquat');
			demand(location).be.null();
		});

		it('gives the correct new location for items that used to live on the removed resource', () =>
		{
			var cycle = makeFruitCycle();

			var originalLoc = cycle.locate('pomegranate');
			cycle.remove(originalLoc.name());

			var newLoc = cycle.locate('pomegranate');
			newLoc.must.be.truthy();
			newLoc.name().must.not.equal(originalLoc.name());
		});
	});

	describe('rebalance', () =>
	{
		it('is triggered when adding makes the number of entries greater than the size', () =>
		{
			var cycle = new Lightcycle({ size: 2, replicas: 2 });
			var r1 = new MockResource('durian');
			var r2 = new MockResource('gooseberry');
			var r3 = new MockResource('kumquat');

			cycle.add(r1, r1.name());
			cycle.add(r2, r2.name());
			cycle.add(r3, r3.name());

			cycle.size.must.equal(3 + Lightcycle.SIZE_PAD,
					'expected size to be ' + Lightcycle.SIZE_PAD + ' + the number of entries');
			cycle.replicas.must.equal(3 + Lightcycle.REPLICAS_PAD,
					'expected replica count to be ' + Lightcycle.REPLICAS_PAD + ' + the number of entries');
		});
	});
});
