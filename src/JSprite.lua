local p = {}

function p.base(f)
	local args = f
	if f == mw.getCurrentFrame() then
		args = require('Module:ProcessArgs').merge(true)
	else
		f = mw.getCurrentFrame()
	end

	local sprite = mw.html.create('span'):addClass('jsprite')

	if args['sheet'] then
		sprite:attr('data-sheet', tostring(args['sheet']))
	end

	if args['image'] then
		sprite:attr('data-image', tostring(args['image']))
	end

	if args['sheetsize'] then
		sprite:attr('data-sheetsize', args['sheetsize'])
	end

	if args['sheet-width'] then
		sprite:attr('data-sheet-width', args['sheet-width'])
	end

	if args['sheet-height'] then
		sprite:attr('data-sheet-height', args['sheet-height'])
	end

	if args['size'] then
		sprite:attr('data-size', args['size'])
	end

	if args['height'] then
		sprite:attr('data-height', args['height'])
	end

	if args['width'] then
		sprite:attr('data-width', args['width'])
	end

	if args['pos'] then
		sprite:attr('data-pos', args['pos'])
	end

	if args[1] or args['name'] then
		sprite:attr('data-id', tostring(args[1] or args['name']))
	end

	if args['scale'] then
		sprite:attr('data-scale', args['scale'])
	end

	if args['link'] then
		sprite:attr('data-link', tostring(args['link']))
	end

	------ Appendings ------
	if args['sheet'] == 'InvSprite' then
		local name = args[1] or args['name']
		-- /// Smithing Template ///
		if name:lower() == 'netherite upgrade' or name:lower():find('armor trim') then
			local smithing_template = {
				{ 'Diamond Equipment', 'Netherite Ingot' },
				{ 'Armor',             'Ingot & Crystals' },
			}
			local upgd = name:lower() == 'netherite upgrade' and 1 or 2
			args['description'] = 'Smithing Template'
			args['description2'] = 'Ingredients'
			args['posi2'] = 1
			args['description3'] = 'Applies to:'
			args['description4'] = '&emsp;' .. smithing_template[upgd][1]
			args['posi4'] = 1
			args['description5'] = 'Ingredients:'
			args['description6'] = '&emsp;' .. smithing_template[upgd][2]
			args['posi6'] = 1
		end
	end
	------------------------

	if args['title'] then
		sprite:attr('data-title', tostring(args['title']))
	end

	if args['text'] then
		sprite:attr('data-text', tostring(args['text']))
	end

	if args['notip'] then
		sprite:attr('data-notip', tostring(args['notip']))
	end

	if args['nocap'] then
		sprite:attr('data-nocap', tostring(args['nocap']))
	end

	if args['rarity'] then
		sprite:attr('data-rarity', tostring(args['rarity']))
	end

	if args['description'] then
		sprite:attr('data-description', tostring(args['description']))
		if args['nega'] then
			sprite:attr('data-nega', tostring(args['nega']))
		elseif args['posi'] then
			sprite:attr('data-posi', tostring(args['posi']))
		end

		for i = 2, 10 do
			if args['description' .. i] then
				sprite:attr('data-description' .. i, tostring(args['description' .. i]))
				if args['nega' .. i] then
					sprite:attr('data-nega' .. i, tostring(args['nega' .. i]))
				elseif args['posi' .. i] then
					sprite:attr('data-posi' .. i, tostring(args['posi' .. i]))
				end
			else
				break
			end
		end
	end

	return tostring(sprite)
end

function p.doc(f)
	local args = f
	if f == mw.getCurrentFrame() then
		args = require('Module:ProcessArgs').merge(true)
	else
		f = mw.getCurrentFrame()
	end

	if args[1] then
		local div = mw.html.create('div'):attr({
			id = 'jsprite-doc',
			['data-sheet'] = tostring(args[1])
		})
		return tostring(div)
	end

	return ''
end

return p
