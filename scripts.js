"use strict";


const storage = {
    key: "LUA_Settings",
    delete: () => {
        localStorage.removeItem(storage.key);
    },
    get: () => {
        return localStorage.getItem(storage.key);
    },
    set: (data) => {
        localStorage.setItem(storage.key, data);
    }
}

// the following object contains an object for each menu entry
// it is keyed by the id as returned by chrome.contextMenus.create()
// links have two properties: address and title
// menus have one property: title
// separators are not included
var entry = {},
    getAddress = function (id, highlighted) {
        var currency = /^(\d{1,3}(\,\d{3})*|\d+)(\.\d{1,2})?$/,
            stripped = highlighted.trim();
        if (currency.test(stripped)) {
            stripped = stripped.replace(/[,]/g, "");
        }
        return entry[id].address.replace("%s", stripped);
    },
    getId = function (title) {
        var key;
        for (key in entry) {
            if (entry.hasOwnProperty(key)) {
                if (entry[key].title === title) {
                    return parseInt(key, 10);
                }
            }
        }
    },
    clearMenu = function () {
        chrome.contextMenus.removeAll();
        entry = {};
    },
    open = {
        incognito: function (info, tab) {
            chrome.windows.create({
                url: getAddress(info.menuItemId, info.selectionText),
                incognito: true
            });
        },
        window: function (info, tab) {
            chrome.windows.create({
                url: getAddress(info.menuItemId, info.selectionText)
            });
        },
        tab: function (info, tab) {
            chrome.tabs.create({
                url: getAddress(info.menuItemId, info.selectionText)
            });
        }
    },
    create = {
        link: function (address, method, title, parent) {
            var id = chrome.contextMenus.create({
                    contexts: ["selection"],
                    onclick: (method === "incognito") ? open.incognito : (method === "window") ? open.window : open.tab,
                    parentId: getId(parent),
                    title: title
                });
            entry[id] = {
                address: address,
                title: title
            };
        },
        menu: function (title, parent, random) {
            var id = chrome.contextMenus.create({
                    contexts: ["selection"],
                    parentId: getId(parent),
                    title: title
                });
            entry[id] = {
                title: title + random
            };
        },
        separator: function (parent) {
            chrome.contextMenus.create({
                contexts: ["selection"],
                parentId: getId(parent),
                type: "separator"
            });
        }
    },
    settings = {
        current: "",
        error: function (name, message, code) {
            throw {
                name: name,
                message: message,
                code: JSON.stringify(code)
            };
        },
        parse: function (data, parent) {
            var error = false,
                random,
                i,
                ilen;
            for (i = 0, ilen = data.length; i < ilen; i += 1) {
                switch (data[i].type) {
                case undefined:  // default to "link" type if not specified
                case "link":
                    error = !data[i].title ? "Title required for links." : !data[i].address ? "Address required for links." : false;
                    if (error) {
                        settings.error("Missing Property", error, data[i]);
                    }
                    create.link(data[i].address, data[i].open, data[i].title, parent);
                    break;
                case "menu":
                    error = !data[i].title ? "Title required for menus." : !data[i].entry ? "Entry required for menus." : false;
                    if (error) {
                        settings.error("Missing Property", error, data[i]);
                    }
                    random = Math.floor(Math.random() * 1000);
                    create.menu(data[i].title, parent, random);
                    settings.parse(data[i].entry, data[i].title + random);
                    break;
                case "separator":
                    create.separator(parent);
                    break;
                default:
                    settings.error("Unknown Type", "Valid types are link, menu, and separator.", data[i]);
                }
            }
        },
        def: function () {
            var d =
                '[                                                                                                                                 \n' +
                '    { "title": "Google",        "address": "http://www.google.com/search?q=%s" },                                                 \n' +
                '    { "title": "Google Images", "address": "http://www.google.com/search?tbm=isch&q=%s" },                                        \n' +
                '                                                                                                                                  \n' +
                '    { "type": "menu", "title": "More", "entry":                                                                                   \n' +
                '        [                                                                                                                         \n' +
                '            { "title": "Bing",   "address": "http://www.bing.com/search?q=%s" },                                                  \n' +
                '            { "title": "Yahoo!", "address": "http://search.yahoo.com/search?p=%s" }                                               \n' +
                '        ]                                                                                                                         \n' +
                '    },                                                                                                                            \n' +
                '                                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                                      \n' +
                '                                                                                                                                  \n' +
                '    { "title": "Dictionary.com",   "address": "http://dictionary.reference.com/browse/%s" },                                      \n' +
                '    { "title": "Thesaurus.com",    "address": "http://thesaurus.com/browse/%s" },                                                 \n' +
                '    { "title": "Urban Dictionary", "address": "http://www.urbandictionary.com/define.php?term=%s" },                              \n' +
                '    { "title": "Wikipedia",        "address": "http://www.wikipedia.org/wiki/%s" },                                               \n' +
                '                                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                                      \n' +
                '                                                                                                                                  \n' +
                '    { "title": "Amazon", "address": "http://www.amazon.com/s/field-keywords=%s" },                                                \n' +
                '    { "title": "eBay",   "address": "http://www.ebay.com/sch/i.html?_nkw=%s" },                                                   \n' +
                '                                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                                      \n' +
                '                                                                                                                                  \n' +
                '    { "title": "YouTube",                "address": "http://www.youtube.com/results?search_query=%s" },                           \n' +
                '    { "title": "YouTube (VideoID)",      "address": "http://www.youtube.com/watch?v=%s" },                                        \n' +
                '    { "title": "EndlessVideo (VideoID)", "address": "http://www.endlessvideo.com/watch?v=%s" },                                   \n' +
                '                                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                                      \n' +
                '                                                                                                                                  \n' +
                '    { "type": "menu", "title": "To English", "entry":                                                                             \n' +
                '        [                                                                                                                         \n' +
                '            { "title": "Chinese",  "address": "http://translate.google.com/#zh-CN|en|%s" },                                       \n' +
                '            { "title": "Japanese", "address": "http://translate.google.com/#ja|en|%s" },                                          \n' +
                '            { "title": "Korean",   "address": "http://translate.google.com/#ko|en|%s" }                                           \n' +
                '        ]                                                                                                                         \n' +
                '    },                                                                                                                            \n' +
                '    { "type": "menu", "title": "From English", "entry":                                                                           \n' +
                '        [                                                                                                                         \n' +
                '            { "title": "Chinese (Simplified)",  "address": "http://translate.google.com/#en|zh-CN|%s" },                          \n' +
                '            { "title": "Chinese (Traditional)", "address": "http://translate.google.com/#en|zh-TW|%s" },                          \n' +
                '            { "title": "Japanese",              "address": "http://translate.google.com/#en|ja|%s" },                             \n' +
                '            { "title": "Korean",                "address": "http://translate.google.com/#en|ko|%s" }                              \n' +
                '        ]                                                                                                                         \n' +
                '    },                                                                                                                            \n' +
                '                                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                                      \n' +
                '                                                                                                                                  \n' +
                '    { "type": "menu", "title": "To USD", "entry":                                                                                 \n' +
                '        [                                                                                                                         \n' +
                '            { "title": "CAD: Canadian Dollar",        "address": "http://www.google.com/finance/converter?a=%s&from=CAD&to=USD" },\n' +
                '            { "title": "CNY: Chinese Yuan",           "address": "http://www.google.com/finance/converter?a=%s&from=CNY&to=USD" },\n' +
                '            { "title": "GBP: British Pound Sterling", "address": "http://www.google.com/finance/converter?a=%s&from=GBP&to=USD" },\n' +
                '            { "title": "EUR: Euro",                   "address": "http://www.google.com/finance/converter?a=%s&from=EUR&to=USD" },\n' +
                '            { "title": "JPY: Japanese Yen",           "address": "http://www.google.com/finance/converter?a=%s&from=JPY&to=USD" },\n' +
                '            { "title": "KRW: South Korean Won",       "address": "http://www.google.com/finance/converter?a=%s&from=KRW&to=USD" } \n' +
                '        ]                                                                                                                         \n' +
                '    },                                                                                                                            \n' +
                '    { "type": "menu", "title": "From USD", "entry":                                                                               \n' +
                '        [                                                                                                                         \n' +
                '            { "title": "CAD: Canadian Dollar",        "address": "http://www.google.com/finance/converter?a=%s&from=USD&to=CAD" },\n' +
                '            { "title": "CNY: Chinese Yuan",           "address": "http://www.google.com/finance/converter?a=%s&from=USD&to=CNY" },\n' +
                '            { "title": "GBP: British Pound Sterling", "address": "http://www.google.com/finance/converter?a=%s&from=USD&to=GBP" },\n' +
                '            { "title": "EUR: Euro",                   "address": "http://www.google.com/finance/converter?a=%s&from=USD&to=EUR" },\n' +
                '            { "title": "JPY: Japanese Yen",           "address": "http://www.google.com/finance/converter?a=%s&from=USD&to=JPY" },\n' +
                '            { "title": "KRW: South Korean Won",       "address": "http://www.google.com/finance/converter?a=%s&from=USD&to=KRW" } \n' +
                '        ]                                                                                                                         \n' +
                '    },                                                                                                                            \n' +
                '                                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                                      \n' +
                '                                                                                                                                  \n' +
                '    { "type": "menu", "title": "Schemes", "entry":                                                                                \n' +
                '        [                                                                                                                         \n' +
                '            { "title": "mailto", "address": "mailto:%s" }                                                                         \n' +
                '        ]                                                                                                                         \n' +
                '    }                                                                                                                             \n' +
                ']                                                                                                                                 \n';
            return d.replace(/ +\n/g, "\n");
        }
    },
    gui = {
        status: function (message) {
            $("#status").empty();
            $("<span>" + message + "<br /><br /></span>").prependTo("#status").fadeOut(30000, function () { $(this).remove(); });
        },
        save: function () {
            if (confirm("Save current settings?")) {
                settings.current = document.getElementById("editor").value;
                storage.set(settings.current);
                gui.status("Settings saved.");
            }
        },
        load: function () {
            if (confirm("Load saved settings?")) {
                settings.current = storage.get();
                document.getElementById("editor").value = settings.current;
                gui.status("Settings restored.");
            }
        },
        exec: function () {
            clearMenu();
            settings.current = document.getElementById("editor").value;
            if (settings.current) {  // do not parse if there is no input
                try {
                    settings.parse(JSON.parse(settings.current));
                    gui.status("No errors.");
                } catch (e) {
                    gui.status('<font color="red">' + e.name + "</font>: " + e.message + (e.code ? "<br />Near Location: " + e.code : ""));
                }
            }
        },
        wipe: function () {
            if (confirm("Delete saved settings?")) {
                clearMenu();
                settings.current = "";
                storage.delete();
                gui.status("Settings wiped!");
            }
        },
        def: function () {
            if (confirm("Load default settings?")) {
                document.getElementById("editor").value = settings.def();
                gui.status("Default settings restored.");
            }
        }
    };

settings.current = storage.get();
if (!settings.current) {  // use default if no settings found
    settings.current = settings.def();
    storage.set(settings.current);
}
clearMenu();
settings.parse(JSON.parse(settings.current));

if (typeof $ !== "undefined") {
    $(document).ready(function () {
        document.getElementById("editor").value = settings.current;
        $("#save").click(gui.save);
        $("#load").click(gui.load);
        $("#exec").click(gui.exec);
        $("#wipe").click(gui.wipe);
        $("#default").click(gui.def);
        $(window).bind("beforeunload", function () {
            var a = document.getElementById("editor").value,
                b = storage.get();
            if (a === "" && b === null) {
                return;
            }
            if (a !== b) {
                return "Unsaved changes!";
            }
            return;
        });
    });
}
