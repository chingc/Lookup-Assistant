(function () {
    "use strict";

    const getElement = (id) => document.getElementById(id);

    const storage = {
        key: "LUA_Settings",
        get: () => localStorage.getItem(storage.key),
        set: (data) => localStorage.setItem(storage.key, data)
    };

    const button = {
        save: () => {
            if (confirm("Save settings?")) {
                if (settings.parse()) {
                    storage.set(getElement("editor").value);
                }
            }
        },
        load: () => {
            if (confirm("Load saved settings?")) {
                getElement("editor").value = storage.get();
                settings.parse();
            }
        },
        default: () => {
            if (confirm("Load default settings?")) {
                storage.set(defaults);
                getElement("editor").value = defaults;
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
                let text = getElement("editor").value;
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
        { "title": "DuckDuckGo", "address": "https://duckduckgo.com/?q=%s" },
        { "title": "Google",     "address": "http://www.google.com/search?q=%s" },
        { "title": "Bing",       "address": "http://www.bing.com/search?q=%s" },
        { "title": "Yahoo!",     "address": "http://search.yahoo.com/search?p=%s" },

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

        { "type": "menu", "title": "Currency", "entries":
            [
                { "title": "CAD -> USD", "address": "http://www.google.com/search?q=%s+CAD+to+USD" },
                { "title": "CNY -> USD", "address": "http://www.google.com/search?q=%s+CNY+to+USD" },
                { "title": "EUR -> USD", "address": "http://www.google.com/search?q=%s+EUR+to+USD" },
                { "title": "GBP -> USD", "address": "http://www.google.com/search?q=%s+GBP+to+USD" },
                { "title": "JPY -> USD", "address": "http://www.google.com/search?q=%s+JPY+to+USD" },
                { "title": "KRW -> USD", "address": "http://www.google.com/search?q=%s+KRW+to+USD" },
                { "title": "USD -> CAD", "address": "http://www.google.com/search?q=%s+USD+to+CAD" },
                { "title": "USD -> CNY", "address": "http://www.google.com/search?q=%s+USD+to+CNY" },
                { "title": "USD -> EUR", "address": "http://www.google.com/search?q=%s+USD+to+EUR" },
                { "title": "USD -> GBP", "address": "http://www.google.com/search?q=%s+USD+to+GBP" },
                { "title": "USD -> JPY", "address": "http://www.google.com/search?q=%s+USD+to+JPY" },
                { "title": "USD -> KRW", "address": "http://www.google.com/search?q=%s+USD+to+KRW" }
            ]
        },

        { "type": "separator" },

        { "type": "menu", "title": "Translate", "entries":
            [
                { "title": "CN -> US", "address": "http://translate.google.com/#zh-CN|en|%s" },
                { "title": "JP -> US", "address": "http://translate.google.com/#ja|en|%s" },
                { "title": "KR -> US", "address": "http://translate.google.com/#ko|en|%s" },
                { "title": "US -> CN", "address": "http://translate.google.com/#en|zh-CN|%s" },
                { "title": "US -> JP", "address": "http://translate.google.com/#en|ja|%s" },
                { "title": "US -> KR", "address": "http://translate.google.com/#en|ko|%s" }
            ]
        }
    ]`.replace(/\n {4}/g, "\n");

    // initialization when extension is installed
    if (storage.get() === null) {
        storage.set(defaults);
        settings._parse(JSON.parse(defaults));
    } else {
        // initialization when chrome starts
        if (!Object.keys(menu.id).length) {
            settings._parse(JSON.parse(storage.get()));
            menu.id._initialized_ = true;
        }
    }

    // options page
    document.onreadystatechange = () => {
        if (document.title.includes("Lookup Assistant") && document.readyState !== "loading") {
            getElement("editor").value = storage.get();
            settings.parse();

            for (const key of Object.keys(button)) {
                getElement(key).onclick = button[key];
            }

            window.onbeforeunload = (event) => {
                if (getElement("editor").value !== storage.get()) {
                    event.preventDefault();
                    event.returnValue = "There are unsaved changes!";
                }
            };
        }
    };
}());
