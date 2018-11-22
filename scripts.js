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

const editor = () => {
    return document.getElementById("editor");
}

const button = {
    save: () => {
        if (confirm("Save settings?")) {
            settings.current = editor().value;
            storage.set(settings.current);
            settings.exec();
        }
    },
    load: () => {
        if (confirm("Load saved settings?")) {
            editor().value = storage.get();
            settings.current = storage.get();
            settings.exec();
        }
    },
    clear: () => {
        if (confirm("Clear settings?")) {
            editor().value = "";
            settings.current = "";
            clearMenu();
        }
    },
    default: () => {
        if (confirm("Load default settings?")) {
            editor().value = settings.def();
            settings.current = settings.def();
            storage.set(settings.current);
            settings.exec();
        }
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
    create = {
        link: function (address, title, parent) {
            var id = chrome.contextMenus.create({
                    contexts: ["selection"],
                    onclick: (info, tab) => {
                        chrome.tabs.create({
                            url: getAddress(info.menuItemId, info.selectionText)
                        })
                    },
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
        exec: () => {
            clearMenu();
            settings.current = editor().value;
            if (settings.current) {  // do not parse if there is no input
                try {
                    settings.parse(JSON.parse(settings.current));
                } catch (e) {
                    alert('<font color="red">' + e.name + "</font>: " + e.message + (e.code ? "<br />Near Location: " + e.code : ""));
                }
            }
        },
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
                    create.link(data[i].address, data[i].title, parent);
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
                '[                                                                                                                 \n' +
                '    { "title": "Google", "address": "http://www.google.com/search?q=%s" },                                        \n' +
                '    { "title": "Bing",   "address": "http://www.bing.com/search?q=%s" },                                          \n' +
                '    { "title": "Yahoo!", "address": "http://search.yahoo.com/search?p=%s" },                                      \n' +
                '                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                      \n' +
                '                                                                                                                  \n' +
                '    { "title": "Wikipedia",        "address": "http://www.wikipedia.org/wiki/%s" },                               \n' +
                '    { "title": "Dictionary.com",   "address": "http://dictionary.reference.com/browse/%s" },                      \n' +
                '    { "title": "Urban Dictionary", "address": "http://www.urbandictionary.com/define.php?term=%s" },              \n' +
                '                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                      \n' +
                '                                                                                                                  \n' +
                '    { "title": "Amazon", "address": "http://www.amazon.com/s/field-keywords=%s" },                                \n' +
                '    { "title": "eBay",   "address": "http://www.ebay.com/sch/i.html?_nkw=%s" },                                   \n' +
                '                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                      \n' +
                '                                                                                                                  \n' +
                '    { "title": "YouTube", "address": "http://www.youtube.com/results?search_query=%s" },                          \n' +
                '                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                      \n' +
                '                                                                                                                  \n' +
                '    { "type": "menu", "title": "to English from...", "entry":                                                     \n' +
                '        [                                                                                                         \n' +
                '            { "title": "Chinese",  "address": "http://translate.google.com/#zh-CN|en|%s" },                       \n' +
                '            { "title": "Japanese", "address": "http://translate.google.com/#ja|en|%s" },                          \n' +
                '            { "title": "Korean",   "address": "http://translate.google.com/#ko|en|%s" }                           \n' +
                '        ]                                                                                                         \n' +
                '    },                                                                                                            \n' +
                '    { "type": "menu", "title": "from English to...", "entry":                                                     \n' +
                '        [                                                                                                         \n' +
                '            { "title": "Chinese (Simplified)",  "address": "http://translate.google.com/#en|zh-CN|%s" },          \n' +
                '            { "title": "Chinese (Traditional)", "address": "http://translate.google.com/#en|zh-TW|%s" },          \n' +
                '            { "title": "Japanese",              "address": "http://translate.google.com/#en|ja|%s" },             \n' +
                '            { "title": "Korean",                "address": "http://translate.google.com/#en|ko|%s" }              \n' +
                '        ]                                                                                                         \n' +
                '    },                                                                                                            \n' +
                '                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                      \n' +
                '                                                                                                                  \n' +
                '    { "type": "menu", "title": "to USD from...", "entry":                                                         \n' +
                '        [                                                                                                         \n' +
                '            { "title": "CAD: Canadian Dollar",        "address": "http://www.google.com/search?q=%s+CAD+to+USD" },\n' +
                '            { "title": "CNY: Chinese Yuan",           "address": "http://www.google.com/search?q=%s+CNY+to+USD" },\n' +
                '            { "title": "GBP: British Pound Sterling", "address": "http://www.google.com/search?q=%s+GBP+to+USD" },\n' +
                '            { "title": "EUR: Euro",                   "address": "http://www.google.com/search?q=%s+EUR+to+USD" },\n' +
                '            { "title": "JPY: Japanese Yen",           "address": "http://www.google.com/search?q=%s+JPY+to+USD" },\n' +
                '            { "title": "KRW: South Korean Won",       "address": "http://www.google.com/search?q=%s+KRW+to+USD" } \n' +
                '        ]                                                                                                         \n' +
                '    },                                                                                                            \n' +
                '    { "type": "menu", "title": "from USD to...", "entry":                                                         \n' +
                '        [                                                                                                         \n' +
                '            { "title": "CAD: Canadian Dollar",        "address": "http://www.google.com/search?q=%s+USD+to+CAD" },\n' +
                '            { "title": "CNY: Chinese Yuan",           "address": "http://www.google.com/search?q=%s+USD+to+CNY" },\n' +
                '            { "title": "GBP: British Pound Sterling", "address": "http://www.google.com/search?q=%s+USD+to+GBP" },\n' +
                '            { "title": "EUR: Euro",                   "address": "http://www.google.com/search?q=%s+USD+to+EUR" },\n' +
                '            { "title": "JPY: Japanese Yen",           "address": "http://www.google.com/search?q=%s+USD+to+JPY" },\n' +
                '            { "title": "KRW: South Korean Won",       "address": "http://www.google.com/search?q=%s+USD+to+KRW" } \n' +
                '        ]                                                                                                         \n' +
                '    },                                                                                                            \n' +
                '                                                                                                                  \n' +
                '    { "type": "separator" },                                                                                      \n' +
                '                                                                                                                  \n' +
                '    { "type": "menu", "title": "Schemes", "entry":                                                                \n' +
                '        [                                                                                                         \n' +
                '            { "title": "mailto", "address": "mailto:%s" }                                                         \n' +
                '        ]                                                                                                         \n' +
                '    }                                                                                                             \n' +
                ']                                                                                                                 \n';
            return d.replace(/ +\n/g, "\n");
        }
    };

document.onreadystatechange = () => {
    if (document.title.includes("Lookup Assistant") && document.readyState !== "loading") {
        editor().value = storage.get();
        settings.exec();

        for (const key of Object.keys(button)) {
            document.getElementById(key).onclick = button[key];
        }

        window.onbeforeunload = (event) => {
            if (editor().value !== storage.get()) {
                event.preventDefault();
                event.returnValue = "There are unsaved changes!";
            }
        };
    }
}
