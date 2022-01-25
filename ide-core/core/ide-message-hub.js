angular.module('ideMessageHub', [])
    .provider('messageHub', function MessageHubProvider() {
        this.eventIdPrefix = '';
        this.eventIdDelimiter = '.';
        this.$get = [function messageHubFactory() {
            let messageHub = new FramesMessageHub();
            let trigger = function (eventId, absolute = false) {
                if (!eventId)
                    throw Error('eventId argument must be a valid string, identifying an existing event');
                messageHub.post(
                    {},
                    (absolute ? eventId : this.eventIdPrefix + this.eventIdDelimiter + eventId)
                );
            }.bind(this);
            let post = function (eventId, data, absolute = false) {
                if (!eventId)
                    throw Error('eventId argument must be a valid string, identifying an existing event');
                messageHub.post(
                    { data: data },
                    (absolute ? eventId : this.eventIdPrefix + this.eventIdDelimiter + eventId)
                );
            }.bind(this);
            let onMessage = function (eventId, callbackFunc, absolute = false) {
                if (typeof callbackFunc !== 'function')
                    throw Error('Callback argument must be a function');
                messageHub.subscribe(
                    callbackFunc,
                    (absolute ? eventId : this.eventIdPrefix + this.eventIdDelimiter + eventId)
                );
            }.bind(this);
            let announceAlert = function (title, message, type) {
                messageHub.post({
                    data: {
                        title: title,
                        message: message,
                        type: type
                    }
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
            return {
                announceAlertSuccess: announceAlertSuccess,
                announceAlertInfo: announceAlertInfo,
                announceAlertWarning: announceAlertWarning,
                announceAlertError: announceAlertError,
                triggerEvent: trigger,
                'postMessage': post,
                onDidReceiveMessage: onMessage
            };
        }];
    })