/**
 * 浏览器端：@wagq/dsh-obsidian —— 知识库工作区
 *
 * 三栏布局：
 *   左：文件库（类型筛选 chip + 搜索 + 文件夹/笔记树）
 *   中：文档（面包屑 + 标题 + 标签 + 元信息 chip + 正文渲染/编辑）
 *   右：大纲（标题跳转）与关联笔记（反链/出链）
 */
window.__ModuleLoader__.load({
  id: '@wagq/dsh-obsidian',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'wagq-dsh-obsidian';
    const NS = 'kb-panel';
    const API = '/kb/api';
    const RAW = '/kb/raw';

    const DICT = {
      zh: {
        panel: '知识库', vault: '知识库',
        files: '文件库', search: '搜标题、标签或正文…', all: '全部', notes: '笔记',
        pdf: 'PDF', images: '图片', others: '其他', folders: '文件夹',
        newNote: '新建笔记', newFolder: '新建文件夹', refresh: '刷新',
        preview: '预览', outline: '大纲', related: '关联', edit: '编辑', save: '保存',
        saved: '已保存', saving: '保存中…', cancel: '取消', delete: '删除', rename: '重命名',
        fullscreen: '全屏', exitFullscreen: '退出全屏', more: '更多', unsaved: '未保存',
        selectNote: '从左侧选择一篇笔记开始阅读', empty: '这里还没有内容',
        noOutline: '这篇笔记还没有标题', noRelated: '还没有关联笔记',
        noResult: '没有匹配的内容', notConnected: '未连接知识库',
        notConnectedHint: '请先在 Obsidian 中打开一个 vault，再点刷新。',
        words: '字', chars: '字符', lines: '行', modified: '修改',
        reading: '只读渲染', editing: '编辑中', linkOut: '出链', linkIn: '反链',
        pathPlaceholder: '例如：00-收件箱/新笔记', confirmDelete: '确定把这篇笔记移入回收站？',
        today: '今天', yesterday: '昨天', previewNote: '预览', backlinksTitle: '关联笔记',
        toc: '大纲', untitled: '未命名', loading: '加载中…',
        ask: '问答', askPlaceholder: '问整个知识库…（Ctrl+Enter 发送）', askSend: '提问',
        asking: '正在检索并回答…', evidenceOnly: '未接入模型，已返回最相关的笔记片段',
        citations: '出处', noEvidence: '知识库里没有找到相关内容', clear: '清空',
        discardChanges: '当前笔记有未保存的更改，确定放弃并打开其他笔记？', searching: '搜索中…',
        reload: '重新检测', create: '创建', continue: '继续', created: '已创建',
        switchVault: '切换知识库 vault', noVaults: '没有发现其它 vault。请先在 Obsidian 中打开一个库。',
        newMenu: '新建', createVault: '新建知识库项目', createVaultTitle: '新建知识库项目 — 位置', createVaultName: '新建知识库项目 — 名称',
        next: '下一步', confirmDeleteFolder: '确定删除这个文件夹？（整棵子树移入 .trash）', deleted: '已删除', renamed: '已重命名', renameFolder: '重命名文件夹',
        noteNamePlaceholder: '输入笔记名，如：产品需求（自动加 .md）',
        folderNamePlaceholder: '输入文件夹名，如：需求文档',
        open: '打开', hintContextMenu: '右键：新建 / 重命名 / 删除',
      },
      en: {
        panel: 'Knowledge base', vault: 'Knowledge base',
        files: 'Library', search: 'Search titles, tags or text…', all: 'All', notes: 'Notes',
        pdf: 'PDF', images: 'Images', others: 'Others', folders: 'Folders',
        newNote: 'New note', newFolder: 'New folder', refresh: 'Refresh',
        preview: 'Preview', outline: 'Outline', related: 'Related', edit: 'Edit', save: 'Save',
        saved: 'Saved', saving: 'Saving…', cancel: 'Cancel', delete: 'Delete', rename: 'Rename',
        fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', more: 'More', unsaved: 'Unsaved',
        selectNote: 'Pick a note on the left to read', empty: 'Nothing here yet',
        noOutline: 'No headings in this note', noRelated: 'No related notes',
        noResult: 'No matches', notConnected: 'Not connected',
        notConnectedHint: 'Open a vault in Obsidian, then refresh.',
        words: 'words', chars: 'chars', lines: 'lines', modified: 'Modified',
        reading: 'Rendered', editing: 'Editing', linkOut: 'outgoing', linkIn: 'backlinks',
        pathPlaceholder: 'e.g. 00-inbox/New note', confirmDelete: 'Move this note to trash?',
        today: 'Today', yesterday: 'Yesterday', previewNote: 'Preview', backlinksTitle: 'Related notes',
        toc: 'Outline', untitled: 'Untitled', loading: 'Loading…',
        ask: 'Q&A', askPlaceholder: 'Ask across the vault… (Ctrl+Enter)', askSend: 'Ask',
        asking: 'Retrieving and answering…', evidenceOnly: 'No model attached — showing the most relevant passages',
        citations: 'Sources', noEvidence: 'Nothing relevant found in the vault', clear: 'Clear',
        discardChanges: 'This note has unsaved changes. Discard and open another note?', searching: 'Searching…',
        reload: 'Redetect', create: 'Create', continue: 'Continue', created: 'Created',
        switchVault: 'Switch vault', noVaults: 'No other vault found. Open one in Obsidian first.',
        newMenu: 'New', createVault: 'New knowledge base project', createVaultTitle: 'New knowledge base — location', createVaultName: 'New knowledge base — name',
        next: 'Next', confirmDeleteFolder: 'Delete this folder? (whole subtree moves to .trash)', deleted: 'Deleted', renamed: 'Renamed', renameFolder: 'Rename folder',
        noteNamePlaceholder: 'Note name, e.g. Product brief (.md added)',
        folderNamePlaceholder: 'Folder name, e.g. Requirements',
        open: 'Open', hintContextMenu: 'Right-click: new / rename / delete',
      },
    };
    let t = k => (DICT.en[k] ?? k);

    async function api(path, body) {
      const opt = body === undefined
        ? { method: 'GET' }
        : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
      const r = await fetch(`${API}/${path}`, opt);
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }

    const fmtDate = ms => {
      if (!ms) return '';
      const d = new Date(ms);
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const fmtSize = n => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

    // ── 极简 Markdown 渲染（标题/段落/列表/引用/代码/表格/链接/wikilink）──
    function inline(text, key) {
      const nodes = [];
      let rest = String(text);
      let i = 0;
      const push = (node) => nodes.push(node);
      const patterns = [
        { re: /^`([^`]+)`/, make: m => h('code', { key: `c${key}-${i++}`, style: { background: 'var(--dsw-alias-bg-layer-2)', padding: '1px 5px', borderRadius: 4, fontSize: '0.92em', fontFamily: 'ui-monospace, monospace' } }, m[1]) },
        { re: /^\*\*([^*]+)\*\*/, make: m => h('strong', { key: `b${key}-${i++}` }, m[1]) },
        { re: /^\*([^*]+)\*/, make: m => h('em', { key: `i${key}-${i++}` }, m[1]) },
        { re: /^\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/, make: m => h('span', { key: `w${key}-${i++}`, style: { color: 'var(--dsw-alias-brand-primary)', borderBottom: '1px dashed currentColor' }, title: m[1] }, m[2] || m[1]) },
        { re: /^\[([^\]]+)\]\(([^)]+)\)/, make: m => h('a', { key: `a${key}-${i++}`, href: m[2], target: '_blank', rel: 'noreferrer', style: { color: 'var(--dsw-alias-brand-primary)' } }, m[1]) },
        { re: /^#([\p{L}\p{N}_\-/]+)/u, make: m => h('span', { key: `t${key}-${i++}`, style: { color: 'var(--dsw-alias-brand-primary)' } }, `#${m[1]}`) },
      ];
      while (rest.length) {
        let matched = false;
        for (const p of patterns) {
          const m = rest.match(p.re);
          if (m) { push(p.make(m)); rest = rest.slice(m[0].length); matched = true; break; }
        }
        if (matched) continue;

        // 找到最近的下一个可匹配起点，把之前的纯文本一次性输出
        let cut = rest.length;
        for (const p of patterns) {
          const probe = rest.slice(1);
          const idx = probe.search(new RegExp(p.re.source));
          if (idx >= 0) cut = Math.min(cut, idx + 1);
        }
        if (cut <= 1) { push(rest[0]); rest = rest.slice(1); }
        else { push(rest.slice(0, cut)); rest = rest.slice(cut); }
      }
      return nodes;
    }

    function renderMarkdown(src, onHeading) {
      const lines = String(src || '').replace(/\r/g, '').split('\n');
      const out = [];
      let i = 0, k = 0, hIndex = -1;
      const H = (level, children, id) => h(`h${level}`, {
        key: `h${k++}`, id: id !== undefined ? `kb-h-${id}` : undefined,
        onClick: id !== undefined && onHeading ? () => onHeading(id) : undefined,
        style: {
          margin: level <= 2 ? '22px 0 10px' : '18px 0 8px',
          fontSize: level === 1 ? 26 : level === 2 ? 21 : level === 3 ? 17.5 : 15.5,
          fontWeight: level <= 2 ? 700 : 600,
          lineHeight: 1.35,
          color: 'var(--dsw-alias-label-primary)',
          cursor: id && onHeading ? 'pointer' : 'default',
        },
      }, ...children);

      while (i < lines.length) {
        const line = lines[i];
        if (/^\s*$/.test(line)) { i++; continue; }

        if (/^\s*```/.test(line)) {
          const buf = [];
          i++;
          while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
          i++;
          out.push(h('pre', {
            key: `pre${k++}`,
            style: {
              background: 'var(--dsw-alias-bg-layer-2)', border: '1px solid var(--dsw-alias-border-l1)',
              borderRadius: 8, padding: '12px 14px', overflowX: 'auto', margin: '12px 0',
              fontSize: 12.5, lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            },
          }, h('code', null, buf.join('\n'))));
          continue;
        }

        const hm = line.match(/^(#{1,6})\s+(.+?)\s*$/);
        if (hm) {
          const level = hm[1].length;
          const text = hm[2];
          const hid = String(++hIndex);
          out.push(H(level, inline(text, `hd${k}`), hid));
          i++;
          continue;
        }

        if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
          out.push(h('hr', { key: `hr${k++}`, style: { border: 'none', borderTop: '1px solid var(--dsw-alias-border-l1)', margin: '20px 0' } }));
          i++;
          continue;
        }

        if (/^\s*>\s?/.test(line)) {
          const buf = [];
          while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
          out.push(h('blockquote', {
            key: `bq${k++}`,
            style: {
              margin: '12px 0', padding: '8px 14px', borderLeft: '3px solid var(--dsw-alias-brand-primary)',
              background: 'var(--dsw-alias-bg-layer-2)', borderRadius: '0 6px 6px 0',
              color: 'var(--dsw-alias-label-secondary)',
            },
          }, ...buf.filter(Boolean).map((b, bi) => h('div', { key: bi, style: { margin: '3px 0' } }, inline(b, `bq${k}-${bi}`)))));
          continue;
        }

        if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
          const items = [];
          const ordered = /^\s*\d+\./.test(line);
          while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
            i++;
          }
          const Tag = ordered ? 'ol' : 'ul';
          out.push(h(Tag, {
            key: `list${k++}`,
            style: { margin: '10px 0', paddingLeft: 22, lineHeight: 1.75 },
          }, ...items.map((it, ii) => h('li', { key: ii, style: { margin: '2px 0' } }, inline(it, `li${k}-${ii}`)))));
          continue;
        }

        // 表格
        if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
          const head = line.split('|').slice(1, -1).map(s => s.trim());
          i += 2;
          const rows = [];
          while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
            rows.push(lines[i].split('|').slice(1, -1).map(s => s.trim()));
            i++;
          }
          out.push(h('div', { key: `tb${k++}`, style: { overflowX: 'auto', margin: '14px 0' } },
            h('table', { style: { borderCollapse: 'collapse', width: '100%', fontSize: 13 } },
              h('thead', null, h('tr', null, ...head.map((c, ci) => h('th', {
                key: ci,
                style: { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-2)', fontWeight: 600 },
              }, inline(c, `th${k}-${ci}`))))),
              h('tbody', null, ...rows.map((r, ri) => h('tr', { key: ri }, ...r.map((c, ci) => h('td', {
                key: ci,
                style: { padding: '7px 10px', borderBottom: '1px solid var(--dsw-alias-border-l1)' },
              }, inline(c, `td${k}-${ri}-${ci}`)))))),
            )));
          continue;
        }

        // 普通段落：合并连续行
        const para = [line];
        i++;
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6})\s|^\s*```|^\s*>|^\s*([-*+]|\d+\.)\s|^\s*\|/.test(lines[i])) {
          para.push(lines[i++]);
        }
        out.push(h('p', {
          key: `p${k++}`,
          style: { margin: '11px 0', lineHeight: 1.85, fontSize: 14.5, color: 'var(--dsw-alias-label-primary)' },
        }, ...inline(para.join(' '), `p${k}`)));
      }
      return out;
    }

    function BookGlyph({ size = 15 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': true, focusable: false,
        style: { display: 'block', flexShrink: 0 },
      },
        h('rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 3 }),
        h('path', { d: 'M8 3.5v17' }),
        h('path', { d: 'M11.5 8h5.5M11.5 12h5.5M11.5 16h3.5' }),
      );
    }

    const Icon = ({ d, size = 14 }) => h('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': true, focusable: false, style: { flexShrink: 0 },
    }, h('path', { d }));

    // ═══════════════ 主工作区 ═══════════════
    function KnowledgePanel() {
      const [status, setStatus] = React.useState(null);
      const [files, setFiles] = React.useState([]);
      const [filter, setFilter] = React.useState('all');
      const [query, setQuery] = React.useState('');
      const [results, setResults] = React.useState(null);
      const [selected, setSelected] = React.useState('');
      const [note, setNote] = React.useState(null);
      const [related, setRelated] = React.useState([]);
      const [draft, setDraft] = React.useState('');
      const [mode, setMode] = React.useState('read');
      const [rightTab, setRightTab] = React.useState('outline');
      const [askQ, setAskQ] = React.useState('');
      const [askBusy, setAskBusy] = React.useState(false);
      const [askRes, setAskRes] = React.useState(null);
      const [notice, setNotice] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [collapsed, setCollapsed] = React.useState({});
      const [full, setFull] = React.useState(false);
      // 内联输入/确认：DSH 的 WebView 禁用了 window.prompt/confirm，必须自带
      const [dialog, setDialog] = React.useState(null);
      // dialog: { kind:'prompt'|'confirm', title, value, placeholder, confirmText, onOk }
      const [picker, setPicker] = React.useState(null);
      const [menu, setMenu] = React.useState(null);
      const rootRef = React.useRef(null);
      // 把视口坐标换算成面板内坐标
      const toLocal = (clientX, clientY) => {
        const r = rootRef.current?.getBoundingClientRect?.();
        return r ? { x: clientX - r.left, y: clientY - r.top } : { x: 40, y: 40 };
      };

      const dirty = note && draft !== note.body;

      const loadTree = React.useCallback(async () => {
        try {
          const r = await api('tree');
          if (r.ok) setFiles(r.files || []);
        } catch (e) { setNotice(String(e)); }
      }, []);

      const loadStatus = React.useCallback(async () => {
        try { setStatus(await api('status')); } catch (e) { setNotice(String(e)); }
      }, []);

      React.useEffect(() => { loadStatus(); loadTree(); }, [loadStatus, loadTree]);

      // 全屏时：Esc 退出、锁定页面滚动、卸载时复位
      React.useEffect(() => {
        if (!full) return undefined;
        const onKey = e => { if (e.key === 'Escape') setFull(false); };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
          window.removeEventListener('keydown', onKey);
          document.body.style.overflow = prevOverflow;
        };
      }, [full]);

      const openNote = async (p) => {
        if (dirty && p !== selected) {
          const ok = await askConfirm({ title: t('discardChanges'), confirmText: t('continue') });
          if (!ok) return;
        }
        setBusy(true);
        try {
          const r = await api(`note?path=${encodeURIComponent(p)}`);
          if (!r.ok) { setNotice(r.error || 'open failed'); return; }
          setSelected(p); setNote(r.note); setDraft(r.note.body); setMode('read'); setNotice('');
          const rel = await api(`related?path=${encodeURIComponent(p)}`);
          setRelated(rel.ok ? rel.related : []);
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      const askVault = async () => {
        const q = askQ.trim();
        if (!q) return;
        setAskBusy(true); setAskRes(null);
        try {
          const r = await api('ask', { question: q });
          if (r.ok) setAskRes(r);
          else setNotice(r.error || 'ask failed');
        } catch (e) { setNotice(String(e)); }
        finally { setAskBusy(false); }
      };

      const runSearch = React.useCallback(async (q) => {
        setQuery(q);
        if (!q.trim()) { setResults(null); return; }
        try {
          const r = await api(`search?query=${encodeURIComponent(q)}`);
          setResults(r.ok ? r.results : []);
        } catch (e) { setNotice(String(e)); }
      }, []);

      const save = async () => {
        if (!note) return;
        // DSH WebView 中 React 受控 textarea 的 onChange 偶发不更新 draft；
        // 这里直接读 DOM 当前值兜底，保证「保存」一定能拿到用户看到的内容。
        const el = rootRef.current?.querySelector?.('[data-kb-editor]');
        const content = el && typeof el.value === 'string' ? el.value : draft;
        setBusy(true);
        try {
          const r = await api('save', { path: note.path, content });
          if (r.ok) {
            const fresh = await api(`note?path=${encodeURIComponent(note.path)}`);
            if (fresh.ok) { setNote(fresh.note); setDraft(fresh.note.body); }
            else setDraft(content);
            setMode('read');
            setNotice(t('saved')); loadTree();
          } else setNotice(r.error || 'save failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      const cancelEdit = () => {
        setDraft(note?.body ?? '');
        setMode('read');
        setNotice('');
      };

      // DSH 的 WebView 禁用了 window.prompt / window.confirm，
      // 所有需要输入的交互都走这里的内联对话框。
      // 用 ref 保存 resolve 与当前值，避免在闭包里读到过期的 state。
      const dialogRef = React.useRef(null);
      const dialogValueRef = React.useRef('');
      const askPrompt = (opts) => new Promise(resolve => {
        dialogRef.current = { kind: 'prompt', resolve };
        dialogValueRef.current = opts.value ?? '';
        setDialog({
          kind: 'prompt',
          title: opts.title,
          value: opts.value ?? '',
          placeholder: opts.placeholder ?? '',
          confirmText: opts.confirmText ?? t('save'),
        });
      });
      const askConfirm = (opts) => new Promise(resolve => {
        dialogRef.current = { kind: 'confirm', resolve };
        dialogValueRef.current = '';
        setDialog({
          kind: 'confirm',
          title: opts.title,
          confirmText: opts.confirmText ?? t('delete'),
        });
      });
      const closeDialog = (value) => {
        const pending = dialogRef.current;
        dialogRef.current = null;
        setDialog(null);
        try { pending?.resolve?.(value); } catch { /* ignore */ }
      };
      const submitDialog = () => {
        const pending = dialogRef.current;
        const kind = pending?.kind;
        dialogRef.current = null;
        setDialog(null);
        const value = kind === 'confirm' ? true : dialogValueRef.current;
        try { pending?.resolve?.(value); } catch { /* ignore */ }
      };

      // 从当前 vault 路径推出父目录，作为新建项目的默认位置
      const vaultParentGuess = () => {
        const p = status?.vaultPath || '';
        if (!p) return '';
        const norm = p.replace(/\//g, '\\').replace(/\\+$/, '');
        const idx = norm.lastIndexOf('\\');
        return idx > 0 ? norm.slice(0, idx) : norm;
      };

      const switchVault = async (p) => {        setPicker(null);
        setBusy(true);
        try {
          const r = await api('switch', { path: p });
          if (r.ok) {
            setStatus(r);
            setSelected(''); setNote(null); setDraft(''); setRelated([]); setResults(null); setQuery('');
            await loadTree();
            setNotice('');
          } else setNotice(r.error || 'switch failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      const removeFolder = async (rel, name) => {
        const ok = await askConfirm({
          title: `${t('confirmDeleteFolder')}\n\n${rel}`,
          confirmText: t('delete'),
        });
        if (!ok) return;
        setBusy(true);
        try {
          const r = await api('rmdir', { path: rel });
          if (r.ok) { await loadTree(); await loadStatus(); setNotice(`${t('deleted')}: ${rel}${r.result.files ? ` (${r.result.files} 个文件)` : ''}`); }
          else setNotice(r.error || 'rmdir failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      const renameFolder = async (rel, name) => {
        const to = await askPrompt({ title: t('renameFolder'), value: name, confirmText: t('save') });
        if (!to || !to.trim() || to.trim() === name) return;
        const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
        const target = parent ? `${parent}/${to.trim()}` : to.trim();
        setBusy(true);
        try {
          const r = await api('move', { from: rel, to: target });
          if (r.ok) { await loadTree(); setNotice(`${t('renamed')}: ${target}`); }
          else setNotice(r.error || 'rename failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      const createVaultProject = async () => {
        setPicker(null);
        const parent = await askPrompt({
          title: t('createVaultTitle'),
          value: vaultParentGuess(),
          placeholder: 'D:\\知识库',
          confirmText: t('next'),
        });
        if (!parent || !parent.trim()) return;
        const name = await askPrompt({
          title: `${t('createVaultName')}\n${parent.trim()}`,
          value: '',
          placeholder: '我的新知识库',
          confirmText: t('create'),
        });
        if (!name || !name.trim()) return;
        setBusy(true);
        try {
          const r = await api('create-vault', { parent: parent.trim(), name: name.trim() });
          if (r.ok) {
            setStatus(r);
            setSelected(''); setNote(null); setDraft(''); setRelated([]); setResults(null); setQuery('');
            await loadTree();
            setNotice(`${t('created')}: ${r.result.path}`);
          } else setNotice(r.error || 'create vault failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      // parent：在哪个文件夹里新建（空字符串 = vault 根目录）
      const joinPath = (parent, name) => (parent ? `${parent}/${name}` : name);

      const createNote = async (parent = '') => {
        const name = await askPrompt({
          title: parent ? `${t('newNote')} · ${parent}` : t('newNote'),
          placeholder: t('noteNamePlaceholder'),
          confirmText: t('create'),
        });
        if (!name || !name.trim()) return;
        const rel = joinPath(parent, name.trim().replace(/^\/+/, ''));
        setBusy(true);
        try {
          const r = await api('create', { path: rel });
          if (r.ok) { await loadTree(); await openNote(r.result.path); setNotice(''); }
          else setNotice(r.error || 'create failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      const createFolder = async (parent = '') => {
        const name = await askPrompt({
          title: parent ? `${t('newFolder')} · ${parent}` : t('newFolder'),
          placeholder: t('folderNamePlaceholder'),
          confirmText: t('create'),
        });
        if (!name || !name.trim()) return;
        const rel = joinPath(parent, name.trim().replace(/^\/+/, ''));
        setBusy(true);
        try {
          const r = await api('mkdir', { path: rel });
          if (r.ok) { await loadTree(); await loadStatus(); setNotice(`${t('created')}: ${r.result.path}`); }
          else setNotice(r.error || 'mkdir failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      const removeNote = async () => {
        if (!note) return;
        if (!(await askConfirm({ title: t('confirmDelete'), confirmText: t('delete') }))) return;
        try {
          const r = await api('delete', { path: note.path });
          if (r.ok) { setSelected(''); setNote(null); setDraft(''); setRelated([]); loadTree(); }
          else setNotice(r.error || 'delete failed');
        } catch (e) { setNotice(String(e)); }
      };

      const renameNote = async () => {
        if (!note) return;
        const to = await askPrompt({ title: t('rename'), value: note.path, confirmText: t('save') });
        if (!to || to.trim() === note.path) return;
        try {
          if (dirty) await api('save', { path: note.path, content: draft });
          const r = await api('move', { from: note.path, to: to.trim() });
          if (r.ok) { await loadTree(); await openNote(r.result.to); }
          else setNotice(r.error || 'rename failed');
        } catch (e) { setNotice(String(e)); }
      };

      // 右键菜单里按路径重命名笔记
      const renameNoteAt = async (rel) => {
        const base = rel.split('/').pop() || rel;
        const name = await askPrompt({ title: t('rename'), value: base.replace(/\.md$/i, ''), confirmText: t('save') });
        if (!name || !name.trim()) return;
        const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
        const target = joinPath(parent, name.trim().replace(/^\/+/, ''));
        setBusy(true);
        try {
          if (selected === rel && dirty) await api('save', { path: rel, content: draft });
          const r = await api('move', { from: rel, to: target });
          if (r.ok) {
            await loadTree();
            if (selected === rel) await openNote(r.result.to);
            setNotice(`${t('renamed')}: ${target}`);
          } else setNotice(r.error || 'rename failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      // 右键菜单里按路径删除笔记
      const removeNoteAt = async (rel) => {
        const ok = await askConfirm({ title: `${t('confirmDelete')}\n\n${rel}`, confirmText: t('delete') });
        if (!ok) return;
        setBusy(true);
        try {
          const r = await api('delete', { path: rel });
          if (r.ok) {
            if (selected === rel) { setSelected(''); setNote(null); setDraft(''); setRelated([]); }
            await loadTree(); await loadStatus();
            setNotice(`${t('deleted')}: ${rel}`);
          } else setNotice(r.error || 'delete failed');
        } catch (e) { setNotice(String(e)); }
        finally { setBusy(false); }
      };

      // ── 样式 ──
      const C = {
        text: 'var(--dsw-alias-label-primary, CanvasText)',
        text2: 'var(--dsw-alias-label-secondary, GrayText)',
        bg: 'var(--dsw-alias-bg-base, Canvas)',
        bg1: 'var(--dsw-alias-bg-layer-1, Canvas)',
        bg2: 'var(--dsw-alias-bg-layer-2, ButtonFace)',
        overlay: 'var(--dsw-alias-bg-overlay, ButtonFace)',
        line: 'var(--dsw-alias-border-l1, rgba(128,128,128,.22))',
        line2: 'var(--dsw-alias-border-l2, rgba(128,128,128,.38))',
        brand: 'var(--dsw-alias-brand-primary, #6b5cff)',
        err: 'var(--dsw-alias-state-error-primary, #d33)',
        warn: 'var(--dsw-alias-state-warn-primary, #c98b00)',
        ok: 'var(--dsw-alias-state-success-primary, #2ea043)',
        side: 'var(--dsw-specific-sidebar-fill, Canvas)',
        onBrand: 'var(--dsw-alias-bg-base, #ffffff)',
      };
      const S = {
        root: {
          display: 'flex', height: full ? 'calc(100vh - 34px)' : '100%', minHeight: 0, boxSizing: 'border-box',
          color: C.text, background: C.bg, fontSize: 13,
          overflow: 'hidden',
          position: full ? 'fixed' : 'relative',
          ...(full
            ? { top: 34, left: 0, right: 0, zIndex: 95, width: '100vw' }
            : {}),
        },
        colLeft: {
          width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0,
          borderRight: `1px solid ${C.line}`, background: C.side,
        },
        colMid: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: C.bg },
        colRight: {
          width: 252, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0,
          borderLeft: `1px solid ${C.line}`, background: C.side,
        },
        bar: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderBottom: `1px solid ${C.line}`, flexShrink: 0 },
        barTitle: { fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        iconBtn: {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          border: 'none', background: 'transparent', color: C.text2, cursor: 'pointer',
          borderRadius: 6, padding: '5px 7px', fontSize: 12, fontFamily: 'inherit',
        },
        btn: {
          display: 'inline-flex', alignItems: 'center', gap: 5,
          border: `1px solid ${C.line2}`, background: C.bg2, color: C.text,
          borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
        },
        btnOn: { background: C.bg1, color: C.text, borderColor: C.brand },
        btnPrimary: {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          border: `1px solid ${C.brand}`, background: C.brand, color: C.onBrand,
          borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
          fontFamily: 'inherit', fontWeight: 600,
        },
        input: {
          width: '100%', boxSizing: 'border-box', background: C.bg1, color: C.text,
          border: `1px solid ${C.line}`, borderRadius: 6, padding: '6px 9px',
          fontSize: 12, fontFamily: 'inherit', outline: 'none',
        },
        chips: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, flexShrink: 0 },
        chip: {
          border: 'none', background: 'transparent', color: C.text2, cursor: 'pointer',
          borderRadius: 999, padding: '3px 9px', fontSize: 11.5, fontFamily: 'inherit',
        },
        chipOn: {
          background: C.bg1, color: C.text, fontWeight: 600,
          boxShadow: `inset 0 0 0 1.5px ${C.brand}`,
          padding: '3px 9px',
        },        tree: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 6px 14px' },
        row: {
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 7px',
          borderRadius: 5, cursor: 'pointer', fontSize: 12.5, color: C.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        },
        rowSel: { background: C.bg2, fontWeight: 600 },
        rowText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' },
        doc: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 40px 80px' },
        crumb: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.text2, marginBottom: 10, flexWrap: 'wrap' },
        docTitle: { fontSize: 27, fontWeight: 700, lineHeight: 1.3, margin: '0 0 10px', letterSpacing: '-0.3px' },
        tagRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
        tag: {
          fontSize: 11, padding: '2px 8px', borderRadius: 999,
          border: `1px solid ${C.line2}`, color: C.text2, background: C.bg1,
        },
        metaRow: { display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: C.text2, marginBottom: 18, alignItems: 'center' },
        loader: { fontSize: 11.5, color: C.text2, padding: '3px 8px', borderRadius: 5, background: C.bg2 },
        textarea: {
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          height: 460,
          minHeight: 240,
          resize: 'vertical',
          background: C.bg2,
          color: C.text,
          border: `1px solid ${C.line2}`,
          borderRadius: 8,
          padding: 14,
          fontSize: 13,
          lineHeight: 1.85,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          outline: 'none',
        },
        tabs: {
          display: 'flex', gap: 2, padding: '0 6px', flexShrink: 0,
          borderBottom: `1px solid ${C.line}`, minHeight: 41, alignItems: 'flex-end',
          boxSizing: 'border-box',
        },
        tab: {
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          background: 'transparent', color: C.text2, cursor: 'pointer',
          padding: '8px 9px', fontSize: 12, fontFamily: 'inherit',
          borderBottom: '2px solid transparent', marginBottom: -1, lineHeight: 1.5,
        },
        tabOn: { color: C.text, borderBottom: `2px solid ${C.brand}`, fontWeight: 600 },
        rightBody: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 8px 20px' },
        outRow: {
          display: 'block', width: '100%', textAlign: 'left', border: 'none',
          background: 'transparent', color: C.text, cursor: 'pointer',
          padding: '4px 8px', borderRadius: 5, fontSize: 12.5, fontFamily: 'inherit',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        },
        relRow: {
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          border: 'none', background: 'transparent', color: C.text, cursor: 'pointer',
          padding: '6px 8px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
          textAlign: 'left',
        },
        rowBtn: {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', color: C.text2, cursor: 'pointer',
          padding: 2, borderRadius: 4, opacity: 0.65, flexShrink: 0,
        },
        empty: { padding: 28, textAlign: 'center', color: C.text2, fontSize: 12.5, lineHeight: 1.8 },
        notice: { margin: '0 10px 8px', fontSize: 11.5, color: C.warn, background: C.bg2, borderRadius: 6, padding: '6px 9px' },
        badge: { fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: C.bg2, color: C.text2 },
        menuGroup: { display: 'flex', flexDirection: 'column' },
        menuSep: { height: 1, background: C.line, margin: '5px 4px' },
      };

      // 右键菜单条目
      const menuItem = (label, d, fn, color) => h('button', {
        style: {
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
          border: 'none', background: 'transparent', color: color || C.text,
          cursor: 'pointer', padding: '7px 9px', borderRadius: 6,
          fontFamily: 'inherit', fontSize: 12.5,
        },
        onClick: fn,
      },
        h(Icon, { d, size: 13 }),
        h('span', null, label),
      );

      const connected = status?.connected;

      // 文件树分组
      const filtered = React.useMemo(() => {
        if (results) return results.map(r => ({ ...r, type: 'note', fromSearch: true }));
        const list = filter === 'all' ? files : files.filter(f => f.type === filter);
        return list;
      }, [files, filter, results]);

      const tree = React.useMemo(() => {
        const root = { name: '', dirs: new Map(), files: [] };
        const ensureDir = (segs) => {
          let node = root;
          for (const s of segs) {
            if (!node.dirs.has(s)) node.dirs.set(s, { name: s, dirs: new Map(), files: [] });
            node = node.dirs.get(s);
          }
          return node;
        };
        for (const f of filtered) {
          const segs = f.path.split('/');
          if (f.type === 'folder') {
            // 空文件夹也要建出节点
            ensureDir(segs);
            continue;
          }
          const name = segs.pop();
          const node = ensureDir(segs);
          node.files.push({ ...f, name });
        }
        return root;
      }, [filtered]);

      const renderTree = (node, depth, prefix = '') => {
        const items = [];
        const dirs = [...node.dirs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        for (const [name, child] of dirs) {
          const id = `${depth}:${name}`;
          const isOpen = !collapsed[id];
          const dirRel = prefix ? `${prefix}/${name}` : name;
          items.push(h('div', {
            key: `d-${id}`,
            'data-kb-row': 'folder',
            style: { ...S.row, paddingLeft: 7 + depth * 12, color: C.text2 },
            onClick: () => setCollapsed(c => ({ ...c, [id]: !c[id] })),
            onContextMenu: e => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({ kind: 'folder', path: dirRel, name, ...toLocal(e.clientX, e.clientY) });
            },
            title: `${dirRel}\n${t('hintContextMenu')}`,
          },
            h('span', { style: { width: 12, display: 'inline-flex', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .12s' } },
              h(Icon, { d: 'M9 6l6 6-6 6', size: 11 })),
            h('span', { style: S.rowText }, name),
            h('button', {
              style: S.rowBtn,
              title: t('delete'),
              onClick: e => { e.stopPropagation(); removeFolder(dirRel, name); },
            }, h(Icon, { d: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', size: 11 })),
            h('button', {
              style: S.rowBtn,
              title: t('rename'),
              onClick: e => { e.stopPropagation(); renameFolder(dirRel, name); },
            }, h(Icon, { d: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', size: 11 })),
          ));
          if (isOpen) items.push(...renderTree(child, depth + 1, dirRel));
        }
        const fs = node.files.slice().sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
        for (const f of fs) {
          const isPdf = f.type === 'pdf';
          const isImg = f.type === 'image';
          const glyph = isPdf ? 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z'
            : isImg ? 'M4 5h16v14H4zM4 15l5-5 5 5M15 12l5 5'
            : 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5';
          items.push(h('div', {
            key: `f-${f.path}`,
            'data-kb-row': 'note',
            style: { ...S.row, paddingLeft: 7 + depth * 12 + 12, ...(selected === f.path ? S.rowSel : {}) },
            onClick: () => openNote(f.path),
            onContextMenu: e => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({ kind: 'note', path: f.path, name: f.title || f.name, ...toLocal(e.clientX, e.clientY) });
            },
            title: `${f.path}\n${t('hintContextMenu')}`,
          },
            h('span', { style: { color: C.text2, display: 'inline-flex' } }, h(Icon, { d: glyph, size: 12 })),
            h('span', { style: S.rowText }, f.title || f.name),
            f.fromSearch && f.line ? h('span', { style: { ...S.badge, fontSize: 10 } }, `:${f.line}`) : null,
          ));
        }
        return items;
      };

      const headings = note?.headings || [];
      const jumpTo = (id) => {
        const el = document.getElementById(`kb-h-${id}`);
        if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      return h('div', { ref: rootRef, style: S.root, 'data-dsh-plugin': '@wagq/dsh-obsidian', 'data-dsh-part': 'kb-workspace' },

        // ═════ 左：文件库 ═════
        h('div', { style: S.colLeft },
          h('div', { style: S.bar },
            h('button', {
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
                border: 'none', background: 'transparent', color: C.text, cursor: 'pointer',
                padding: '3px 4px', borderRadius: 6, fontFamily: 'inherit', textAlign: 'left',
              },
              title: status?.vaultPath || t('files'),
              onClick: async () => {
                try {
                  const r = await api('vaults');
                  setPicker(r.ok ? (r.vaults || []) : []);
                } catch { setPicker([]); }
              },
            },
              h('span', { style: { display: 'inline-flex', color: C.brand } }, h(BookGlyph)),
              h('span', { style: { ...S.barTitle, flex: 1 } }, status?.name || t('files')),
              h('span', { style: { display: 'inline-flex', color: C.text2, transform: 'rotate(90deg)' } },
                h(Icon, { d: 'M9 6l6 6-6 6', size: 10 })),
            ),
            h('button', {
              style: S.iconBtn, title: t('newMenu'),
              onClick: e => {
                const r = e.currentTarget.getBoundingClientRect();
                const p = toLocal(r.left, r.bottom + 4);
                setMenu({ kind: 'new', x: p.x, y: p.y });
              },
            }, h(Icon, { d: 'M12 5v14M5 12h14' })),
            h('button', { style: S.iconBtn, title: t('newFolder'), onClick: () => createFolder('') },
              h(Icon, { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 11v6M9 14h6' })),
            h('button', { style: S.iconBtn, title: t('refresh'), onClick: () => { loadStatus(); loadTree(); } }, h(Icon, { d: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6' })),
          ),
          h('div', { style: { padding: '8px 10px 0' } },
            h('input', {
              style: S.input, value: query, placeholder: t('search'),
              onChange: e => runSearch(e.target.value),
              'aria-label': t('search'),
            }),
          ),
          h('div', { style: S.chips },
            ...[['all', t('all')], ['note', t('notes')], ['pdf', t('pdf')], ['image', t('images')], ['file', t('others')]].map(([k, label]) =>
              h('button', {
                key: k,
                style: { ...S.chip, ...(filter === k && !results ? S.chipOn : {}) },
                onClick: () => { setFilter(k); setResults(null); setQuery(''); },
              }, label)),
          ),
          !connected && status
            ? h('div', { style: { ...S.notice, margin: '8px 10px' } }, t('notConnectedHint'))
            : null,
          notice ? h('div', { style: S.notice }, notice) : null,
          h('div', {
            style: S.tree,
            onContextMenu: e => {
              if (e.target.closest && e.target.closest('[data-kb-row]')) return;
              e.preventDefault();
              setMenu({ kind: 'root', ...toLocal(e.clientX, e.clientY) });
            },
          },
            filtered.length === 0
              ? h('div', { style: S.empty }, results ? t('noResult') : t('empty'))
              : renderTree(tree, 0),
          ),
          h('div', { style: { ...S.bar, borderBottom: 'none', borderTop: `1px solid ${C.line}`, justifyContent: 'space-between' } },
            h('span', { style: { fontSize: 11, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              connected ? status?.vaultPath : t('notConnected')),
            h('span', { style: { fontSize: 11, color: C.text2, flexShrink: 0 } },
              connected ? `${status.counts.note} ${t('notes')} · ${status.counts.folders} ${t('folders')}` : ''),
          ),
        ),

        // ═════ 中：文档 ═════
        h('div', { style: S.colMid },
          h('div', { style: S.bar },
            h('span', { style: { ...S.barTitle, flex: 1 } }, note ? note.title : t('vault')),
            note ? h('span', { style: { ...S.loader, color: dirty ? C.warn : C.text2 } },
              dirty ? t('unsaved')
                : note.kind === 'note' ? (mode === 'edit' ? t('editing') : t('reading'))
                : note.kind === 'image' ? t('images')
                : note.kind === 'pdf' ? t('pdf')
                : fmtSize(note.size)) : null,
            note ? h('button', {
              style: { ...S.iconBtn, ...(mode === 'read' ? S.btnOn : {}) },
              onClick: () => setMode('read'), title: t('preview'),
            }, t('preview')) : null,            note && note.kind === 'note' ? h('button', {
              style: { ...S.iconBtn, ...(mode === 'edit' ? S.btnOn : {}) },
              onClick: () => setMode('edit'), title: t('edit'),
            }, t('edit')) : null,
            note && (dirty || mode === 'edit') ? h('button', {
              style: { ...S.btn, borderColor: C.brand, color: C.brand },
              onClick: save,
              onPointerDown: e => e.stopPropagation(),
              disabled: busy,
            }, busy ? t('saving') : t('save')) : null,
            note ? h('button', { style: S.iconBtn, title: t('rename'), onClick: renameNote }, h(Icon, { d: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' })) : null,
            note ? h('button', { style: S.iconBtn, title: t('delete'), onClick: removeNote }, h(Icon, { d: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', })) : null,
            h('button', {
              style: { ...S.iconBtn, ...(full ? S.btnOn : {}) },
              title: full ? t('exitFullscreen') : t('fullscreen'),
              onClick: () => setFull(f => !f),
            }, h(Icon, { d: full ? 'M9 3v6H3M15 21v-6h6M3 15h6v6M21 9h-6V3' : 'M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5' })),
          ),

          note
            ? h('div', { style: S.doc },
                h('div', { style: S.crumb },
                  ...note.path.split('/').map((seg, si, arr) =>
                    h('span', { key: si, style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
                      si > 0 ? h('span', { style: { opacity: .5 } }, '/') : null,
                      h('span', { style: si === arr.length - 1 ? { color: C.text } : undefined }, seg.replace(/\.(md|markdown)$/i, '')))),
                ),
                h('h1', { style: S.docTitle }, note.title),
                note.tags.length
                  ? h('div', { style: S.tagRow }, ...note.tags.map(tag => h('span', { key: tag, style: S.tag }, `#${tag}`)))
                  : null,
                h('div', { style: S.metaRow },
                  h('span', null, `📄 ${note.words} ${t('words')}`),
                  h('span', null, `↩ ${note.chars} ${t('chars')}`),
                  h('span', null, `☰ ${note.lines} ${t('lines')}`),
                  h('span', null, `🕒 ${fmtDate(note.mtime)}`),
                  h('span', { style: S.badge }, fmtSize(note.size)),
                ),
                mode === 'edit' && note.kind !== 'note' ? null : mode === 'edit'
                  ? h('textarea', {
                      style: S.textarea, value: draft ?? '', spellCheck: false,
                      'data-kb-editor': '1',
                      onChange: e => setDraft(e.target.value),
                      onInput: e => setDraft(e.target.value),
                      'aria-label': note.title,
                    })
                  : note.kind === 'image'
                    ? h('div', { style: { padding: '10px 0' } },
                        h('img', {
                          src: `${RAW}?path=${encodeURIComponent(note.path)}`,
                          alt: note.title,
                          style: { maxWidth: '100%', borderRadius: 8, border: `1px solid ${C.line}` },
                        }))
                    : note.kind === 'pdf'
                      ? h('div', null,
                          h('iframe', {
                            src: `${RAW}?path=${encodeURIComponent(note.path)}`,
                            title: note.title,
                            style: { width: '100%', height: 620, border: `1px solid ${C.line}`, borderRadius: 8, background: C.bg1 },
                          }),
                          h('div', { style: { marginTop: 8, fontSize: 12, color: C.text2 } },
                            h('a', { href: `${RAW}?path=${encodeURIComponent(note.path)}`, target: '_blank', rel: 'noreferrer', style: { color: C.brand } }, `↗ ${note.title}`)),
                        )
                      : note.kind && note.kind !== 'note'
                        ? h('div', { style: S.empty },
                            h('div', null, `${note.title} · ${fmtSize(note.size)}`),
                            h('a', { href: `${RAW}?path=${encodeURIComponent(note.path)}`, target: '_blank', rel: 'noreferrer', style: { color: C.brand, fontSize: 12 } }, '↗ 下载/打开'))
                        : h('div', null, ...renderMarkdown(note.body, jumpTo)),
                mode === 'edit'
                  ? h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 } },
                      h('button', {
                        style: S.btn,
                        onClick: cancelEdit,
                        onPointerDown: e => e.stopPropagation(),
                        disabled: busy,
                      }, t('cancel')),
                      h('button', {
                        style: { ...S.btn, borderColor: C.brand, color: C.brand },
                        onClick: save,
                        onPointerDown: e => e.stopPropagation(),
                        disabled: busy,
                      }, busy ? t('saving') : t('save')),
                    )
                  : null,
              )
            : h('div', { style: S.empty },
                h('div', { style: { fontSize: 34, marginBottom: 10, opacity: .35 } }, '📚'),
                h('div', null, t('selectNote')),
              ),
        ),

        // ═════ 右：大纲 / 关联 ═════
        h('div', { style: S.colRight },
          h('div', { style: S.tabs },
            h('button', { style: { ...S.tab, ...(rightTab === 'outline' ? S.tabOn : {}) }, onClick: () => setRightTab('outline') }, t('outline')),
            h('button', { style: { ...S.tab, ...(rightTab === 'related' ? S.tabOn : {}) }, onClick: () => setRightTab('related') }, `${t('related')}${related.length ? ` ${related.length}` : ''}`),
            h('button', { style: { ...S.tab, ...(rightTab === 'ask' ? S.tabOn : {}) }, onClick: () => setRightTab('ask') }, t('ask')),
          ),
          h('div', { style: S.rightBody },
            rightTab === 'ask'
              ? h('div', { style: { padding: '10px 8px 0' } },
                  h('textarea', {
                    style: { ...S.input, height: 62, resize: 'vertical', lineHeight: 1.6, padding: '7px 9px' },
                    value: askQ, placeholder: t('askPlaceholder'),
                    onChange: e => setAskQ(e.target.value),
                    onKeyDown: e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); askVault(); }
                    },
                    'aria-label': t('ask'),
                  }),
                  h('div', { style: { display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' } },
                    h('button', {
                      style: {
                        ...S.btnPrimary, flex: 1,
                        ...(askBusy || !askQ.trim() ? { opacity: 0.55, cursor: 'default' } : {}),
                      },
                      onClick: askVault, disabled: askBusy || !askQ.trim(),
                    }, askBusy ? t('asking') : t('askSend')),
                    askRes ? h('button', { style: S.iconBtn, title: t('clear'), onClick: () => { setAskRes(null); setAskQ(''); } }, '✕') : null,
                  ),
                  askBusy ? h('div', { style: { ...S.match, padding: '8px 0' } }, t('asking')) : null,
                  askRes && !askRes.synthesized ? h('div', { style: { fontSize: 11, color: C.warn, marginTop: 8, lineHeight: 1.6 } },
                    `${t('evidenceOnly')}${askRes.reason ? `（${askRes.reason}）` : ''}`) : null,
                  askRes && askRes.answer ? h('div', {
                    style: { marginTop: 10, fontSize: 12.5, lineHeight: 1.85, color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
                  }, askRes.answer) : null,
                  askRes && askRes.hits?.length
                    ? h('div', { style: { marginTop: 12 } },
                        h('div', { style: { ...S.match, padding: '0 0 6px', fontSize: 11 } }, `${t('citations')} · ${askRes.citations?.length || 0}`),
                        ...askRes.hits.map((hh, hi) => h('button', {
                          key: hi,
                          style: { ...S.relRow, alignItems: 'flex-start' },
                          onClick: () => openNote(hh.path),
                          title: hh.text.slice(0, 240),
                        },
                          h('span', { style: { fontSize: 10, color: C.text2, minWidth: 16 } }, `[${hi + 1}]`),
                          h('span', { style: { flex: 1, overflow: 'hidden' } },
                            h('span', { style: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, hh.title),
                            h('span', { style: { display: 'block', fontSize: 10.5, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, hh.heading || ''),
                          ),
                        )),
                      )
                    : null,
                  askRes && !askRes.hits?.length ? h('div', { style: S.empty }, t('noEvidence')) : null,
                )
              : rightTab === 'outline'
              ? (headings.length
                  ? headings.map((x, xi) => h('button', {
                      key: xi,
                      style: { ...S.outRow, paddingLeft: 8 + (x.level - 1) * 13, color: x.level <= 2 ? C.text : C.text2, fontWeight: x.level <= 2 ? 600 : 400 },
                      onClick: () => jumpTo(String(xi)),
                      title: x.text,
                    }, x.text))
                  : h('div', { style: S.empty }, t('noOutline')))
              : (related.length
                  ? related.map((r, ri) => h('button', {
                      key: ri,
                      style: S.relRow,
                      onClick: () => openNote(r.path),
                      title: r.path,
                    },
                      h('span', { style: { color: r.kind === 'in' ? C.brand : C.text2, display: 'inline-flex' } },
                        h(Icon, { d: r.kind === 'in' ? 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1' : 'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1', size: 12 })),
                      h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.title),
                      h('span', { style: { fontSize: 10, color: C.text2 } }, r.kind === 'in' ? t('linkIn') : t('linkOut')),
                    ))
                  : h('div', { style: S.empty }, t('noRelated'))),
          ),
        ),

        // 新建菜单（笔记 / 文件夹 / 知识库项目）
        menu && menu.kind === 'new'
          ? h('div', {
              style: { position: 'absolute', inset: 0, zIndex: 280 },
              onClick: () => setMenu(null),
            },
              h('div', {
                style: {
                  position: 'absolute', left: Math.max(8, menu.x), top: Math.max(8, menu.y),
                  width: 200, background: C.bg2, border: `1px solid ${C.line2}`,
                  borderRadius: 8, padding: 6, boxShadow: '0 12px 40px rgba(0,0,0,.45)',
                },
                onClick: e => e.stopPropagation(),
              },
                h('div', { style: S.menuGroup },
                  menuItem(t('newNote'), 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5', () => { setMenu(null); createNote(''); }),
                  menuItem(t('newFolder'), 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', () => { setMenu(null); createFolder(''); }),
                ),
                h('div', { style: S.menuSep }),
                h('div', { style: S.menuGroup },
                  menuItem(t('createVault'), 'M12 3v18M3 12h18', () => { setMenu(null); createVaultProject(); }, C.brand),
                ),
              ),
            )
          : null,

        // 右键菜单（文件夹 / 笔记 / 空白处）
        menu && menu.kind !== 'new'
          ? h('div', {
              style: { position: 'absolute', inset: 0, zIndex: 280 },
              onClick: () => setMenu(null),
            },
              h('div', {
                style: {
                  position: 'absolute', left: Math.max(8, menu.x), top: Math.max(8, menu.y),
                  width: 196, background: C.bg2, border: `1px solid ${C.line2}`,
                  borderRadius: 8, padding: 6, boxShadow: '0 12px 40px rgba(0,0,0,.45)',
                },
                onClick: e => e.stopPropagation(),
              },
                // 在文件夹里新建（仅文件夹菜单）
                menu.kind === 'folder'
                  ? h('div', null,
                      h('div', { style: S.menuGroup },
                        menuItem(t('newNote'), 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5', () => { setMenu(null); createNote(menu.path); }),
                        menuItem(t('newFolder'), 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', () => { setMenu(null); createFolder(menu.path); }),
                      ),
                      h('div', { style: S.menuSep }),
                      h('div', { style: S.menuGroup },
                        menuItem(t('rename'), 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', () => { setMenu(null); renameFolder(menu.path, menu.name); }),
                        menuItem(t('delete'), 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', () => { setMenu(null); removeFolder(menu.path, menu.name); }, C.err),
                      ),
                    )
                  : null,
                // 笔记菜单
                menu.kind === 'note'
                  ? h('div', null,
                      h('div', { style: S.menuGroup },
                        menuItem(t('open'), 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5', () => { setMenu(null); openNote(menu.path); }),
                      ),
                      h('div', { style: S.menuSep }),
                      h('div', { style: S.menuGroup },
                        menuItem(t('rename'), 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', () => { setMenu(null); renameNoteAt(menu.path); }),
                        menuItem(t('delete'), 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', () => { setMenu(null); removeNoteAt(menu.path); }, C.err),
                      ),
                    )
                  : null,
                // 空白处菜单（根目录）
                menu.kind === 'root'
                  ? h('div', null,
                      h('div', { style: S.menuGroup },
                        menuItem(t('newNote'), 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5', () => { setMenu(null); createNote(''); }),
                        menuItem(t('newFolder'), 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', () => { setMenu(null); createFolder(''); }),
                      ),
                      h('div', { style: S.menuSep }),
                      h('div', { style: S.menuGroup },
                        menuItem(t('createVault'), 'M12 3v18M3 12h18', () => { setMenu(null); createVaultProject(); }, C.brand),
                      ),
                    )
                  : null,
              ),
            )
          : null,

        // vault 切换下拉
        picker
          ? h('div', {
              style: {
                position: 'absolute', inset: 0, zIndex: 290,
                background: 'rgba(0,0,0,.35)', display: 'flex',
                alignItems: 'flex-start', justifyContent: 'flex-start', padding: 16,
              },
              onClick: e => { if (e.target === e.currentTarget) setPicker(null); },
            },
              h('div', {
                style: {
                  width: 320, maxHeight: '70%', overflowY: 'auto',
                  background: C.bg2, border: `1px solid ${C.line2}`, borderRadius: 10,
                  padding: 8, boxShadow: '0 12px 40px rgba(0,0,0,.45)',
                },
              },
                h('div', { style: { fontSize: 11.5, color: C.text2, padding: '4px 8px 8px' } }, t('switchVault')),
                picker.length === 0
                  ? h('div', { style: { fontSize: 11.5, color: C.text2, padding: '6px 8px' } }, t('noVaults'))
                  : picker.map(v => h('button', {
                      key: v.path,
                      style: {
                        display: 'block', width: '100%', textAlign: 'left', border: 'none',
                        background: v.path === status?.vaultPath ? C.bg1 : 'transparent',
                        color: C.text, cursor: 'pointer', padding: '8px 9px',
                        borderRadius: 6, fontFamily: 'inherit', fontSize: 12.5,
                      },
                      onClick: () => switchVault(v.path),
                      title: v.path,
                    },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', { style: { fontWeight: 600 } }, v.name),
                        v.open ? h('span', { style: S.badge }, 'open') : null,
                        v.path === status?.vaultPath ? h('span', { style: { ...S.badge, color: C.brand } }, '✓') : null,
                      ),
                      h('div', { style: { fontSize: 10.5, color: C.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, v.path),
                    )),
                h('div', { style: { height: 1, background: C.line, margin: '8px 4px' } }),
                h('button', {
                  style: {
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                    border: 'none', background: 'transparent', color: C.brand, cursor: 'pointer',
                    padding: '9px 9px', borderRadius: 6, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                  },
                  onClick: createVaultProject,
                },
                  h(Icon, { d: 'M12 5v14M5 12h14', size: 13 }),
                  h('span', null, t('createVault')),
                ),
              ),
            )
          : null,

        // 内联对话框（替代被禁用的 window.prompt / window.confirm）
        dialog
          ? h('div', {
              style: {
                position: 'absolute', inset: 0, zIndex: 300,
                background: 'rgba(0,0,0,.42)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 20,
              },
              onClick: e => { if (e.target === e.currentTarget) closeDialog(dialog.kind === 'confirm' ? false : null); },
            },
              h('div', {
                style: {
                  width: 'min(420px, 100%)', background: C.bg2, color: C.text,
                  border: `1px solid ${C.line2}`, borderRadius: 10, padding: 16,
                  boxShadow: '0 12px 40px rgba(0,0,0,.45)', display: 'flex',
                  flexDirection: 'column', gap: 12,
                },
                role: 'dialog',
                'aria-modal': 'true',
              },
                h('div', { style: { fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 } }, dialog.title),
                dialog.kind === 'prompt'
                  ? h('input', {
                      style: S.input,
                      value: dialog.value,
                      placeholder: dialog.placeholder,
                      autoFocus: true,
                      onChange: e => {
                        const v = e.target.value;
                        dialogValueRef.current = v;
                        setDialog(d => d && { ...d, value: v });
                      },
                      onKeyDown: e => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && !e.nativeEvent?.isComposing) submitDialog();
                        if (e.key === 'Escape') closeDialog(null);
                      },
                    })
                  : null,
                h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
                  h('button', { style: S.btn, onClick: () => closeDialog(dialog.kind === 'confirm' ? false : null) }, t('cancel')),
                  h('button', { style: S.btnPrimary, onClick: submitDialog }, dialog.confirmText || t('save')),
                ),
              ),
            )
          : null,
      );
    }

    function registerUi(ctx) {
      ctx.slots.inject('main', () =>
        ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, KnowledgePanel));
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 56, locale: NS, label: () => t('panel') },
          BookGlyph));
    }

    function apply(ctx) {
      const disposeLocale = ctx.locale.register(NS, DICT);
      t = ctx.locale.bind(NS);
      const ui = ctx.inject(['slots'], () => registerUi(ctx));
      return () => { ui?.dispose?.(); disposeLocale?.(); };
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
