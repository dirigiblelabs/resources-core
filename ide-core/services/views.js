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

let views = [];
let viewExtensions = extensions.getExtensions('ide-view');

for (let i = 0; i < viewExtensions.length; i++) {
	let module = viewExtensions[i];
	try {
		let viewExtension = require(module);
		let view = viewExtension.getView();
		views.push(view);
	} catch (error) {
		console.error('Error occured while loading metadata for the view: ' + module);
		console.error(error);
	}
}
response.setContentType("application/json");
response.println(JSON.stringify(views));