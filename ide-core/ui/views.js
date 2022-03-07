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
angular.module('ideUI', ['ideMessageHub'])
    .factory('Theme', [function () {
        let theme = JSON.parse(localStorage.getItem('DIRIGIBLE.theme'));
        return {
            reload: function () {
                theme = JSON.parse(localStorage.getItem('DIRIGIBLE.theme'));
            },
            getLinks: function () {
                return theme.links;
            },
            getType: function () {
                return theme.type;
            }
        }
    }])
    .directive('theme', ['Theme', 'messageHub', function (Theme, messageHub) {
        return {
            restrict: 'E',
            replace: true,
            link: function (scope) {
                scope.links = Theme.getLinks();
                messageHub.onDidReceiveMessage(
                    'ide.themeChange',
                    function () {
                        scope.$apply(function () {
                            Theme.reload();
                            scope.links = Theme.getLinks();
                        });
                    },
                    true
                );
            },
            template: '<link type="text/css" rel="stylesheet" ng-repeat="link in links" ng-href="{{ link }}">'
        };
    }])
    .directive('dgContextmenu', ['messageHub', '$window', function (messageHub, $window) {
        return {
            restrict: 'A',
            replace: false,
            scope: {
                callback: '&dgContextmenu'
            },
            link: function (scope, element) {
                scope.callback = scope.callback();
                element.on('contextmenu', function (event) {
                    event.preventDefault();
                    let posX;
                    let posY;
                    if ($window.frameElement) {
                        let frame = $window.frameElement.getBoundingClientRect();
                        posX = frame.x + event.clientX;
                        posY = frame.y + event.clientY;
                    } else {
                        posX = event.clientX;
                        posY = event.clientY;
                    }
                    let menu = scope.callback(event.target);
                    messageHub.postMessage(
                        'ide-contextmenu.open',
                        {
                            posX: posX,
                            posY: posY,
                            callbackTopic: menu.callbackTopic,
                            items: menu.items
                        },
                        true
                    );
                });
            }
        };
    }]);