// global abatement
var LUA = {};

// this array contains an object for each menu entry
// links have three properties: address, id, and title
// menus have two properties: id and title
// separators are not included
LUA.entry = [];

// lookup the address of a given entry id, and replace the search token
LUA.entry.getAddress = function (id, highlightedText) {
    "use strict";
    var i,
        currency = /^(\d{1,3}(\,\d{3})*|\d+)(\.\d{1,2})?$/,
        stripped = highlightedText.trim();
    if (currency.test(stripped)) {
        stripped = stripped.replace(/[,]/g, "");
    }
    for (i = 0; i < LUA.entry.length; i += 1) {
        if (LUA.entry[i].id === id) {
            return LUA.entry[i].address.replace("%s", stripped);
        }
    }
};

// lookup the id of a given entry title
LUA.entry.getId = function (title) {
    "use strict";
    var i;
    for (i = 0; i < LUA.entry.length; i += 1) {
        if (LUA.entry[i].title === title) {
            return LUA.entry[i].id;
        }
    }
};

// create various menu items
LUA.create = {
    link: function (address, open, title, parent) {
        "use strict";
        LUA.entry.push({
            address: address,
            id: chrome.contextMenus.create({
                contexts: ["selection"],
                onclick: (open === "window") ? LUA.open.window :
                         (open === "incognito") ? LUA.open.incognito : LUA.open.tab,
                parentId: LUA.entry.getId(parent),
                title: title
            }),
            title: title
        });
    },
    menu: function (title, parent) {
        "use strict";
        LUA.entry.push({
            id: chrome.contextMenus.create({
                contexts: ["selection"],
                parentId: LUA.entry.getId(parent),
                title: title
            }),
            title: title
        });
    },
    separator: function (parent) {
        "use strict";
        chrome.contextMenus.create({
            contexts: ["selection"],
            parentId: LUA.entry.getId(parent),
            type: "separator"
        });
    }
};

// perform the lookup
LUA.open = {
    tab: function (info, tab) {
        "use strict";
        chrome.tabs.create({
            url: LUA.entry.getAddress(info.menuItemId, info.selectionText)
        });
    },
    window: function (info, tab) {
        "use strict";
        chrome.windows.create({
            url: LUA.entry.getAddress(info.menuItemId, info.selectionText)
        });
    },
    incognito: function (info, tab) {
        "use strict";
        chrome.windows.create({
            url: LUA.entry.getAddress(info.menuItemId, info.selectionText),
            incognito: true
        });
    }
};

// these buttons are for options.html and they manage local storage
LUA.button = {
    save: function () {
        "use strict";
        document.getElementById("status").innerHTML = "&nbsp;";
        if (confirm("Save current settings?")) {
            LUA.settings.current = document.getElementById("editor").value;
            localStorage.setItem("LUA_Settings", LUA.settings.current);
            document.getElementById("status").innerHTML = "<b>Settings saved.</b>";
        }
    },
    load: function () {
        "use strict";
        document.getElementById("status").innerHTML = "&nbsp;";
        if (confirm("Load saved settings?")) {
            LUA.settings.current = localStorage.getItem("LUA_Settings");
            document.getElementById("editor").value = LUA.settings.current;
            document.getElementById("status").innerHTML = "<b>Settings restored.</b>";
        }
    },
    exec: function () {
        "use strict";
        document.getElementById("status").innerHTML = "&nbsp;";
        LUA.settings.clearMenu();
        LUA.settings.current = document.getElementById("editor").value;
        if (LUA.settings.current.trim()) {  // do not parse if there is no input
            chrome.extension.sendRequest(
                {
                    data: LUA.settings.current
                },
                function (error) {
                    if (error.name) {
                        document.getElementById("status").innerHTML = "<font color=\"red\"><b>" +
                            error.name + "</b></font>: " + error.message +
                            (error.code ? "<br /><br /><b>Near Location:</b> " + error.code : "");
                    } else {
                        document.getElementById("status").innerHTML = "<b>No errors.</b>";
                    }
                }
            );
        }
    },
    wipe: function () {
        "use strict";
        document.getElementById("status").innerHTML = "&nbsp;";
        if (confirm("Delete saved settings?")) {
            LUA.settings.clearMenu();
            LUA.settings.current = "";
            localStorage.removeItem("LUA_Settings");
            document.getElementById("status").innerHTML = "<b>Saved settings wiped!</b>";
            if (confirm("Restore default settings?")) {
                LUA.settings.current = LUA.settings.defaultSettings();
                document.getElementById("editor").value = LUA.settings.current;
                document.getElementById("status").innerHTML = "<b>Default settings restored.</b>";
            }
        }
    }
};

// settings management
LUA.settings = {
    current: "",
    clearMenu: function () {
        "use strict";
        chrome.contextMenus.removeAll();
        LUA.entry.length = 0;
    },
    parse: function (data, parent) {
        "use strict";
        var i;
        for (i = 0; i < data.length; i += 1) {
            switch (data[i].type) {
            case undefined:  // fall through
            case "link":
                if (!data[i].title) {
                    throw {
                        name: "Missing Property",
                        message: "Title required for links.",
                        code: JSON.stringify(data[i])
                    };
                }
                if (!data[i].address) {
                    throw {
                        name: "Missing Property",
                        message: "Address required for links.",
                        code: JSON.stringify(data[i])
                    };
                }
                LUA.create.link(data[i].address, data[i].open, data[i].title, parent);
                break;
            case "menu":
                if (!data[i].title) {
                    throw {
                        name: "Missing Property",
                        message: "Title required for menus.",
                        code: JSON.stringify(data[i])
                    };
                }
                if (!data[i].entry) {
                    throw {
                        name: "Missing Property",
                        message: "Entry required for menus.",
                        code: JSON.stringify(data[i])
                    };
                }
                LUA.create.menu(data[i].title, parent);
                LUA.settings.parse(data[i].entry, data[i].title);
                break;
            case "separator":
                LUA.create.separator(parent);
                break;
            default:
                throw {
                    name: "Unknown Type",
                    message: "Valid types are link, menu, and separator.",
                    code: JSON.stringify(data[i])
                };
            }
        }
    },
    defaultSettings: function () {
        "use strict";
        var settings =
            "[                                                                                                                                         \n" +
            "    { \"title\": \"Google\",        \"address\": \"http://www.google.com/search?q=%s\" },                                                 \n" +
            "    { \"title\": \"Google Images\", \"address\": \"http://www.google.com/search?tbm=isch&q=%s\" },                                        \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"menu\", \"title\": \"More Searches\", \"entry\":                                                                        \n" +
            "        [                                                                                                                                 \n" +
            "            { \"title\": \"Bing\",   \"address\": \"http://www.bing.com/search?q=%s\" },                                                  \n" +
            "            { \"title\": \"Yahoo!\", \"address\": \"http://search.yahoo.com/search?p=%s\" }                                               \n" +
            "        ]                                                                                                                                 \n" +
            "    },                                                                                                                                    \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"separator\" },                                                                                                          \n" +
            "                                                                                                                                          \n" +
            "    { \"title\": \"Dictionary.com\",   \"address\": \"http://dictionary.reference.com/browse/%s\" },                                      \n" +
            "    { \"title\": \"Thesaurus.com\",    \"address\": \"http://thesaurus.com/browse/%s\" },                                                 \n" +
            "    { \"title\": \"Urban Dictionary\", \"address\": \"http://www.urbandictionary.com/define.php?term=%s\" },                              \n" +
            "    { \"title\": \"Wikipedia\",        \"address\": \"http://www.wikipedia.org/wiki/%s\" },                                               \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"separator\" },                                                                                                          \n" +
            "                                                                                                                                          \n" +
            "    { \"title\": \"Amazon\", \"address\": \"http://www.amazon.com/s/field-keywords=%s\" },                                                \n" +
            "    { \"title\": \"eBay\",   \"address\": \"http://www.ebay.com/sch/i.html?_nkw=%s\" },                                                   \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"separator\" },                                                                                                          \n" +
            "                                                                                                                                          \n" +
            "    { \"title\": \"YouTube\",                \"address\": \"http://www.youtube.com/results?search_query=%s\" },                           \n" +
            "    { \"title\": \"YouTube (VideoID)\",      \"address\": \"http://www.youtube.com/watch?v=%s\" },                                        \n" +
            "    { \"title\": \"EndlessVideo (VideoID)\", \"address\": \"http://www.endlessvideo.com/watch?v=%s\" },                                   \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"separator\" },                                                                                                          \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"menu\", \"title\": \"To English\", \"entry\":                                                                           \n" +
            "        [                                                                                                                                 \n" +
            "            { \"title\": \"Chinese\",  \"address\": \"http://translate.google.com/#zh-CN|en|%s\" },                                       \n" +
            "            { \"title\": \"Japanese\", \"address\": \"http://translate.google.com/#ja|en|%s\" },                                          \n" +
            "            { \"title\": \"Korean\",   \"address\": \"http://translate.google.com/#ko|en|%s\" }                                           \n" +
            "        ]                                                                                                                                 \n" +
            "    },                                                                                                                                    \n" +
            "    { \"type\": \"menu\", \"title\": \"From English\", \"entry\":                                                                         \n" +
            "        [                                                                                                                                 \n" +
            "            { \"title\": \"Chinese (Simplified)\",  \"address\": \"http://translate.google.com/#en|zh-CN|%s\" },                          \n" +
            "            { \"title\": \"Chinese (Traditional)\", \"address\": \"http://translate.google.com/#en|zh-TW|%s\" },                          \n" +
            "            { \"title\": \"Japanese\",              \"address\": \"http://translate.google.com/#en|ja|%s\" },                             \n" +
            "            { \"title\": \"Korean\",                \"address\": \"http://translate.google.com/#en|ko|%s\" }                              \n" +
            "        ]                                                                                                                                 \n" +
            "    },                                                                                                                                    \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"separator\" },                                                                                                          \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"menu\", \"title\": \"To USD\", \"entry\":                                                                               \n" +
            "        [                                                                                                                                 \n" +
            "            { \"title\": \"CAD: Canadian Dollar\",        \"address\": \"http://www.google.com/finance/converter?a=%s&from=CAD&to=USD\" },\n" +
            "            { \"title\": \"CNY: Chinese Yuan\",           \"address\": \"http://www.google.com/finance/converter?a=%s&from=CNY&to=USD\" },\n" +
            "            { \"title\": \"GBP: British Pound Sterling\", \"address\": \"http://www.google.com/finance/converter?a=%s&from=GBP&to=USD\" },\n" +
            "            { \"title\": \"EUR: Euro\",                   \"address\": \"http://www.google.com/finance/converter?a=%s&from=EUR&to=USD\" },\n" +
            "            { \"title\": \"JPY: Japanese Yen\",           \"address\": \"http://www.google.com/finance/converter?a=%s&from=JPY&to=USD\" },\n" +
            "            { \"title\": \"KRW: South Korean Won\",       \"address\": \"http://www.google.com/finance/converter?a=%s&from=KRW&to=USD\" } \n" +
            "        ]                                                                                                                                 \n" +
            "    },                                                                                                                                    \n" +
            "    { \"type\": \"menu\", \"title\": \"From USD\", \"entry\":                                                                             \n" +
            "        [                                                                                                                                 \n" +
            "            { \"title\": \"CAD: Canadian Dollar\",        \"address\": \"http://www.google.com/finance/converter?a=%s&from=USD&to=CAD\" },\n" +
            "            { \"title\": \"CNY: Chinese Yuan\",           \"address\": \"http://www.google.com/finance/converter?a=%s&from=USD&to=CNY\" },\n" +
            "            { \"title\": \"GBP: British Pound Sterling\", \"address\": \"http://www.google.com/finance/converter?a=%s&from=USD&to=GBP\" },\n" +
            "            { \"title\": \"EUR: Euro\",                   \"address\": \"http://www.google.com/finance/converter?a=%s&from=USD&to=EUR\" },\n" +
            "            { \"title\": \"JPY: Japanese Yen\",           \"address\": \"http://www.google.com/finance/converter?a=%s&from=USD&to=JPY\" },\n" +
            "            { \"title\": \"KRW: South Korean Won\",       \"address\": \"http://www.google.com/finance/converter?a=%s&from=USD&to=KRW\" } \n" +
            "        ]                                                                                                                                 \n" +
            "    },                                                                                                                                    \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"separator\" },                                                                                                          \n" +
            "                                                                                                                                          \n" +
            "    { \"type\": \"menu\", \"title\": \"Schemes\", \"entry\":                                                                              \n" +
            "        [                                                                                                                                 \n" +
            "            { \"title\": \"mailto\", \"address\": \"mailto:%s\" }                                                                         \n" +
            "        ]                                                                                                                                 \n" +
            "    }                                                                                                                                     \n" +
            "]                                                                                                                                         \n";
        return settings.replace(/ +\n/g, "\n");
    }
};
