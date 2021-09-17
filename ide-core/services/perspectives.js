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

let perspectives = [];
let perspectiveExtensions = extensions.getExtensions('ide-perspective');

for (let i = 0; i < perspectiveExtensions.length; i++) {
	let module = perspectiveExtensions[i];
	try {
		let perspectiveExtension = require(module);
		let perspective = perspectiveExtension.getPerspective();
		perspectives.push(perspective);
	} catch (error) {
		console.error('Error occured while loading metadata for the perspective: ' + module);
		console.error(error);
	}
}

perspectives.sort(function (p, n) {
	return (parseInt(p.order) - parseInt(n.order));
});

response.println(JSON.stringify(perspectives));