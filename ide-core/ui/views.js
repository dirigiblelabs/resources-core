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
                excludedElements: '='
            },
            link: function (scope, element) {
                scope.callback = scope.callback();
                element.on('contextmenu', function (event) {
                    if (scope.excludedElements) {
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
        return {
            restrict: 'E',
            transclude: {
                'control': 'fdInput',
                'message': 'fdFormMessage',
            },
            replace: true,
            link: {
                pre: function (scope) {
                    scope.popoverId = `fimg${uuid.generate()}`;
                },
                post: function (scope, element) {
                    element.on('focusout', function () {
                        scope.$apply(scope.togglePopover());
                    });
                    scope.togglePopover = function () {
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
         */
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                compact: '@',
                fdRequired: '@',
            },
            link: {
                pre: function (scope, element) {
                    scope.getClasses = function () {
                        let classList = [];
                        if (scope.compact === 'true') classList.push('fd-checkbox__label--compact');
                        if (scope.fdRequired === 'true') classList.push('fd-checkbox__label--required');
                        return classList.join(' ');
                    };
                },
            },
            template: `<label class="fd-checkbox__label" ng-class="getClasses()">
                <div class="fd-checkbox__label-container"><span class="fd-checkbox__text" ng-transclude></span></div>
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
                <div class="fd-popover__wrapper" style="max-height:{{ maxHeight || 250 }}px;" ng-transclude>
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
    }]);