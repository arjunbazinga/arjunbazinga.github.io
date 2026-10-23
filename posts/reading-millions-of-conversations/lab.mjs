import {facets, groupCases, outcomeCounts, releaseGroups, floors, gate} from './model.mjs';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

async function initFacets() {
  const root = document.querySelector('#facet-lab');
  const response = await fetch(new URL('./cases.json', import.meta.url));
  if (!response.ok) throw new Error('The example conversations could not be loaded.');
  const cases = await response.json();
  let facet = 'task';
  let selected = '04';
  const groups = root.querySelector('.facet-groups');
  const transcript = root.querySelector('.facet-transcript');

  const showTranscript = () => {
    const item = cases.find(item => item.id === selected);
    const heading = el('h4', 'no-anchor', `Conversation ${item.id}`);
    const body = el('dl', 'transcript-lines');
    for (const [name, text] of [['User', item.user], ['Assistant', item.assistant], ['Later', item.followup || 'No further message in this excerpt.']]) {
      body.append(el('dt', null, name), el('dd', name === 'Later' && !item.followup ? 'quiet' : null, text));
    }
    const label = el('p', 'chosen-label');
    label.append(el('span', null, 'Assigned label'), el('strong', null, item[facet]));
    const basis = el('p', 'facet-basis', item.basis);
    transcript.replaceChildren(heading, body, label, basis);
    groups.querySelectorAll('button').forEach(button => {
      const active = button.dataset.id === selected;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', `Conversation ${button.dataset.id}: ${cases.find(item => item.id === button.dataset.id)[facet]}`);
    });
  };

  const render = () => {
    root.querySelector('.facet-question').textContent = facets[facet].question;
    root.querySelector('.facet-note').textContent = facets[facet].note;
    const grouped = groupCases(cases, facet);
    groups.replaceChildren(...grouped.map((group, index) => {
      const section = el('section', `facet-group group-${index}`);
      const title = el('h4', 'no-anchor');
      title.append(el('span', null, group.label), el('span', 'group-count', String(group.cases.length)));
      const buttons = el('div', 'conversation-buttons');
      group.cases.forEach(item => {
        const button = el('button', 'conversation-token', item.id);
        button.type = 'button';
        button.dataset.id = item.id;
        button.addEventListener('click', () => {selected = item.id; showTranscript();});
        buttons.append(button);
      });
      section.append(title, buttons);
      return section;
    }));
    root.querySelector('.outcome-reading').hidden = facet !== 'outcome';
    showTranscript();
    root.querySelector('.facet-announcement').textContent = `${facets[facet].question} ${grouped.map(group => `${group.label}: ${group.cases.length}`).join('. ')}.`;
  };

  const counts = outcomeCounts(cases);
  root.querySelector('[data-outcome="all"]').textContent = `${counts.successes} / ${counts.total} = ${(100 * counts.successes / counts.total).toFixed(0)}%`;
  root.querySelector('[data-outcome="known"]').textContent = `${counts.successes} / ${counts.successes + counts.failures} = ${(100 * counts.successes / (counts.successes + counts.failures)).toFixed(0)}%`;
  root.querySelectorAll('input[name="facet"]').forEach(input => input.addEventListener('change', () => {facet = input.value; render();}));
  render();
  root.querySelector('.lab-controls').hidden = false;
  root.querySelector('.facet-workspace').hidden = false;
  root.querySelector('.lab-loading').hidden = true;
}

function initGate() {
  const root = document.querySelector('#release-lab');
  const slider = root.querySelector('#volume');
  const render = () => {
    const mode = root.querySelector('input[name="release"]:checked').value;
    const multiplier = Number(slider.value);
    const floor = floors[mode];
    root.querySelector('output').value = `${multiplier}×`;
    slider.setAttribute('aria-valuetext', `${multiplier} times the conversations, same accounts`);
    root.querySelector('.floor-note').textContent = `Minimum: ${floor.conversations.toLocaleString()} conversations AND ${floor.accounts} distinct accounts${mode === 'descriptions' ? ', plus a check of the description.' : '. Broad, fixed category names are used here.'}`;
    const results = releaseGroups.map(group => gate(group, mode, multiplier));
    root.querySelector('tbody').replaceChildren(...results.map(group => {
      const row = el('tr', group.released ? 'gate-pass' : 'gate-hold');
      const name = el('th', null, group.label); name.scope = 'row';
      const result = el('td', 'gate-reason');
      result.append(el('strong', null, group.released ? 'Passes this example' : 'Withheld'));
      if (group.reasons.length) result.append(el('span', null, group.reasons.join('; ')));
      const conversations = el('td', 'numeric', group.conversations.toLocaleString());
      conversations.dataset.label = 'Conversations';
      const accounts = el('td', 'numeric', group.accounts.toLocaleString());
      accounts.dataset.label = 'Accounts';
      row.append(name, conversations, accounts, result);
      return row;
    }));
    const released = results.filter(group => group.released);
    root.querySelector('.release-count').textContent = `${released.length} of ${results.length} groups pass`;
    const list = root.querySelector('.release-output');
    list.replaceChildren(...released.map(group => {
      const li = el('li');
      li.append(el('strong', null, group.label), el('span', null, `${group.conversations.toLocaleString()} conversations`));
      if (mode === 'descriptions') li.append(el('p', null, group.description));
      return li;
    }));
    root.querySelector('.gate-announcement').textContent = `${released.length} of ${results.length} groups pass for ${mode}, at ${multiplier} times the conversations. Account counts are unchanged.`;
  };
  root.querySelectorAll('input[name="release"]').forEach(input => input.addEventListener('change', render));
  slider.addEventListener('input', render);
  root.querySelector('[data-reset-gate]').addEventListener('click', () => {
    slider.value = '1';
    root.querySelector('input[value="counts"]').checked = true;
    render();
  });
  render();
  root.querySelector('.gate-interactive').hidden = false;
  root.querySelector('.lab-loading').hidden = true;
}

initFacets().catch(error => {
  const message = document.querySelector('#facet-lab .lab-loading');
  message.textContent = `${error.message} The explanation and static results below are still available.`;
});
initGate();
