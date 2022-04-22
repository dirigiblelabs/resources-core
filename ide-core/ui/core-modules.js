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
const defaultEditorId = "monaco"; // This has to go
angular.module('idePerspective', ['ngResource', 'ideTheming', 'ideMessageHub'])
    .constant('branding', brandingInfo)
    .constant('perspective', perspectiveData)
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
    .provider('Editors', function editorProvider() {
        this.$get = ['$http', function editorsFactory($http) {
            let editorProviders = {};
            let editorsForContentType = {};

            $http.get('/services/v4/js/ide-core/services/editors.js')
                .then(function (response) {
                    for (let i = 0; i < response.data.length; i++) {
                        editorProviders[response.data[i].id] = response.data[i].link;
                        for (let j = 0; j < response.data[i].contentTypes.length; j++) {
                            if (!editorsForContentType[response.data[i].contentTypes[j]]) {
                                editorsForContentType[response.data[i].contentTypes[j]] = [{
                                    'id': response.data[i].id,
                                    'label': response.data[i].label
                                }];
                            } else {
                                editorsForContentType[response.data[i].contentTypes[j]].push({
                                    'id': response.data[i].id,
                                    'label': response.data[i].label
                                });
                            }
                        }
                    }
                }, function (response) {
                    console.error("ide-core: could not get editors", response);
                });

            return {
                defaultEditorId: defaultEditorId,
                editorProviders: editorProviders,
                editorsForContentType: editorsForContentType
            };
        }];
    })
    .filter('removeSpaces', [function () {
        return function (string) {
            if (!angular.isString(string)) return string;
            return string.replace(/[\s]/g, '');
        };
    }])
    .directive('dgBrandTitle', ['perspective', 'branding', function (perspective, branding) {
        return {
            restrict: 'A',
            transclude: false,
            replace: true,
            link: function (scope) {
                scope.name = branding.name;
                scope.perspective = perspective;
            },
            template: '<title>{{perspective.name || "Loading..."}} | {{name}}</title>'
        };
    }])
    .directive('dgBrandIcon', ['branding', function (branding) {
        return {
            restrict: 'A',
            transclude: false,
            replace: true,
            link: function (scope) {
                scope.icon = branding.icons.faviconIco;
            },
            template: `<link rel="icon" type="image/x-icon" ng-href="{{icon}}">`
        };
    }])
    .directive('ideContextmenu', ['messageHub', function (messageHub) {
        return {
            restrict: 'E',
            replace: true,
            link: function (scope, element) {
                let openedMenuId = "";
                let menu = element[0].querySelector(".fd-menu");
                scope.menuItems = [];
                scope.callbackTopic = "";

                scope.menuClick = function (itemId, data) {
                    messageHub.postMessage(scope.callbackTopic, { itemId: itemId, data: data }, true);
                };

                element.on('click', function (event) {
                    event.stopPropagation();
                    element[0].classList.add("dg-hidden");
                    scope.hideAllSubmenus();
                });

                element.on('contextmenu', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    element[0].classList.add("dg-hidden");
                    scope.hideAllSubmenus();
                });

                scope.hideAllSubmenus = function () {
                    let submenus = element[0].querySelectorAll('.fd-menu__sublist[aria-hidden="false"]');
                    let submenusLinks = element[0].querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                }

                scope.menuHovered = function () {
                    if (openedMenuId !== "") {
                        let oldSubmenu = element[0].querySelector(`#${openedMenuId}`);
                        let oldSubmenuLink = element[0].querySelector(`span[aria-controls="${openedMenuId}"]`);
                        oldSubmenuLink.setAttribute("aria-expanded", false);
                        oldSubmenuLink.classList.remove("is-expanded");
                        oldSubmenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };

                scope.showSubmenu = function (submenuId) {
                    scope.hideAllSubmenus();
                    openedMenuId = submenuId;
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    let submenus = submenu.querySelectorAll('.fd-menu__sublist');
                    let submenusLinks = submenu.querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                    let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                    submenuLink.setAttribute("aria-expanded", true);
                    submenuLink.classList.add("is-expanded");
                    submenu.setAttribute("aria-hidden", false);
                };

                scope.hideSubmenu = function (submenuId, target) {
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    if (!submenu.contains(target)) {
                        let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuLink.classList.remove("is-expanded");
                        submenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };

                messageHub.onDidReceiveMessage(
                    'ide-contextmenu.open',
                    function (msg) {
                        scope.$apply(function () {
                            scope.menuItems = msg.data.items;
                            scope.callbackTopic = msg.data.callbackTopic;
                            menu.style.top = `${msg.data.posY}px`;
                            menu.style.left = `${msg.data.posX}px`;
                            element[0].classList.remove("dg-hidden");
                        })
                    },
                    true
                );
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/contextmenu.html'
        };
    }])
    .directive('ideContextmenuSubmenu', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                menuClick: "&",
                menuItems: "<",
                submenuIndex: "<",
            },
            link: function (scope, element, attr) {
                let openedMenuId = "";
                scope.menuClick = scope.menuClick();

                scope.menuHovered = function () {
                    if (openedMenuId !== "" && openedMenuId !== attr["id"]) {
                        let oldSubmenu = element[0].querySelector(`#${openedMenuId}`);
                        let oldSubmenuLink = element[0].querySelector(`span[aria-controls="${openedMenuId}"]`);
                        oldSubmenuLink.setAttribute("aria-expanded", false);
                        oldSubmenuLink.classList.remove("is-expanded");
                        oldSubmenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };

                scope.showSubmenu = function (submenuId) {
                    openedMenuId = submenuId;
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    let submenus = submenu.querySelectorAll('.fd-menu__sublist');
                    let submenusLinks = submenu.querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                    let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                    submenuLink.setAttribute("aria-expanded", true);
                    submenuLink.classList.add("is-expanded");
                    submenu.setAttribute("aria-hidden", false);
                };

                scope.hideSubmenu = function (submenuId, target) {
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    if (!submenu.contains(target)) {
                        let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuLink.classList.remove("is-expanded");
                        submenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/contextmenuSubmenu.html'
        };
    })
    .directive('ideHeader', ['$window', '$resource', 'branding', 'theming', 'User', 'messageHub', function ($window, $resource, branding, theming, User, messageHub) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                url: '@menuDataUrl',
                menu: '=?menuData'
            },
            link: function (scope, element) {
                let isMenuOpen = false;
                scope.themes = [];
                scope.currentTheme = theming.getCurrentTheme();
                scope.user = User.get();
                let menuBackdrop = element[0].querySelector(".dg-menu__backdrop");
                let themePopover = element[0].querySelector("#themePopover");
                let themePopoverButton = element[0].querySelector("#themePopoverButton");
                let userPopover = element[0].querySelector("#userPopover");
                let userPopoverButton = element[0].querySelector("#userPopoverButton");

                menuBackdrop.addEventListener('click', function (event) {
                    event.stopPropagation();
                    scope.backdropEvent();
                });

                menuBackdrop.addEventListener('contextmenu', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    scope.backdropEvent();
                });

                function toggleThemePopover(hidden = true) {
                    isMenuOpen = !hidden;
                    if (hidden) {
                        themePopover.classList.add("dg-hidden");
                        themePopover.setAttribute("aria-expanded", false);
                        themePopover.setAttribute("aria-hidden", true);
                        themePopoverButton.setAttribute("aria-expanded", false);
                    } else {
                        themePopover.classList.remove("dg-hidden");
                        themePopover.setAttribute("aria-expanded", true);
                        themePopover.setAttribute("aria-hidden", false);
                        themePopoverButton.setAttribute("aria-expanded", true);
                    }
                }

                function toggleUserPopover(hidden = true) {
                    isMenuOpen = !hidden;
                    if (hidden) {
                        userPopover.classList.add("dg-hidden");
                        userPopover.setAttribute("aria-expanded", false);
                        userPopover.setAttribute("aria-hidden", true);
                        userPopoverButton.setAttribute("aria-expanded", false);
                    } else {
                        userPopover.classList.remove("dg-hidden");
                        userPopover.setAttribute("aria-expanded", true);
                        userPopover.setAttribute("aria-hidden", false);
                        userPopoverButton.setAttribute("aria-expanded", true);
                    }
                }

                function loadMenu() {
                    scope.menu = $resource(scope.url).query();
                }

                scope.branding = branding;

                scope.showBackdrop = function () {
                    menuBackdrop.classList.remove("dg-hidden");
                };

                scope.hideBackdrop = function () {
                    menuBackdrop.classList.add("dg-hidden");
                };

                scope.backdropEvent = function () {
                    messageHub.triggerEvent('header-menu.closeAll', true);
                    if (isMenuOpen) {
                        if (!themePopover.classList.contains("dg-hidden")) {
                            toggleThemePopover(true);
                        }
                        if (!userPopover.classList.contains("dg-hidden")) {
                            toggleUserPopover(true);
                        }
                    }
                    scope.hideBackdrop();
                };

                messageHub.onDidReceiveMessage(
                    'ide-header.menuOpened',
                    function () {
                        if (isMenuOpen) {
                            if (!themePopover.classList.contains("dg-hidden")) {
                                toggleThemePopover(true);
                            }
                            if (!userPopover.classList.contains("dg-hidden")) {
                                toggleUserPopover(true);
                            }
                        }
                        scope.showBackdrop();
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'ide-header.menuClosed',
                    function () {
                        if (!isMenuOpen) scope.hideBackdrop();
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    'ide.themesLoaded',
                    function () {
                        scope.themes = theming.getThemes();
                    },
                    true
                );

                if (!scope.menu && scope.url)
                    loadMenu.call(scope);

                scope.menuClick = function (item) {
                    if (item.action === 'openView') {
                        messageHub.openView(item.id, { "test": "somedata" });
                    } else if (item.action === 'openPerspective') {
                        messageHub.openPerspective(item.link);
                    } else if (item.action === 'openDialogWindow') {
                        messageHub.showDialogWindow(item.dialogId);
                    } else if (item.action === 'open') {
                        window.open(item.data, '_blank');
                    } else if (item.event) {
                        messageHub.postMessage(item.event, item.data, true);
                    }
                };

                scope.themeButtonClicked = function () {
                    toggleUserPopover(true);
                    if (themePopover.classList.contains("dg-hidden")) {
                        scope.showBackdrop();
                        messageHub.triggerEvent('header-menu.closeAll', true);
                        let offset = themePopoverButton.getBoundingClientRect();
                        themePopover.style.top = `${offset.bottom}px`;
                        themePopover.style.right = `${$window.innerWidth - offset.right}px`;
                        toggleThemePopover(false);
                    } else {
                        scope.hideBackdrop();
                        toggleThemePopover(true);
                    }
                };

                scope.userButtonClicked = function () {
                    toggleThemePopover(true);
                    if (userPopover.classList.contains("dg-hidden")) {
                        scope.showBackdrop();
                        messageHub.triggerEvent('header-menu.closeAll', true);
                        let offset = userPopoverButton.getBoundingClientRect();
                        userPopover.style.top = `${offset.bottom}px`;
                        userPopover.style.right = `${$window.innerWidth - offset.right}px`;
                        toggleUserPopover(false);
                    } else {
                        scope.hideBackdrop();
                        toggleUserPopover(true);
                    }
                };

                scope.setTheme = function (themeId, name) {
                    scope.currentTheme.id = themeId;
                    scope.currentTheme.name = name;
                    theming.setTheme(themeId);
                    toggleThemePopover(true);
                };

                scope.resetTheme = function () {
                    scope.resetViews();
                };

                scope.resetViews = function () {
                    localStorage.clear();
                    theming.reset();
                    location.reload();
                };
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/ideHeader.html'
        };
    }])
    .directive("headerHamburgerMenu", ['messageHub', function (messageHub) {
        return {
            restrict: "E",
            replace: true,
            scope: {
                menuList: "<",
                menuHandler: "&",
            },
            link: function (scope, element) {
                let isMenuOpen = false;
                scope.menuHandler = scope.menuHandler();

                messageHub.onDidReceiveMessage(
                    'header-menu.closeAll',
                    function () {
                        if (isMenuOpen) scope.hideAllMenus();
                    },
                    true
                );

                scope.menuClicked = function (menuButton) {
                    let menu = menuButton.parentElement.querySelector(".fd-menu");
                    if (menu.classList.contains("dg-hidden")) {
                        scope.hideAllSubmenus(menu);
                        scope.hideAllMenus();
                        let offset = menuButton.getBoundingClientRect();
                        menu.style.top = `${offset.bottom}px`;
                        menu.style.left = `${offset.left}px`;
                        menu.classList.remove("dg-hidden");
                        messageHub.triggerEvent('ide-header.menuOpened', true);
                        isMenuOpen = true;
                    } else {
                        menu.classList.add("dg-hidden");
                        messageHub.triggerEvent('ide-header.menuClosed', true);
                        isMenuOpen = false;
                    }
                };

                scope.hideAllMenus = function () {
                    let menus = element[0].querySelectorAll(".fd-menu");
                    for (let i = 0; i < menus.length; i++) {
                        if (!menus[i].classList.contains("dg-hidden")) menus[i].classList.add("dg-hidden");
                    }
                    messageHub.triggerEvent('ide-header.menuClosed', true);
                    isMenuOpen = false;
                };

                scope.hideAllSubmenus = function () {
                    let submenus = element[0].querySelectorAll('.fd-menu__sublist[aria-hidden="false"]');
                    let submenusLinks = element[0].querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                };

                scope.showSubmenu = function (submenuId) {
                    scope.hideAllSubmenus();
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    let submenus = submenu.querySelectorAll('.fd-menu__sublist');
                    let submenusLinks = submenu.querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                    let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                    submenuLink.setAttribute("aria-expanded", true);
                    submenuLink.classList.add("is-expanded");
                    submenu.setAttribute("aria-hidden", false);
                };

                scope.hideSubmenu = function (submenuId, target) {
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    if (!submenu.contains(target)) {
                        let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuLink.classList.remove("is-expanded");
                        submenu.setAttribute("aria-hidden", true);
                    }
                };
            },
            templateUrl: "/services/v4/web/ide-core/ui/templates/headerHamburgerMenu.html",
        };
    }])
    .directive("headerMenu", ['messageHub', function (messageHub) {
        return {
            restrict: "E",
            replace: true,
            scope: {
                menuList: "<",
                menuHandler: "&",
            },
            link: function (scope, element) {
                let isMenuOpen = false;
                let openedMenuId = "";
                scope.menuHandler = scope.menuHandler();

                messageHub.onDidReceiveMessage(
                    'header-menu.closeAll',
                    function () {
                        if (isMenuOpen) {
                            scope.hideAllMenus();
                            scope.hideAllSubmenus();
                        }
                    },
                    true
                );

                scope.isScrollable = function (menuItems) {
                    for (let i = 0; i < menuItems.length; i++)
                        if (menuItems[i].items) return '';
                    return 'fd-menu--overflow fd-scrollbar dg-headermenu--overflow';
                }

                scope.menuHovered = function () {
                    if (openedMenuId !== "") {
                        let oldSubmenu = element[0].querySelector(`#${openedMenuId}`);
                        let oldSubmenuLink = element[0].querySelector(`span[aria-controls="${openedMenuId}"]`);
                        oldSubmenuLink.setAttribute("aria-expanded", false);
                        oldSubmenuLink.classList.remove("is-expanded");
                        oldSubmenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };

                scope.menuClicked = function (menuButton) {
                    let menu = menuButton.parentElement.querySelector(".fd-menu");
                    if (menu.classList.contains("dg-hidden")) {
                        scope.hideAllSubmenus(menu);
                        scope.hideAllMenus();
                        let offset = menuButton.getBoundingClientRect();
                        menu.style.top = `${offset.bottom}px`;
                        menu.style.left = `${offset.left}px`;
                        menu.classList.remove("dg-hidden");
                        messageHub.triggerEvent('ide-header.menuOpened', true);
                        isMenuOpen = true;
                    } else {
                        menu.classList.add("dg-hidden");
                        messageHub.triggerEvent('ide-header.menuClosed', true);
                        isMenuOpen = false;
                    }
                };

                scope.hideAllMenus = function () {
                    let menus = element[0].querySelectorAll(".fd-menu");
                    for (let i = 0; i < menus.length; i++) {
                        if (!menus[i].classList.contains("dg-hidden")) menus[i].classList.add("dg-hidden");
                    }
                    messageHub.triggerEvent('ide-header.menuClosed', true);
                    isMenuOpen = false;
                };

                scope.hideAllSubmenus = function () {
                    let submenus = element[0].querySelectorAll('.fd-menu__sublist[aria-hidden="false"]');
                    let submenusLinks = element[0].querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                };

                scope.showSubmenu = function (submenuId) {
                    scope.hideAllSubmenus();
                    openedMenuId = submenuId;
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    let submenus = submenu.querySelectorAll('.fd-menu__sublist');
                    let submenusLinks = submenu.querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                    let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                    submenuLink.setAttribute("aria-expanded", true);
                    submenuLink.classList.add("is-expanded");
                    submenu.setAttribute("aria-hidden", false);
                };

                scope.hideSubmenu = function (submenuId, target) {
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    if (!submenu.contains(target)) {
                        let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuLink.classList.remove("is-expanded");
                        submenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };

                scope.menuItemClick = function (item, subItem) {
                    scope.hideAllMenus();
                    scope.menuHandler(item, subItem);
                };
            },
            templateUrl: "/services/v4/web/ide-core/ui/templates/headerMenu.html",
        };
    }])
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
                idPrefix: "<",
            },
            link: function (scope, element, attr) {
                let openedMenuId = "";
                scope.hideMenuFn = scope.hideMenuFn();
                scope.menuHandler = scope.menuHandler();

                scope.isScrollable = function (menuItems) {
                    for (let i = 0; i < menuItems.length; i++)
                        if (menuItems[i].items) return "";
                    return "fd-scrollbar dg-menu__sublist--overflow";
                }

                scope.menuHovered = function () {
                    if (openedMenuId !== "" && openedMenuId !== attr["id"]) {
                        let oldSubmenu = element[0].querySelector(`#${openedMenuId}`);
                        let oldSubmenuLink = element[0].querySelector(`span[aria-controls="${openedMenuId}"]`);
                        oldSubmenuLink.setAttribute("aria-expanded", false);
                        oldSubmenuLink.classList.remove("is-expanded");
                        oldSubmenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };

                scope.hideAllSubmenus = function () {
                    let submenus = element[0].querySelectorAll('.fd-menu__sublist[aria-hidden="false"]');
                    let submenusLinks = element[0].querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                };

                scope.showSubmenu = function (submenuId) {
                    scope.hideAllSubmenus();
                    openedMenuId = submenuId;
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    let submenus = submenu.querySelectorAll('.fd-menu__sublist');
                    let submenusLinks = submenu.querySelectorAll('.is-expanded');
                    for (let i = 0; i < submenus.length; i++)
                        submenus[i].setAttribute("aria-hidden", true);
                    for (let i = 0; i < submenusLinks.length; i++) {
                        submenusLinks[i].setAttribute("aria-expanded", false);
                        submenusLinks[i].classList.remove("is-expanded");
                    }
                    let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                    submenuLink.setAttribute("aria-expanded", true);
                    submenuLink.classList.add("is-expanded");
                    submenu.setAttribute("aria-hidden", false);
                };

                scope.hideSubmenu = function (submenuId, target) {
                    let submenu = element[0].querySelector(`#${submenuId}`);
                    if (!submenu.contains(target)) {
                        let submenuLink = element[0].querySelector(`span[aria-controls="${submenuId}"]`);
                        submenuLink.setAttribute("aria-expanded", false);
                        submenuLink.classList.remove("is-expanded");
                        submenu.setAttribute("aria-hidden", true);
                        openedMenuId = "";
                    }
                };

                scope.menuItemClick = function (item, subItem) {
                    scope.hideMenuFn();
                    if (scope.isToplevel) scope.menuHandler(subItem); // Temp fix for legacy menu api
                    else scope.menuHandler(item, subItem);
                };
            },
            templateUrl: "/services/v4/web/ide-core/ui/templates/headerSubmenu.html",
        };
    })
    .directive('ideContainer', ['perspective', function (perspective) {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            link: {
                pre: function (scope) {
                    scope.shouldLoad = true;
                    if (!perspective.id || !perspective.name) {
                        console.error('<ide-container> requires perspective service data');
                        scope.shouldLoad = false;
                    }
                },
            },
            template: `<div class="dg-main-container">
                <ide-sidebar></ide-sidebar>
                <ng-transclude ng-if="shouldLoad" class="dg-perspective-container"></ng-transclude>
            </div>`
        }
    }])
    .directive('ideSidebar', ['Perspectives', 'perspective', function (Perspectives, perspective) {
        return {
            restrict: 'E',
            replace: true,
            link: {
                pre: function (scope) {
                    scope.activeId = perspective.id;
                    scope.perspectives = Perspectives.query();
                    scope.getIcon = function (icon) {
                        if (icon) return icon;
                        return "/services/v4/web/resources/images/unknown.svg";
                    }
                },
            },
            templateUrl: '/services/v4/web/ide-core/ui/templates/ideSidebar.html'
        }
    }])
    /**
     * Used for Dialogs and Window Dialogs
     */
    .directive('ideDialogs', ['messageHub', 'DialogWindows', 'perspective', function (messageHub, DialogWindows, perspective) {
        return {
            restrict: 'E',
            replace: true,
            link: function (scope, element) {
                let dialogWindows = DialogWindows.query();
                let messageBox = element[0].querySelector("#dgIdeAlert");
                let ideDialog = element[0].querySelector("#dgIdeDialog");
                let ideFormDialog = element[0].querySelector("#dgIdeFormDialog");
                let ideSelectDialog = element[0].querySelector("#dgIdeSelectDialog");
                let ideDialogWindow = element[0].querySelector("#dgIdeDialogWindow");
                let alerts = [];
                let windows = [];
                let dialogs = [];
                let loadingDialogs = [];
                let formDialogs = [];
                let selectDialogs = [];
                scope.searchInput = { value: "" }; // AngularJS - "If you use ng-model, you have to use an object property, not just a variable"
                scope.activeDialog = null;
                scope.alert = {
                    title: "",
                    message: "",
                    type: "information", // information, error, success, warning
                };
                scope.dialog = {
                    id: null,
                    header: "",
                    subheader: "",
                    title: "",
                    body: "",
                    footer: "",
                    buttons: [],
                    callbackTopic: null,
                    loader: false,
                };
                scope.formDialog = {
                    id: null,
                    header: "",
                    subheader: "",
                    title: "",
                    footer: "",
                    buttons: [],
                    loadingMessage: "",
                    loader: false,
                    callbackTopic: null,
                    items: []
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
                    scope.activeDialog = 'alert';
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
                    scope.activeDialog = 'dialog';
                };

                scope.hideDialog = function (buttonId) {
                    if (buttonId && scope.dialog.callbackTopic) messageHub.postMessage(scope.dialog.callbackTopic, buttonId, true);
                    ideDialog.classList.remove("fd-dialog--active");
                    dialogs.shift();
                    checkForDialogs();
                };

                scope.showFormDialog = function () {
                    if (element[0].classList.contains("dg-hidden"))
                        element[0].classList.remove("dg-hidden");
                    scope.formDialog = formDialogs[0];
                    ideFormDialog.classList.add("fd-dialog--active");
                    scope.activeDialog = 'form';
                };

                scope.formDialogAction = function (buttonId) {
                    scope.formDialog.loader = true;
                    messageHub.postMessage(scope.formDialog.callbackTopic, { buttonId: buttonId, formData: scope.formDialog.items }, true);
                };

                scope.hideFormDialog = function () {
                    ideFormDialog.classList.remove("fd-dialog--active");
                    formDialogs.shift();
                    checkForDialogs();
                };

                scope.showLoadingDialog = function () {
                    if (element[0].classList.contains("dg-hidden"))
                        element[0].classList.remove("dg-hidden");
                    scope.dialog = loadingDialogs[0];
                    ideDialog.classList.add("fd-dialog--active");
                    scope.activeDialog = 'dialog';
                };

                scope.hideLoadingDialog = function () {
                    ideDialog.classList.remove("fd-dialog--active");
                    loadingDialogs.shift();
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
                    let value = scope.searchInput.value.toLowerCase();
                    if (value === "") scope.clearSearch();
                    else for (let i = 0; i < scope.selectDialog.listItems.length; i++) {
                        if (!scope.selectDialog.listItems[i].text.toLowerCase().includes(value))
                            scope.selectDialog.listItems[i].hidden = true;
                    }
                };

                scope.clearSearch = function () {
                    scope.searchInput.value = "";
                    for (let i = 0; i < scope.selectDialog.listItems.length; i++) {
                        scope.selectDialog.listItems[i].hidden = false;
                    }
                };

                scope.showSelectDialog = function () {
                    if (element[0].classList.contains("dg-hidden"))
                        element[0].classList.remove("dg-hidden");
                    scope.selectDialog = selectDialogs[0];
                    ideSelectDialog.classList.add("fd-dialog--active");
                    scope.activeDialog = 'select';
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
                    scope.activeDialog = 'window';
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
                    scope.activeDialog = null;
                    if (selectDialogs.length > 0) scope.showSelectDialog();
                    else if (formDialogs.length > 0) scope.showFormDialog();
                    else if (dialogs.length > 0) scope.showDialog();
                    else if (alerts.length > 0) scope.showAlert();
                    else if (loadingDialogs.length > 0) scope.showLoadingDialog();
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

                messageHub.onDidReceiveMessage(
                    "ide.formDialog.show",
                    function (data) {
                        scope.$apply(function () {
                            formDialogs.push({
                                id: data.id,
                                header: data.header,
                                subheader: data.subheader,
                                title: data.title,
                                items: data.items,
                                loadingMessage: data.loadingMessage,
                                loader: false,
                                footer: data.footer,
                                buttons: data.buttons,
                                callbackTopic: data.callbackTopic
                            });
                            scope.showFormDialog();
                        });
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    "ide.formDialog.update",
                    function (data) {
                        scope.$apply(function () {
                            if (scope.formDialog && data.id === scope.formDialog.id) {
                                scope.formDialog.items = data.items;
                                if (data.subheader)
                                    scope.formDialog.subheader = data.subheader;
                                if (data.footer)
                                    scope.formDialog.footer = data.footer;
                                if (data.loadingMessage)
                                    scope.formDialog.loadingMessage = data.loadingMessage;
                                scope.formDialog.loader = false;
                            } else {
                                for (let i = 0; i < formDialogs.length; i++) {
                                    if (formDialogs[i].id === data.id) {
                                        formDialogs[i].items = data.items;
                                        if (data.subheader)
                                            formDialogs[i].subheader = data.subheader;
                                        if (data.footer)
                                            formDialogs[i].footer = data.footer;
                                        if (data.loadingMessage)
                                            formDialogs[i].loadingMessage = data.loadingMessage;
                                        formDialogs[i].loader = false;
                                        break;
                                    }
                                }
                            }
                        });
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    "ide.formDialog.hide",
                    function () {
                        scope.$apply(function () {
                            scope.hideFormDialog();
                        });
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    "ide.loadingDialog.show",
                    function (data) {
                        scope.$apply(function () {
                            loadingDialogs.push({
                                id: data.id,
                                title: data.title,
                                header: '',
                                subheader: '',
                                footer: '',
                                status: data.status,
                                loader: true,
                            });
                            scope.showLoadingDialog();
                        });
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    "ide.loadingDialog.update",
                    function (data) {
                        scope.$apply(function () {
                            if (scope.dialog && data.id === scope.dialog.id) {
                                scope.dialog.status = data.status;
                            } else {
                                for (let i = 0; i < loadingDialogs.length; i++) {
                                    if (loadingDialogs[i].id === data.id) {
                                        loadingDialogs[i].status = data.status;
                                        break;
                                    }
                                }
                            }
                        });
                    },
                    true
                );

                messageHub.onDidReceiveMessage(
                    "ide.loadingDialog.hide",
                    function () {
                        scope.$apply(function () {
                            scope.hideLoadingDialog();
                        });
                    },
                    true
                );

                scope.inputValidation = function (isValid, item) {
                    if (isValid) {
                        item.error = false;
                    } else {
                        item.error = true;
                    }
                };

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
                                    if (data.params) {
                                        data.params['container'] = 'dialog';
                                        data.params['perspectiveId'] = perspective.id;
                                    } else {
                                        data.parameters = {
                                            container: 'layout',
                                            perspectiveId: perspective.id,
                                        };
                                    }
                                    found = true;
                                    windows.push({
                                        title: dialogWindows[i].title,
                                        dialogWindowId: dialogWindows[i].id,
                                        callbackTopic: data.callbackTopic,
                                        link: dialogWindows[i].link,
                                        params: JSON.stringify(data.params),
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
    }]);