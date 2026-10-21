```{=html}
<div class="writing-list">
<% for (const item of items) { %>
  <article>
    <a class="writing-entry" href="<%- item.path %>" aria-label="<%- item.title %>">
      <div class="writing-entry-copy">
        <h3 class="no-anchor"><%- item.title %></h3>
        <p><%- item['homepage-description'] || item.description %></p>
        <span class="work-date"><%= item.date %></span>
      </div>
      <% if (item.image) { %><img class="writing-thumbnail" src="<%- item.image %>" alt="" width="176" height="124" loading="lazy"><% } %>
    </a>
  </article>
<% } %>
</div>
```
