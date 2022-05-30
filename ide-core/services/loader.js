var request = require("http/v4/request");
var response = require("http/v4/response");
var registry = require("platform/v4/registry");

let id = request.getParameter("id");
if (id) {
    let namedScripts = new Map();

    namedScripts.set(
        "ide-view-js",
        [
            "/jquery/3.6.0/jquery.min.js",
            "/angularjs/1.8.2/angular.min.js",
            "/angularjs/1.8.2/angular-resource.min.js",
            "/angular-aria/1.8.2/angular-aria.min.js",
            "/ide-core/core/message-hub.js",
            "/ide-core/core/ide-message-hub.js",
            "/ide-core/ui/theming.js",
            "/ide-core/ui/widgets.js",
            "/ide-core/ui/view.js"
        ]
    );

    namedScripts.set(
        "ide-view-css",
        [
            "/fundamental-styles/0.23.0/dist/fundamental-styles.css",
            "/resources/styles/core.css",
            "/resources/styles/widgets.css"
        ]
    );

    let namedScript = namedScripts.get(id);
    if (namedScript) {
        namedScript.forEach(function (item) {
            response.println(registry.getText(item));
        });
    } else {
        response.println("Script with 'id': " + id + " is not known.");
    }

} else {
    response.println("Provide the 'id' parameter of the script");
}

response.flush();
response.close();