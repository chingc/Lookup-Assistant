(function () {
    "use strict";
    chrome.extension.onRequest.addListener(
        function (request, sender, sendResponse) {
            if (request.reload) {
                location.reload();
            }
        }
    );
}());
