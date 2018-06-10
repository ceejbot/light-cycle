/*global describe:true, it:true, before:true, after:true */

'use strict';

const
	demand = require('must'),
	Lightcycle = require('./index.js')
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
	const cycle = new Lightcycle({ size: 10, replicas: 3 });
	const r1 = new MockResource('kiwi');
	const r2 = new MockResource('papaya');
	const r3 = new MockResource('litchi');

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
			const cycle = new Lightcycle({ });
			cycle.seed.must.equal(0xcafed00d);
		});

		it('respects the hash seed setting', () =>
		{
			const cycle = new Lightcycle({ seed: 0xdeadbeef });
			cycle.seed.must.equal(0xdeadbeef);
		});

		it('defaults size to 128', () =>
		{
			const cycle = new Lightcycle({ });
			cycle.size.must.equal(128);
		});

		it('defaults replica count to 128', () =>
		{
			const cycle = new Lightcycle({ });
			cycle.replicas.must.equal(128);
		});

		it('defaults replica count to size if size is passed in', () =>
		{
			const cycle = new Lightcycle({ size: 1024 });
			cycle.replicas.must.equal(1024);
		});

		it('obeys both size & replica settings if provided', () =>
		{
			const cycle = new Lightcycle({ size: 10, replicas: 3 });
			cycle.size.must.equal(10);
			cycle.replicas.must.equal(3);
		});
	});

	describe('add()', () =>
	{
		it('demands both resource and id parameters', () =>
		{
			const cycle = new Lightcycle({ size: 10, replicas: 3 });
			const resource = { name: 'nameless' };

			function mustThrow()
			{
				cycle.add(resource);
			}

			mustThrow.must.throw(Error);
		});

		it('adds a resource to the cycle', () =>
		{
			const cycle = new Lightcycle({ size: 10, replicas: 3 });
			const resource = new MockResource('kiwi');

			cycle.add(resource, resource.name());

			const key1 = cycle.hashit(resource.name() + '0');
			const item = cycle.resources.match(key1);

			item.must.exist();
			item.must.equal(resource);
		});

		it('adds `replicas` count replicas to the cycle', () =>
		{
			const cycle = new Lightcycle({ size: 10, replicas: 3 });
			const resource = new MockResource('kiwi');

			cycle.add(resource, resource.name());

			const allEntries = cycle.resources.find();
			allEntries.length.must.equal(3);
		});

		it('adding twice has no ill effect', () =>
		{
			const cycle = new Lightcycle({ size: 10, replicas: 3 });
			const resource = new MockResource('kiwi');

			cycle.add(resource, resource.name());
			cycle.add(resource, resource.name());
			const allEntries = cycle.resources.find();
			allEntries.length.must.equal(3);
		});
	});

	describe('all()', () =>
	{
		it('returns a hash of the resources & ids', () =>
		{
			const cycle = makeFruitCycle();
			const entries = cycle.all();

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
			const cycle = new Lightcycle({ size: 10, replicas: 3 });
			const r1 = new MockResource('kiwi');
			const r2 = new MockResource('papaya');

			cycle.add(r1, r1.name());
			cycle.add(r2, r2.name());

			const allItems = cycle.resources.find();
			allItems.length.must.equal(6);

			cycle.remove(r1.name());

			const afterItems = cycle.resources.find();
			afterItems.length.must.equal(3);

			const key1 = cycle.hashit(r1.name() + '0');

			const found = cycle.resources.match(key1);
			demand(found).be.null();
		});

		it('silently ignores items that are not in the cycle', () =>
		{
			const cycle = new Lightcycle({ size: 10, replicas: 3 });
			const r1 = new MockResource('kiwi');
			const r2 = new MockResource('papaya');
			const r3 = new MockResource('litchi');

			cycle.add(r1, r1.name());
			cycle.add(r2, r2.name());

			cycle.remove(r3.name());
		});
	});

	describe('locate()', () =>
	{
		it('returns a single resource for a given id', () =>
		{
			const cycle = makeFruitCycle();
			const loc = cycle.locate('pomegranate');
			loc.must.exist();
		});

		it('handles the case of resources at the end of the circle by returning the first resource', () =>
		{
			const cycle = new Lightcycle();

			const r1 = new MockResource('durian');
			const r2 = new MockResource('gooseberry');

			cycle.resources.insert('a', r1);
			cycle.resources.insert('b', r2);

			const key = cycle.hashit('pomegranate');
			key.must.be.a.string();
			const loc = cycle.locate('pomegranate');
			loc.must.equal(r1);
		});

		it('handles ids that are buffers', () =>
		{
			const cycle = makeFruitCycle();
			const loc = cycle.locate(Buffer.from('mangosteen'));
			loc.must.exist();
		});

		it('returns null when asked to locate an id when no resources are in the cycle', () =>
		{
			const cycle = new Lightcycle();
			const location = cycle.locate('kumquat');
			demand(location).be.null();
		});

		it('gives the correct new location for items that used to live on the removed resource', () =>
		{
			const cycle = makeFruitCycle();

			const originalLoc = cycle.locate('pomegranate');
			cycle.remove(originalLoc.name());

			const newLoc = cycle.locate('pomegranate');
			newLoc.must.be.truthy();
			newLoc.name().must.not.equal(originalLoc.name());
		});
	});

	describe('rebalance', () =>
	{
		it('is triggered when adding makes the number of entries greater than the size', () =>
		{
			const cycle = new Lightcycle({ size: 2, replicas: 2 });
			const r1 = new MockResource('durian');
			const r2 = new MockResource('gooseberry');
			const r3 = new MockResource('kumquat');

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
