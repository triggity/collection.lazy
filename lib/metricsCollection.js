"use strict";
/* 
 * lazy collection for metrics, has crossfilter integration to do some of the dirty work 
 * we dont setup any integrations between adding/fetching and crossfilter. that needs to be done
 */

var _ = require("lodash"),
		LazyCollection = require("../index"),
		Backbone = require("backbone"),
		Crossfilter = require("crossfilter"),
		Promise = require("promise");

module.exports = LazyCollection.extend({
	// storage of dimensions  being filtered/used
	// there is a performance hit to creating too many dimensions 
	// so we will want to keep track of them instaed of creating new ones as necessary
	dimensions : {},
	// needs either a crossfilter instance or instance data 
	initialize: function( models, options ) {
		this.setupCrossfilter.apply( this, arguments );
		this.options = _.extend( options, this.defaults );
		this.lastRequestData = {}; 
		LazyCollection.prototype.initialize.apply(this, arguments);
	},
	// sets 
	setupCrossfilter: function(  models, options ) {
		var crossfilter = this.getOption("crossfilter"),
				dimension = this.getOption("dimension"),
				data;
		
		// assign new crossfilter as necessary
		crossfilter = this.crossfilter = crossfilter || Crossfilter();
		var dimensions = this.setupDimensions();
		if ( models ) {
			data = _.map(models, function( model ) {
				// shortcut (but possibly not a ccurate, because i dont wanna import backbone to do this test)
				return _.isPlainObject(model) ? model : model.toJSON();
			});
			crossfilter.add( data );
		}
	},
	// checks for dimensions on options and instance. dimensions can be object or function
	// instantiates given dimensions and attaches to this.dimensions
	setupDimensions: function( ) {
		var key = "dimensions",
				crossfilter = this.crossfilter,
				options = this.options;
		// get dimensions object from either instantiation or class
		var dummy = _.result( options, key ) || _.result( this, key );
		// iterate over , and populate with instances of dimensions as necssary
		_.each( dummy, function( dimension, key ) {
			// if you are instantiating already filled dimensions, then this should be an object
			// otherwise, it can be empty/false/true
			if ( !_.isObject( dimension ) )	{
				dimension  = crossfilter.dimension( function( d ) {
					//TODO needs a default
					return d[key];
				});
			}
			this.dimensions[key] = dimension;
		}, this);
		
		return this.dimensions;
	},

	/*
	 * overring request so we can look on the last request first. the idea is that look at the last request first (stored) , then bisecting the array ( more expensive, but doesnt do an ajax) then finally requesting data (requires an http call , ergo slow)
	 * for use with cubism
	 */
	//request: function(query) {},
	/* 
	 * updates the this.lastRequestData object. this way awe have a short cache of what we need
	 * for use with cubism
	 */
	updateLastRequestData: function( data ) {
		
	},
	// poorly named, this can retrieve or add
	// add a dimension based on the given key, key can also be a function
	// can add just a key and that key will be returned off the object
	// or add a func as well and that func will be evaluated instead
	addDimension: function ( key, func ) {
		var dimensions = this.dimensions,
				crossfilter = this.crossfilter;
		if ( dimensions[key] ) {
			return dimensions[key];
		}
		func = func && _.isFunction( func ) ? func : function ( d ) { return d[key]; };	
		var dimension = this.dimensions[ key ] =  crossfilter.dimension( func );
		return dimension;
	},
	getData: function( data ) {
		var url= _.result( this, "url" );
		var crossfilter = this.crossfilter;
		var mapKey = this.getOption("mapKey");
		var categorydimension = this.addDimension("category");
		// still need to work on the query prameter stuff
		var req = Backbone.$.ajax( { url: url, dataType: "json" })
		
		return req.then(_.bind(function (data) {
			var parsedData = this.parse.apply(this, arguments);
			crossfilter.add(parsedData)	
			categorydimension.filter(mapKey)
			this.reset(parsedData);
			return parsedData;
		}, this))
	},
	// move the sliding window, we can worry about actually deleting data later
	bookkeep: function( data ) {
		var size = this.getOption("size"), 
				crossfilter = this.crossfilter,
				dimensions = this.dimensions,
				dateDimension;

		// add or retrieve dimension
		dateDimension = this.addDimension( "date" );

		//dateDimension.filterRange();

	},
	defaults: _.defaults({
		crossfilter: 	'foo'
	}, LazyCollection.prototype.defaults),

});
