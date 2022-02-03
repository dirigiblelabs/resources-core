angular.module('ideMessageHub', [])
    .provider('messageHub', function MessageHubProvider() {
        this.eventIdPrefix = "";
        this.eventIdDelimiter = '.';
        this.$get = [function messageHubFactory() {
            let messageHub = new FramesMessageHub();
            let trigger = function (eventId, absolute = false) {
                if (!eventId)
                    throw Error('eventId argument must be a valid string, identifying an existing event');
                if (!absolute && this.eventIdPrefix !== "") eventId = this.eventIdPrefix + this.eventIdDelimiter + eventId;
                messageHub.post({}, eventId);
            }.bind(this);
            let post = function (eventId, data, absolute = false) {
                if (!eventId)
                    throw Error('eventId argument must be a valid string, identifying an existing event');
                if (!absolute && this.eventIdPrefix !== "") eventId = this.eventIdPrefix + this.eventIdDelimiter + eventId;
                messageHub.post({ data: data }, eventId);
            }.bind(this);
            let onMessage = function (eventId, callbackFunc, absolute = false) {
                if (typeof callbackFunc !== 'function')
                    throw Error('Callback argument must be a function');
                if (!absolute && this.eventIdPrefix !== "") eventId = this.eventIdPrefix + this.eventIdDelimiter + eventId;
                messageHub.subscribe(callbackFunc, eventId);
            }.bind(this);
            let setStatusMessage = function (message) {
                messageHub.post({
                    message: message,
                }, 'ide.statusMessage');
            };
            let setStatusError = function (message) {
                messageHub.post({
                    message: message,
                }, 'ide.statusError');
            };
            let setStatusCaret = function (text) {
                messageHub.post({
                    text: text,
                }, 'ide.statusCaret');
            };
            let announceAlert = function (title, message, type) {
                messageHub.post({
                    title: title,
                    message: message,
                    type: type
                }, 'ide.alert');
            };
            let announceAlertSuccess = function (title, message) {
                announceAlert(title, message, "success");
            };
            let announceAlertInfo = function (title, message) {
                announceAlert(title, message, "info");
            };
            let announceAlertWarning = function (title, message) {
                announceAlert(title, message, "warning");
            };
            let announceAlertError = function (title, message) {
                announceAlert(title, message, "error");
            };
            let showDialog = function (
                title = "",
                body = "",
                buttons = [{
                    id: "b1",
                    type: "normal", // normal, emphasized, transparent
                    label: "Ok",
                }],
                callbackTopic = null,
                loader = false,
                header = "",
                subheader = "",
                footer = ""
            ) {
                if (buttons.length === 0)
                    throw Error("Dialog: There must be at least one button");
                messageHub.post({
                    header: header,
                    subheader: subheader,
                    title: title,
                    body: body,
                    footer: footer,
                    loader: loader,
                    buttons: buttons,
                    callbackTopic: callbackTopic
                }, 'ide.dialog');
            };
            let showSelectDialog = function (
                title,
                listItems,
                callbackTopic,
                isSingleChoice = true,
                hasSearch = false
            ) {
                if (title === undefined)
                    throw Error("Select dialog: Title must be specified");
                if (listItems === undefined || !Array.isArray(listItems))
                    throw Error("Select dialog: You must provide a list of strings.");
                else if (listItems.length === 0)
                    throw Error("Select dialog: List is empty");
                if (callbackTopic === undefined)
                    throw Error("Select dialog: Callback topic must pe specified");
                messageHub.post({
                    title: title,
                    listItems: listItems,
                    callbackTopic: callbackTopic,
                    isSingleChoice: isSingleChoice,
                    hasSearch: hasSearch
                }, 'ide.selectDialog');
            };
            let showWindowDialog = function (
                dialogWindowId = "",
                parameters = "",
                callbackTopic = null
            ) {
                messageHub.post({
                    dialogWindowId: dialogWindowId,
                    parameters: parameters,
                    callbackTopic: callbackTopic
                }, 'ide.dialogWindow');
            };
            return {
                setStatusMessage: setStatusMessage,
                setStatusError: setStatusError,
                setStatusCaret: setStatusCaret,
                announceAlertSuccess: announceAlertSuccess,
                announceAlertInfo: announceAlertInfo,
                announceAlertWarning: announceAlertWarning,
                announceAlertError: announceAlertError,
                showDialog: showDialog,
                showSelectDialog: showSelectDialog,
                showWindowDialog: showWindowDialog,
                triggerEvent: trigger,
                'postMessage': post,
                onDidReceiveMessage: onMessage
            };
        }];
    })