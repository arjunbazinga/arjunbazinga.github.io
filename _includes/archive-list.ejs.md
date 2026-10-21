```{=html}
<ul class="archive-list">
<% for (const item of items) { %>
  <li><a href="<%- item.path %>"><%- item.title %></a><span class="work-date"><%= item.date %></span></li>
<% } %>
</ul>
```
