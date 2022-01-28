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