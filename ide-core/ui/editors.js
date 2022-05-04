angular.module('ideEditors', ['ngResource'])
    .provider('Editors', function editorProvider() {
        this.$get = ['$http', function editorsFactory($http) {
            let defaultEditor = {};
            let editorProviders = {};
            let editorsForContentType = {};

            $http.get('/services/v4/js/ide-core/services/editors.js')
                .then(function (response) {
                    for (let i = 0; i < response.data.length; i++) {
                        editorProviders[response.data[i].id] = response.data[i].link;
                        if (response.data[i].defaultEditor) {
                            if (defaultEditor.id) console.error(`ide-editors: more then one editor is set as default - ${response.data[i].id}`);
                            else {
                                defaultEditor.id = response.data[i].id;
                                defaultEditor.label = response.data[i].label;
                            }
                        }
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
                    console.error("ide-editors: could not get editors", response);
                });

            return {
                defaultEditor: defaultEditor,
                editorProviders: editorProviders,
                editorsForContentType: editorsForContentType
            };
        }];
    })