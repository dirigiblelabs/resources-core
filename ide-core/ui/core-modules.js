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
                scope.themes = Theming.getThemes();
                scope.user = User.get();
                let themePopover = element[0].querySelector("#themePopover");
                let userPopover = element[0].querySelector("#userPopover");
                function documentClick(event) {
                    if (!themePopover.classList.contains("dg-hidden")) {
                        if (!themePopover.parentElement.contains(event.originalTarget))
                            toggleThemePopover(true);
                    }
                    if (!userPopover.classList.contains("dg-hidden")) {
                        if (!userPopover.parentElement.contains(event.originalTarget))
                            userPopover.classList.add("dg-hidden");
                    }
                }
                function toggleThemePopover(hidden = true) {
                    if (hidden) themePopover.classList.add("dg-hidden");
                    else themePopover.classList.remove("dg-hidden");
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

                scope.themeButtonLeave = function (event) {
                    let target = event.toElement || event.relatedTarget;
                    if (target) {
                        if (!target.classList.contains("fd-menu__link")) {
                            toggleThemePopover(true);
                        }
                    }
                };

                scope.themeMenuLeave = function (event) {
                    let target = event.toElement || event.relatedTarget;
                    if (target) {
                        if (!target.classList.contains("fd-tool-header__button")) {
                            toggleThemePopover(true);
                        }
                    }
                };

                scope.themeButtonClicked = function (menuButton) {
                    if (themePopover.classList.contains("dg-hidden")) {
                        let offset = menuButton.getBoundingClientRect();
                        themePopover.style.top = `${offset.bottom}px`;
                        themePopover.style.right = `${$window.innerWidth - offset.right}px`;
                        toggleThemePopover(false);
                    } else toggleThemePopover(true);
                };

                scope.userButtonLeave = function (event) {
                    let target = event.toElement || event.relatedTarget;
                    if (target) {
                        if (!target.classList.contains("fd-menu__link")) {
                            userPopover.classList.add("dg-hidden");
                        }
                    }
                };

                scope.userMenuLeave = function (event) {
                    let target = event.toElement || event.relatedTarget;
                    if (target) {
                        if (!target.classList.contains("fd-tool-header__button")) {
                            userPopover.classList.add("dg-hidden");
                        }
                    }
                };

                scope.userButtonClicked = function (userButton) {
                    if (userPopover.classList.contains("dg-hidden")) {
                        let offset = userButton.getBoundingClientRect();
                        userPopover.style.top = `${offset.bottom}px`;
                        userPopover.style.right = `${$window.innerWidth - offset.right}px`;
                        userPopover.classList.remove("dg-hidden");
                    } else userPopover.classList.add("dg-hidden");
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
                    if (isMenuOpen && !element[0].contains(event.originalTarget)) {
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
                scope.hideMenu = function (event) {
                    let menuButton = event.currentTarget.parentElement.querySelector(".fd-button--menu");
                    let target = event.toElement || event.relatedTarget;
                    if (target !== menuButton) {
                        event.currentTarget.classList.add("dg-hidden");
                    }
                };
                scope.menuButtonLeave = function (event) {
                    let target = event.toElement || event.relatedTarget;
                    if (!target.classList.contains("fd-menu__link")) {
                        scope.hideAllMenus();
                    }
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
                scope.submenuAction = function (submenu) {
                    let submenuList;
                    let submenuLink;
                    if (submenu.classList.contains("fd-menu__item")) {
                        submenuList = submenu.querySelector(".fd-menu__sublist");
                        submenuLink = submenu.querySelector(".fd-menu__link");
                    } else {
                        submenuList = submenu.parentElement.querySelector(".fd-menu__sublist");
                        submenuLink = submenu.parentElement.querySelector(".fd-menu__link");
                    }
                    if (submenuList) {
                        if (!submenuLink.classList.contains("is-expanded")) {
                            if (submenu.classList.contains("fd-menu__item")) scope.hideAllSubmenus(submenu.parentElement);
                            else scope.hideAllSubmenus(submenu.parentElement.parentElement);
                            submenuLink.classList.add("is-expanded");
                            submenuLink.setAttribute("aria-expanded", true);
                            submenuList.classList.remove("dg-hidden");
                            submenuList.setAttribute("aria-hidden", false);
                        } else {
                            submenuLink.classList.remove("is-expanded");
                            submenuLink.setAttribute("aria-expanded", false);
                            submenuList.classList.add("dg-hidden");
                            submenuList.setAttribute("aria-hidden", true);
                        }
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
                    if (isMenuOpen && !element[0].contains(event.originalTarget)) {
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
                scope.hideMenu = function (event) {
                    let menuButton = event.currentTarget.parentElement.querySelector(".fd-button--menu");
                    let target = event.toElement || event.relatedTarget;
                    if (target !== menuButton) {
                        event.currentTarget.classList.add("dg-hidden");
                    }
                };
                scope.menuButtonLeave = function (event) {
                    let target = event.toElement || event.relatedTarget;
                    if (!target.classList.contains("fd-menu__link")) {
                        scope.hideAllMenus();
                    }
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
                scope.submenuAction = function (submenu) {
                    let submenuList;
                    let submenuLink;
                    if (submenu.classList.contains("fd-menu__item")) {
                        submenuList = submenu.querySelector(".fd-menu__sublist");
                        submenuLink = submenu.querySelector(".fd-menu__link");
                    } else {
                        submenuList = submenu.parentElement.querySelector(".fd-menu__sublist");
                        submenuLink = submenu.parentElement.querySelector(".fd-menu__link");
                    }
                    if (submenuList) {
                        if (!submenuLink.classList.contains("is-expanded")) {
                            if (submenu.classList.contains("fd-menu__item")) scope.hideAllSubmenus(submenu.parentElement);
                            else scope.hideAllSubmenus(submenu.parentElement.parentElement);
                            submenuLink.classList.add("is-expanded");
                            submenuLink.setAttribute("aria-expanded", true);
                            submenuList.classList.remove("dg-hidden");
                            submenuList.setAttribute("aria-hidden", false);
                        } else {
                            submenuLink.classList.remove("is-expanded");
                            submenuLink.setAttribute("aria-expanded", false);
                            submenuList.classList.add("dg-hidden");
                            submenuList.setAttribute("aria-hidden", true);
                        }
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
            link: function (scope) {
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
                scope.submenuAction = function (submenu) {
                    let submenuList;
                    let submenuLink;
                    if (submenu.classList.contains("fd-menu__item")) {
                        submenuList = submenu.querySelector(".fd-menu__sublist");
                        submenuLink = submenu.querySelector(".fd-menu__link");
                    } else {
                        submenuList = submenu.parentElement.querySelector(".fd-menu__sublist");
                        submenuLink = submenu.parentElement.querySelector(".fd-menu__link");
                    }
                    if (submenuList) {
                        if (!submenuLink.classList.contains("is-expanded")) {
                            if (submenu.classList.contains("fd-menu__item")) scope.hideAllSubmenus(submenu.parentElement);
                            else scope.hideAllSubmenus(submenu.parentElement.parentElement);
                            submenuLink.classList.add("is-expanded");
                            submenuLink.setAttribute("aria-expanded", true);
                            submenuList.classList.remove("dg-hidden");
                            submenuList.setAttribute("aria-hidden", false);
                        } else {
                            submenuLink.classList.remove("is-expanded");
                            submenuLink.setAttribute("aria-expanded", false);
                            submenuList.classList.add("dg-hidden");
                            submenuList.setAttribute("aria-hidden", true);
                        }
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
    .directive('ideDialogs', ['messageHub', function (messageHub) {
        return {
            restrict: 'E',
            replace: true,
            link: function (scope, element) {
                let messageBox = element[0].querySelector("#dgIdeAlert");
                let alerts = [];
                scope.alert = {
                    title: "",
                    message: "",
                    type: "information", // information, error, success, warning
                };

                scope.clearAlerts = function () {
                    scope.alerts = [];
                    element[0].classList.add("dg-hidden");
                    messageBox.classList.remove("fd-message-box--active");
                };

                scope.showAlert = function () {
                    if (element[0].classList.contains("dg-hidden")) {
                        scope.alert = alerts[0];
                        messageBox.classList.add("fd-message-box--active");
                        element[0].classList.remove("dg-hidden");
                    }
                }

                scope.hideAlert = function () {
                    messageBox.classList.remove("fd-message-box--active");
                    element[0].classList.add("dg-hidden");
                    alerts.shift();
                    if (alerts.length > 0) scope.showAlert();
                }

                messageHub.onDidReceiveMessage(
                    'ide.alert',
                    function (msg) {
                        scope.$apply(function () {
                            let type;
                            if (msg.data.type) {
                                switch (msg.data.type.toLowerCase()) {
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
                                title: msg.data.title,
                                message: msg.data.message,
                                type: type,
                            });
                            scope.showAlert();
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
                    function (msg) {
                        scope.$apply(function () {
                            scope.message = msg.data;
                        });
                    },
                    true
                );
                messageHub.onDidReceiveMessage(
                    'ide.statusCaret',
                    function (msg) {
                        scope.$apply(function () {
                            scope.caret = msg.data;
                        });
                    },
                    true
                );
                messageHub.onDidReceiveMessage(
                    'ide.statusError',
                    function (msg) {
                        scope.$apply(function () {
                            scope.error = msg.data;
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
                viewsModel: '=',
                viewsLayoutViews: '@',
            },
            link: function (scope, element) {
                let views;
                if (scope.layoutViews) views = scope.layoutViews.split(',');
                else views = scope.viewsModel.views;
                let eventHandlers = scope.viewsModel.events;
                let viewSettings = scope.viewsModel.viewSettings;
                let layoutSettings = scope.viewsModel.layoutSettings;

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
