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

let rs = require("http/v4/rs");

rs.service()
	.resource("")
	.get(function (ctx, request, response) {
		let templates = getTemplates();
		templates = sortTemplates(templates);
		response.println(JSON.stringify(templates));
	})
	.resource("extensions")
	.get(function (ctx, request, response) {
		let templates = getTemplates();
		let fileExtensions = [];
		templates.forEach(template => { if (template.extension) fileExtensions.push(template.extension); });
		response.println(JSON.stringify(fileExtensions));
	})
	.execute();

function getTemplates() {
	let templates = [];
	let templateExtensions = extensions.getExtensions('ide-template');
	for (let i = 0; i < templateExtensions.length; i++) {
		let module = templateExtensions[i];
		try {
			let templateExtension = require(module);
			let template = templateExtension.getTemplate();
			template.id = module;
			templates.push(template);
		} catch (error) {
			console.error('Error occured while loading metadata for the template: ' + module);
			console.error(error);
		}
	}
	return templates;
}

function sortTemplates(templates) {
	return templates.sort(function (a, b) {
		if (a.order && b.order) {
			if (a.order - b.order != 0) {
				return a.order - b.order;
			}
		} else if (a.order && b.order === undefined) {
			return -1;
		} else if (b.order && a.order === undefined) {
			return 1;
		}
		if (a.name > b.name) {
			return 1;
		} else if (a.name < b.name) {
			return -1;
		}
		return 0;
	});
}