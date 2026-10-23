-- Keep tables inside the reading column and provide a consistent next step.
local function escape(text)
  return text:gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;'):gsub('"', '&quot;')
end

function CodeBlock(block)
  if not FORMAT:match('html') or not block.classes:includes('text') then return nil end
  local diagram = false
  for _, symbol in ipairs({'│', '─', '┌', '└', '┐', '┘', '┬', '├', '┤', '┼', '║', '═', '━', '▼', '▲', '▶', '◀', '█', '→', '←'}) do
    if block.text:find(symbol, 1, true) then diagram = true; break end
  end
  if not diagram then return nil end

  -- Remove only the common outer indent. Relative spaces are the drawing.
  local indent
  for line in block.text:gmatch('[^\n]+') do
    if line:match('%S') then
      local spaces = #line:match('^ *')
      indent = indent and math.min(indent, spaces) or spaces
    end
  end
  if indent and indent > 0 then
    local spaces = string.rep(' ', indent)
    block.text = block.text:gsub('^' .. spaces, ''):gsub('\n' .. spaces, '\n')
  end
  block.classes:insert('ascii-diagram')
  return block
end

-- Each scrollable table region needs its own name: use the caption, else a number.
local table_count = 0
function Table(table)
  if not FORMAT:match('html') then return nil end
  table_count = table_count + 1
  local caption = pandoc.utils.stringify(table.caption.long or {})
  local label = caption ~= '' and caption or ('Table ' .. table_count)
  return pandoc.Div({table}, pandoc.Attr('', {'table-scroll'}, {
    {'role', 'region'}, {'tabindex', '0'}, {'aria-label', label}
  }))
end

function Pandoc(doc)
  if not FORMAT:match('html') or not doc.meta['next-read-url'] then return nil end
  local url = escape(pandoc.utils.stringify(doc.meta['next-read-url']))
  local title = escape(pandoc.utils.stringify(doc.meta['next-read-title']))
  doc.blocks:insert(pandoc.RawBlock('html', '<nav class="essay-next" aria-label="Continue reading"><p class="next-label">Read next</p><p class="next-title"><a href="' .. url .. '">' .. title .. '</a></p><p class="reading-links"><a href="/posts/">All writing</a><a href="https://arjunsriva.substack.com/">Subscribe on Substack</a></p></nav>'))
  return doc
end
