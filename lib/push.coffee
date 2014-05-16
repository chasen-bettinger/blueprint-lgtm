#
# Push Service Module
#

Q= require 'q'
E= require './error'
_= require 'lodash'

sdb= false
_log= false
io= false
INTERVAL= false

class Push
	constructor: (@kit)->
		kit.services.logger.log.info 'Initializing Push Service...'
		sdb=	kit.services.db.mysql
		_log=	kit.services.logger.log
		io= 	kit.services.io
		config= kit.services.config.push_service
		INTERVAL= config.poll_interval
		@pset_by_name= {}
		@count= false
		io.of('/push').on 'connection', @connect

	# Get the latest push count
	server_init: (kit)->
		f= 'Push:server_init'
		ctx= conn: null, log: _log

		Q.resolve()
		.then =>

			# Acquire DB Connection
			sdb.core.Acquire()
		.then (c) =>
			ctx.conn= c

			# Read the latest item_change
			sdb.pset_item_change.get_recent ctx, 1, @count
		.then (db_rows)=>
			if db_rows.length
				@count= db_rows[db_rows.length].count

			# Release DB conn / Start the timer
			sdb.core.release ctx.conn
			@timer= setTimeout @Poll, INTERVAL

	# Socket.io entry point for the push service
	connect: (socket)->
		f= 'Push:connect:'
		_log.debug f, 'client connected to push service'

		socket.emit 'connected' # Let the client know we have connected
		
		socket.on 'listen', (push_handle)-> # TODO: Prevent someone from listenting to a non-existent room
			_log.info f, 'client wants to listen to:', push_handle
			socket.join push_handle
		
		socket.on 'ignore', (push_handle)->
			_log.info f, 'clients wants to ignore:', push_handle

	# TODO: Consider holding on to a db connection for the @Poll function
	Poll: ()=>
		f= 'Push:Poll'
		ctx= conn: null, log: _log
		limit= 5
		fromId= @count

		Q.resolve()
		.then ()->

			# Acquire DB Connection
			sdb.core.Acquire()
		.then (c) =>
			ctx.conn= c

			# Read all pset_item_changes from last cursor
			sdb.pset_item_change.get_recent ctx, limit, fromId
		.then (db_rows)=>
			if db_rows.length
				@count= db_rows[db_rows.length - 1].count

			return false unless db_rows.length
			@ProcessChanges db_rows
		.then ()=>
			
			# Release DB Connection / Restart the timer
			sdb.core.release ctx.conn
			@timer= setTimeout @Poll, INTERVAL

		.fail (e)->
			_log.error f, e, e.stack

	ProcessChanges: (changes)->
		f= 'Push:ProcessChanges'
		data= {}

		Q.resolve()
		.then ()->

			# Sort changes by pset_id/pset_item_id
			for rec in changes
				continue if rec.verb is 'init'
				pid= rec.pset_id; iid= rec.pset_item_id
				data[pid]= {} unless data[pid]
				data[pid][iid]= {} unless data[pid][iid]
				data[pid][iid].count= rec.count
				data[pid][iid].changes= {} unless data[pid][iid].changes
				data[pid][iid].changes[rec.resource]= [] unless data[pid][iid].changes[rec.resource]

				rec.after= JSON.parse rec.after
				rec.prev= JSON.parse rec.prev
				data[pid][iid].changes[rec.resource].push _.pick rec, ['id','count','verb','prev','after']

			# Update all push rooms
			for pset, items of data
				for item, push_obj of items
					push_handle= "#{pset}/#{item}"
					_log.debug f, 'pushing to room:', push_handle
					io.of('/push').in(push_handle).emit 'update', push_obj
					
	GetPushSet: (ctx, clear_pset, nm)->
		f= 'Push:GetPushSet'
		_log= ctx.log
		_log.debug f, {clear_pset}, nm
		pset_id= false
		pset= @pset_by_name[nm] ? false
		return pset if pset and not clear_pset

		Q.resolve()
		.then ->

			# Acquire DB Connection
			sdb.core.Acquire()
		.then (c) ->
			ctx.conn= c if c isnt false

			# Start a Transaction
			sdb.core.StartTransaction(ctx)
		.then () ->

			# Grab the pset, or create one if it doesn't exist
			sdb.pset.read_or_insert ctx, nm
		.then (pset_rec)=>
			@pset_by_name[nm]= new PushSet pset_rec
			pset_id= pset_rec.id

			# if clear_pset is true remove all data related to pset id
			return false unless clear_pset
			@CleanPushSet ctx, pset_id
		.then (clean_result)->
			_log.debug f, 'got clean_result:', clean_result

			# Commit the transaction
			sdb.core.sqlQuery ctx, 'COMMIT'
		.then (db_result) =>

			# Release DB Connection
			sdb.core.release ctx.conn

			return @pset_by_name[nm]
			# return new PushSet rec or existing @pset_by_name[nm]

	CleanPushSet: (ctx, pset_id)->
		f= 'Push:CleanPushSet'
		_log= ctx.log
		_log.debug f, {pset_id}
		item_ids= []

		Q.resolve()
		.then ()->
			
			# Grab all pset_item id's related to this pset
			sdb.pset_item.get_by_psid ctx, pset_id
		.then (db_rows)->
			_log.debug f, 'got item ids:', db_rows
			item_ids.push row.id for row in db_rows

			# Remove all pset_item_changes in pset_item ids
			sdb.pset_item_change.delete_items ctx, item_ids
		.then (db_result)->
			_log.debug f, 'got delete changes:', db_result

			# Remove all pset_items related to this pset
			sdb.pset_item.delete_pset ctx, pset_id
		.then (db_result)->
			_log.debug f, 'got delete items:', db_result

			true
			
class PushSet
	constructor: (@pset)-> # pset: id= 10, name= 'Todo'
		@c_items= {} # Cached Push Set Items. indexed by 'xref'

	itemChange: (ctx, xref, verb, prev, after, resource, tbl_id, tbl)->
		f= "PushSet:#{@pset.name}:itemChange:"
		_log= ctx.log
		_log.debug f, { xref, verb, prev, after, tbl_id, tbl }
		pset_item_id= false

		Q.resolve()
		.then ()=>
			
			# Gran the pset_item's id
			@getItem ctx, xref
		.then (item_rec)=>
			_log.debug f, { item_rec }
			pset_item_id= item_rec.id

			# Lock the pset_item
			sdb.pset_item.lock ctx, pset_item_id
		.then (db_rows)=>
			throw new E.DbError 'PUSHSET:ITEMCHANGE:BAD_LOCK' unless db_rows.length is 1

			# Insert the change
			prev= JSON.stringify prev
			after= JSON.stringify after
			new_change= { pset_id: @pset.id, pset_item_id, verb, prev, after, resource, tbl_id, tbl }
			sdb.pset_item_change.create ctx, new_change
		.then (db_result)=>

			# Update pset_item count
			sdb.pset_item.update_by_id ctx, pset_item_id, count: db_result.insertId
		.then (db_result)=>
			throw new E.DbError 'PUSHSET:ITEMCHANGE:UPDATE_COUNT' unless db_result.affectedRows is 1

			null

	# Return item handle to endpoint on behalf of client for websock call
	# Assumption: The caller will start a transaction
	getItem: (ctx, xref)->
		f= "PushSet:#{@pset.name}:getItem:"
		_log= ctx.log
		_log.debug f, xref
		sxref= (String xref)
		handle= @c_items[sxref] ? false
		return handle if handle # Cached handle

		Q.resolve()
		.then ()=>

			# Look for existing pset handle in DB
			sdb.pset_item.get_psid_xref ctx, @pset.id, sxref
		.then (db_rows)=>
			_log.debug f, 'got pset_item:', db_rows
			if db_rows.length
				@c_items[sxref]= db_rows[0]
				return false

			# If handle doesn't exist. Call @_createItem
			@_createItem ctx, sxref
		.then (new_handle)=>
			_log.debug f, 'got new_handle:', new_handle
			if new_handle isnt false
				@c_items[sxref]= new_handle
		
			# Send back to client
			@c_items[sxref]
	
	getPushHandle: (ctx, xref)->
		f= "PushSet:#{@pset.name}:getPushHandle:"
		_log= ctx.log
		
		Q.resolve()
		.then ()=>
			
			@getItem ctx, xref
		.then (item_rec)=>

			"#{@pset.id}/#{item_rec.id}"

	_createItem: (ctx, xref)->
		f= "PushSet:#{@pset.name}:_createItem:"
		_log= ctx.log
		_log.debug f, xref
		pset_id= @pset.id
		handle= false

		Q.resolve()
		.then ()->
			
			# Insert in to pset_item table (@pset.id, xref)
			sdb.pset_item.create ctx, { pset_id, xref }
		.then (db_result)=>
			_log.debug f, 'got create pset item result:', db_result
			id= db_result.insertId

			# Re-Read the PSetItem
			sdb.pset_item.get_by_id ctx, id
		.then (db_rows)=>
			_log.debug f, 'got re-read:', db_rows
			throw new E.DbError 'PUSHSET:CREATE_ITEM:REREAD' if db_rows.length isnt 1
			handle= db_rows[0]

			# Insert 'init' change record for the new pset_item
			prev= {}; after= {}; resource= null; tbl_id= null; tbl= null
			@itemChange ctx, xref, 'init', prev, after, resource, tbl_id, tbl
		.then =>
			
			# return insertId
			handle

exports.Push= Push
