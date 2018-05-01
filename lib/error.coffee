# TODO Put back into DVblueprint when restify 7x is working

errors = require 'restify-errors'
my_errors= {}

nm= 'ServerControlledException'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 420
	my_errors[ nm]= (old_code, title, text, commands, goto)->
		throw new Error "lib/error::#{nm}: Missing 'goto' in function arguments" unless typeof goto is 'string'
		commands= commands.join '~' unless typeof commands is 'string'
		server_control= {title,text,commands,goto}
		message= 'See server_control'
		e= new ec {message}
		e.body= {error: 'ServerControl', message: 'See server_control', old_code, server_control}
		console.log 'myinfo', e.body
		e

nm= 'InvalidArg'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 400
	my_errors[ nm]= (message)->
		e= new ec message: message
		e.body= { error: nm, message}
		console.log 'myinfo', e.body
		e

nm= 'MissingArg'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 400
	my_errors[ nm]= (message)->
		e= new ec {message}
		e.body= { error: nm, message}
		console.log 'myinfo', e.body
		e

nm= 'NotFoundError'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 404
	my_errors[ nm]= (token, message)->
		e= new ec {message}
		e.body= { error: nm, message}
		console.log 'myinfo', e.body
		e

nm= 'OAuthError'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 401
	my_errors[ nm]= (code, error, message)->
		e= new ec message: 'Invalid OAuth Request'
		e.body= if message then {error, message} else {error}
		console.log 'myinfo', e.body
		e

nm= 'BasicAuthError'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 401
	my_errors[ nm]= (error, message)->
		e= new ec message: 'Invalid Basic Auth Request'
		e.body= body= if message then {error, message} else {error}
		console.log 'myinfo', e.body
		e

# token in the form 'MODULE:FUNCTION:CUSTOM_STRING'
nm= 'AccessDenied'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 403
	my_errors[ nm]= (token, message)->
		e= new ec {message}
		e.body= {error: token, message}
		console.log 'myinfo', e.body
		e

nm= 'DbError'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 500
	my_errors[ nm]= (token)->
		e= new ec message: token, restCode: 'DatabaseError'
		e.body= {error: token}
		console.log 'myinfo', e.body
		e

nm= 'ServerError'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 500
	my_errors[ nm]= (token, message)->
		e= new ec {message}
		e.body= {error: token, message}
		console.log 'myinfo', e.body
		e

nm= 'MongoDbError'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 500
	my_errors[ nm]= (message)->
		e= new ec {message}
		e.body= {error: 'mongo_error', message}
		console.log 'myinfo', e.body
		e

nm= 'TooManyConnectionsError'
do (nm)->
	ec= errors.makeConstructor nm, statusCode: 426
	my_errors[ nm]= (message)->
		e= new ec {message}
		e.body= {error: 'too_many_connections_error', message}
		console.log 'myinfo', e.body
		e

console.log my_errors
exports[nm]= val for nm,val of my_errors
