angular.module('ideView', ['ngResource'])
    .constant('view', viewData || editorData)
    .directive('dgViewTitle', ['view', function (view) {
        return {
            restrict: 'A',
            transclude: false,
            replace: true,
            link: function (scope) {
                scope.label = view.label;
            },
            template: '<title>{{label}}</title>'
        };
    }]);