"use strict";
/*
 *	Backbone Collection that implements a promise-based queue
 *	in order to get responses for all its children
 *	
 *	Designed to be used with real-time graphs that request data on 
 *	intervals/scheduled. and when syncing up fetch calls is not 
 *	practical
 *
 *	requires https://github.com/rkatic/p
 *	author: Michael Truong <michael@cloudflare.com>
 *	date: April 28, 2014
 *
 *
 */
/* TODO List 
 *
 * set up fail condition catches for the queries
 * */

var _ = require('lodash'),
		$ = require('jquery'),
		Promise = require('promise'),
		Backbone = require('backbone'),
		Collection;


//Constants 
var SIZE = 400;
var STEP = 60 * 1000;
function bind(fn, context) {
	return function() {
		return fn.apply(context, arguments);
	};
}
Collection = Backbone.Collection.extend({
	getOption: function() {
		Backbone.Marionette.getOption.apply(this, arguments);
	},
	defaults: {
		size: SIZE, 
		step: STEP
	},
	initialize: function(attr, options) {
		this.options = _.defaults( options, this.defaults );
		//this.rate= options.rate;
		//this.url =this.formUrl(options);
		this.setupQueue();
	},
	/* 
	 * Sets up the queue object. resolves the first one stupidly. yes, is quite ghetto */
	setupQueue: function() {
		this.queue = new Promise(function(resolve, reject) {
			resolve(true);
		});
	},

	/* Add item to queue. queue gets resolved in FIFO order. returns queue (latest item in promise chain)
	 * @param : func (function) -> function to be run when queue resolves
	 * @return : queue, (promise)
	 * */
	enqueue: function(func) {
		this.queue = this.queue.then(_.bind(func, this));
		return this.queue;
	},


	// Super Simple, asks for the range from a query
	// request values for range and coloId. value can be in state or requested
	ask: function(query) {
		var func = function() {
			return this.request(query);
		};

		return this.enqueue(_.bind(func, this));
	},
	

	// duh
	askAll: function() {},

	state: {
		type: 'values',
		time: new Date()
	},


	// returns a promise
	// will resolve with values 
	//	either populated locally or via a fetch. 
	request: function(query) {
		var _this = this;
		var result;
		var state = this.state;
		query = query || {};
		var promise = new Promise(function(resolve, reject) {
			//right now single condition to test, maybe model doesnt exist yet
			// add test for time
			if ( state.type === query.type  ) {
				resolve(_this.toJSON());
			} else {
				// jquery promise (just to note)
				_this.query(query).then(function() {
					resolve( _this.toJSON() );
				}).fail(function() {
					resolve( [] );
				});
			}
		});
		return promise;
	},
	//wrapper around fetch on the model with start and end parameters
	//does bookkeeping as well
	//returns the jquery promise
	query: function(options) {
		var resp;
		// normalize options no op for now
		options = options || {};

		resp = this.getData( options );
		resp.then(bind(this.bookkeep, this));
		return resp;
	},
	// function that actually creates a request
	getData: function() {
		// we wanna run instance fetch if avail
		this.fetch.apply(this, arguments);
	},


	formUrl: function(options) {
		var targetType = options.targetType || "node"; 
		var target = this.target = options.target;
		var node = this.node = options.node;
		//called extraTags just so i remmember that node is actually a tag
		//and the first use case of this collection is for individual nodes
		//may need to be adjusted later
		var extraTags = this.subtitle = options.subtitle;

		var arg = encodeURIComponent(target + "/" + targetType + "="	+ node + "," + extraTags);

    return options.urlRoot + arg;
	},
	// no op in order to do any collection length cleaning/ etc
	bookkeep: function(data) {},
	// no op 
	purge: function() {},
	//},
});

module.exports = Collection;
