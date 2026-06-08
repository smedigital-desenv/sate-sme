export async function loadIncludes() {
  const nodes = Array.from(document.querySelectorAll('[data-include]'));
  await Promise.all(nodes.map(async node => {
    const url = node.getAttribute('data-include');
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Falha ao carregar include ${url}: ${res.status}`);
    node.outerHTML = await res.text();
  }));
}
