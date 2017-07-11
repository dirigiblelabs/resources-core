/*******************************************************************************
 * Copyright (c) 2017 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 * Contributors:
 * SAP - initial API and implementation
 *******************************************************************************/

/* eslint-env node, dirigible */

var extensions = require('core/v3/extensions');

function getMainMenu() {
    var mainmenu = [];
	var menuExtensions = extensions.getExtensions('/ide/extensions/mainmenu');
	for (var i=0; i<menuExtensions.length; i++) {
		menuExtension = require(menuExtensions[i]);
		mainmenu.push[menuExtension.getMenu()];
	}
	return JSON.stringify(mainmenu);
}

getMainMenu();
