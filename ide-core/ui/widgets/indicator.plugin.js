(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define('jstree.indicator', ['jquery', './jstree.js'], factory);
    }
    else if (typeof exports === 'object') {
        factory(require('jquery'), require('./jstree.js'));
    }
    else {
        factory(jQuery, jQuery.jstree);
    }
}(function ($, jstree, undefined) {
    "use strict";

    if ($.jstree.plugins.indicator) { return; }

    $.jstree.defaults.indicator = {
        sort: true,
        customSort: function (firstNodeId, secondNodeId) {
            let firstNode = this.get_node(firstNodeId);
            let secondNode = this.get_node(secondNodeId);
            if (firstNode.type == secondNode.type) {
                return firstNode.text.localeCompare(secondNode.text, "en", { numeric: true, sensitivity: "base" });
            }
            else return (firstNode.type === "folder") ? false : true;
        },
        rowIndicator: function (element, node) {
            if (node) {
                const row = element.querySelector(".jstree-wholerow");
                const indicator = document.createElement("span");
                indicator.classList.add("dg-jstree-indicator");
                let indicatorClass = "";
                let indicatorText = "";
                let isDotClass = false;
                if (node.state.submodule) {
                    indicatorClass = "dg-jstree--submodule";
                    indicatorText = "S";
                } else if (node.state.containsChanges) {
                    indicatorClass = "dg-jstree--changed";
                    isDotClass = true;
                } else if (node.state.added) {
                    indicatorClass = "dg-jstree--added";
                    indicatorText = "A";
                } else if (node.state.modified) {
                    indicatorClass = "dg-jstree--modified";
                    indicatorText = "M";
                } else if (node.state.deleted) {
                    indicatorClass = "dg-jstree--deleted";
                    indicatorText = "D";
                } else if (node.state.untracked) {
                    indicatorClass = "dg-jstree--untracked";
                    indicatorText = "U";
                } else if (node.state.conflict) {
                    indicatorClass = "dg-jstree--conflict";
                    indicatorText = "C";
                } else if (node.state.renamed) {
                    indicatorClass = "dg-jstree--renamed";
                    indicatorText = "R";
                }
                if (indicatorClass) {
                    const link = element.querySelector("a:first-of-type");
                    indicator.classList.add(indicatorClass);
                    if (isDotClass) {
                        const dot = document.createElement("div");
                        dot.classList.add("dg-jstree-dot");
                        indicator.appendChild(dot);
                    } else indicator.innerHTML = indicatorText;
                    link.classList.add(indicatorClass);
                }
                row.appendChild(indicator);
            }
        }
    };
    $.jstree.plugins.indicator = function (options, parent) {
        this.bind = function () {
            parent.bind.call(this);
            this.element
                .on("model.jstree", function (e, data) {
                    this.sort(data.parent, true);
                }.bind(this))
                .on("rename_node.jstree create_node.jstree", function (e, data) {
                    this.sort(data.parent || data.node.parent, false);
                    this.redraw_node(data.parent || data.node.parent, true);
                }.bind(this))
                .on("move_node.jstree copy_node.jstree", function (e, data) {
                    this.sort(data.parent, false);
                    this.redraw_node(data.parent, true);
                }.bind(this));
            if (this.settings.core.animation) {
                this.element.on("init.jstree", function () {
                    if (typeof this.settings.core.animation !== "string" && this.settings.core.animation)
                        document.documentElement.style.setProperty("--jstree-fiori-animation", `0.${this.settings.core.animation}s`);
                    else document.documentElement.style.setProperty("--jstree-fiori-animation", `0s`);
                }.bind(this));
            }
        };

        this.close_node = function (obj, animation) {
            if (this.settings.core.animation && obj.parentElement) {
                let indicators = obj.parentElement.querySelectorAll("span.dg-jstree-indicator");
                for (let i = 1; i < indicators.length; i++) {
                    indicators[i].style.animation = `fadeOut 0.${this.settings.core.animation}s`;
                }
            }
            return parent.close_node.call(this, obj, animation);
        };

        this.redraw_node = function (obj, deep, callback, force_draw) {
            let element = parent.redraw_node.apply(this, arguments);
            if (element) this.settings.indicator.rowIndicator(element, this._model.data[obj]);
            return element;
        };

        this.sort = function (obj, deep) {
            let containsChanges = false;
            obj = this.get_node(obj);
            if (obj && obj.children && obj.children.length) {
                if (this.settings.indicator.sort) {
                    obj.children.sort(this.settings.indicator.customSort.bind(this));
                }
                if (deep) {
                    for (let i = 0; i < obj.children_d.length; i++) {
                        this.sort(obj.children_d[i], false);
                    }
                } else if (!obj.state.containsChanges) {
                    for (let i = 0; i < obj.children.length; i++) {
                        let child = this._model.data[obj.children[i]];
                        if (
                            child.state.containsChanges
                            || child.state.added
                            || child.state.modified
                            || child.state.deleted
                            || child.state.untracked
                            || child.state.conflict
                            || child.state.renamed
                        ) {
                            containsChanges = true;
                            for (let j = 0; j < child.parents.length; j++) {
                                let childParent = this._model.data[child.parents[j]];
                                if (childParent.state.containsChanges) break;
                                childParent.state.containsChanges = true;
                            }
                            break;
                        }
                    }
                }
                if (!deep && containsChanges) {
                    for (let i = 0; i < obj.parents.length; i++) {
                        if (obj.parents[i] !== "#") this.redraw_node(obj.parents[i], false);
                    }
                }
            }
        };
    };
}));