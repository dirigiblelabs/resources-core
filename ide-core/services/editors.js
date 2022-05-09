/*
 * Copyright (c) 2010-2020 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *   SAP - initial API and implementation
 */
let extensions = require('core/v4/extensions');
let response = require('http/v4/response');

let editors = [];
let editorExtensions = extensions.getExtensions('ide-editor');

for (let i = 0; editorExtensions != null && i < editorExtensions.length; i++) {
	let module = editorExtensions[i];
	try {
		let editorExtension = require(module);
		let editor = editorExtension.getEditor();
		editors.push(editor);
	} catch (error) {
		console.error('Error occured while loading metadata for the editor: ' + module);
		console.error(error);
	}
}

editors = editors.sort(function (a, b) {
	if (a.label && b.label) {
		const res = a.label.localeCompare(b.label);
		if (res <= -1) return -1;
		else if (res >= 1) return 1;
	} else {
		let eId;
		if (!a.label) eId = a.id;
		else eId = b.id;
		console.error("Editor with id '" + eId + "' does not have a label.");
	}
	return 0;
});

response.setContentType("application/json");
response.println(JSON.stringify(editors));