```{=html}
<div class="featured-grid">
<% for (const item of items) { %>
  <a class="featured-entry" href="<%- item.path %>" aria-label="<%- item.title %>">
    <p class="featured-topic"><%- item['homepage-topic'] %></p>
    <h3 class="no-anchor"><%- item.title %></h3>
    <p class="featured-summary"><%- item['homepage-description'] %></p>
    <p class="work-date"><%= item.date %></p>
  </a>
<% } %>
</div>
```
