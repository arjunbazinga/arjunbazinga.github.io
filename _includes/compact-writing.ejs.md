```{=html}
<ul class="compact-writing">
<% for (const item of items) { %>
  <li><a class="compact-writing-link" href="<%- item.path %>">
    <span><%- item.title %></span>
    <span class="work-date"><%= item.date %></span>
  </a></li>
<% } %>
</ul>
```
