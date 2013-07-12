Light-cycle
============

A consistent hash ringcycle for sharding your dataz, with 100% more blue glow.


## API

## Notes


- storage agnostic
- storage units must by an object that exposes a `name()` function
- name is used to calculate the hash so it has to be unique
- performs best if you know how many storage units you expect
- `locate()` takes the id of your data & returns a storage unit synchronously (probably)



## See Also

[Wikipedia](http://en.wikipedia.org/wiki/Consistent_hashing) is informative.

[A good introduction](http://www.martinbroadhurst.com/Consistent-Hash-Ring.html)

http://www.tom-e-white.com/2007/11/consistent-hashing.html

[The original paper](http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.147.1879)
