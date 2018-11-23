(function () {
    "use strict";

    const doc = (id) => document.getElementById(id);
    
    const storage = {
        key: "LUA_Settings",
        get: () => localStorage.getItem(storage.key),
        set: (data) => localStorage.setItem(storage.key, data)
    };

    const button = {
        save: () => {
            if (confirm("Save settings?")) {
                if (settings.parse()) {
                    storage.set(doc("editor").value);
                }
            }
        },
        load: () => {
            if (confirm("Load saved settings?")) {
                doc("editor").value = storage.get();
                settings.parse();
            }
        },
        default: () => {
            if (confirm("Load default settings?")) {
                storage.set(defaults);
                doc("editor").value = defaults;
                settings.parse();
            }
        }
    };

    const menu = {
        id: {},  // track the ID of submenus
        clear: () => {
            chrome.contextMenus.removeAll();
            menu.id = {};
        },
        link: (address, title, parent) => {
            chrome.contextMenus.create({
                contexts: ["selection"],
                parentId: menu.id[parent],
                title: title,
                onclick: (info) => chrome.tabs.create({ url: address.replace("%s", info.selectionText.trim()) })
            });
        },
        separator: (parent) => {
            chrome.contextMenus.create({
                contexts: ["selection"],
                parentId: menu.id[parent],
                type: "separator"
            });
        },
        submenu: (title, parent) => {
            menu.id[title] = chrome.contextMenus.create({
                contexts: ["selection"],
                parentId: menu.id[parent],
                title: title
            });
        }
    };

    const settings = {
        parse: () => {
            try {
                menu.clear();
                let text = doc("editor").value;
                if (!text || settings._parse(JSON.parse(text))) {
                    return true;
                }
            } catch (e) {
                alert(`${e.name}: ${e.message}`);
            }
            return false;
        },
        _parse: (rows, parent) => {
            for (let row of rows) {
                let error = false;
                switch (row.type) {
                    case undefined:  // default to "link" type if not specified
                    case "link":
                        error = !row.title ? "Title required for links." : !row.address ? "Address required for links." : false;
                        if (error) {
                            throw { name: "Missing Property", message: `${error}\n${JSON.stringify(row)}` };
                        }
                        menu.link(row.address, row.title, parent);
                        break;
                    case "menu":
                        error = !row.title ? "Title required for menus." : !row.entries ? "One or more entries required for menus." : false;
                        if (error) {
                            throw { name: "Missing Property", message: `${error}\n${JSON.stringify(row)}` };
                        }
                        menu.submenu(row.title, parent);
                        settings._parse(row.entries, row.title);
                        break;
                    case "separator":
                        menu.separator(parent);
                        break;
                    default:
                        throw { name: "Unknown Type", message: `Valid types are link, menu, and separator.\n${JSON.stringify(row)}` };
                }
            }
        }
    };

    const defaults = `[
        { "title": "Google", "address": "http://www.google.com/search?q=%s" },
        { "title": "Bing",   "address": "http://www.bing.com/search?q=%s" },
        { "title": "Yahoo!", "address": "http://search.yahoo.com/search?p=%s" },

        { "type": "separator" },

        { "title": "Wikipedia",        "address": "http://www.wikipedia.org/wiki/%s" },
        { "title": "Dictionary.com",   "address": "http://dictionary.reference.com/browse/%s" },
        { "title": "Urban Dictionary", "address": "http://www.urbandictionary.com/define.php?term=%s" },

        { "type": "separator" },

        { "title": "Amazon", "address": "http://www.amazon.com/s/field-keywords=%s" },
        { "title": "eBay",   "address": "http://www.ebay.com/sch/i.html?_nkw=%s" },

        { "type": "separator" },

        { "title": "YouTube", "address": "http://www.youtube.com/results?search_query=%s" },

        { "type": "separator" },

        { "type": "menu", "title": "to English from...", "entries":
            [
                { "title": "Chinese",  "address": "http://translate.google.com/#zh-CN|en|%s" },
                { "title": "Japanese", "address": "http://translate.google.com/#ja|en|%s" },
                { "title": "Korean",   "address": "http://translate.google.com/#ko|en|%s" }
            ]
        },
        { "type": "menu", "title": "from English to...", "entries":
            [
                { "title": "Chinese (Simplified)",  "address": "http://translate.google.com/#en|zh-CN|%s" },
                { "title": "Chinese (Traditional)", "address": "http://translate.google.com/#en|zh-TW|%s" },
                { "title": "Japanese",              "address": "http://translate.google.com/#en|ja|%s" },
                { "title": "Korean",                "address": "http://translate.google.com/#en|ko|%s" }
            ]
        },

        { "type": "separator" },

        { "type": "menu", "title": "to USD from...", "entries":
            [
                { "title": "CAD: Canadian Dollar",        "address": "http://www.google.com/search?q=%s+CAD+to+USD" },
                { "title": "CNY: Chinese Yuan",           "address": "http://www.google.com/search?q=%s+CNY+to+USD" },
                { "title": "GBP: British Pound Sterling", "address": "http://www.google.com/search?q=%s+GBP+to+USD" },
                { "title": "EUR: Euro",                   "address": "http://www.google.com/search?q=%s+EUR+to+USD" },
                { "title": "JPY: Japanese Yen",           "address": "http://www.google.com/search?q=%s+JPY+to+USD" },
                { "title": "KRW: South Korean Won",       "address": "http://www.google.com/search?q=%s+KRW+to+USD" }
            ]
        },
        { "type": "menu", "title": "from USD to...", "entries":
            [
                { "title": "CAD: Canadian Dollar",        "address": "http://www.google.com/search?q=%s+USD+to+CAD" },
                { "title": "CNY: Chinese Yuan",           "address": "http://www.google.com/search?q=%s+USD+to+CNY" },
                { "title": "GBP: British Pound Sterling", "address": "http://www.google.com/search?q=%s+USD+to+GBP" },
                { "title": "EUR: Euro",                   "address": "http://www.google.com/search?q=%s+USD+to+EUR" },
                { "title": "JPY: Japanese Yen",           "address": "http://www.google.com/search?q=%s+USD+to+JPY" },
                { "title": "KRW: South Korean Won",       "address": "http://www.google.com/search?q=%s+USD+to+KRW" }
            ]
        },

        { "type": "separator" },

        { "type": "menu", "title": "Schemes", "entries":
            [
                { "title": "mailto", "address": "mailto:%s" }
            ]
        }
    ]`.replace(/\n {4}/g, "\n");

    document.onreadystatechange = () => {
        if (document.title.includes("Lookup Assistant") && document.readyState !== "loading") {
            doc("editor").value = storage.get();
            settings.parse();

            for (const key of Object.keys(button)) {
                document.getElementById(key).onclick = button[key];
            }

            window.onbeforeunload = (event) => {
                if (doc("editor").value !== storage.get()) {
                    event.preventDefault();
                    event.returnValue = "There are unsaved changes!";
                }
            };
        }
    };
}());
