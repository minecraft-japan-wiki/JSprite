var JSONData = {};

$(function () {
    //ビジュアルエディターへ対応
    var hooks = [
        'wikipage.content',
        've.activationComplete',
        've.wikitextInteractive',
        'renderSprites',
    ];
    hooks.forEach(function (hook) {
        mw.hook(hook).add(check_elements);
    });
});

//JSpriteエレメントの存在チェック＆必要なJSONの逐次読み込み
function check_elements() {
    const path = mw.config.get('wgScriptPath') + '/index.php?';
    var sprite_elements = $('.jsprite, #jsprite-doc').toArray();

    var promises = [];
    sprite_elements.forEach(function (element) {
        var sheet = element.getAttribute('data-sheet');
        if (!JSONData.hasOwnProperty(sheet)) {
            JSONData[sheet] = {};
            promises.push(
                jsonLoader(
                    sheet,
                    path +
                        'title=' +
                        encodeURIComponent('MediaWiki:' + sheet + '.json') +
                        '&' +
                        'action=raw&' +
                        'ctype=' +
                        encodeURIComponent('application/json')
                )
            );
        }
    });

    if (promises.length) {
        Promise.all(promises).then(function (resolves) {
            resolves.forEach(function (data) {
                JSONData[data.name] = data.json;
            });
            apply_contents();
        });
    } else {
        apply_contents();
    }
}

//スプライトの反映
function apply_contents(hook) {
    $('.jsprite').each(eachTarget);

    //// for document ////
    if (document.querySelector('#jsprite-doc')) {
        createDoc.call(document.querySelector('#jsprite-doc'));
    }
}

//Debouncing Method
var minetooltip_timer;
function tooltipQueue() {
    if (minetooltip_timer) {
        clearTimeout(minetooltip_timer);
    }
    minetooltip_timer = setTimeout(tooltipReady, 100);
}

function tooltipReady() {
    if (typeof tooltip === 'object' && typeof tooltip.refresh === 'function') {
        tooltip.refresh();
    }
}

function capitalize(text) {
    if (text) {
        var tokens = text.replace(/(\_|\-)/g, ' ').split(' ');
        tokens = tokens.map(function (token) {
            if (token.length > 1) {
                if (
                    [
                        'of',
                        'in',
                        'on',
                        'and',
                        "o'",
                        'with',
                        'as',
                        'at',
                        'the',
                        'an',
                    ].indexOf(token.toLowerCase()) > -1
                ) {
                    return token.toLowerCase();
                } else {
                    if (
                        [
                            'je',
                            'be',
                            'pe',
                            'lce',
                            '3ds',
                            'mhf',
                            'tnt',
                            'tnt2',
                            'npc',
                            'usb',
                        ].indexOf(token.toLowerCase()) > -1
                    ) {
                        return token.toUpperCase();
                    } else {
                        return (
                            token.charAt(0).toUpperCase() +
                            token.toLowerCase().substr(1)
                        );
                    }
                }
            } else if (token == tokens[0]) {
                return token.toUpperCase();
            }
            return token;
        });
        return tokens.join(' ');
    }
    return text;
}

function eachTarget() {
    var option = {
        target: $(this),
        sheet: $(this).attr('data-sheet'),
        id: $(this).attr('data-id'),
        scale: $(this).attr('data-scale'),
        link: $(this).attr('data-link'),
        title: $(this).attr('data-title'),
        text: $(this).attr('data-text'),
        image: $(this).attr('data-image'),
        'sheet-width':
            $(this).attr('data-sheet-width') || $(this).attr('data-sheetsize'),
        'sheet-height': $(this).attr('data-sheet-height'),
        width: $(this).attr('data-width') || $(this).attr('data-size'),
        height: $(this).attr('data-height') || $(this).attr('data-size'),
        pos: $(this).attr('data-pos'),
        notip: $(this).attr('data-notip'),
        nocap: $(this).attr('data-nocap'),
        rarity: $(this).attr('data-rarity'),
        description: $(this).attr('data-description'),
        posi: $(this).attr('data-posi'),
        nega: $(this).attr('data-nega'),
    };

    if ($(this).attr('data-description2')) {
        var i = 2;
        while ($(this).attr('data-description' + i)) {
            option['description' + i] = $(this).attr('data-description' + i);
            option['posi' + i] = $(this).attr('data-posi' + i);
            option['nega' + i] = $(this).attr('data-nega' + i);
            i++;
        }
    }

    if (JSONData.hasOwnProperty(option.sheet)) {
        var data = JSONData[option.sheet];
        makeSprite(data, option);
    }

    function makeSprite(data, option) {
        if (data.settings === undefined) data.settings = {};
        if (data.ids === undefined) data.ids = {};
        if (option.target && option.target.attr('data-done') !== undefined)
            return;

        var isVEenabled =
            window.ve && ve.init && ve.init.target && ve.init.target.active;

        data.settings['sheet-width'] =
            data.settings['sheet-width'] || data.settings.sheetsize;
        data.settings.width = data.settings.width || data.settings.size || 16;
        data.settings.height = data.settings.height || data.settings.size || 16;
        data.settings.scale = data.settings.scale || 1;

        Object.keys(data.settings).forEach(function (key) {
            option[key] = option[key] || data.settings[key];
        });

        var scale = option.scale || 1;
        var id = option.id;
        let hasIrregularFiles = false;

        if (id && data.hasOwnProperty('Irregular_files')) {
            if (data.Irregular_files.hasOwnProperty(id)) {
                hasIrregularFiles = true;
            } else {
                id = id.toLowerCase();
                if (data.Irregular_files.hasOwnProperty(id)) {
                    hasIrregularFiles = true;
                } else {
                    id = id.replaceAll(' ', '-');
                    if (data.Irregular_files.hasOwnProperty(id)) {
                        hasIrregularFiles = true;
                    }
                }
            }
        }

        if (!hasIrregularFiles) {
            id = option.id;
            if (id && !data.ids[id]) {
                id = id.toLowerCase();
                if (!data.ids[id]) {
                    id = id.replaceAll(' ', '-');
                }
            }
        }

        if (id && data.ids[id] && !hasIrregularFiles) {
            var target = option.target;

            if (data.hasOwnProperty('appendings')) {
                option = $.extend({}, data.appendings[id] || {}, option);
            }

            var pos = data.ids[id].pos - 1;
            var holizontal_count = option['sheet-width'] / option.width;

            var position = {
                x: (pos % holizontal_count) * option.width,
                y: Math.floor(pos / holizontal_count) * option.height,
            };

            var sprite = $('<span/>', {
                class: 'sprite',
            }).css({
                'background-position':
                    '-' +
                    position.x * scale +
                    'px -' +
                    position.y * scale +
                    'px',
            });

            if (!option.notip) {
                var tooltipopt = '';
                if (option.rarity || option.description) {
                    var obj = {};
                    if (option.rarity) {
                        obj['class'] = 'minetext-' + option.rarity;
                    }
                    if (!option.description2) {
                        if (option.description) {
                            obj.description = option.description;
                            if (option.posi) {
                                obj.posi = 1;
                            }
                            if (option.nega) {
                                obj.nega = 1;
                            }
                        }
                    } else {
                        obj.description = [];
                        var i = 1,
                            d;
                        while (option['description' + ((i > 1 && i) || '')]) {
                            var item = {};
                            d = (i > 1 && i) || '';
                            item.description = option['description' + d];
                            if (option['posi' + d]) {
                                item.posi = option['posi' + d];
                            }
                            if (option['nega' + d]) {
                                item.nega = option['nega' + d];
                            }
                            obj.description.push(item);
                            i++;
                        }
                    }
                    tooltipopt = JSON.stringify(obj);
                }

                sprite.attr({
                    'data-mine-tooltip': tooltipopt,
                    title:
                        option.title ||
                        (option.nocap ? option.id : capitalize(option.id)),
                });
            }

            if (scale != data.settings.scale) {
                sprite.css({
                    width: option.width * scale + 'px',
                    height: option.height * scale + 'px',
                    'background-size':
                        option['sheet-width'] * scale + 'px auto',
                });
            }

            if (data.settings.classname) {
                //クラス定義を使うべき
                sprite.addClass(data.settings.classname);
            } else {
                var url = data.settings.image;
                if (option.image) {
                    url = option.image;
                }

                if (!url && option.sheet) {
                    url = ('Special:FilePath/' + option.sheet + '.png').replace(
                        /^(.*)$/,
                        mw.config.get('wgArticlePath')
                    );
                }

                sprite.css({ 'background-image': 'url(' + url + ')' });
            }

            if (option.text) {
                var spriteText = $('<span/>', {
                    class: 'sprite-text',
                    text: option.text,
                });

                if (option.link) {
                    target.after(
                        $('<a/>', { href: option.link }).append(spriteText)
                    );
                } else {
                    target.after(spriteText);
                }
            }

            if (option.link) {
                target.after($('<a/>', { href: option.link }).append(sprite));
            } else {
                if (isVEenabled) {
                    target.append(sprite);
                    target.css({ width: 'auto', height: 'auto' });
                    target.attr('data-done', '');
                } else {
                    target.after(sprite);
                }
            }
            if (!isVEenabled) {
                target.remove();
            }
        } else {
            var filename;
            var isExists = hasIrregularFiles;
            if (isExists) {
                filename = data.Irregular_files[id];
            } else {
                var title = new mw.Title(
                    option.sheet + '_' + id.replaceAll(' ', '_') + '.png',
                    mw.config.get('wgNamespaceIds').file
                );
                isExists = title.exists();
                if (isExists) {
                    filename = title.getPrefixedText();
                }
            }

            if (isExists) {
                getURL(filename).then(function (url) {
                    if (url) {
                        var sprite = $('<img>', {
                            src: url,
                            width: option.width * scale,
                            height: option.height * scale,
                        });

                        if (!option.notip) {
                            sprite.attr({
                                'data-mine-tooltip': '',
                                title:
                                    option.title || option.nocap
                                        ? option.id
                                        : capitalize(option.id),
                            });
                        }
                        option.target.after(sprite);
                        option.target.hide();
                        option.target.attr('data-done', '');
                    } else {
                        var tagsprite = option.target.addClass('sprite');
                        if (id && id != 'blank' && id.length > 0) {
                            tagsprite
                                .attr('data-mine-tooltip', '')
                                .attr('title', option.title || option.id);
                        }
                        noimage(tagsprite, option);
                    }
                    tooltipQueue();
                });
            } else {
                var tagsprite = option.target.addClass('sprite');

                if (id && id != 'blank' && id.length > 0) {
                    tagsprite
                        .attr('data-mine-tooltip', '')
                        .attr('title', option.title || option.id);
                }
                noimage(tagsprite, option);
            }
        }

        tooltipQueue();
    }
}

function noimage(sprite, option) {
    var pos = option.pos - 1 || 0;
    var sheetWidth = option['sheet-width'] || option.sheetsize;
    var width = option.width || option.size || 16;
    var height = option.height || option.size || 16;
    var scale = option.scale || 1;

    var holizontal_count = sheetWidth / width;
    var position = {
        x: (pos % holizontal_count) * width,
        y: Math.floor(pos / holizontal_count) * height,
    };
    sprite.css({
        width: width * scale + 'px',
        height: height * scale + 'px',
        'background-size': sheetWidth * scale + 'px auto',
        'background-position':
            '-' + position.x * scale + 'px -' + position.y * scale + 'px',
    });

    if (option.classname) {
        sprite.addClass(option.classname);
    } else {
        var url = option.image;

        if (!url) {
            getURL(option.sheet + '.png').then(function (url) {
                if (!url) {
                    url = ('Special:FilePath/' + option.sheet + '.png').replace(
                        /^(.*)$/,
                        mw.config.get('wgArticlePath')
                    );
                }
                sprite.css({ 'background-image': 'url(' + url + ')' });
            });
        } else {
            sprite.css({ 'background-image': 'url(' + url + ')' });
        }
    }
    return sprite;
}

function createDoc() {
    if ($('#toc').attr('data-is-toc-appened')) return;
    var container = $(this);
    var sheet = container.attr('data-sheet');
    if (!JSONData.hasOwnProperty(sheet)) return;

    var tocitems = $('<ul />');
    var toc_parentnum = 4;
    var toc_childnum = 1;
    if ($('#toc li:last-child a span.tocnumber').length) {
        toc_parentnum = $('#toc li:last-child a span.tocnumber').text();
    }

    var data = JSONData[sheet];
    var sections = {};
    data.sections.forEach(function (section) {
        section.name = section.name || 'Uncategorized';

        // for TOC
        var section_id = encodeURIComponent(section.name.replaceAll(' ', '_'))
            .replaceAll('%', '\\')
            .replace(/(\[|\]|\(|\))/g, '_');
        while ($('#' + section_id).length) {
            section_id += Math.floor(Math.random() * 1000) + '';
        }

        var sectionTag = $('<div />', {
            class: 'spritedoc-section',
            'data-section-id': section.id,
        })
            .append(
                $('<h3 />').append(
                    $('<span />', {
                        class: 'mw-headline',
                        id: section_id,
                        text: section.name,
                    })
                )
            )
            .appendTo(container);

        sections[section.id] = $('<ul />', {
            class: 'spritedoc-boxes',
        }).appendTo(sectionTag);

        // for TOC
        tocitems.append(
            $('<li />', { class: 'toclevel-2' }).append(
                $('<a />', { href: '#' + section_id }).append(
                    $('<span />', {
                        class: 'tocnumber',
                        text: toc_parentnum + '.' + toc_childnum,
                    }),
                    $('<span />', { class: 'toctext', text: section.name })
                )
            )
        );
        toc_childnum++;
    });

    // settings
    if (!data.settings) data.settings = {};
    data.settings.width = data.settings.width || data.settings.size || 16;
    data.settings.height = data.settings.height || data.settings.size || 16;
    data.settings['sheet-width'] =
        data.settings['sheet-width'] || data.settings['sheet-size'];
    data.settings.scale = data.settings.scale || 1;

    if (data.Irregular_files) {
        // for TOC
        var section_id = 'Irregular-files';
        while ($('#' + section_id).length) {
            section_id += Math.floor(Math.random() * 1000) + '';
        }

        var sectionTag = $('<div />', { class: 'spritedoc-section' })
            .append(
                $('<h3 />').append(
                    $('<span />', {
                        class: 'mw-headline',
                        id: section_id,
                        text: 'Irregular files',
                    })
                )
            )
            .appendTo(container);

        sections[999] = $('<ul />', { class: 'spritedoc-boxes' }).appendTo(
            sectionTag
        );

        // for TOC
        tocitems.append(
            $('<li />', { class: 'toclevel-2' }).append(
                $('<a />', { href: '#' + section_id }).append(
                    $('<span />', {
                        class: 'tocnumber',
                        text: toc_parentnum + '.' + toc_childnum,
                    }),
                    $('<span />', { class: 'toctext', text: 'Irregular files' })
                )
            )
        );
        toc_childnum++;
    }

    // for TOC
    $('#toc li:last-child').append(tocitems);

    var sprite_boxes = {};

    Object.keys(data.ids)
        .sort()
        .forEach(function (key) {
            var value = data.ids[key];
            if (sections.hasOwnProperty(value.section)) {
                if (!sprite_boxes[value.pos]) {
                    sprite_boxes[value.pos] = $('<li />', {
                        class: 'spritedoc-box',
                        'data-pos': value.pos,
                    }).appendTo(sections[value.section]);

                    var sprite = $('<span />', { class: 'sprite ' });
                    var pos = value.pos - 1;

                    var holizontal_count =
                        data.settings['sheet-width'] / data.settings.width;
                    var position = {
                        x:
                            (pos % holizontal_count) *
                            data.settings.width *
                            data.settings.scale,
                        y:
                            Math.floor(pos / holizontal_count) *
                            data.settings.height *
                            data.settings.scale,
                    };

                    sprite.css({
                        'background-position':
                            '-' + position.x + 'px -' + position.y + 'px',
                    });

                    if (data.settings.classname) {
                        sprite.addClass(data.settings.classname);
                    } else {
                        sprite.css({
                            'background-image':
                                'url(' + data.settings.image + ')',
                        });
                    }

                    sprite_boxes[value.pos].append(
                        $('<div />', { class: 'spritedoc-image' }).append(
                            sprite
                        ),
                        $('<ul />', { class: 'spritedoc-names' })
                    );
                }

                var spritenames = sprite_boxes[value.pos].find('ul');
                var codeElm = $('<code />', { text: key });
                spritenames.append(
                    $('<li />', { class: 'spritedoc-name' }).append(codeElm)
                );

                if (value.deprecated) {
                    codeElm.addClass('spritedoc-deprecated');
                }
            }
        });

    // Irregular_files
    if (data.Irregular_files) {
        Object.keys(data.Irregular_files)
            .sort()
            .forEach(function (key) {
                var sprite_box = $('<li />', {
                    class: 'spritedoc-box',
                }).appendTo(sections[999]);

                var sprite = $('<span />', { class: 'sprite ' });

                sprite.addClass(data.settings.classname);

                sprite_box.append(
                    $('<div />', { class: 'spritedoc-image' }).append(sprite),
                    $('<ul />', { class: 'spritedoc-names' })
                );

                var spritenames = sprite_box.find('ul');
                var codeElm = $('<code />', {
                    text: sheet !== 'InvSprite' ? key : capitalize(key),
                });
                spritenames.append(
                    $('<li />', { class: 'spritedoc-name' }).append(codeElm)
                );

                getURL(data.Irregular_files[key]).then(function (url) {
                    if (url) {
                        sprite.css({ 'background-image': 'url(' + url + ')' });
                    } else {
                        noimage(sprite, data.settings);
                    }
                });
            });
    }

    $('#toc').attr('data-is-toc-appened', '1');
}

function jsonLoader(name, filename) {
    return new Promise(function (resolve, reject) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'text';
            xhr.open('GET', filename);
            xhr.setRequestHeader('Cache-Control', 'public');
            xhr.setRequestHeader('Cache-Control', 'min-fresh=43200');
            xhr.setRequestHeader('Cache-Control', 'max-age=86400');
            xhr.onload = function () {
                if (xhr.readyState === xhr.DONE) {
                    if (xhr.status === 200) {
                        try {
                            var json = JSON.parse(xhr.responseText);
                            if (typeof json.ids === 'object') {
                                var key,
                                    keys = Object.keys(json.ids);
                                var n = keys.length;
                                var newobj = {};
                                while (n--) {
                                    key = keys[n];
                                    newobj[key.toLowerCase()] = json.ids[key];
                                }
                                json.ids = newobj;
                            }
                            resolve({ name: name, json: json });
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        reject(Error(xhr.statusText));
                    }
                } else {
                    reject(Error(xhr.statusText));
                }
            };
            xhr.onerror = function () {
                reject(Error('Network Error'));
            };
            xhr.send();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * リトライ可能promise関数
 */
function retryableRequest(request, delay, retries) {
    var deferred = $.Deferred();
    var curRequest;
    var timeout;
    retries = retries || 1;
    var attemptRequest = function (attempt) {
        (curRequest = request()).then(deferred.resolve, function (code, data) {
            if (attempt <= retries) {
                timeout = setTimeout(function () {
                    attemptRequest(++attempt);
                }, delay || 1000);
            } else {
                deferred.reject(code, data);
            }
        });
    };
    attemptRequest(1);

    return deferred.promise({
        abort: function () {
            if (curRequest.abort) {
                curRequest.abort();
            }
            clearTimeout(timeout);
        },
    });
}

/**
 * ファイルのリアルURLを引っこ抜く
 */
function getURL(filename) {
    filename = filename.replaceAll(' ', '_');
    if (filename.indexOf('File:') != 0) {
        filename = 'File:' + filename;
    }
    return retryableRequest(function () {
        return new mw.Api().get({
            action: 'query',
            titles: filename,
            prop: 'imageinfo',
            iiprop: 'url',
        });
    })
        .then(function (data) {
            if (data) {
                var pageid = Object.keys(data.query.pages)[0];
                if (pageid > -1) {
                    return data.query.pages[pageid].imageinfo[0].url;
                }
            }
            return '';
        })
        .fail(function () {
            return '';
        });
}
