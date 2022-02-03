/*
 * Copyright (c) 2010-2021 SAP and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *   SAP - initial API and implementation
 */
/*
 * Provides key microservices for constructing and managing the IDE UI
 */
let defaultEditorId = "monaco";
let brandingInfo;
angular.module('idePerspective', ['ngResource', 'ideMessageHub'])
    .factory('Theming', ['$resource', 'messageHub', function ($resource, messageHub) {
        let theme = JSON.parse(localStorage.getItem('DIRIGIBLE.theme'));
        // legacySwitcher is deprecated. Remove once all views have been migrated.
        let legacySwitcher = $resource('/services/v4/js/theme/resources.js?name=:themeId', { themeId: 'default' });
        let themes = [];
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/services/v4/js/theme/resources.js/themes?legacy=false', false);
        xhr.send();
        if (xhr.status === 200) themes = JSON.parse(xhr.responseText);
        else console.error("Theming error", xhr.response);

        function setTheme(themeId, sendEvent = true) {
            for (let i = 0; i < themes.length; i++) {
                if (themes[i].id === themeId) {
                    localStorage.setItem(
                        'DIRIGIBLE.theme',
                        JSON.stringify(themes[i])
                    )
                    theme = themes[i];
                    // legacySwitcher is deprecated. Remove once all views have been migrated.
                    if (themes[i].oldThemeId) legacySwitcher.get({ 'themeId': themes[i].oldThemeId });
                }
            }
            if (sendEvent) messageHub.triggerEvent("ide.themeChange", true);
        }

        if (!theme) setTheme("quartz-light");

        return {
            setTheme: setTheme,
            getThemes: function () {
                return themes.map(
                    function (item) {
                        return {
                            "id": item["id"],
                            "name": item["name"]
                        };
                    }
                );
            },
            reset: function () {
                // setting sendEvent to false because of the reload caused by Golden Layout
                setTheme("quartz-light", false);
            }
        }
    }])
    .service('Perspectives', ['$resource', function ($resource) {
        return $resource('/services/v4/js/ide-core/services/perspectives.js');
    }])
    .service('Menu', ['$resource', function ($resource) {
        return $resource('/services/v4/js/ide-core/services/menu.js');
    }])
    .service('User', ['$http', function ($http) {
        return {
            get: function () {
                let user = {};
                $http({
                    url: '/services/v4/js/ide-core/services/user-name.js',
                    method: 'GET'
                }).then(function (data) {
                    user.name = data.data;
                });
                return user;
            }
        };
    }])
    .service('DialogWindows', ['$resource', function ($resource) {
        return $resource('/services/v4/js/ide-core/services/dialog-windows.js');
    }])
    .provider('Editors', function () {
        function getEditors() {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', '/services/v4/js/ide-core/services/editors.js', false);
            xhr.send();
            if (xhr.status === 200) return JSON.parse(xhr.responseText);
        }
        let editorProviders = {};
        let editorsForContentType = {};
        let editorsList = getEditors();
        editorsList.forEach(function (editor) {
            editorProviders[editor.id] = editor.link;
            editor.contentTypes.forEach(function (contentType) {
                if (!editorsForContentType[contentType]) {
                    editorsForContentType[contentType] = [{
                        'id': editor.id,
                        'label': editor.label
                    }];
                } else {
                    editorsForContentType[contentType].push({
                        'id': editor.id,
                        'label': editor.label
                    });
                }
            });
        });

        this.$get = [function editorsFactory() {
            return {
                defaultEditorId: defaultEditorId,
                editorProviders: editorProviders,
                editorsForContentType: editorsForContentType
            };
        }];
    })
    /**
     * Creates a map object associating a view factory function with a name (id)
     */
    .provider('ViewFactories', function () {
        let self = this;
        this.factories = {
            "frame": function (container, componentState) {
                container.setTitle(componentState.label || 'View');
                $('<iframe>').attr('src', componentState.path).appendTo(container.getElement().empty());
            },
            "editor": function (container, componentState) {
                /* Improvement hint: Instead of hardcoding ?file=.. use URL template for the editor provider values
                 * and then replace the placeholders in the template with matching properties from the componentState.
                 * This will make it easy to replace the query string property if needed or provide additional
                 * (editor-specific) parameters easily.
                 */
                (function (componentState) {
                    let src, editorPath;
                    if (!componentState.editorId || Object.keys(self.editors.editorProviders).indexOf(componentState.editorId) < 0) {
                        if (Object.keys(self.editors.editorsForContentType).indexOf(componentState.contentType) < 0) {
                            editorPath = self.editors.editorProviders[self.editors.defaultEditorId];
                        } else {
                            if (self.editors.editorsForContentType[componentState.contentType].length > 1) {
                                let formEditors = self.editors.editorsForContentType[componentState.contentType].filter(function (e) {
                                    switch (e.id) {
                                        case "orion":
                                        case "monaco":
                                        case "ace":
                                            return false;
                                        default:
                                            return true;
                                    }
                                });
                                if (formEditors.length > 0) {
                                    componentState.editorId = formEditors[0].id;
                                } else {
                                    componentState.editorId = self.editors.editorsForContentType[componentState.contentType][0].id;
                                }
                            } else {
                                componentState.editorId = self.editors.editorsForContentType[componentState.contentType][0].id;
                            }
                            editorPath = self.editors.editorProviders[componentState.editorId];
                        }
                    }
                    else
                        editorPath = self.editors.editorProviders[componentState.editorId];
                    if (componentState.path) {
                        if (componentState.editorId === 'flowable')
                            src = editorPath + componentState.path;
                        else
                            src = editorPath + '?file=' + componentState.path;
                        if (componentState.contentType && componentState.editorId !== 'flowable')
                            src += "&contentType=" + componentState.contentType;
                        if (componentState.extraArgs) {
                            const extraArgs = Object.keys(componentState.extraArgs);
                            for (let i = 0; i < extraArgs.length; i++) {
                                src += `&${extraArgs[i]}=${encodeURIComponent(componentState.extraArgs[extraArgs[i]])}`;
                            }
                        }
                    } else {
                        container.setTitle("Welcome");
                        let brandingInfo = getBrandingInfo();
                        src = brandingInfo.branding.welcomePage;
                    }
                    $('<iframe>').attr('src', src).appendTo(container.getElement().empty());
                })(componentState, this);
            }.bind(self)
        };
        this.$get = ['Editors', function viewFactoriesFactory(Editors) {
            this.editors = Editors;
            return this.factories;
        }];
    })
    /**
     * Wrap the ViewRegistry class in an angular service object for dependency injection
     */
    .service('ViewRegistrySvc', ViewRegistry)
    /**
     * A view registry instance factory, using remote service for intializing the view definitions
     */
    .factory('viewRegistry', ['ViewRegistrySvc', '$resource', 'ViewFactories', function (ViewRegistrySvc, $resource, ViewFactories) {
        Object.keys(ViewFactories).forEach(function (factoryName) {
            ViewRegistrySvc.factory(factoryName, ViewFactories[factoryName]);
        });
        let get = function () {
            return $resource('/services/v4/js/ide-core/services/views.js').query().$promise
                .then(function (data) {
                    data = data.map(function (v) {
                        v.id = v.id || v.name.toLowerCase();
                        v.label = v.label || v.name;
                        v.factory = v.factory || 'frame';
                        v.settings = {
                            "path": v.link
                        }
                        v.region = v.region || 'left-top';
                        return v;
                    });
                    //no extension point. provisioned "manually"
                    data.push({ "id": "editor", "factory": "editor", "region": "center-middle", "label": "Editor", "settings": {} });
                    //no extension point yet
                    data.push({ "id": "result", "factory": "frame", "region": "center-bottom", "label": "Result", "settings": { "path": "../ide-database/sql/result.html" } });
                    data.push({ "id": "properties", "factory": "frame", "region": "center-bottom", "label": "Properties", "settings": { "path": "../ide/properties.html" } });
                    data.push({ "id": "sql", "factory": "frame", "region": "center-middle", "label": "SQL", "settings": { "path": "../ide-database/sql/editor.html" } });
                    //register views
                    data.forEach(function (viewDef) {
                        ViewRegistrySvc.view(viewDef.id, viewDef.factory, viewDef.region, viewDef.label, viewDef.settings);
                    });
                    return ViewRegistrySvc;
                });
        };

        return {
            get: get
        };
    }])
    .factory('Layouts', [function () {
        return {
            manager: undefined
        };
    }])
    .filter('removeSpaces', [function () {
        return function (string) {
            if (!angular.isString(string)) return string;
            return string.replace(/[\s]/g, '');
        };
    }])
    .directive('brandtitle', [function () {
        return {
            restrict: 'AE',
            transclude: true,
            replace: true,
            scope: {
                perspectiveName: '@perspectiveName'
            },
            link: function (scope) {
                scope.branding = getBrandingInfo();
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/brandTitle.html'
        };
    }])
    .directive('brandicon', [function () {
        return {
            restrict: 'AE',
            transclude: true,
            replace: true,
            link: function (scope) {
                scope.branding = getBrandingInfo();
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/brandIcon.html'
        };
    }])
    .directive('ideHeader', ['$window', '$resource', 'Theming', 'User', 'Layouts', 'messageHub', function ($window, $resource, Theming, User, Layouts, messageHub) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                url: '@menuDataUrl',
                menu: '=?menuData'
            },
            link: function (scope, element) {
                let isMenuOpen = false;
                scope.themes = Theming.getThemes();
                scope.user = User.get();
                let themePopover = element[0].querySelector("#themePopover");
                let themePopoverButton = element[0].querySelector("#themePopoverButton");
                let userPopover = element[0].querySelector("#userPopover");
                let userPopoverButton = element[0].querySelector("#userPopoverButton");
                function documentClick(event) {
                    if (isMenuOpen) {
                        if (!themePopover.classList.contains("dg-hidden")) {
                            if (!themePopover.parentElement.contains(event.target))
                                toggleThemePopover(true);
                        }
                        if (!userPopover.classList.contains("dg-hidden")) {
                            if (!userPopover.parentElement.contains(event.target))
                                toggleUserPopover(true);
                        }
                    }
                }
                function toggleThemePopover(hidden = true) {
                    isMenuOpen = !hidden;
                    if (hidden) {
                        themePopover.classList.add("dg-hidden");
                        themePopover.setAttribute("aria-expanded", false);
                        themePopoverButton.setAttribute("aria-expanded", false);
                    } else {
                        themePopover.classList.remove("dg-hidden");
                        themePopover.setAttribute("aria-expanded", true);
                        themePopoverButton.setAttribute("aria-expanded", true);
                    }
                }
                function toggleUserPopover(hidden = true) {
                    isMenuOpen = !hidden;
                    if (hidden) {
                        userPopover.classList.add("dg-hidden");
                        userPopover.setAttribute("aria-expanded", false);
                        userPopoverButton.setAttribute("aria-expanded", false);
                    } else {
                        userPopover.classList.remove("dg-hidden");
                        userPopover.setAttribute("aria-expanded", true);
                        userPopoverButton.setAttribute("aria-expanded", true);
                    }
                }
                document.addEventListener("click", documentClick);

                function loadMenu() {
                    scope.menu = $resource(scope.url).query();
                }
                scope.branding = getBrandingInfo();

                messageHub.onDidReceiveMessage(
                    'ide-core.openEditor',
                    function (msg) {
                        Layouts.manager.openEditor(
                            msg.data.file.path,
                            msg.data.file.label,
                            msg.data.file.contentType,
                            msg.data.editor || defaultEditorId,
                            msg.data.extraArgs
                        );
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'ide-core.closeEditor',
                    function (msg) {
                        Layouts.manager.closeEditor(msg.fileName);
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'ide-core.closeOtherEditors',
                    function (msg) {
                        Layouts.manager.closeOtherEditors(msg.fileName);
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'ide-core.closeAllEditors',
                    function () {
                        Layouts.manager.closeAllEditors();
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'ide-core.openView',
                    function (msg) {
                        Layouts.manager.openView(msg.viewId);
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'ide-core.openPerspective',
                    function (msg) {
                        let url = msg.data.link;
                        if ('parameters' in msg.data) {
                            let urlParams = '';
                            for (const property in msg.data.parameters) {
                                urlParams += `${property}=${encodeURIComponent(msg.data.parameters[property])}&`
                            }
                            url += `?${urlParams.slice(0, -1)}`;
                        }
                        window.location.href = url;
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'workspace.set',
                    function (msg) {
                        localStorage.setItem('DIRIGIBLE.workspace', JSON.stringify({ "name": msg.data.workspace }));
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'workspace.file.deleted',
                    function (msg) {
                        Layouts.manager.closeEditor(msg.data.path);
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'workspace.file.renamed',
                    function (msg) {
                        Layouts.manager.closeEditor(msg.data.file.path);
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'workspace.file.moved',
                    function (msg) {
                        Layouts.manager.closeEditor("/" + msg.data.workspace + msg.data.sourcepath + "/" + msg.data.file);
                    },
                    true
                );

                if (!scope.menu && scope.url)
                    loadMenu.call(scope);

                scope.menuClick = function (item, subItem) {
                    if (item.name === 'Show View') {
                        // open view
                        Layouts.manager.openView(subItem.name.toLowerCase());
                    } else if (item.name === 'Open Perspective') {
                        // open perspective`
                        window.open(subItem.onClick.substring(subItem.onClick.indexOf('(') + 2, subItem.onClick.indexOf(',') - 1));//TODO: change the menu service ot provide paths instead
                    } else if (item.event === 'openView') {
                        // open view
                        Layouts.manager.openView(item.name.toLowerCase());
                    } else if (item.event === 'openDialogWindow') {
                        messageHub.showDialogWindow(item.dialogId);
                    } else if (item.name === 'Reset') {
                        scope.resetViews();
                    } else {
                        if (item.event === 'open') {
                            window.open(item.data, '_blank');
                        } else {
                            if (subItem) {
                                messageHub.postMessage(subItem.event, subItem.data, true);
                            } else {
                                messageHub.postMessage(item.event, item.data, true);
                            }
                        }
                    }
                };

                scope.themeButtonClicked = function () {
                    toggleUserPopover(true);
                    if (themePopover.classList.contains("dg-hidden")) {
                        let offset = themePopoverButton.getBoundingClientRect();
                        themePopover.style.top = `${offset.bottom}px`;
                        themePopover.style.right = `${$window.innerWidth - offset.right}px`;
                        toggleThemePopover(false);
                    } else toggleThemePopover(true);
                };

                scope.userButtonClicked = function () {
                    toggleThemePopover(true);
                    if (userPopover.classList.contains("dg-hidden")) {
                        let offset = userPopoverButton.getBoundingClientRect();
                        userPopover.style.top = `${offset.bottom}px`;
                        userPopover.style.right = `${$window.innerWidth - offset.right}px`;
                        toggleUserPopover(false);
                    } else toggleUserPopover(true);
                };

                scope.setTheme = function (themeId) {
                    Theming.setTheme(themeId);
                    toggleThemePopover(true);
                };

                scope.resetTheme = function () {
                    scope.resetViews();
                };

                scope.resetViews = function () {
                    localStorage.clear();
                    Theming.reset();
                    location.reload(); // Because of Golden Layout
                };
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/ideHeader.html'
        };
    }])
    .directive("headerHamburgerMenu", function () {
        return {
            restrict: "E",
            replace: true,
            scope: {
                menuList: "<",
                menuHandler: "&",
            },
            link: function (scope, element) {
                let isMenuOpen = false;
                function documentClick(event) {
                    if (isMenuOpen && !element[0].contains(event.target)) {
                        scope.hideAllMenus();
                    }
                }
                document.addEventListener("click", documentClick);
                scope.menuClicked = function (menuButton) {
                    let menu = menuButton.parentElement.querySelector(".fd-menu");
                    if (menu.classList.contains("dg-hidden")) {
                        scope.hideAllSubmenus(menu);
                        scope.hideAllMenus();
                        let offset = menuButton.getBoundingClientRect();
                        menu.style.top = `${offset.bottom}px`;
                        menu.style.left = `${offset.left}px`;
                        menu.classList.remove("dg-hidden");
                        isMenuOpen = true;
                    } else {
                        menu.classList.add("dg-hidden");
                        isMenuOpen = false;
                    }
                };
                scope.hideAllMenus = function () {
                    let menus = element[0].querySelectorAll(".fd-menu");
                    for (let i = 0; i < menus.length; i++) {
                        if (!menus[i].classList.contains("dg-hidden")) menus[i].classList.add("dg-hidden");
                    }
                    isMenuOpen = false;
                };
                scope.hideAllSubmenus = function (parent) {
                    let submenuLists = parent.querySelectorAll(".fd-menu__sublist");
                    let submenuLinks = parent.querySelectorAll(".fd-menu__link[aria-haspopup]");
                    if (submenuLists.length !== submenuLinks.length)
                        console.error("Error: Submenu list count is different then the submenu link count.");
                    for (let i = 0; i < submenuLists.length; i++) {
                        submenuLinks[i].classList.remove("is-expanded");
                        submenuLinks[i].setAttribute("aria-expanded", false);
                        submenuLists[i].classList.add("dg-hidden");
                        submenuLists[i].setAttribute("aria-hidden", true);
                    }
                };
                scope.submenuShow = function (submenuId) {
                    let submenu = element[0].querySelector("#" + submenuId);
                    let submenuList = submenu.querySelector(".fd-menu__sublist");
                    let submenuLink = submenu.querySelector(".fd-menu__link");
                    if (!submenuLink.classList.contains("is-expanded")) {
                        submenuLink.classList.add("is-expanded");
                        submenuLink.setAttribute("aria-expanded", true);
                        submenuList.classList.remove("dg-hidden");
                        submenuList.setAttribute("aria-hidden", false);
                    }
                };
                scope.submenuHide = function (submenuId, target) {
                    let submenu = element[0].querySelector("#" + submenuId);
                    if (!submenu.contains(target)) {
                        let submenuList = submenu.querySelector(".fd-menu__sublist");
                        let submenuLink = submenu.querySelector(".fd-menu__link");
                        submenuLink.classList.remove("is-expanded");
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuList.classList.add("dg-hidden");
                        submenuList.setAttribute("aria-hidden", true);
                    }
                };
            },
            templateUrl: "/services/v4/web/ide-core/ui/templates/headerHamburgerMenu.html",
        };
    })
    .directive("headerMenu", function () {
        return {
            restrict: "E",
            replace: true,
            scope: {
                menuList: "<",
                menuHandler: "&",
            },
            link: function (scope, element) {
                let isMenuOpen = false;
                function documentClick(event) {
                    if (isMenuOpen && !element[0].contains(event.target)) {
                        scope.hideAllMenus();
                    }
                }
                document.addEventListener("click", documentClick);
                scope.menuClicked = function (menuButton) {
                    let menu = menuButton.parentElement.querySelector(".fd-menu");
                    if (menu.classList.contains("dg-hidden")) {
                        scope.hideAllSubmenus(menu);
                        scope.hideAllMenus();
                        let offset = menuButton.getBoundingClientRect();
                        menu.style.top = `${offset.bottom}px`;
                        menu.style.left = `${offset.left}px`;
                        menu.classList.remove("dg-hidden");
                        isMenuOpen = true;
                    } else {
                        menu.classList.add("dg-hidden");
                        isMenuOpen = false;
                    }
                };
                scope.hideAllMenus = function () {
                    let menus = element[0].querySelectorAll(".fd-menu");
                    for (let i = 0; i < menus.length; i++) {
                        if (!menus[i].classList.contains("dg-hidden")) menus[i].classList.add("dg-hidden");
                    }
                    isMenuOpen = false;
                };
                scope.hideAllSubmenus = function (parent) {
                    let submenuLists = parent.querySelectorAll(".fd-menu__sublist");
                    let submenuLinks = parent.querySelectorAll(".fd-menu__link[aria-haspopup]");
                    if (submenuLists.length !== submenuLinks.length)
                        console.error("Error: Submenu list count is different then the submenu link count.");
                    for (let i = 0; i < submenuLists.length; i++) {
                        if (submenuLinks[i].getAttribute("aria-expanded")) {
                            submenuLinks[i].classList.remove("is-expanded");
                            submenuLinks[i].setAttribute("aria-expanded", false);
                            submenuLists[i].classList.add("dg-hidden");
                            submenuLists[i].setAttribute("aria-hidden", true);
                        }
                    }
                };
                scope.submenuShow = function (submenuId) {
                    let submenu = element[0].querySelector("#" + submenuId);
                    let submenuList = submenu.querySelector(".fd-menu__sublist");
                    let submenuLink = submenu.querySelector(".fd-menu__link");
                    if (!submenuLink.classList.contains("is-expanded")) {
                        scope.hideAllSubmenus(submenu.parentElement);
                        submenuLink.classList.add("is-expanded");
                        submenuLink.setAttribute("aria-expanded", true);
                        submenuList.classList.remove("dg-hidden");
                        submenuList.setAttribute("aria-hidden", false);
                    }
                };
                scope.submenuHide = function (submenuId, target) {
                    let submenu = element[0].querySelector("#" + submenuId);
                    if (!submenu.contains(target)) {
                        let submenuList = submenu.querySelector(".fd-menu__sublist");
                        let submenuLink = submenu.querySelector(".fd-menu__link");
                        submenuLink.classList.remove("is-expanded");
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuList.classList.add("dg-hidden");
                        submenuList.setAttribute("aria-hidden", true);
                    }
                };
                scope.menuItemClick = function (item, subItem) {
                    scope.hideAllMenus();
                    scope.menuHandler()(item, subItem);
                };
            },
            templateUrl: "/services/v4/web/ide-core/ui/templates/headerMenu.html",
        };
    })
    .directive("headerSubmenu", function () {
        return {
            restrict: "E",
            replace: true,
            scope: {
                parentItem: "<",
                submenuIndex: "<",
                menuHandler: "&",
                hideMenuFn: "&",
                isToplevel: "<",
            },
            link: function (scope, element) {
                scope.hideAllSubmenus = function (parent) {
                    let submenuLists = parent.querySelectorAll(".fd-menu__sublist");
                    let submenuLinks = parent.querySelectorAll(".fd-menu__link[aria-haspopup]");
                    if (submenuLists.length !== submenuLinks.length)
                        console.error("Error: Submenu list count is different then the submenu link count.");
                    for (let i = 0; i < submenuLists.length; i++) {
                        if (submenuLinks[i].getAttribute("aria-expanded")) {
                            submenuLinks[i].classList.remove("is-expanded");
                            submenuLinks[i].setAttribute("aria-expanded", false);
                            submenuLists[i].classList.add("dg-hidden");
                            submenuLists[i].setAttribute("aria-hidden", true);
                        }
                    }
                };
                scope.submenuShow = function (submenuId) {
                    let submenu = element[0].querySelector("#" + submenuId);
                    let submenuList = submenu.querySelector(".fd-menu__sublist");
                    let submenuLink = submenu.querySelector(".fd-menu__link");
                    if (!submenuLink.classList.contains("is-expanded")) {
                        scope.hideAllSubmenus(submenu.parentElement);
                        submenuLink.classList.add("is-expanded");
                        submenuLink.setAttribute("aria-expanded", true);
                        submenuList.classList.remove("dg-hidden");
                        submenuList.setAttribute("aria-hidden", false);
                    }
                };
                scope.submenuHide = function (submenuId, target) {
                    let submenu = element[0].querySelector("#" + submenuId);
                    if (!submenu.contains(target)) {
                        let submenuList = submenu.querySelector(".fd-menu__sublist");
                        let submenuLink = submenu.querySelector(".fd-menu__link");
                        submenuLink.classList.remove("is-expanded");
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuList.classList.add("dg-hidden");
                        submenuList.setAttribute("aria-hidden", true);
                    }
                };
                scope.menuItemClick = function (item, subItem) {
                    scope.hideMenuFn()();
                    if (scope.isToplevel) scope.menuHandler()(subItem); // Temp fix for legacy menu api
                    else scope.menuHandler()(item, subItem);
                };
            },
            templateUrl: "/services/v4/web/ide-core/ui/templates/headerSubmenu.html",
        };
    })
    .directive('ideContainer', function () {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                activeId: '@'
            },
            link: function (scope) {
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/ideContainer.html'
        }
    })
    .directive('ideSidebar', ['Perspectives', function (Perspectives) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                activeId: '@'
            },
            link: function (scope) {
                scope.perspectives = Perspectives.query();
                scope.getIcon = function (icon) {
                    if (icon) return icon;
                    return "/services/v4/web/resources/images/unknown.svg";
                }
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/ideSidebar.html'
        }
    }])
    /**
     * Used for Dialogs and Window Dialogs
     */
    .directive('ideDialogs', ['messageHub', 'DialogWindows', function (messageHub, DialogWindows) {
        return {
            restrict: 'E',
            replace: true,
            link: function (scope, element) {
                let dialogWindows = DialogWindows.query();
                let messageBox = element[0].querySelector("#dgIdeAlert");
                let ideDialog = element[0].querySelector("#dgIdeDialog");
                let ideSelectDialog = element[0].querySelector("#dgIdeSelectDialog");
                let ideDialogWindow = element[0].querySelector("#dgIdeDialogWindow");
                let alerts = [];
                let windows = [];
                let dialogs = [];
                let selectDialogs = [];
                scope.searchValue = "";
                scope.alert = {
                    title: "",
                    message: "",
                    type: "information", // information, error, success, warning
                };
                scope.dialog = {
                    header: "",
                    subheader: "",
                    title: "",
                    body: "",
                    footer: "",
                    loader: false,
                    buttons: [],
                    callbackTopic: null
                };
                scope.selectDialog = {
                    title: "",
                    listItems: [],
                    selectedItems: 0,
                    selectedItemId: "",
                    callbackTopic: "",
                    isSingleChoice: true,
                    hasSearch: false
                };
                scope.window = {
                    title: "",
                    dialogWindowId: "",
                    callbackTopic: null,
                    link: "",
                    parameters: ""
                };

                scope.showAlert = function () {
                    if (element[0].classList.contains("dg-hidden"))
                        element[0].classList.remove("dg-hidden");
                    scope.alert = alerts[0];
                    messageBox.classList.add("fd-message-box--active");
                };

                scope.hideAlert = function () {
                    messageBox.classList.remove("fd-message-box--active");
                    alerts.shift();
                    checkForDialogs();
                };

                scope.showDialog = function () {
                    if (element[0].classList.contains("dg-hidden"))
                        element[0].classList.remove("dg-hidden");
                    scope.dialog = dialogs[0];
                    ideDialog.classList.add("fd-dialog--active");
                };

                scope.hideDialog = function (buttonId) {
                    if (buttonId && scope.dialog.callbackTopic) messageHub.postMessage(scope.dialog.callbackTopic, buttonId, true);
                    ideDialog.classList.remove("fd-dialog--active");
                    dialogs.shift();
                    checkForDialogs();
                };

                scope.itemSelected = function (item) {
                    if (scope.selectDialog.isSingleChoice) {
                        scope.selectDialog.selectedItemId = item;
                        scope.selectDialog.selectedItems = 1;
                    } else {
                        if (item) scope.selectDialog.selectedItems += 1;
                        else scope.selectDialog.selectedItems -= 1;
                    }
                };

                scope.searchChanged = function () {
                    let value = scope.searchValue.toLowerCase();
                    if (value === "") scope.clearSearch();
                    else for (let i = 0; i < scope.selectDialog.listItems.length; i++) {
                        if (!scope.selectDialog.listItems[i].text.toLowerCase().includes(value))
                            scope.selectDialog.listItems[i].hidden = true;
                    }
                };

                scope.clearSearch = function () {
                    scope.searchValue = "";
                    for (let i = 0; i < scope.selectDialog.listItems.length; i++) {
                        scope.selectDialog.listItems[i].hidden = false;
                    }
                };

                scope.showSelectDialog = function () {
                    if (element[0].classList.contains("dg-hidden"))
                        element[0].classList.remove("dg-hidden");
                    scope.selectDialog = selectDialogs[0];
                    ideSelectDialog.classList.add("fd-dialog--active");
                };

                scope.hideSelectDialog = function (action) {
                    if (action === "select") {
                        if (scope.selectDialog.selectedItems > 0 || scope.selectDialog.selectedItemId !== "")
                            if (scope.selectDialog.isSingleChoice)
                                messageHub.postMessage(
                                    scope.selectDialog.callbackTopic,
                                    {
                                        selected: scope.selectDialog.selectedItemId
                                    },
                                    true
                                );
                            else messageHub.postMessage(
                                scope.selectDialog.callbackTopic,
                                {
                                    selected: getSelectedItems()
                                },
                                true
                            );
                        else return;
                    }
                    else {
                        let selected;
                        if (scope.selectDialog.isSingleChoice) selected = "";
                        else selected = [];
                        messageHub.postMessage(
                            scope.selectDialog.callbackTopic,
                            { selected: selected },
                            true
                        );
                    }
                    ideSelectDialog.classList.remove("fd-dialog--active");
                    element[0].classList.add("dg-hidden");
                    selectDialogs.shift();
                    checkForDialogs();
                };

                scope.showWindow = function () {
                    scope.window = windows[0];
                    if (scope.window.link === "") {
                        console.log(scope.window);
                        console.error(
                            "Dialog Window Error: The link property is missing."
                        );
                        windows.shift();
                        checkForDialogs();
                        return;
                    }
                    if (element[0].classList.contains("dg-hidden"))
                        element[0].classList.remove("dg-hidden");
                    ideDialogWindow.classList.add("fd-message-box--active");
                };

                scope.hideWindow = function () {
                    if (scope.window.callbackTopic) messageHub.trigger(scope.dialog.callbackTopic, true);
                    ideDialogWindow.classList.remove("fd-dialog--active");
                    windows.shift();
                    scope.window.link = "";
                    scope.window.parameters = "";
                    checkForDialogs();
                };

                function checkForDialogs() {
                    if (selectDialogs.length > 0) scope.showSelectDialog();
                    else if (dialogs.length > 0) scope.showDialog();
                    else if (alerts.length > 0) scope.showAlert();
                    else if (windows.length > 0) scope.showWindow();
                    else element[0].classList.add("dg-hidden");
                }

                messageHub.onDidReceiveMessage(
                    "ide.alert",
                    function (data) {
                        scope.$apply(function () {
                            let type;
                            if (data.type) {
                                switch (data.type.toLowerCase()) {
                                    case "success":
                                        type = "success";
                                        break;
                                    case "warning":
                                        type = "warning";
                                        break;
                                    case "info":
                                        type = "information";
                                        break;
                                    case "error":
                                        type = "error";
                                        break;
                                    default:
                                        type = "information";
                                        break;
                                }
                            }
                            alerts.push({
                                title: data.title,
                                message: data.message,
                                type: type,
                            });
                            scope.showAlert();
                        });
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    "ide.dialog",
                    function (data) {
                        scope.$apply(function () {
                            dialogs.push({
                                header: data.header,
                                subheader: data.subheader,
                                title: data.title,
                                body: data.body,
                                footer: data.footer,
                                loader: data.loader,
                                buttons: data.buttons,
                                callbackTopic: data.callbackTopic
                            });
                            scope.showDialog();
                        });
                    },
                    true
                );

                function getSelectedItems() {
                    let selected = [];
                    for (let i = 0; i < scope.selectDialog.listItems.length; i++) {
                        if (scope.selectDialog.listItems[i].selected)
                            selected.push(scope.selectDialog.listItems[i].ownId);
                    }
                    return selected;
                }

                function getSelectDialogList(listItems) {
                    return listItems.map(
                        function (item, index) {
                            return {
                                "id": `idesdl${index}`,
                                "ownId": item.id,
                                "text": item.text,
                                "hidden": false,
                                "selected": false
                            };
                        }
                    );
                }

                messageHub.onDidReceiveMessage(
                    "ide.selectDialog",
                    function (data) {
                        scope.$apply(function () {
                            selectDialogs.push({
                                title: data.title,
                                listItems: getSelectDialogList(data.listItems),
                                selectedItems: 0,
                                callbackTopic: data.callbackTopic,
                                isSingleChoice: data.isSingleChoice,
                                hasSearch: data.hasSearch
                            });
                            scope.showSelectDialog();
                        });
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    "ide.dialogWindow",
                    function (data) {
                        scope.$apply(function () {
                            let found = false;
                            for (let i = 0; i < dialogWindows.length; i++) {
                                if (dialogWindows[i].id === data.dialogWindowId) {
                                    found = true;
                                    windows.push({
                                        title: dialogWindows[i].title,
                                        dialogWindowId: dialogWindows[i].id,
                                        callbackTopic: data.callbackTopic,
                                        link: dialogWindows[i].link,
                                        parameters: data.parameters || ""
                                    });
                                    break;
                                }
                            }
                            if (found) scope.showWindow();
                            else console.error(
                                "Dialog Window Error: There is no window dialog with such id."
                            );
                        });
                    },
                    true
                );
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/ideDialogs.html'
        }
    }])
    .directive('ideStatusBar', ['messageHub', function (messageHub) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                message: '@',
                caret: '@',
                error: '@'
            },
            link: function (scope) {
                messageHub.onDidReceiveMessage(
                    'ide.statusMessage',
                    function (data) {
                        scope.$apply(function () {
                            scope.message = data.message;
                        });
                    },
                    true
                );
                messageHub.onDidReceiveMessage(
                    'ide.statusError',
                    function (data) {
                        scope.$apply(function () {
                            scope.error = data.message;
                        });
                    },
                    true
                );
                messageHub.onDidReceiveMessage(
                    'ide.statusCaret',
                    function (data) {
                        scope.$apply(function () {
                            scope.caret = data.text;
                        });
                    },
                    true
                );
                scope.cleanStatusMessages = function () {
                    scope.message = null;
                };
                scope.cleanErrorMessages = function () {
                    scope.error = null;
                };
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/ideStatusBar.html'
        }
    }])
    .directive('perspectiveView', ['viewRegistry', 'Layouts', function (viewRegistry, Layouts) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                layoutModel: '=',
                layoutViews: '@', // Do we need this?
            },
            link: function (scope, element) {
                let views;
                if (scope.layoutViews) views = scope.layoutViews.split(',');
                else views = scope.layoutModel.views;
                let eventHandlers = scope.layoutModel.events;
                let viewSettings = scope.layoutModel.viewSettings;
                let layoutSettings = scope.layoutModel.layoutSettings;

                viewRegistry.get().then(function (registry) {
                    scope.layoutManager = new LayoutController(registry);
                    if (eventHandlers) {
                        Object.keys(eventHandlers).forEach(function (evtName) {
                            let handler = eventHandlers[evtName];
                            if (typeof handler === 'function')
                                scope.layoutManager.addListener(evtName, handler);
                        });
                    }
                    $(window).resize(function () {
                        let container = $(".dg-main-container");
                        let sidebar = $(".dg-sidebar");
                        scope.layoutManager.layout.updateSize(container.width() - sidebar.width(), container.height());
                    });
                    scope.layoutManager.init(element, views, undefined, undefined, viewSettings, layoutSettings);
                    Layouts.manager = scope.layoutManager;
                });
            },
            template: '<div class="dg-perspective-view"></div>',
        }
    }]);

function getBrandingInfo() {
    if (brandingInfo === undefined) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/services/v4/js/ide-branding/api/branding.js', false);
        xhr.send();
        if (xhr.status === 200) {
            brandingInfo = JSON.parse(xhr.responseText);
            localStorage.setItem('DIRIGIBLE.branding', xhr.responseText);
        } else console.error("Branding error", xhr.response);
    }
    return brandingInfo;
}
