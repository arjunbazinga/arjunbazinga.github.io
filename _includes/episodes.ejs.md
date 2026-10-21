```{=html}
<div class="list episode-list">
<% for (const item of items) { %>
  <article class="episode-entry" <%= metadataAttrs(item) %>>
    <a href="<%- item.path %>" aria-label="<%- item.title %>">
      <h3 class="listing-title no-anchor"><%- item.title %></h3>
      <p class="listing-description"><%- (item.description || '').replace(/<[^>]*>/g, '').slice(0, 180) %><% if ((item.description || '').length > 180) { %>…<% } %></p>
      <span class="work-date listing-date"><%= item.date %></span><span class="episode-action">Listen &amp; read</span>
    </a>
  </article>
<% } %>
</div>
```
