Sessions logs tracker for Shopwise
===

## Installation instructions
	* Make sure to be in the right version of node (0.4.7 on Heroku Cedar).
	* A custom build pack is necessary on Heroku. To configure it, run 
    heroku config:add BUILDPACK_URL="https://github.com/shopwise/heroku-buildpack-nodejs.git"
[More infos on this issue here](http://stackoverflow.com/questions/8243527/use-git-dependencies-in-with-npm-and-node-on-heroku)

## Configuration instructions

Copyright and licensing information
---

Resources for Newcomers
---
* [Node modules](https://github.com/joyent/node/wiki/modules)
* [Express w/ Cluster becnhmark](http://openhood.com/ruby/node/heroku/sinatra/mongo_mapper/unicorn/express/mongoose/cluster/2011/06/14/benchmark-ruby-versus-node-js/)