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
angular.module('ideUI', ['ngAria', 'ideMessageHub'])
    .factory('uuid', function () {
        return {
            generate: function () {
                function _p8(s) {
                    let p = (Math.random().toString(16) + "000000000").substr(2, 8);
                    return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
                }
                return _p8() + _p8(true) + _p8(true) + _p8();
            }
        };
    }).factory('Theme', [function () {
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
    }]).directive('theme', ['Theme', 'messageHub', function (Theme, messageHub) {
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
    }]).directive('dgContextmenu', ['messageHub', '$window', function (messageHub, $window) {
        return {
            restrict: 'A',
            replace: false,
            scope: {
                callback: '&dgContextmenu',
                includedElements: '=',
                excludedElements: '=',
            },
            link: function (scope, element) {
                scope.callback = scope.callback();
                element.on('contextmenu', function (event) {
                    if (scope.includedElements) {
                        let isIncluded = false;
                        if (scope.includedElements.ids && scope.includedElements.ids.includes(event.target.id)) isIncluded = true;
                        if (!isIncluded && scope.includedElements.classes) {
                            for (let i = 0; i < scope.includedElements.classes.length; i++) {
                                if (event.target.classList.contains(scope.includedElements.classes[i]))
                                    isIncluded = true;
                            }
                        }
                        if (!isIncluded && scope.includedElements.types && scope.includedElements.types.includes(event.target.tagName)) isIncluded = true;
                        if (!isIncluded) return;
                    } else if (scope.excludedElements) {
                        if (scope.excludedElements.ids && scope.excludedElements.ids.includes(event.target.id)) return;
                        if (scope.excludedElements.classes) {
                            for (let i = 0; i < scope.excludedElements.classes.length; i++) {
                                if (event.target.classList.contains(scope.excludedElements.classes[i])) return;
                            }
                        }
                        if (scope.excludedElements.types && scope.excludedElements.types.includes(event.target.tagName)) return;
                    }
                    event.preventDefault();
                    let menu = scope.callback(event.target);
                    if (menu) {
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
                    }
                });
            }
        };
    }]).directive('fdScrollbar', [function () {
        return {
            restrict: 'AE',
            transclude: true,
            replace: true,
            template: `<div class="fd-scrollbar" ng-transclude><div>`,
        }
    }]).directive('fdAvatar', [function () {
        /**
         * fdText: String - One or two letters representing a username or something similiar.
         * accentColor: String - The number of the accent color to be applied. Ranges from 1 to 10. Omitting this will result in a transparent avatar.
         * tile: Boolean - Avatar with a tile icon background.
         * fdPlaceholder: Boolean - The avatar will have a placeholder background.
         * fdSize: String - The size of the avatar. Possible options are 'xs', 's', 'm', 'l' and 'xl'. Default is 'xs'.
         * glyph: String - Icon class.
         * fdBorder: Boolean - Show border around avatar.
         * circle: Boolean - Avatar is in a circular shape.
         * zoomIcon: String -  Icon class.
         * zoomLabel: String - ARIA description of the zoom button.
         * image: String - Link to an image.
         */
        return {
            restrict: 'E',
            transclude: false,
            replace: true,
            scope: {
                fdText: '@',
                accentColor: '@',
                tile: '@',
                fdPlaceholder: '@',
                fdSize: '@',
                glyph: '@',
                fdBorder: '@',
                circle: '@',
                zoomIcon: '@',
                zoomLabel: '@',
                image: '@',
            },
            link: function (scope, element, attrs) {
                if (!attrs.ariaLabel)
                    console.error('fd-avatar error: You should provide a description using the "aria-label" attribute');
                if (scope.zoomIcon && !scope.zoomLabel)
                    console.error('fd-avatar error: You should provide a description of the zoom button using the "zoom-label" attribute');

                if (scope.image) {
                    if (scope.fdText) scope.fdText = '';
                    element[0].style.backgroundImage = `url("${scope.image}")`;
                    element[0].setAttribute("role", "img");
                }

                scope.getClasses = function () {
                    let classList = [];
                    if (scope.tile === 'true') classList.push('fd-avatar--tile');
                    else {
                        if (scope.accentColor) classList.push(`fd-avatar--accent-color-${scope.accentColor}`);
                        else {
                            if (scope.fdPlaceholder) classList.push('fd-avatar--placeholder');
                            else classList.push('fd-avatar--transparent');
                        }
                    }
                    if (scope.fdSize) classList.push(`fd-avatar--${scope.fdSize}`);
                    else classList.push('fd-avatar--xs');
                    if (scope.fdBorder === 'true') classList.push('fd-avatar--border');
                    if (scope.circle === 'true') classList.push('fd-avatar--circle');
                    return classList.join(' ');
                };
                scope.getIconClass = function () {
                    if (scope.glyph) return scope.glyph;
                };
            },
            template: `<span class="fd-avatar" ng-class="getClasses()">
                <i ng-if="!fdText && !image" class="fd-avatar__icon" ng-class="getIconClass()" role="presentation"></i>
                {{ fdText }}
                <i ng-if="zoomIcon" class="fd-avatar__zoom-icon" ng-class="zoomIcon" aria-label="{{ zoomLabel }}"></i>
            </span>`,
        }
    }]).directive('fdBusyIndicator', [function () {
        /**
         * fdSize: String - The size of the avatar. Possible options are 'm' and 'l'.
         * fdHidden: Boolean - Show/hide the busy indicator.
         * contrast: Boolean - Contrast mode.
         */
        return {
            restrict: 'E',
            transclude: false,
            replace: true,
            scope: {
                fdSize: '@',
                fdHidden: '@',
                contrast: '@',
            },
            link: {
                pre: function (scope) {
                    if (!scope.fdHidden)
                        scope.fdHidden = false;
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.fdSize) classList.push(`fd-busy-indicator--${scope.fdSize}`);
                        if (scope.contrast === 'true') classList.push('contrast');
                        return classList.join(' ');
                    }
                },
            },
            template: `<div class="fd-busy-indicator" ng-class="getClasses()" aria-hidden="{{ fdHidden }}" aria-label="Loading">
                <div class="fd-busy-indicator--circle-0"></div>
                <div class="fd-busy-indicator--circle-1"></div>
                <div class="fd-busy-indicator--circle-2"></div>
            </div>`,
        }
    }]).directive('fdFieldset', [function () {
        /**
         * fdLabel: String - Title for the legend.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                fdLabel: '@',
            },
            template: `<fieldset class="fd-fieldset">
                <legend ng-if="fdLabel" class="fd-fieldset__legend">{{ fdLabel }}</legend>
                <ng-transclude></ng-transclude>
            </fieldset>`,
        }
    }]).directive('fdFormGroup', ['uuid', function (uuid) {
        /**
         * fdInline: Boolean - Form items are displayed horizontally.
         * fdHeader: String - Text for the group header.
         * compact: Boolean - Heaader size.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                fdInline: '@',
                fdHeader: '@',
                compact: '@',
            },
            link: {
                pre: function (scope, element) {
                    if (scope.fdHeader) {
                        scope.headerId = `fgh${uuid.generate()}`;
                        element.attr('aria-labelledby', scope.headerId);
                    }
                }
            },
            template: `<div class="fd-form-group" ng-class="{'true': 'fd-form-group--inline'}[fdInline]" role="group">
                <fd-form-group-header ng-if="fdHeader" header-id="{{ headerId }}" compact="{{ compact }}">{{ fdHeader }}</fd-form-group-header>
                <ng-transclude></ng-transclude>
            </div>`,
        }
    }]).directive('fdFormGroupHeader', [function () {
        /**
         * compact: Boolean - Heaader size.
         * headerId: String - Id for the header element. Used mostly because of 'aria-labelledby'.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                compact: '@',
                headerId: '@'
            },
            template: `<div class="fd-form-group__header" ng-class="{'true': 'fd-form-group__header--compact'}[compact]"><h1 id="{{ headerId }}" class="fd-form-group__header-text" ng-transclude></h1></div>`,
        }
    }]).directive('fdFormItem', [function () {
        /**
         * horizontal: Boolean - If true, items will be displayed horizontally.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                horizontal: '@',
            },
            template: `<div class="fd-form-item" ng-class="{'true':'fd-form-item--horizontal'}[horizontal]" ng-transclude></div>`,
        }
    }]).directive('fdFormLabel', [function () {
        /**
         * fdColon: Boolean - Puts a colon at the end of the label.
         * fdRequired: Boolean - If the checkbox is required.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                fdRequired: '@',
                fdColon: '@',
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.fdColon === 'true') classList.push('fd-form-label--colon');
                        if (scope.fdRequired === 'true') classList.push('fd-form-label--required');
                        return classList.join(' ');
                    };
                },
            },
            template: `<label class="fd-form-label" ng-class="getClasses()" ng-required="fdRequired === 'true'" ng-transclude></label>`,
        }
    }]).directive('fdFormHeader', [function () {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            template: `<div class="fd-form-header"><span class="fd-form-header__text" ng-transclude></span></div>`,
        }
    }]).directive('fdInput', [function () {
        /**
         * compact: Boolean - Input size.
         * fdRequired: Boolean - If the input is required.
         * fdDisabled: Boolean - If the input is disabled.
         * inGroup: Boolean - If the input is inside an fd-input-group element.
         * state: String - You have five options - 'error', 'success', 'warning' and 'information'.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                compact: '@',
                fdRequired: '@',
                fdDisabled: '@',
                inGroup: '@',
                state: '@',
            },
            link: {
                pre: function (scope, element, attrs) {
                    if (!attrs.type)
                        console.error('fd-input error: Inputs must have the "type" HTML attribute');
                    else {
                        let forbiddenTypes = ['checkbox', 'radio', 'file', 'image', 'range'];
                        if (forbiddenTypes.includes(attrs.type))
                            console.error('fd-input error: Invalid input type. Possible options are "color", "date", "datetime-local", "email", "hidden", "month", "number", "password", "search", "tel", "text", "time", "url" and "week".');
                    }
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-input--compact');
                        if (scope.state) classList.push(`is-${scope.state}`);
                        if (scope.fdDisabled === 'true') classList.push('is-disabled');
                        if (scope.inGroup === "true") classList.push('fd-input-group__input');
                        return classList.join(' ');
                    };
                },
            },
            template: `<input class="fd-input" ng-class="getClasses()" ng-disabled="fdDisabled" ng-required="fdRequired === 'true'" ng-transclude>`,
        }
    }]).directive('fdInputGroup', [function () {
        /**
         * compact: Boolean - Input size.
         * fdRequired: Boolean - If the input is required.
         * state: String - You have five options - 'error', 'success', 'warning' and 'information'.
         * fdFocus: Boolean - If the input group is in a focused state.
         * fdDisabled: Boolean - If the input group is disabled.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                compact: '@',
                fdRequired: '@',
                fdFocus: '@',
                fdDisabled: '@',
                state: '@',
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-input--compact');
                        if (scope.state) classList.push(`is-${scope.state}`);
                        if (scope.fdFocus === 'true') classList.push('is-focus');
                        if (scope.fdDisabled === 'true') classList.push('is-disabled');
                        return classList.join(' ');
                    };
                },
            },
            template: `<div class="fd-input-group" ng-class="getClasses()" ng-disabled="fdDisabled" ng-transclude></div>`,
        }
    }]).directive('fdInputGroupAddon', [function () {
        /**
         * compact: Boolean - Addon size.
         * hasButton: Boolean - Addon contains a button.
         * isReadonly: Boolean - If the addon is in readonly mode.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                compact: '@',
                hasButton: '@',
                isReadonly: '@'
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-input-group__addon--compact');
                        if (scope.isReadonly) classList.push('fd-input-group__addon--readonly');
                        if (scope.hasButton === 'true') classList.push('fd-input-group__addon--button');
                        return classList.join(' ');
                    };
                },
            },
            template: `<span class="fd-input-group__addon" ng-class="getClasses()" ng-transclude></span>`,
        }
    }]).directive('fdFormInputMessageGroup', ['uuid', function (uuid) {
        /**
         * fdInactive: Boolean - If the message popover should not be shown.
         */
        return {
            restrict: 'E',
            transclude: {
                'control': 'fdInput',
                'message': 'fdFormMessage',
            },
            scope: {
                fdInactive: '@',
            },
            replace: true,
            link: {
                pre: function (scope) {
                    scope.popoverId = `fimg${uuid.generate()}`;
                },
                post: function (scope, element) {
                    element.on('focusout', function () {
                        if (scope.fdInactive !== "true")
                            scope.$apply(scope.togglePopover());
                    });
                    scope.$watch('fdInactive', function () {
                        if (scope.fdInactive === "true") {
                            if (!scope.popoverControl) {
                                scope.popoverControl = element[0].querySelector(`[aria-controls="${scope.popoverId}"]`);
                                scope.popoverBody = element[0].querySelector(`#${scope.popoverId}`);
                            }
                            scope.popoverControl.setAttribute('aria-expanded', 'false');
                            scope.popoverBody.setAttribute('aria-hidden', 'true');
                        }
                    });
                    scope.togglePopover = function () {
                        if (scope.fdInactive !== "true") {
                            if (!scope.popoverControl) {
                                scope.popoverControl = element[0].querySelector(`[aria-controls="${scope.popoverId}"]`);
                                scope.popoverBody = element[0].querySelector(`#${scope.popoverId}`);
                            }
                            if (scope.popoverBody.getAttribute('aria-hidden') === 'true') {
                                scope.popoverControl.setAttribute('aria-expanded', 'true');
                                scope.popoverBody.setAttribute('aria-hidden', 'false');
                            } else {
                                scope.popoverControl.setAttribute('aria-expanded', 'false');
                                scope.popoverBody.setAttribute('aria-hidden', 'true');
                            };
                        }
                    };
                },
            },
            template: `<div class="fd-form-input-message-group fd-popover fd-popover--input-message-group">
                <div class="fd-popover__control" aria-controls="{{ popoverId }}" aria-expanded="false" aria-haspopup="true" ng-click="togglePopover()" ng-transclude="control"></div>
                <div class="fd-popover__body fd-popover__body--no-arrow" aria-hidden="true" id="{{ popoverId }}" ng-transclude="message"></div>
            </div>`,
        }
    }]).directive('fdFormMessage', [function () {
        /**
         * fdType: String - The type of message. Possible values are 'error', 'information', 'success' and 'warning'.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                fdType: '@',
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        if (scope.fdType) return `fd-form-message--${scope.fdType}`;
                        else return '';
                    };
                },
            },
            template: '<div class="fd-form-message" ng-class="getClasses()" ng-transclude></div>',
        }
    }]).directive('fdCheckbox', [function () {
        /**
         * compact: Boolean - Checkbox size.
         * fdDisabled: Boolean - If the checkbox is disabled.
         * state: String - You have five options - 'error', 'success', 'warning' and 'information'.
         */
        return {
            restrict: 'E',
            transclude: false,
            replace: true,
            scope: {
                compact: '@',
                fdDisabled: '@',
                state: '@',
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-checkbox--compact');
                        if (scope.state) classList.push(`is-${scope.state}`);
                        if (scope.fdDisabled === 'true') classList.push('is-disabled');
                        return classList.join(' ');
                    };
                },
            },
            template: `<input type="checkbox" class="fd-checkbox" ng-class="getClasses()" ng-disabled="fdDisabled">`,
        }
    }]).directive('fdCheckboxLabel', [function () {
        /**
         * compact: Boolean - Checkbox label size.
         * fdRequired: Boolean - If the checkbox is required.
         * empty: Boolean - If the label has text
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                compact: '@',
                fdRequired: '@',
                empty: '@'
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-checkbox__label--compact');
                        if (scope.fdRequired === 'true') classList.push('fd-checkbox__label--required');
                        return classList.join(' ');
                    };
                },
            },
            template: `<label class="fd-checkbox__label" ng-class="getClasses()">
                <div ng-if="empty!=='true'" class="fd-checkbox__label-container"><span class="fd-checkbox__text" ng-transclude></span></div>
            </label>`,
        }
    }]).directive('fdRadio', [function () {
        /**
         * compact: Boolean - Radio size.
         * fdDisabled: Boolean - If the radio button is disabled.
         * state: String - You have five options - 'error', 'success', 'warning' and 'information'.
         */
        return {
            restrict: 'E',
            transclude: false,
            replace: true,
            scope: {
                compact: '@',
                fdDisabled: '@',
                state: '@',
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-checkbox--compact');
                        if (scope.state) classList.push(`is-${scope.state}`);
                        if (scope.fdDisabled === 'true') classList.push('is-disabled');
                        return classList.join(' ');
                    };
                },
            },
            template: `<input type="radio" class="fd-radio" ng-class="getClasses()" ng-disabled="fdDisabled">`,
        }
    }]).directive('fdRadioLabel', [function () {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            template: '<label class="fd-radio__label" ng-transclude></label>',
        }
    }]).directive('fdTextarea', [function () {
        /**
         * compact: Boolean - Textarea size.
         * fdDisabled: Boolean - If the radio button is disabled.
         * state: String - You have five options - 'error', 'success', 'warning' and 'information'.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                compact: '@',
                fdDisabled: '@',
                state: '@',
            },
            link: {
                pre: function (scope) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-textarea--compact');
                        if (scope.state) classList.push(`is-${scope.state}`);
                        if (scope.fdDisabled === 'true') classList.push('is-disabled');
                        return classList.join(' ');
                    };
                },
            },
            template: `<textarea class="fd-textarea" ng-class="getClasses()" ng-disabled="fdDisabled" ng-transclude></textarea>`,
        }
    }]).directive('fdButton', ['uuid', function (uuid) {
        /**
         * fdLabel: String - Button text.
         * compact: Boolean - Button size.
         * badge: String/Number - Used for showing a badge inside the button.
         * glyph: String - Icon class/classes.
         * state: String - Possible options are 'selected', 'disabled' and 'disabled-focusable' (must be used with fdAriaDesc). If not specified, normal state is assumed.
         * fdType: String - 'emphasized', 'transparent', 'ghost', 'positive', 'negative' and 'attention'. If not specified, normal state is assumed.
         * fdAriaDesc: String - Short description of the button. If the button is disabled, it should contain the reason and what needs to be done to enable it.
         * isMenu: String - Accepts two values - "true" and "false".
         * isSplit: Boolean - (Internal use) If the button is part of a split button.
         * inGroup: Boolean - If the button is inside an fd-input-group-addon element.
         */
        return {
            restrict: 'AE',
            transclude: false,
            replace: true,
            scope: {
                fdLabel: '@',
                compact: '@',
                badge: '@',
                glyph: '@',
                state: '@',
                fdType: '@',
                fdAriaDesc: '@',
                isMenu: '@',
                isSplit: '@',
                inGroup: '@',
            },
            link: {
                pre: function (scope) {
                    if (scope.fdAriaDesc)
                        scope.buttonId = `b${uuid.generate()}`;
                },
                post: function (scope, element, attrs) {
                    scope.lastState = '';
                    if (!scope.fdLabel && scope.glyph && !attrs.ariaLabel)
                        console.error('fd-button error: Icon-only buttons must have the "aria-label" attribute');
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.lastState === 'disabled-focusable' && scope.state !== 'disabled-focusable')
                            element[0].setAttribute('aria-live', 'polite');
                        if (scope.isMenu === "true") {
                            if (scope.fdLabel && scope.glyph) {
                                scope.glyph = '';
                                console.error('fd-button error: menu buttons cannot have both text and icon');
                            }
                            scope.badge = '';
                            classList.push('fd-button--menu');
                        }
                        if (scope.fdType) classList.push(`fd-button--${scope.fdType}`);
                        if (scope.compact === "true") classList.push('fd-button--compact');
                        if (scope.inGroup === "true") classList.push('fd-input-group__button');
                        if (scope.state === "selected") {
                            element[0].removeAttribute('aria-disabled');
                            classList.push('is-selected');
                        }
                        else if (scope.state === "disabled") {
                            element[0].removeAttribute('aria-disabled');
                            classList.push('is-disabled');
                        }
                        else if (scope.state === "disabled-focusable") {
                            classList.push('is-disabled');
                            element[0].setAttribute('aria-disabled', true);
                            if (!scope.fdAriaDesc || scope.fdAriaDesc === '')
                                console.error('fd-button error: when using "disabled - focusable" state, you must provide a description.');
                            scope.lastState = scope.state;
                        } else element[0].removeAttribute('aria-disabled');
                        if (scope.fdAriaDesc) {
                            if (!scope.buttonId) scope.buttonId = uuid.generate();
                            element[0].setAttribute('aria-describedby', scope.buttonId);
                        }
                        else element[0].removeAttribute('aria-describedby');
                        return classList.join(' ');
                    };
                    scope.getTextClasses = function () {
                        let classList = [];
                        if (scope.isSplit === "true") {
                            if (scope.compact === "true") classList.push("fd-button-split__text--compact");
                            else classList.push("fd-button-split__text");
                        }
                        else classList.push("fd-button__text");
                        return classList.join(' ');
                    };
                }
            },
            template: `<button class="fd-button" ng-class="getClasses()" ng-disabled="{'disabled':true}[state]"
                aria-selected="{{ state === 'selected' ? true : false }}">
                <i ng-if="glyph" ng-class="glyph" role="presentation" aria-hidden="true"></i>
                <span ng-if="fdLabel" ng-class="getTextClasses()">{{ fdLabel }}</span>
                <span ng-if="badge" class="fd-button__badge">{{ badge }}</span>
                <i ng-if="isMenu" class="sap-icon--slim-arrow-down" aria-hidden="true"></i>
                <p ng-if="fdAriaDesc" class="fd-button__instructions" id="{{ uuid }}">{{ fdAriaDesc }}</p>
            </button>`,
        };
    }]).directive('fdSegmentedButton', [function () {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            link: function (scope, element, attrs) {
                if (!attrs.ariaLabel)
                    console.error('fd-segmented-button error: You should provide a description of the group using the "aria-label" attribute');
            },
            template: '<div class="fd-segmented-button" role="group" ng-transclude></div>'
        }
    }]).directive('fdSplitButton', ['uuid', function (uuid) {
        /**
         * mainAction: String - Main button text
         * fdAlign: String - Relative position of the popover. Possible values are "left" and "right". If not provided, right is assumed.
         * compact: Boolean - Button size.
         * glyph: String - Icon class for the dropdown button.
         * state: String - Possible options are 'selected' and 'disabled'. If not specified, normal state is assumed.
         * fdType: String - 'emphasized', 'transparent', 'ghost', 'positive', 'negative' and 'attention'. If not specified, normal state is assumed.
         * callback: Function - The passed function will be called when the main action button is clicked.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                mainAction: '@',
                fdAlign: '@',
                compact: '@',
                glyph: '@',
                state: '@',
                fdType: '@',
                callback: '&',
            },
            link: {
                pre: function (scope, element, attrs) {
                    if (scope.callback) scope.callback = scope.callback();
                    scope.popoverId = `sb${uuid.generate()}`;
                    if (!attrs.ariaLabel)
                        console.error('fd-split-button error: You should provide a description of the split button using the "aria-label" attribute');
                    scope.getSplitClasses = function () {
                        if (scope.fdType) return `fd-button-split--${scope.fdType}`;
                        else return 'fd-has-margin-right-small';
                    };
                },
                post: function (scope, element) {
                    element.on('focusout', function () {
                        scope.$apply(scope.hidePopover());
                    });

                    scope.mainActionClicked = function () {
                        scope.callback();
                    };

                    scope.hidePopover = function () {
                        if (scope.popoverBody) {
                            scope.popoverControl.setAttribute('aria-expanded', 'false');
                            scope.popoverBody.setAttribute('aria-hidden', 'true');
                        }
                    };

                    scope.togglePopover = function () {
                        if (!scope.popoverBody) {
                            scope.popoverControl = element[0].querySelector(`[aria-controls="${scope.popoverId}"]`);
                            scope.popoverBody = element[0].querySelector(`#${scope.popoverId}`);
                        }
                        if (scope.popoverBody.getAttribute('aria-hidden') === 'true') {
                            scope.popoverControl.setAttribute('aria-expanded', 'true');
                            scope.popoverBody.setAttribute('aria-hidden', 'false');
                        } else {
                            scope.popoverControl.setAttribute('aria-expanded', 'false');
                            scope.popoverBody.setAttribute('aria-hidden', 'true');
                        };
                    };
                },
            },
            template: `<div class="fd-button-split" ng-class="getSplitClasses()" role="group">
                <fd-button fd-label="{{ mainAction }}" state="{{ state }}" fd-type="{{ fdType }}" is-split="true" compact="{{ compact || 'false' }}" ng-click="mainActionClicked()">
                </fd-button>
                <fd-button glyph="{{ glyph || 'sap-icon--slim-arrow-down' }}" state="{{ state }}" fd-type="{{ fdType }}" compact="{{ compact || 'false' }}" aria-label="arrow down" aria-controls="{{ popoverId }}"
                    aria-haspopup="true" aria-expanded="{{ popupExpanded }}" ng-click="togglePopover()">
                </fd-button>
                <fd-popover-body no-arrow="true" fd-align="{{ fdAlign || 'right' }}">
                  <ng-transclude></ng-transclude>
                </fd-popover-body>
            </div>`,
        }
    }]).directive('fdPopover', ['uuid', function (uuid) {
        /**
         * fdAlign: String - Relative position of the popover. Possible values are "left" and "right". If not provided, left is assumed.
         */
        return {
            restrict: 'E',
            transclude: {
                'control': 'fdPopoverControl',
                'body': 'fdPopoverBody',
            },
            replace: true,
            scope: {
                fdAlign: '@',
            },
            link: {
                pre: function (scope) {
                    scope.popoverId = `p${uuid.generate()}`;
                },
                post: function (scope, element) {
                    element.on('focusout', function () {
                        scope.$apply(scope.hidePopover());
                    });

                    scope.hidePopover = function () {
                        if (scope.popoverBody) {
                            scope.popoverControl.setAttribute('aria-expanded', 'false');
                            scope.popoverBody.setAttribute('aria-hidden', 'true');
                        }
                    };

                    scope.togglePopover = function () {
                        if (!scope.popoverBody) {
                            scope.popoverControl = element[0].querySelector(`[aria-controls="${scope.popoverId}"]`);
                            scope.popoverBody = element[0].querySelector(`#${scope.popoverId}`);
                        }
                        if (scope.popoverBody.getAttribute('aria-hidden') === 'true') {
                            scope.popoverControl.setAttribute('aria-expanded', 'true');
                            scope.popoverBody.setAttribute('aria-hidden', 'false');
                        } else {
                            scope.popoverControl.setAttribute('aria-expanded', 'false');
                            scope.popoverBody.setAttribute('aria-hidden', 'true');
                        };
                    };
                }
            },
            template: `<div class="fd-popover" ng-class="{'right': 'fd-popover--right'}[fdAlign]">
                <ng-transclude ng-transclude-slot="control"></ng-transclude>
                <ng-transclude ng-transclude-slot="body"></ng-transclude>
            </div>`,
        }
    }]).directive('fdPopoverControl', [function () {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            link: function (scope, element) {
                if (scope.$parent && scope.$parent.popoverId) {
                    scope.control = element[0].firstElementChild;
                    scope.control.setAttribute('aria-controls', scope.$parent.popoverId);
                    scope.control.setAttribute('aria-expanded', 'false');
                    scope.control.setAttribute('aria-haspopup', 'true');
                    scope.control.addEventListener("click", function () {
                        scope.$parent.togglePopover();
                    });
                }
            },
            template: '<div class="fd-popover__control" ng-transclude></div>',
        }
    }]).directive('fdPopoverBody', [function () {
        /**
         * fdAlign: String - Relative position of the popover. Possible values are "left" and "right". If not provided, left is assumed.
         * maxHeight: Number - Maximum popover height in pixels before it starts scrolling. Default is 250 px.
         * noArrow: Boolean - If the popup should have an arrow.
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                maxHeight: '@',
                fdAlign: '@',
                noArrow: '@',
            },
            link: {
                pre: function (scope) {
                    if (scope.$parent && scope.$parent.popoverId)
                        scope.popoverId = scope.$parent.popoverId;
                    else if (scope.$parent && scope.$parent.$parent && scope.$parent.$parent.popoverId)
                        scope.popoverId = scope.$parent.$parent.popoverId;
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.fdAlign === 'right') classList.push('fd-popover__body--right');
                        if (scope.noArrow) classList.push('fd-popover__body--no-arrow');
                        return classList.join(' ');
                    };
                },
            },
            template: `<div id="{{ popoverId }}" class="fd-popover__body" ng-class="getClasses()" aria-hidden="true">
                <div class="fd-popover__wrapper fd-scrollbar" style="max-height:{{ maxHeight || 250 }}px;" ng-transclude>
                </div>
            </div>`,
        }
    }]).directive('fdMenu', [function () {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            template: `<nav aria-label="menu" class="fd-menu"><ul class="fd-menu__list" role="menu" ng-transclude></ul></nav>`
        }
    }]).directive('fdMenuItem', [function () {
        return {
            restrict: 'E',
            transclude: false,
            replace: true,
            scope: {
                title: '@',
                isActive: '@',
                isSelected: '@',
                iconBefore: '@',
                iconAfter: '@',
            },
            link: function (scope) {
                scope.getClasses = function () {
                    let classList = [];
                    if (scope.isActive) classList.push('is-active');
                    if (scope.isSelected) classList.push('is-selected');
                    return classList.join(' ');
                };
            },
            template: `<li class="fd-menu__item" role="presentation">
                <span class="fd-menu__link" ng-class="getClasses()" role="menuitem">
                    <span ng-if="iconBefore" class="fd-menu__addon-before">
                        <i class="{{ iconBefore }}" role="presentation"></i>
                    </span>
                    <span class="fd-menu__title">{{ title }}</span>
                    <span ng-if="iconAfter" class="fd-menu__addon-after">
                        <i class="{{ iconAfter }}" role="presentation"></i>
                    </span>
                </span>
            </li>`
        }
    }]).directive('fdMenuSeparator', [function () {
        return {
            restrict: 'E',
            transclude: false,
            replace: true,
            template: '<span class="fd-menu__separator"></span>'
        }
    }]).directive('fdTable', [function () {
        /**
         * innerBorders: String - Table inner borders. One of 'horizontal', 'vertical', 'none' or 'all' (default value)
         * outerBorders: String - Table outer borders. One of 'horizontal', 'vertical', 'none' or 'all (default value)
         * displayMode: String - The size of the table. Could be one of 'compact', 'condensed' or 'standard' (default value)
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                innerBorders: '@',
                outerBorders: '@',
                displayMode: '@'
            },
            controller: ['$scope', '$element', function ($scope, $element) {

                this.setAriaDescribedBy = function (id) {
                    $element[0].setAttribute('aria-describedby', id);
                };

                $scope.getClasses = function () {
                    let classList = ['fd-table'];
                    if ($scope.innerBorders === 'horizontal' || $scope.innerBorders === 'none') {
                        classList.push('fd-table--no-horizontal-borders');
                    }
                    if ($scope.innerBorders === 'vertical' || $scope.innerBorders === 'none') {
                        classList.push('fd-table--no-vertical-borders');
                    }
                    if ($scope.displayMode === 'compact') {
                        classList.push('fd-table--compact');
                    } else if ($scope.displayMode === 'condensed') {
                        classList.push('fd-table--condensed');
                    }
                    switch ($scope.outerBorders) {
                        case 'vertical':
                            classList.push('dg-table--no-outer-horizontal-borders');
                            break;
                        case 'horizontal':
                            classList.push('dg-table--no-outer-vertical-borders');
                            break;
                        case 'none':
                            classList.push('fd-table--no-outer-border');
                            break;
                    }
                    return classList.join(' ');
                };
            }],
            template: `<table ng-class="getClasses()" ng-transclude></table>`
        }
    }]).directive('fdTableCaption', ['uuid', function (uuid) {
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            require: '^fdTable',
            link: function (scope, element, attrs, tableCtrl) {
                let id = `fdt-${uuid.generate()}`
                element[0].setAttribute('id', id);
                tableCtrl.setAriaDescribedBy(id);
            },
            template: '<caption class="fd-table__caption" aria-live="polite" ng-transclude></caption>'
        }
    }]).directive('fdTableFixed', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            template: `<div class="fd-table--fixed" ng-transclude></div>`
        }
    }]).directive('fdTableHeader', [function () {
        /**
         * sticky: Boolean - Makes header sticky when scrolling the table
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                sticky: '<'
            },
            link: function (scope) {
                scope.getClasses = function () {
                    let classList = ['fd-table__header'];
                    if (scope.sticky) {
                        classList.push('dg-table__header-sticky')
                    }
                    return classList.join(' ');
                };
            },
            template: `<thead ng-class="getClasses()" ng-transclude></thead>`
        }
    }]).directive('fdTableBody', [function () {
        /**
         * innerBorders: String - Table inner borders. One of 'horizontal', 'vertical', 'none' or 'all' (default value)
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                innerBorders: '@'
            },
            link: function (scope) {
                scope.getClasses = function () {
                    let classList = ['fd-table__body'];
                    if (scope.innerBorders === 'horizontal' || scope.innerBorders === 'none') {
                        classList.push('fd-table__body--no-horizontal-borders');
                    }
                    if (scope.innerBorders === 'vertical' || scope.innerBorders === 'none') {
                        classList.push('fd-table__body--no-vertical-borders');
                    }
                    return classList.join(' ');
                };
            },
            template: `<tbody ng-class="getClasses()" ng-transclude></tbody>`
        }
    }]).directive('fdTableFooter', [function () {
        /**
         * sticky: Boolean - Makes footer sticky when scrolling the table
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                sticky: '<'
            },
            link: function (scope) {
                scope.getClasses = function () {
                    let classList = ['fd-table__footer'];
                    if (scope.sticky) {
                        classList.push('dg-table__footer-sticky')
                    }
                    return classList.join(' ');
                };
            },
            template: `<tfoot ng-class="getClasses()" ng-transclude></tfoot>`
        }
    }]).directive('fdTableRow', [function () {
        /**
         * selected: Boolean - Whether or not the table row is selected. Defaults to 'false'
         * activable: Boolean - Displays the row as active when clicked. Defaults to 'false'
         * hoverable: Boolean - Highlights the row on hover. Defaults to 'false'
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                selected: '<',
                activable: '<',
                hoverable: '<'
            },
            link: function (scope, element) {
                scope.$watch('selected', function () {
                    if (scope.selected) {
                        element[0].setAttribute('aria-selected', 'true');
                    } else {
                        element[0].removeAttribute('aria-selected');
                    }
                })
                scope.getClasses = function () {
                    let classList = ['fd-table__row'];
                    if (scope.activable) {
                        classList.push('fd-table__cell--activable');
                    }
                    if (scope.hoverable) {
                        classList.push('fd-table__cell--hoverable');
                    }
                    return classList.join(' ');
                };
            },
            template: `<tr ng-class="getClasses()" ng-transclude></tr>`
        }
    }]).directive('fdTableHeaderCell', [function () {
        /**
         * contentType: String - The type of the inner element. Could be one of 'checkbox', 'statusIndicator' or 'any' (default value)
         * fixed: Boolean|String - Renders the cell as fixed. Could be one of 'true', 'false' or 'last' (if that's the last fixed cell). Defaults to 'false'
         * activable: Boolean - Displays the cell as active when clicked. Defaults to 'false'
         * hoverable: Boolean - Highlights the cell on hover. Defaults to 'false'
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                contentType: '@',
                fixed: '@',
                activable: '<',
                hoverable: '<',
            },
            link: {
                post: function (scope, element) {
                    scope.getClasses = function () {
                        let classList = ['fd-table__cell'];
                        switch (scope.contentType) {
                            case 'checkbox':
                                classList.push('fd-table__cell--checkbox');
                                break;
                            case 'statusIndicator':
                                classList.push('fd-table__cell--status-indicator');
                                break;

                        }
                        if (scope.fixed) {
                            classList.push('fd-table__cell--fixed');
                            if (scope.fixed === 'last') {
                                classList.push('fd-table__cell--fixed-last');
                            }
                        }
                        if (scope.activable) {
                            classList.push('fd-table__cell--activable');
                        }
                        if (scope.hoverable) {
                            classList.push('fd-table__cell--hoverable');
                        }
                        return classList.join(' ');
                    };

                    if (element.closest('tbody').length > 0) {
                        element[0].setAttribute('scope', 'row');
                    } else if (element.closest('thead').length > 0) {
                        element[0].setAttribute('scope', 'col');
                    }
                }
            },
            template: `<th ng-class="getClasses()" ng-transclude></th>`
        }
    }]).directive('fdTableCell', [function () {
        /**
         * contentType: String - The type of the inner element. Could be one of 'checkbox', 'statusIndicator' or 'any' (default value)
         * fitContent: Boolean - Sets width to fit the cell content
         * activable: Boolean - Displays the cell as active when clicked. Defaults to 'false'
         * hoverable: Boolean - Highlights the cell on hover. Defaults to 'false'
         * navigated: Boolean - Displays the cell as navigated. Defaults to 'false'
         * noData: Boolean - Displays empty row
         * statusIndicator: String - the type of the status indicator. Could be one of 'valid', 'warning', 'error', 'information' or 'default' (default value)
         * nestingLevel: Number - The row nesting level (starting from 1) for tables with row groups 
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                contentType: '@',
                fitContent: '<',
                activable: '<',
                hoverable: '<',
                navigated: '<',
                noData: '<',
                statusIndicator: '@',
                nestingLevel: '<'
            },
            link: function (scope, element) {
                scope.getClasses = function () {
                    let classList = ['fd-table__cell'];
                    if (scope.noData) {
                        classList.push('fd-table__cell--no-data');
                        element[0].setAttribute('colspan', '100%');
                    }
                    switch (scope.contentType) {
                        case 'checkbox':
                            classList.push('fd-table__cell--checkbox');
                            break;
                        case 'statusIndicator':
                            classList.push('fd-table__cell--status-indicator');
                            break;
                    }
                    if (scope.statusIndicator) {
                        classList.push(`fd-table__cell--status-indicator--${scope.statusIndicator}`);
                    }
                    if (scope.fitContent) {
                        classList.push('fd-table__cell--fit-content');
                    }
                    if (scope.activable) {
                        classList.push('fd-table__cell--activable');
                    }
                    if (scope.hoverable) {
                        classList.push('fd-table__cell--hoverable');
                    }
                    if (scope.navigated) {
                        classList.push('fd-table__cell--navigated');
                    }
                    return classList.join(' ');
                };

                if (scope.nestingLevel) {
                    element[0].setAttribute('data-nesting-level', scope.nestingLevel);
                }
            },
            template: `<td ng-class="getClasses()" ng-transclude></td>`
        }
    }]).directive('fdTableGroup', [function () {
        return {
            restrict: 'A',
            controller: ['$scope', '$element', function ($scope, $element) {
                $element.addClass('fd-table--group');

                let groupCells = [];
                this.addGroupCell = function (element) {
                    groupCells.push(element);
                }

                this.updateNestedRowsVisibility = function (element, expanded) {
                    let rowExpanded = expanded;
                    let nestingLevel = $(element).data('nesting-level');
                    $(element).parent().nextAll('tr')
                        .each(function () {
                            const row = $(this);
                            let cells = row.children('td[data-nesting-level]');
                            if (cells.length === 0 || nestingLevel >= cells.first().data('nesting-level')) return false;

                            if (expanded) {
                                if (rowExpanded)
                                    row.removeClass('dg-hidden');

                                const currentRowExpanded = row.attr('aria-expanded');
                                if (currentRowExpanded !== undefined)
                                    rowExpanded = currentRowExpanded === 'true';
                            } else {
                                row.addClass('dg-hidden');
                            }
                        });
                }

                $element.ready(() => {
                    groupCells.sort((a, b) => $(b).data('nesting-level') - $(a).data('nesting-level'));
                    for (let element of groupCells) {
                        this.updateNestedRowsVisibility(element, $(element).parent().attr('aria-expanded') === 'true');
                    }
                })
            }]
        };
    }]).directive('fdTableGroupCell', [function () {
        /**
         * nestingLevel: Number - The row nesting level (starting from 1) for tables with row groups 
         * expanded: Boolean - Whether the row group is expanded or not
         */
        return {
            restrict: 'A',
            transclude: true,
            replace: true,
            scope: {
                nestingLevel: '<',
                expanded: '<'
            },
            require: '^fdTableGroup',
            link: function (scope, element, attrs, tableCtrl) {
                tableCtrl.addGroupCell(element);

                scope.getClasses = function () {
                    let classList = ['fd-table__expand'];

                    if (scope.expanded) {
                        classList.push('fd-table__expand--open');
                    }

                    return classList.join(' ');
                };

                scope.toggleExpanded = function () {
                    scope.expanded = !scope.expanded;
                    updateAriaExpanded();
                    tableCtrl.updateNestedRowsVisibility(element, scope.expanded);
                };

                const updateAriaExpanded = function () {
                    $(element).parent().attr('aria-expanded', scope.expanded ? 'true' : 'false');
                }

                if (scope.nestingLevel) {
                    element[0].setAttribute('data-nesting-level', scope.nestingLevel);
                }

                updateAriaExpanded();
            },
            template: `<td class="fd-table__cell fd-table__cell--group fd-table__cell--expand" colspan="100%" ng-click="toggleExpanded()">
                <span ng-class="getClasses()"></span>
                <span class="fd-table__text--no-wrap" ng-transclude></span>
            </td>`
        }
    }]).directive('fdToolbar', [function () {
        /**
         * type: String - The type of the toolbar. One of 'transparent', 'auto', 'info' or 'solid' (default value)
         * size: String - The size of the toolbar. One of 'cozy' or 'compact' (default value)
         * hasTitle: Boolean - Should be used whenever a title is required.
         * noBottomBorder: Boolean - Removes the bottom border of the toolbar
         * active: Boolean - Enables active and hover states
         */
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                type: '@',
                size: '@',
                hasTitle: '<',
                noBottomBorder: '<',
                active: '<'
            },
            link: function (scope) {
                scope.getClasses = function () {
                    let classList = ['fd-toolbar'];

                    switch (scope.type) {
                        case 'transparent':
                            classList.push('fd-toolbar--transparent');
                            break;
                        case 'auto':
                            classList.push('fd-toolbar--auto');
                            break;
                        case 'info':
                            classList.push('fd-toolbar--info');
                            break;
                        case 'solid':
                            classList.push('fd-toolbar--solid');
                            break;
                    }

                    if (scope.hasTitle) {
                        classList.push('fd-toolbar--title');
                    }

                    if (scope.noBottomBorder) {
                        classList.push('fd-toolbar--clear');
                    }

                    if (scope.active) {
                        classList.push('fd-toolbar--active');
                    }

                    if (scope.size === 'cozy') {
                        classList.push('fd-toolbar--cozy');
                    }

                    return classList.join(' ');
                };
            },
            template: '<div ng-class="getClasses()" ng-transclude></div>'
        }
    }]).directive('fdToolbarSpacer', [function () {
        /**
         * fixedWidth: Number|String - The fixed with of the spacer. Could be any valid css width value or number in pixels.  
         */
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                fixedWidth: '@'
            },
            link: function (scope) {
                scope.getClasses = function () {
                    let classList = ['fd-toolbar__spacer'];

                    if (scope.fixedWidth !== undefined) {
                        classList.push('fd-toolbar__spacer--fixed');
                    }

                    return classList.join(' ');
                };

                scope.getStyles = function () {
                    if (scope.fixedWidth !== undefined) {
                        let width = scope.fixedWidth;
                        return { width: Number.isFinite(width) ? `${width}px` : width };
                    }
                }
            },
            template: '<div ng-class="getClasses()" ng-style="getStyles()" ng-transclude></div>'
        }
    }]).directive('fdToolbarSeparator', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            template: '<span class="fd-toolbar__separator" ng-transclude></span>'
        }
    }]).directive('fdToolbarOverflow', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            template: `<fd-popover>
				<fd-popover-control>
					<fd-button compact="true" glyph="sap-icon--overflow" fd-type="transparent" aria-label="Toolbar overflow"></fd-button>
				</fd-popover-control>
				<fd-popover-body fd-align="right">
					<div class="fd-toolbar__overflow" ng-transclude></div>
				</fd-popover-body>
			</fd-popover>`
        }
    }]).directive('fdToolbarOverflowButton', [function () {
        /**
         * fdLabel: String - Button text.
         */
        return {
            restrict: 'EA',
            transclude: false,
            scope: {
                fdLabel: '@'
            },
            template: '<fd-button fd-type="transparent" class="fd-toolbar__overflow-button" fd-label="{{fdLabel}}"></fd-button>'
        }
    }]).directive('fdToolbarOverflowLabel', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            template: '<label class="fd-label fd-toolbar__overflow-label" ng-transclude></label>'
        }
    }]).directive('fdList', [function () {
        /**
         * compact: Boolean - Display the list in compact size mode
         * noBorder: Boolean - Removes the list borders
         * listType: String - One of 'selection', 'navigation' or 'navigation-indication'
         * fixedHeight: String|Number|Boolean - If true it expects the height to be specified explicitly (by css class or style). If number it will be treated as pixels otherwise it must be a valid css height value.
         * byline: Boolean - Whether the list is byline or standard
         */
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                compact: '<',
                noBorder: '<',
                listType: '@',
                fixedHeight: '@',
                byline: '<'
            },
            link: function (scope) {
                scope.getClasses = function () {
                    let classList = ['fd-list'];

                    if (scope.compact) {
                        classList.push('fd-list--compact');
                    }

                    if (scope.byline) {
                        classList.push('fd-list--byline');
                    }

                    if (scope.noBorder) {
                        classList.push('fd-list--no-border');
                    }

                    switch (scope.listType) {
                        case 'navigation-indication':
                            classList.push('fd-list--navigation-indication');
                        case 'navigation':
                            classList.push('fd-list--navigation');
                            break;
                        case 'selection':
                            classList.push('fd-list--selection');
                            break;
                    }

                    if (parseHeight(scope.fixedHeight)) {
                        classList.push('fd-list__infinite-scroll');
                    }

                    return classList.join(' ');
                }

                scope.getStyles = function () {
                    let height = parseHeight(scope.fixedHeight);
                    if (height && typeof height === 'string') {
                        return { height };
                    }
                }

                scope.getRole = function () {
                    return scope.listType === 'selection' ? 'listbox' : 'list';
                }

                const parseHeight = function (height) {
                    if (Number.isFinite(height)) {
                        return `${height}px`;
                    }
                    return height === 'true' ? true :
                        height === 'false' ? false : height;
                };
            },
            template: `<ul ng-class="getClasses()" ng-style="getStyles()" role="{{getRole()}}" ng-transclude>`
        }
    }]).directive('fdListItem', [function () {
        /**
         * interactive: Boolean - Makes the list item look interactive (clickable)
         * inactive: Boolean - Makes the list item look inactive (non-clickable)
         * selected: Boolean - Selects the list item. Should be used with 'selection' lists
         */
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                interactive: '<',
                inactive: '<',
                selected: '<'
            },
            controller: ['$scope', '$element', function ($scope, $element) {
                $scope.role = "listitem";

                this.addClass = function (className) {
                    $element.addClass(className);
                }

                this.setRole = function (role) {
                    $scope.role = role;
                }

                $scope.getClasses = function () {
                    let classList = ['fd-list__item'];

                    if ($scope.interactive) {
                        classList.push('fd-list__item--interractive');
                    }
                    if ($scope.inactive) {
                        classList.push('fd-list__item--inactive');
                    }
                    if ($scope.selected) {
                        classList.push('is-selected');
                    }

                    return classList.join(' ');
                }

                $scope.$watch('selected', function () {
                    if ($scope.selected) {
                        $element[0].setAttribute('aria-selected', 'true');
                    } else {
                        $element[0].removeAttribute('aria-selected');
                    }
                })
            }],
            template: `<li role="{{role}}" ng-class="getClasses()" ng-transclude></li>`
        }
    }]).directive('fdListTitle', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            template: '<span class="fd-list__title" ng-transclude></span>'
        }
    }]).directive('fdListButton', [function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                element.addClass('fd-list__button');
            }
        }
    }]).directive('fdListLink', [function () {
        /**
         * navigationIndicator: Boolean - Displays an arrow to indicate that the item is navigable (Should be used with 'navigation-indication' lists)
         * navigated: Boolean - Displays the list item as navigated
         * selected: Boolean - Selects the list item. Should be used with 'navigation' and 'navigation-indication' lists
         */
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            require: '^fdListItem',
            scope: {
                navigationIndicator: '<',
                navigated: '<',
                selected: '<'
            },
            link: function (scope, element, attrs, listItemCtrl) {
                listItemCtrl.addClass('fd-list__item--link');

                scope.getClasses = function () {
                    let classList = ['fd-list__link'];

                    if (scope.navigationIndicator) {
                        classList.push('fd-list__link--navigation-indicator');
                    }

                    if (scope.navigated) {
                        classList.push('is-navigated');
                    }

                    if (scope.selected) {
                        classList.push('is-selected');
                    }
                    return classList;
                }
            },
            template: '<a tabindex="0" ng-class="getClasses()" ng-transclude></a>'
        }
    }]).directive('fdListIcon', [function () {
        /**
         * glyph: String - Icon class.
         */
        return {
            restrict: 'EA',
            replace: true,
            scope: {
                glyph: '@'
            },
            link: function (scope) {
                if (!scope.glyph) {
                    console.error('fd-list-icon error: You should provide glpyh icon using the "glyph" attribute');
                }

                scope.getClasses = function () {
                    let classList = ['fd-list__icon'];
                    if (scope.glyph) {
                        classList.push(scope.glyph);
                    }
                    return classList.join(' ');
                }
            },
            template: '<i role="presentation" ng-class="getClasses()"></i>'
        }
    }]).directive('fdListActionItem', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            template: `<li role="listitem" class="fd-list__item fd-list__item--action">
                <button class="fd-list__title" ng-transclude></button>
            </li>`
        }
    }]).directive('fdListFormItem', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            require: '^fdListItem',
            link: function (scope, element, attrs, listItemCtrl) {
                listItemCtrl.setRole('option');
            },
            template: '<div class="fd-form-item fd-list__form-item" ng-transclude></div>'
        }
    }]).directive('fdListContent', [function () {
        /**
         * itemTitle: String - list item title
         * itemTitleId: String - list item title id
         * contentWrap: String - Allows the byline text to wrap
         * titleWrap: String - Allows the title text to wrap
         */
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                itemTitle: '@',
                itemTitleId: '@',
                contentWrap: '<',
                titleWrap: '<'
            },
            controller: ['$scope', '$element', function ($scope, $element) {
                this.addClass = function (className) {
                    $element.children().last().addClass(className);
                }

                $scope.getBylineClasses = function () {
                    let classList = ['fd-list__byline'];
                    if ($scope.contentWrap) {
                        classList.push('fd-list__byline--wrap');
                    }
                    return classList.join(' ');
                }

                $scope.getTitleClasses = function () {
                    let classList = ['fd-list__title'];
                    if ($scope.titleWrap) {
                        classList.push('fd-list__title--wrap');
                    }
                    return classList.join(' ');
                }

                if ($scope.itemTitleId) {
                    $element.children().first().attr('id', $scope.itemTitleId);
                }
            }],
            template: `<div class="fd-list__content">
                <div ng-class="getTitleClasses()">{{itemTitle}}</div>
                <div ng-class="getBylineClasses()" ng-transclude></div>
            </div>`
        }
    }]).directive('fdListGroupHeader', [function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            template: `<li role="listitem" class="fd-list__group-header" ng-transclude></li>`
        }
    }]).directive('fdListByline', [function () {
        /**
         * align: String - One of 'left' or 'right'
         * contentWrap: String - Allows the byline text to wrap. Relevant to left aligned content only
         * semanticStatus: String - One of 'neutral', 'positive', 'negative', 'critical' or 'informative'. Relevant to right aligned content only
         */
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                align: '@',
                contentWrap: '<',
                semanticStatus: '@'
            },
            require: '^fdListContent',
            link: function (scope, element, attrs, ctrl) {
                ctrl.addClass('fd-list__byline--2-col');

                const semanticStatuses = ['neutral', 'positive', 'negative', 'critical', 'informative'];

                if (scope.semanticStatus && !semanticStatuses.includes(scope.semanticStatus)) {
                    console.error(`fd-list-byline error: semantic-status must be one of: ${semanticStatuses.join(', ')}`);
                }

                if (scope.align !== 'left' && scope.align !== 'right') {
                    console.error(`fd-list-byline error: 'align' must be 'left' or 'right' `);
                }

                scope.getClasses = function () {
                    let classList = [];
                    switch (scope.align) {
                        case 'left':
                            classList.push('fd-list__byline-left');
                            if (scope.contentWrap) {
                                classList.push('fd-list__byline-left--wrap');
                            }
                            break;
                        case 'right':
                            classList.push('fd-list__byline-right');
                            if (semanticStatuses.includes(scope.semanticStatus)) {
                                classList.push(`fd-list__byline-right--${scope.semanticStatus}`);
                            }
                            break;
                    }

                    return classList.join(' ');
                }
            },
            template: `<div ng-class="getClasses()" ng-transclude></div>`
        }
    }]).directive('fdListThumbnail', [function () {
        /**
         * glyph: String - Icon class.
         * imageUrl: String - Path to the thumbnail image
         */
        return {
            restrict: 'EA',
            replace: true,
            scope: {
                glyph: '@',
                imageUrl: '@'
            },
            link: function (scope) {
                if (!scope.glyph && !scope.imageUrl) {
                    console.error('fd-list-thumbnail error: You should provide either glpyh icon or image');
                }

                scope.getClasses = function () {
                    let classList = ['fd-list__thumbnail'];
                    if (scope.imageUrl) {
                        classList.push('fd-image--s');
                    }
                    return classList.join(' ');
                }

                scope.getStyles = function () {
                    if (scope.imageUrl) {
                        return {
                            backgroundImage: `url('${scope.imageUrl}')`,
                            backgroundSize: 'cover'
                        }
                    }
                }
            },
            template: `<span ng-class="getClasses()" ng-style="getStyles()">
                <i ng-if="glyph" role="presentation" ng-class="glyph"></i>
            </span>`
        }
    }]).directive('fdObjectStatus', [function () {
        /**
         * status: String - One of 'negative', 'critical', 'positive' or 'informative'
         * glyph: String - Icon class.
         * text: String - Object status text.
         * clickable: Boolean - For SPAN elements only
         * inverted: Boolean - Inverts the background color
         * indication: Boolean - Applies generic indication color. Must be a number between 1 and 8 inclusive
         * large: Boolean - Increases the size
         */
        return {
            restrict: 'A',
            replace: false,
            scope: {
                status: '@',
                glyph: '@',
                text: '@',
                clickable: '<',
                inverted: '<',
                indication: '<',
                large: '<'
            },
            link: function (scope, element) {
                const statuses = ['negative', 'critical', 'positive', 'informative'];

                scope.getIconClasses = function () {
                    let classList = ['fd-object-status__icon'];
                    if (scope.glyph) {
                        classList.push(scope.glyph);
                    }
                    return classList.join(' ');
                }

                element.addClass('fd-object-status');

                scope.$watch('status', function (newStatus, oldStatus) {
                    if (newStatus && !statuses.includes(newStatus)) {
                        console.error(`fd-object-status error: 'status' must be one of: ${statuses.join(', ')}`);
                    }

                    if (oldStatus) {
                        element.removeClass(`fd-object-status--${oldStatus}`);
                    }

                    if (statuses.includes(newStatus)) {
                        element.addClass(`fd-object-status--${newStatus}`);
                    }
                });

                scope.$watch('clickable', function () {
                    const isLink = element[0].tagName === 'A';
                    if (scope.clickable || isLink) {
                        element.addClass(`fd-object-status--link`);
                        if (!isLink)
                            element[0].setAttribute('role', 'button');
                    } else {
                        element.removeClass(`fd-object-status--link`);
                        element[0].removeAttribute('role');
                    }
                });

                scope.$watch('inverted', function () {
                    if (scope.inverted) {
                        element.addClass('fd-object-status--inverted');
                    } else {
                        element.removeClass('fd-object-status--inverted');
                    }
                });

                scope.$watch('large', function () {
                    if (scope.large) {
                        element.addClass('fd-object-status--large');
                    } else {
                        element.removeClass('fd-object-status--large');
                    }
                });

                scope.$watch('indication', function (indication, oldIndication) {
                    if (oldIndication) {
                        element.removeClass(`fd-object-status--indication-${oldIndication}`);
                    }

                    if (indication && (indication < 1 || indication > 8)) {
                        console.error(`fd-object-status error: 'indication' must be a number between 1 and 8 inclusive`);
                        return;
                    }

                    element.addClass(`fd-object-status--indication-${indication}`);
                });
            },
            template: `<i ng-if="glyph" ng-class="getIconClasses()" role="presentation"></i>
                       <span ng-if="text" class="fd-object-status__text">{{text}}</span>`
        }
    }]).directive('fdSelect', ['uuid', function (uuid) {
        /**
         * size: String - The size of the select. One of 'compact' or 'large'. 
         * disabled: Boolean - Disable the select
         * selectedValue: Any - The value of the currently selected item
         * state: String - Optional semantic state. Could be one of 'success', 'error', 'warning' or 'information'
         * message: String - Optional text displayed within the dropdown list.
         * placeholder: String - Short hint displayed when no item is selected yet.
         * dropdownFill: Boolean - Adjusts the popover body that wraps the dropdown to match the text length
         * labelId: String - The id of the label element if present (Necessary for aria-labelledby)
         */
        return {
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                size: '@',
                disabled: '<',
                selectedValue: '=?',
                state: '@',
                message: '@',
                placeholder: '@',
                dropdownFill: '<',
                labelId: '@'
            },
            controller: ['$scope', '$element', function ($scope, $element) {
                $scope.items = [];
                $scope.bodyExpanded = false;
                $scope.buttonId = `select-btn-${uuid.generate()}`;
                $scope.textId = `select-text-${uuid.generate()}`;
                $scope.bodyId = `select-body-${uuid.generate()}`;

                const states = ['success', 'error', 'warning', 'information'];
                if ($scope.state && !states.includes($scope.state)) {
                    console.error(`fd-select error: 'state' must be one of: ${states.join(', ')}`);
                }

                $scope.getClasses = function () {
                    let classList = ['fd-select'];

                    if ($scope.size === 'compact') {
                        classList.push('fd-select--compact');
                    }

                    return classList.join(' ');
                }

                $scope.getControlClasses = function () {
                    let classList = ['fd-select__control'];

                    if ($scope.state) classList.push(`is-${$scope.state}`);

                    return classList.join(' ');
                }

                $scope.getPopoverBodyClasses = function () {
                    let classList = ['fd-popover__body', 'fd-popover__body--no-arrow', 'fd-popover__body--dropdown'];

                    if ($scope.dropdownFill) {
                        classList.push('fd-popover__body--dropdown-fill');
                    }

                    return classList.join(' ');
                }


                $scope.getListClasses = function () {
                    let classList = ['fd-list', 'fd-list--dropdown'];

                    if ($scope.message) {
                        classList.push('fd-list--has-message');
                    }

                    switch ($scope.size) {
                        case 'compact':
                            classList.push('fd-list--compact');
                            break;
                        case 'large':
                            classList.push('fd-list--large-dropdown');
                            break;
                    }

                    return classList.join(' ');
                }

                $scope.getListMessageClasses = function () {
                    let classList = ['fd-list__message'];

                    if ($scope.state) {
                        classList.push(`fd-list__message--${$scope.state}`);
                    }

                    return classList.join(' ');
                }

                $scope.getFormMessageClasses = function () {
                    let classList = ['fd-form-message', 'fd-form-message--static'];

                    if ($scope.state) {
                        classList.push(`fd-form-message--${$scope.state}`);
                    }

                    return classList.join(' ');
                }

                $scope.onControllClick = function ($event) {
                    $scope.bodyExpanded = !$scope.bodyExpanded;
                    $event.currentTarget.focus();
                }

                $scope.closeDropdown = function () {
                    $scope.bodyExpanded = false;
                }

                $scope.getSelectedItem = function () {
                    if (!$scope.selectedValue)
                        return null;

                    let index = $scope.items.findIndex(x => x.value === $scope.selectedValue);
                    return index >= 0 ? $scope.items[index] : null;
                }

                $scope.getSelectedItemText = function () {
                    const selectedItem = $scope.getSelectedItem();
                    return selectedItem ? selectedItem.text : $scope.placeholder || '';
                }

                $scope.getSelectedItemId = function () {
                    const selectedItem = $scope.getSelectedItem();
                    return selectedItem ? selectedItem.optionId : '';
                }

                this.addItem = function (item) {
                    $scope.items.push(item);
                }

                this.removeItem = function (item) {
                    let index = $scope.items.findIndex(x => x.optionId === item.optionId);
                    if (index >= 0)
                        $scope.items.splice(index, 1);
                }

                this.getSelectedValue = function () {
                    return $scope.selectedValue;
                }

                this.selectItem = function (item) {
                    $scope.selectedValue = item.value;
                    $scope.closeDropdown();
                }

                $element.on('focusout', function (e) {
                    if (!e.relatedTarget || !$element[0].contains(e.relatedTarget)) {
                        $scope.$apply($scope.closeDropdown);
                    }
                });
            }],
            template: `<div class="fd-popover">
                <div class="fd-popover__control" aria-disabled="{{ !!disabled }}">
                    <div ng-class="getClasses()">
                        <button id="{{ buttonId }}" ng-class="getControlClasses()" ng-click="onControllClick($event)" aria-labelledby="{{ [labelId, textId].join(' ') }}" aria-expanded="{{ bodyExpanded }}" aria-haspopup="listbox" aria-disabled="{{ !!disabled }}">
                            <span id="{{ textId }}" class="fd-select__text-content">{{ getSelectedItemText() }}</span>
                            <span class="fd-button fd-button--transparent fd-select__button">
                                <i class="sap-icon--slim-arrow-down"></i>
                            </span>
                        </button>
                    </div>
                </div>
                <div id="{{ bodyId }}" aria-hidden="{{ !bodyExpanded }}" ng-class="getPopoverBodyClasses()">
                    <div ng-if="message" aria-live="assertive" ng-class="getListMessageClasses()" role="alert">{{ message }}</div>
                    <ul ng-class="getListClasses()" aria-activedescendant="{{ getSelectedItemId() }}" aria-labelledby="{{ labelId }}" role="listbox" ng-transclude></ul>
                </div>
                <div ng-if="message" class="fd-popover__body fd-popover__body--no-arrow" aria-hidden="{{ bodyExpanded }}">
                    <span ng-class="getFormMessageClasses()">{{ message }}</span>
                </div>
            </div>`
        }
    }]).directive('fdOption', ['uuid', function (uuid) {
        /**
         * text: String - Primary text of the select option
         * secondaryText: String - Right alligned secondary text
         * value: Any - Option value
         * glyph: String - Option icon class
         * noWrap: String - Prevents primary text wrapping
         */
        return {
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                text: '@',
                secondaryText: '@',
                value: '<',
                glyph: '@',
                noWrap: '<'
            },
            require: '^fdSelect',
            link: function (scope, element, attrs, selectCtrl) {
                scope.optionId = `select-option-${uuid.generate()}`;

                scope.isSelected = function () {
                    return selectCtrl.getSelectedValue() === scope.value;
                }

                scope.selectItem = function () {
                    selectCtrl.selectItem(scope);
                }

                scope.getClasses = function () {
                    let classList = ['fd-list__item'];

                    if (scope.isSelected()) {
                        classList.push('is-selected');
                    }

                    return classList.join(' ');
                }

                scope.getTitleClasses = function () {
                    let classList = ['fd-list__title'];

                    if (scope.noWrap) {
                        classList.push('fd-list__title--no-wrap');
                    }

                    return classList.join(' ');
                }

                scope.getIconClasses = function () {
                    let classList = ['fd-list__icon'];

                    if (scope.glyph) {
                        classList.push(scope.glyph);
                    }

                    return classList.join(' ');
                }

                selectCtrl.addItem(scope);

                scope.$on('$destroy', function () {
                    selectCtrl.removeItem(scope);
                });
            },
            template: `<li id="{{ optionId }}" ng-class="getClasses()" role="option" aria-selected="{{ isSelected() }}" ng-click="selectItem()">
                <i ng-if="glyph" role="presentation" ng-class="getIconClasses()"></i>
                <span ng-class="getTitleClasses()">{{ text }}</span>
                <span ng-if="secondaryText" class="fd-list__secondary">{{ secondaryText }}</span>
            </li>`
        }
    }]).directive('fdPagination', ['uuid', function (uuid) {
        /**
         * totalItems: Number - The total number of the items
         * itemsPerPage: Number - The number of the items per page
         * currentPage: Number - The number of the current page (starting from 1).
         * compact: Boolean - Pagination buttons size
         * displayTotalItems: Boolean - Whether to display the total number of items
         * itemsPerPageOptions: Array<Number> - The options for items per page dropdown. If not specified the dropdown will not be displayed
         * pageChage: Function - Callback called when the page has changed. Args: (pageNumber : Number)
         * itemsPerPageChange: Function - Callback called when the 'itemsPerPage' dropdown selection has changed: Args: (itemsPerPage : Number)
         */
        return {
            restrict: 'EA',
            replace: true,
            scope: {
                totalItems: '<',
                itemsPerPage: '=?',
                currentPage: '=?',
                compact: '<',
                displayTotalItems: '<',
                itemsPerPageOptions: '<',
                pageChage: '&',
                itemsPerPageChange: '&'
            },
            link: function (scope) {
                const maxButtonsInShortMode = 9; // must be an odd number (min 5)
                const maxInnerButtonsInShortMode = maxButtonsInShortMode - 4; //excluding left and right arrow buttons and first and last number buttons

                scope.totalItems = scope.totalItems || 0;
                scope.itemsPerPage = scope.itemsPerPage || 20;
                scope.currentPage = scope.currentPage || 1;
                scope.currentPageInput = scope.currentPage;

                scope.itemsPerPageLabelId = `pag-perpage-label-${uuid.generate()}`;
                scope.currentPageLabelId = `pag-page-label-${uuid.generate()}`;
                scope.currentPageOfLabelId = `pag-of-label-${uuid.generate()}`;

                scope.isShortMode = function () {
                    return scope.getPageCount() <= maxButtonsInShortMode;
                }

                scope.isCurrentPageValid = function (pageNumber) {
                    return pageNumber >= 1 && pageNumber <= scope.getPageCount();
                }

                scope.changePage = function () {
                    scope.gotoPage(scope.currentPageInput);
                }

                scope.onCurrentPageInputChange = function () {
                    scope.currentPageInputState = scope.isCurrentPageValid(scope.currentPageInput) ? null : 'error';
                }

                scope.onCurrentPageInputBlur = function () {
                    if (scope.currentPageInput != scope.currentPage) {
                        scope.currentPageInput = scope.currentPage;
                        scope.currentPageInputState = null;
                    }
                }

                scope.gotoPage = function (pageNumber) {
                    if (scope.isCurrentPageValid(pageNumber)) {
                        scope.currentPage = pageNumber;
                        scope.currentPageInput = pageNumber;

                        scope.pageChange && scope.pageChange(pageNumber);
                    }
                }

                scope.gotoFirstPage = function () {
                    scope.gotoPage(1);
                }

                scope.gotoLastPage = function () {
                    scope.gotoPage(scope.getPageCount());
                }

                scope.gotoPrevPage = function () {
                    scope.gotoPage(scope.currentPage - 1);
                }

                scope.gotoNextPage = function () {
                    scope.gotoPage(scope.currentPage + 1);
                }

                scope.getPageCount = function () {
                    return Math.ceil(scope.totalItems / scope.itemsPerPage);
                }

                scope.isPrevButtonEnabled = function () {
                    return scope.currentPage > 1;
                }

                scope.isNextButtonEnabled = function () {
                    return scope.currentPage < scope.getPageCount();
                }

                scope.hasStartEllipsys = function () {
                    return scope.getPageCount() > maxButtonsInShortMode && scope.currentPage > Math.ceil(maxButtonsInShortMode / 2);
                }

                scope.hasEndEllipsys = function () {
                    return scope.getPageCount() > maxButtonsInShortMode && scope.currentPage <= scope.getPageCount() - Math.ceil(maxButtonsInShortMode / 2);
                }

                scope.showEllipsys = function (index, length) {
                    return (index === 0 && scope.hasStartEllipsys()) || (index === length - 2 && scope.hasEndEllipsys());
                }

                scope.getPageNumbers = function () {
                    let count = scope.getPageCount();
                    const numbers = [1];
                    if (count > 2) {
                        const hasStartEllipsys = scope.hasStartEllipsys();
                        const hasEndEllipsys = scope.hasEndEllipsys();
                        let startNumber, endNumber;

                        if (hasStartEllipsys && hasEndEllipsys) {
                            const offset = Math.ceil(maxInnerButtonsInShortMode / 2) - 1;
                            startNumber = scope.currentPage - offset;
                            endNumber = scope.currentPage + offset;

                        } else if (hasStartEllipsys && !hasEndEllipsys) {
                            endNumber = count - 1;
                            startNumber = endNumber - maxInnerButtonsInShortMode;

                        } else if (!hasStartEllipsys && hasEndEllipsys) {
                            startNumber = 2;
                            endNumber = startNumber + maxInnerButtonsInShortMode;

                        } else {
                            startNumber = 2;
                            endNumber = count - 1
                        }

                        for (let i = startNumber; i <= endNumber; i++) {
                            numbers.push(i);
                        }
                    }
                    if (count > 1) numbers.push(count);

                    return numbers;
                }

                scope.getClasses = function () {
                    let classList = ['fd-pagination'];

                    if (scope.isShortMode()) {
                        classList.push('fd-pagination--short');
                    }

                    return classList.join(' ');
                }

                scope.getNumberButtonClasses = function (pageNumber) {
                    let classList = ['fd-button', 'fd-button--transparent', 'fd-pagination__link'];

                    if (pageNumber === scope.currentPage) {
                        classList.push('is-active');
                    }

                    if (scope.compact) {
                        classList.push('fd-button--compact');
                    }

                    return classList.join(' ');
                }

                scope.getArrowButtonClassess = function () {
                    let classList = ['fd-button', 'fd-button--transparent', 'fd-pagination__button'];

                    if (scope.compact) {
                        classList.push('fd-button--compact');
                    }

                    return classList.join(' ');
                }

                scope.getNumberButtonAriaLabel = function (pageNumber) {
                    return pageNumber === scope.currentPage ? `Current Page, Page ${pageNumber}` : `Goto page ${pageNumber}`;
                }

                scope.getCurrentPageInputAriaLabelledBy = function () {
                    return [scope.currentPageLabelId, scope.currentPageOfLabelId].join(' ');
                }

                scope.getTotal = function () {
                    return `${scope.totalItems} Results`;
                }

                scope.$watch('itemsPerPage', function () {
                    if (scope.itemsPerPageChange)
                        scope.itemsPerPageChange(scope.itemsPerPage);

                    const pageCount = scope.getPageCount();
                    if (scope.currentPage > pageCount) {
                        scope.gotoPage(pageCount);
                    }
                });
            },
            template: `<div ng-class="getClasses()">
                <div ng-if="itemsPerPageOptions" class="fd-pagination__per-page">
                    <label class="fd-form-label fd-pagination__per-page-label" id="{{ itemsPerPageLabelId }}">Results per page: </label>
                    <fd-select selected-value="$parent.itemsPerPage" size="{{ compact ? 'compact' : null }}" label-id="{{ itemsPerPageLabelId }}">
                        <fd-option ng-repeat="option in itemsPerPageOptions" text="{{ option }}" value="option"></fd-option>
                    </fd-select>
                </div>
                <nav class="fd-pagination__nav" role="navigation">
                    <a href="javascript:void(0)" ng-class="getArrowButtonClassess()" class="fd-pagination__button--mobile" aria-label="First page" aria-disabled="{{ !isPrevButtonEnabled() }}" ng-click="gotoFirstPage()">
                        <i class="sap-icon sap-icon--media-rewind"></i>
                    </a>
                    <a href="javascript:void(0)" ng-class="getArrowButtonClassess()" aria-label="Previous page" aria-disabled="{{ !isPrevButtonEnabled() }}" ng-click="gotoPrevPage()">
                        <i class="sap-icon sap-icon--navigation-left-arrow"></i>
                    </a>

                    <a ng-if="pageNumber !== currentPage || isShortMode()" ng-repeat-start="pageNumber in pageNumbers = getPageNumbers()" href="javascript:void(0)" ng-class="getNumberButtonClasses(pageNumber)" aria-label="{{ getNumberButtonAriaLabel(pageNumber) }}" aria-current="{{ currentPage === pageNumber }}" ng-click="gotoPage(pageNumber)">{{ pageNumber }}</a>
                    <label ng-if="pageNumber === currentPage" id="{{ currentPageLabelId }}" class="fd-form-label fd-pagination__label" aria-label="Page input, Current page, Page {currentPage}">Page:</label>
                    <fd-input ng-if="pageNumber === currentPage" aria-labelledby="{{ getCurrentPageInputAriaLabelledBy() }}" class="fd-pagination__input" type="number" min="1" max="{{ getPageCount() }}" compact="{{ compact }}" fd-required="true" state="{{ currentPageInputState }}" ng-model="$parent.$parent.currentPageInput" ng-keydown="$event.keyCode === 13 && changePage()" ng-blur="onCurrentPageInputBlur()" ng-change="onCurrentPageInputChange()"></fd-input>
                    <label ng-if="pageNumber === currentPage" id="{{ currentPageOfLabelId }}" class="fd-form-label fd-pagination__label">of {{ getPageCount() }}</label>
                    <span ng-if="showEllipsys($index, pageNumbers.length)" ng-repeat-end class="fd-pagination__more" role="presentation"></span>

                    <a href="javascript:void(0)" ng-class="getArrowButtonClassess()" aria-label="Next page" aria-disabled="{{ !isNextButtonEnabled() }}" ng-click="gotoNextPage()">
                        <i class="sap-icon sap-icon--navigation-right-arrow"></i>
                    </a>
                    <a href="javascript:void(0)" ng-class="getArrowButtonClassess()" class="fd-pagination__button--mobile" aria-label="Last page" aria-disabled="{{ !isNextButtonEnabled() }}" ng-click="gotoLastPage()">
                        <i class="sap-icon sap-icon--media-forward"></i>
                    </a>
                </nav>
                <div ng-if="displayTotalItems" class="fd-pagination__total">
                    <span class="fd-form-label fd-pagination__total-label">{{ getTotal() }}</span>
                </div>
            </div>`
        }
    }]);