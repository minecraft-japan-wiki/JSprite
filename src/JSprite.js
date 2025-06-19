var JSONData = {};

const hooks = [
    'wikipage.content',
    've.activationComplete',
    've.wikitextInteractive',
    'renderSprites'
];

hooks.forEach(function (hook) {
    mw.hook(hook).add(prepareSpriteRendering);
});
setupVESpriteHooks();

/**
 * Scans the page for all sprite-related elements and ensures their associated data is loaded.
 * @returns {void}
 */
function prepareSpriteRendering() {
    var sprite_elements = $(".jsprite, #jsprite-doc").toArray();

    var promises = [];
    sprite_elements.forEach(function (element) {
    	var promise = loadSpriteData(element);
        if( promise !== undefined ) promises.push(promise);
    });

    if (promises.length) {
        Promise.all(promises).then(function (resolves) {
            resolves.forEach(function (data) {
                JSONData[data.name] = data.json;
            });
        }).then(()=>{
        	renderAllSpriteElements();
        });
    } else {
        renderAllSpriteElements();
    }
}

/**
 * Enables sprite rendering within VisualEditor (VE) transclusion nodes.
 * @returns {void}
 */
function setupVESpriteHooks(){
    mw.hook( 've.activationComplete' ).add( () => {
        mw.loader.using( [ 'ext.visualEditor.core', 'ext.visualEditor.mwtransclusion' ] ).then( () => {
            const origFunc = ve.ce.MWTransclusionNode.prototype.afterRender;
            
            ve.ce.MWTransclusionNode.prototype.afterRender = function ( ) {
                
                if(this.type === "mwTransclusionInline"){
                    try{
                        if( this.$element.hasClass("jsprite") ){
                            var element = this.$element.toArray()[0];
                            this.on("rerender", ()=>{ renderElement( element ); });
                        }
                        if( this.$element.find(".jsprite").length>0 ) {
                            const $this = this;
                            this.$element.find(".jsprite").each(function(){
                                $this.on("rerender", ()=>{ renderElement( this ); });
                            });
                        }
                    }catch{
                    }
                }
                
                return origFunc.apply( this, arguments );
            };
        });
    } );
}

/**
 * Loads sprite data from a MediaWiki JSON page based on a data attribute in the given HTML element.
 *
 * This function checks the `data-sheet` attribute of the provided DOM element,
 * and if the data has not yet been cached in the global `JSONData` object,
 * it fetches the corresponding JSON from the wiki via `loadJSON()`.
 *
 * @param {Element} element - The HTML element containing a `data-sheet` attribute referencing the JSON page.
 * @returns {Promise<{name: string; json: any;}>|undefined} A Promise resolving to the parsed JSON data if loading is triggered,
 *   or `undefined` if the sheet is already loaded or the element is invalid.
 */
function loadSpriteData( element ){
	const path = mw.config.get('wgScriptPath') + '/index.php?';

	if(element){
		var sheet = element.getAttribute("data-sheet");
	    if (!JSONData.hasOwnProperty(sheet)) {
	        JSONData[sheet] = {};
	        return loadJSON(sheet, path +
	            "title=" + encodeURIComponent("MediaWiki:" + sheet + ".json") + "&" +
	            "action=raw&" +
	            "ctype=" + encodeURIComponent("application/json")
	        );
	    }
	}
}

/**
 * Renders an element by loading and applying associated sprite data.
 * @param {Element|Element[]} element - The DOM element or elements to be rendered.
 */
function renderElement( element ) {
	var promise = loadSpriteData( element );
	if( promise !== undefined ){
		promise.then(function (data) {
	        JSONData[data.name] = data.json;
	    }).then(()=>{
		    renderAllSpriteElements();
	        if(element) $( element ).each(renderSpriteElement);
	    });
	} else {
        renderAllSpriteElements();
        if(element) $( element ).each(renderSpriteElement);
    }
}

/**
 * Applies sprite rendering logic to all relevant elements in the document.
 * @returns {void}
 */
function renderAllSpriteElements() {
    $(".jsprite").each(renderSpriteElement);
    
    //// for document ////
    if (document.querySelector("#jsprite-doc")) {
        createDocument.call(document.querySelector("#jsprite-doc"));
    }
}


/**
 * Renders a single `.jsprite` element based on its `data-*` attributes and sprite sheet metadata.
 * @this {Element} The current element being processed (typically with class `.jsprite`).
 * @returns {void}
 */
function renderSpriteElement() {
    var option = {
        target: $(this),
        sheet: $(this).attr("data-sheet"),
        id: $(this).attr("data-id"),
        scale: $(this).attr("data-scale"),
        link: $(this).attr("data-link"),
        title: $(this).attr("data-title"),
        text: $(this).attr("data-text"),
        image: $(this).attr("data-image"),
        "sheet-width": $(this).attr("data-sheet-width") || $(this).attr("data-sheetsize"),
        "sheet-height": $(this).attr("data-sheet-height"),
        width: $(this).attr("data-width") || $(this).attr("data-size"),
        height: $(this).attr("data-height") || $(this).attr("data-size"),
        pos: $(this).attr("data-pos"),
        notip: $(this).attr("data-notip"),
        nocap: $(this).attr("data-nocap"),
        rarity: $(this).attr("data-rarity"),
        description: $(this).attr("data-description"),
        posi: $(this).attr("data-posi"),
        nega: $(this).attr("data-nega")
    };

    if ($(this).attr("data-description2")) {
        var i = 2;
        while ($(this).attr("data-description" + i)) {
            option['description' + i] = $(this).attr("data-description" + i);
            option['posi' + i] = $(this).attr("data-posi" + i);
            option['nega' + i] = $(this).attr("data-nega" + i);
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
        if (option.target && option.target.attr("data-done") !== undefined) return;

        var isVEenabled = (window.ve && ve.init && ve.init.target && ve.init.target.active);
	
		data.settings["sheet-width"] = data.settings["sheet-width"] || data.settings.sheetsize;
		data.settings.width = data.settings.width || data.settings.size || 16;
		data.settings.height = data.settings.height || data.settings.size || 16;
        data.settings.scale = data.settings.scale || 1;

        Object.keys(data.settings).forEach(function (key) {
            option[key] = option[key] || data.settings[key];
        });

        var scale = option.scale || 1;
        var id = option.id;
        let hasIrregularFiles = false;
        
        if (id && data.hasOwnProperty("Irregular_files")){
        	if (data.Irregular_files.hasOwnProperty(id)) {
        		hasIrregularFiles = true;
	        }else{
            	id = id.toLowerCase();
            	if (data.Irregular_files.hasOwnProperty(id)) {
        			hasIrregularFiles = true;
		        }else{
	            	id = id.replaceAll(" ", "-");
	            	if (data.Irregular_files.hasOwnProperty(id)) {
	        			hasIrregularFiles = true;
			        }
		        }
	        }
        }
        
        if (!hasIrregularFiles) {
        	id = option.id;
        	if (id && !data.ids[id]){
        		id = id.toLowerCase();
	            if (!data.ids[id]) {
	                id = id.replaceAll(" ", "-");
	            }
        	}
        }

        if (id && data.ids[id] && !hasIrregularFiles) {
            if (data.hasOwnProperty("appendings")) {
                option = $.extend({}, data.appendings[id] || {}, option);
            }

            var pos = data.ids[id].pos - 1;
            var holizontal_count = option["sheet-width"] / option.width;

            var position = {
                x: (pos % holizontal_count) * option.width,
                y: Math.floor(pos / holizontal_count) * option.height
            };

            var sprite =
                $("<span/>", {
                    "class": "sprite"
                }).css({
                    "background-position": "-" + (position.x * scale) + "px -" + (position.y * scale) + "px"
                });

            if (!option.notip) {
                var tooltipopt = "";
                if (option.rarity || option.description) {
                    var obj = {};
                    if (option.rarity) {
                        obj['class'] = "minetext-" + option.rarity;
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
                        var i = 1, d;
                        while (option['description' + (i > 1 && i || '')]) {
                            var item = {};
                            d = (i > 1 && i || '');
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
                    "data-mine-tooltip": tooltipopt,
                    "title": option.title || (option.nocap ? option.id : capitalize(option.id))
                });
            }

            if (scale != data.settings.scale) {
                sprite.css({
                    "width": (option.width * scale) + "px",
                    "height": (option.height * scale) + "px",
                    "background-size": (option["sheet-width"] * scale) + "px auto"
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
                    url = ("Special:FilePath/" + option.sheet + ".png").replace(/^(.*)$/, mw.config.get( 'wgArticlePath' ));
                }

                sprite.css({ "background-image": "url(" + url + ")" });
            }

            if (option.text) {
                var spriteText = $("<span/>", { "class": "sprite-text", "text": option.text });

                if (option.link) {
                    option.target.after(
                        $("<a/>", { "href": option.link }).append(spriteText)
                    );
                } else {
                    option.target.after(spriteText);
                }
            }

            if (option.link) {
                option.target.after(
                    $("<a/>", { "href": option.link }).append(sprite)
                );
            } else {
                if (isVEenabled) {
                    option.target.empty();
                    option.target.append( sprite );
                    option.target.css({ width: "auto", height: "auto" });
                    option.target.attr("data-done", "");
                } else {
                    option.target.after(sprite);
                }
            }
            if (!isVEenabled) {
                option.target.remove();
            }
        }

        else {
			var filename;
            var isExists = hasIrregularFiles;
            if (isExists) {
            	filename = data.Irregular_files[id];
            } else {
				var title = new mw.Title( option.sheet + "_" + id.replaceAll(" ", "_") + ".png", mw.config.get( 'wgNamespaceIds' ).file);
				isExists = title.exists();
				if (isExists){
					filename = title.getPrefixedText();
				}
			}

            if (isExists) {
                getURL( filename ).then( function( url ){
                    if ( url ){
                        var sprite = $("<img>", {
                            "src": url,
                            "width": option.width * scale,
                            "height": option.height * scale,
                        });

                        if (!option.notip) {
                            sprite.attr({
                                "data-mine-tooltip": "",
                                "title": option.title || option.nocap ? option.id : capitalize(option.id)
                            });
                        }
                        //option.target.after(sprite);
                        //option.target.hide();
                        option.target.css({ width: "auto", height: "auto" });
                        option.target.empty();
		                option.target.append(sprite);
                        option.target.attr("data-done", "");
                    } else {
                        if (id && id != "blank" && id.length > 0) {
                            option.target
                                .attr("data-mine-tooltip", "")
                                .attr("title", option.title || option.id);
                        }
		                var spr = $("<span/>", {"class": "sprite"} );
		                renderFallbackSprite(spr, option);
                        option.target.css({ width: "auto", height: "auto" });
                        option.target.empty();
		                option.target.append(spr);
                    }
        			tooltipQueue();
                });

            } else {
                if (id && id != "blank" && id.length > 0) {
                    option.target
                        .attr("data-mine-tooltip", "")
                        .attr("title", option.title || option.id);
                }
                var spr = $("<span/>", {"class": "sprite"} );
                renderFallbackSprite(spr, option);
                option.target.css({ width: "auto", height: "auto" });
                option.target.empty();
                option.target.append(spr);
            }
        }

        tooltipQueue();
    }
}

/**
 * Applies a fallback sprite style when no valid image or ID-based sprite is available.
 * @param {JQuery<HTMLElement>} sprite - The target jQuery element to style (typically a `<span class="sprite">`).
 * @param {Object} option - Sprite rendering options, typically parsed from `data-*` attributes.
 * @returns {JQuery<HTMLElement>} The styled `sprite` element.
 */
function renderFallbackSprite( sprite, option ) {
    var pos = option.pos - 1 || 0;
    var sheetWidth = option["sheet-width"] || option.sheetsize;
    var width = option.width || option.size || 16;
    var height = option.height || option.size || 16;
    var scale = option.scale || 1;
    
    var holizontal_count = sheetWidth / width;
    var position = {
        x: (pos % holizontal_count) * width,
        y: Math.floor(pos / holizontal_count) * height
    };
    sprite.css({
        "width": (width * scale) + "px",
        "height": (height * scale) + "px",
        "background-size": (sheetWidth * scale) + "px auto",
        "background-position": "-" + (position.x * scale) + "px -" + (position.y * scale) + "px"
    });

    if ( option.classname) {
        sprite.addClass( option.classname );
    } else {
        var url = option.image;

        if (!url) {
            getURL( option.sheet + ".png" ).then( function( url ){
                if( !url ) {
                    url = ("Special:FilePath/" + option.sheet + ".png").replace(/^(.*)$/, mw.config.get( 'wgArticlePath' ));
                }
                sprite.css({ "background-image": "url(" + url + ")" });
            });
        } else {
            sprite.css({ "background-image": "url(" + url + ")" });
        }
    }
    return sprite;
}

/**
 * Dynamically generates a documentation section and table of contents (TOC) for sprite data.
 *
 * This function reads sprite metadata from a cached JSON object (`JSONData`) associated with the `data-sheet`
 * attribute of the DOM element it's bound to (`this`). It creates section headers and boxes for each sprite,
 * appending them to the DOM and to the MediaWiki-style TOC. Sprite previews are shown using background positioning.
 * 
 * @this {HTMLElement | ArrayLike<HTMLElement>} The jQuery-wrapped DOM element with a `data-sheet` attribute.
 * @returns {void}
 */
function createDocument() {
    if ($("#toc").attr('data-is-toc-appened')) return;
    var container = $(this);
    var sheet = container.attr("data-sheet");
    if (!JSONData.hasOwnProperty(sheet)) return;

    var tocitems = $("<ul />");
    var toc_parentnum = 4;
    var toc_childnum = 1;
    if ($("#toc li:last-child a span.tocnumber").length) {
        toc_parentnum = $("#toc li:last-child a span.tocnumber").text();
    }

    var data = JSONData[sheet];
    var sections = {};
    data.sections.forEach(function (section) {
        section.name = section.name || "Uncategorized";

        // for TOC
        var section_id = encodeURIComponent(section.name.replaceAll(" ", "_")).replaceAll("%", "\\").replace(/(\[|\]|\(|\))/g, "_");
        while ($("#" + section_id).length) {
            section_id += (Math.floor(Math.random() * 1000) + "");
        }

        var sectionTag =
            $('<div />', { "class": "spritedoc-section", "data-section-id": section.id }).append(
                $('<h3 />').append(
                    $('<span />', { "class": "mw-headline", "id": section_id, "text": section.name })
                )
            ).appendTo(container);

        sections[section.id] = $('<ul />', { "class": "spritedoc-boxes" }).appendTo(sectionTag);

        // for TOC
        tocitems.append(
            $('<li />', { "class": "toclevel-2" }).append(
                $('<a />', { "href": "#" + section_id }).append(
                    $('<span />', { "class": "tocnumber", "text": toc_parentnum + "." + toc_childnum }),
                    $('<span />', { "class": "toctext", "text": section.name })
                )
            )
        );
        toc_childnum++;
    });
    
    // settings
    if(!data.settings) data.settings = {};
    data.settings.width = data.settings.width || data.settings.size || 16;
    data.settings.height = data.settings.height || data.settings.size || 16;
    data.settings["sheet-width"] = data.settings["sheet-width"] || data.settings["sheet-size"];
    data.settings.scale = data.settings.scale || 1;

    if (data.Irregular_files) {
        // for TOC
        var section_id = "Irregular-files";
        while ($("#" + section_id).length) {
            section_id += (Math.floor(Math.random() * 1000) + "");
        }


        var sectionTag =
            $('<div />', { "class": "spritedoc-section" }).append(
                $('<h3 />').append(
                    $('<span />', { "class": "mw-headline", "id": section_id, "text": "Irregular files" })
                )
            ).appendTo(container);

        sections[999] = $('<ul />', { "class": "spritedoc-boxes" }).appendTo(sectionTag);

        // for TOC
        tocitems.append(
            $('<li />', { "class": "toclevel-2" }).append(
                $('<a />', { "href": "#" + section_id }).append(
                    $('<span />', { "class": "tocnumber", "text": toc_parentnum + "." + toc_childnum }),
                    $('<span />', { "class": "toctext", "text": "Irregular files" })
                )
            )
        );
        toc_childnum++;
    }

    // for TOC
    $("#toc li:last-child").append(tocitems);

    var sprite_boxes = {};

    Object.keys(data.ids).sort().forEach(function (key) {
        var value = data.ids[key];
        if (sections.hasOwnProperty(value.section)) {

            if (!sprite_boxes[value.pos]) {

                sprite_boxes[value.pos] = $("<li />", {
                    "class": "spritedoc-box",
                    "data-pos": value.pos
                }).appendTo(sections[value.section]);

                var sprite = $("<span />", { "class": "sprite " });
                var pos = value.pos - 1;

                var holizontal_count = data.settings["sheet-width"] / data.settings.width;
                var position = {
                    x: (pos % holizontal_count) * data.settings.width * data.settings.scale,
                    y: Math.floor(pos / holizontal_count) * data.settings.height * data.settings.scale
                };

                sprite.css({
                    "background-position": "-" + position.x + "px -" + position.y + "px"
                });

                if (data.settings.classname) {
                    sprite.addClass(data.settings.classname);
                } else {
                    sprite.css({ "background-image": "url(" + data.settings.image + ")" });
                }

                sprite_boxes[value.pos].append(
                    $("<div />", { "class": "spritedoc-image" }).append(sprite),
                    $("<ul />", { "class": "spritedoc-names" })
                );
            }

            var spritenames = sprite_boxes[value.pos].find("ul");
            var codeElm = $("<code />", { "text": key });
            spritenames.append(
                $("<li />", { "class": "spritedoc-name" }).append(
                    codeElm
                )
            );

            if (value.deprecated) {
                codeElm.addClass('spritedoc-deprecated');
            }
        }
    });

    // Irregular_files
    if (data.Irregular_files) {
        Object.keys(data.Irregular_files).sort().forEach(function (key) {

            var sprite_box = $("<li />", {
                "class": "spritedoc-box"
            }).appendTo(sections[999]);

            var sprite = $("<span />", { "class": "sprite " });

            sprite.addClass(data.settings.classname);

            sprite_box.append(
                $("<div />", { "class": "spritedoc-image" }).append(sprite),
                $("<ul />", { "class": "spritedoc-names" })
            );

            var spritenames = sprite_box.find("ul");
            var codeElm = $("<code />", { "text": (sheet !== 'InvSprite' ? key : capitalize(key)) });
            spritenames.append(
                $("<li />", { "class": "spritedoc-name" }).append(
                    codeElm
                )
            );

            getURL( data.Irregular_files[key] ).then( function( url ){
                if ( url ){
                    sprite.css({ "background-image": "url(" + url + ")" });
                } else {
                    renderFallbackSprite( sprite, data.settings );
                }
            });

        });
    }

    $("#toc").attr('data-is-toc-appened', '1');
}

/**
 * Loads and parses a JSON file from a given URL using XMLHttpRequest.
 *
 * This function fetches a JSON file, optionally normalizes the `ids` object
 * by converting all its keys to lowercase, and resolves with the result.
 *
 * @param {string} name - An arbitrary name to identify the data being loaded.
 * @param {string} filename - The URL or path to the JSON file.
 * @returns {Promise<{ name: string, json: Object }>} A Promise that resolves with an object containing:
 *   - `name`: The name provided to the function.
 *   - `json`: The parsed JSON object, with `ids` keys lowercased if present.
 */
function loadJSON(name, filename) {
    return new Promise(function (resolve, reject) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'text';
            xhr.open('GET', filename);
            xhr.setRequestHeader("Cache-Control", "public");
            xhr.setRequestHeader("Cache-Control", "min-fresh=43200");
            xhr.setRequestHeader("Cache-Control", "max-age=86400");
            xhr.onload = function () {
                if (xhr.readyState === xhr.DONE) {
                    if (xhr.status === 200) {
                        try {
                        	var responseText = xhr.responseText;
                            var json = JSON.parse(responseText);
                            if (typeof json.ids === "object") {
                                var key, keys = Object.keys(json.ids);
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
                reject(Error("Network Error"));
            };
            xhr.send();
        } catch (err) {
            reject(err);
        }
    });
}

// Debouncing Method
var minetooltip_timer;
function tooltipQueue() {
    if (minetooltip_timer) { clearTimeout(minetooltip_timer); }
    minetooltip_timer = setTimeout(tooltipReady, 100);
}

function tooltipReady() {
    if (typeof tooltip === "object" && typeof tooltip.refresh === "function") {
        tooltip.refresh();
    }
}

/**
 * Capitalizes and formats a given string with special rules for small words and acronyms.
 *
 * This function:
 * - Replaces underscores and hyphens with spaces.
 * - Capitalizes the first letter of most words.
 * - Keeps certain small words (e.g., "of", "and", "in") in lowercase unless they are the first word.
 * - Converts recognized acronyms (e.g., "usb", "npc") to uppercase.
 *
 * @param {string} text - The input text to be formatted.
 * @returns {string} The formatted and capitalized text.
 */
function capitalize(text) {
    if (text) {
        var tokens = text.replace(/(\_|\-)/g, " ").split(" ");
        tokens = tokens.map(function (token) {
            if (token.length > 1) {
                if (['of', "in", 'on', 'and', "o'", "with", "as", "at", "the", "an"].indexOf(token.toLowerCase()) > -1) {
                    return token.toLowerCase();
                } else {
                    if (['je', 'be', 'pe', 'lce', '3ds', 'mhf', 'tnt', 'tnt2', 'npc', 'usb'].indexOf(token.toLowerCase()) > -1) {
                        return token.toUpperCase();
                    } else {
                        return token.charAt(0).toUpperCase() + token.toLowerCase().substr(1);
                    }
                }
            } else
                if (token == tokens[0]) {
                    return token.toUpperCase();
                }
            return token;
        });
        return tokens.join(" ");
    }
    return text;
}

/**
 * Performs a retryable asynchronous request.
 *
 * This function takes a request-producing function and retries it on failure
 * up to a specified number of times with a delay between attempts.
 *
 * @param {Function} request - A function that returns a jQuery Deferred or Promise representing the request.
 * @param {number} [delay=1000] - Delay in milliseconds between retry attempts.
 * @param {number} [retries=1] - Maximum number of retries.
 * @returns {jQuery.Promise} A promise that resolves or rejects with the final result. The returned promise also supports an `abort()` method to cancel the request.
 */
function retryableRequest( request, delay, retries ) {
	var deferred = $.Deferred();
	var curRequest;
	var timeout;
	retries = retries || 1;
	var attemptRequest = function( attempt ) {
		( curRequest = request() ).then( deferred.resolve, function( code, data ) {
			if ( attempt <= retries ) {
				timeout = setTimeout( function() {
					attemptRequest( ++attempt );
				}, delay || 1000 );
			} else {
				deferred.reject( code, data );
			}
			
		} );
	};
	attemptRequest( 1 );
	
	return deferred.promise( { abort: function() {
		if ( curRequest.abort ) {
			curRequest.abort();
		}
		clearTimeout( timeout );
	} } );
}

/**
 * Retrieves the direct URL of a file hosted on MediaWiki.
 * 
 * This function normalizes the file name and uses the MediaWiki API to
 * fetch the actual URL of the file if it exists.
 *
 * @param {string} filename - The file name, with or without the "File:" prefix.
 * @returns {jQuery.Promise<string>} A promise that resolves to the file's direct URL, or an empty string on failure.
 */
function getURL(filename){
    filename = filename.replaceAll(" ", "_");
    if(filename.indexOf("File:") != 0){
        filename = "File:" + filename;
    }
    return retryableRequest( function() {
		return new mw.Api().get( {
            action: 'query',
            titles: filename,
            prop: 'imageinfo',
            iiprop: 'url'
        });
    }).then(function( data ){
        if(data){
            var pageid = Object.keys(data.query.pages)[0];
            if (pageid > -1){
                return data.query.pages[ pageid ].imageinfo[0].url;
            }
        }
        return "";
    }).fail(function(){
        return "";
    });
}
