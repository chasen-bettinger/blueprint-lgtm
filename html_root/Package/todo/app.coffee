
window.EpicMvc.app$todo=
	OPTIONS:
		login: 		flow: 'anon'
		template:	default: 'todo'
		settings:	group: 'blueprint', show_issues: 'inline'
	MODELS:
		Todo:		class: 'Todo',		inst: 'tdTO'
	FLOWS:
		anon:
			start: 'todo'
			TRACKS:
				todo:
					start: 'landing'
					STEPS:
						landing: page: 'todo_main', CLICKS:
							show: call: 'Todo/show', use_fields: 'state'
							save_todo: call: 'Todo/save_todo', use_fields: 'title,id', RESULTS: [
								{ r: {}, call: 'Todo/choose_item', p: {clear: true} }
							]
							delete_todo: call: 'Todo/delete_todo', use_fields: 'id'
							clear_completed: call: 'Todo/clear_completed'
							mark_toggle: call: 'Todo/mark_toggle', use_fields: 'id'
							mark_all: call: 'Todo/mark_all'
							edit_item: call: 'Todo/choose_item', use_fields: 'id'
