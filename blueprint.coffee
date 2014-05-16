#
#	Blueprint - Template Node Server
#
#	Written for DV-Mobile by Jamie Hollowell. All rights reserved.
#

# Node Modules
Q= 			require 'q'
restify= 	require 'restify'
socketio=	require 'socket.io'

# Library Modules and Services
{Kit}=			require  './lib/kit'
{Db}=			require  './lib/db'
s_use=			require	 './lib/server_use'
config= 		(require './lib/config')()
{SES}=			require  './lib/ses'
{Push}=			require  './lib/push'
{Auth}=			require  './lib/auth'
{Logger}=		require  './lib/logger'
{Router}=		require  './lib/router'
{Wrapper}=		require  './lib/wrapper'
{TokenMgr}=		require  './lib/token_manager'
{Prototype}= 	require  './lib/prototype'
{TripManager}= 	require  './lib/trip_manager'
{EpicTemplate}= require  './lib/EpicTemplate'

# Initialize kit and set up with core services
kit= new Kit
kit.add_service 'config', 		config					# Config Object
kit.new_service 'logger', 		Logger					# Bunyan Logger

log= kit.services.logger.log
server= restify.createServer log: log 	# Create Server
io= socketio.listen server 				# Create Web Socket Listener
io.set 'log level', 2					# Set socket.io output to info level
kit.add_service 'server', server 		# Add server to kit
kit.add_service 'io', io 				# Add socket io to kit

# Add additional Library Services to Kit
# TODO: Move these to the config file just like the route modules
kit.new_service 'template',		EpicTemplate, ['template']			# Epic Template Engine
kit.new_service 'template_use',	EpicTemplate, ['template_use']			# Epic Template Engine
kit.new_service 'tokenMgr', 	TokenMgr				# Token Manager
kit.new_service 'db', 			Db						# Database Object (MySQL, MongoDB)
kit.new_service 'auth', 		Auth					# Auth Logic
kit.new_service 'router',		Router					# Route Creator
kit.new_service 'wrapper', 		Wrapper					# Route Wrapper
kit.new_service 'prototype', 	Prototype				# Prototype Service
kit.new_service 'push',			Push					# Push Service
kit.new_service 'ses', 			SES						# Amazon SES Module
kit.new_service 'tripMgr', 		TripManager				# Round Trip token/code Manager

# Setup Handlers
server.use s_use.set_response_headers
server.use restify.queryParser()
server.use restify.bodyParser()
server.use restify.requestLogger()
server.use kit.services.auth.parseAuthorization # TODO: Loop through the servics and run server_use functions
server.use s_use.debug_request

# Create all Routes
for mod in kit.services.config.route_modules when mod.enable is true
	log.info "Initializing #{mod.class} Routes..."
	kit.new_route_service mod.name, (require mod.file)[mod.class]
	kit.services.wrapper.add mod.name

# API Usage Endpoint
kit.services.router.route_usage()

# Run Server Init Functions from Kit Service Modules
log.debug 'running server_init()'
q_result= Q.resolve()
for nm, service of kit.services when typeof service.server_init is 'function'
	do(service)-> q_result= q_result.then -> service.server_init(kit)

# Start the Server
q_result.then ->
	# Static File Server (Must be last Route Created)
	server.get /.*/, restify.serveStatic config.api.static_file_server
	# Listen
	server.listen config.api.port, ()->
		log.info 'Server listening at', server.url

.fail (err)->
	log.error err
	log.error 'SERVER FAILED TO INITIALIZE. EXITING NOW!'
	process.exit(1)
