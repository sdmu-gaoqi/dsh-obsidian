/**
 * @wagq/dsh-obsidian — Host 半端
 *
 * 面向「知识库」工作区：索引整个 Obsidian vault，提供
 *  - 文件库树（文件夹 / 笔记 / PDF / 图片 / 其它文件，按类型筛选）
 *  - 笔记详情（正文、frontmatter、标签、大纲、字数、链接与反链）
 *  - 全文检索、标签聚合、关联笔记
 *  - 写入 / 新建 / 重命名 / 删除（.trash）/ 建文件夹
 *  - 与左侧栏同一套能力的 kb_* 对话工具
 *
 * 纯 node:fs 实现，零外部依赖；路径越界防护；不触碰 .obsidian/
 */
import { readFile, readdir, writeFile, mkdir, rename, stat, copyFile, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import z from '@deepseek-ai/schemastery'

export const name = '@wagq/dsh-obsidian'
export const inject = ['webServer', 'tools']

export const Config = z.object({
  vaultPath: z.string().default('').description('Obsidian vault 绝对路径；留空则自动检测 obsidian.json 中打开的 vault'),
})

const PREFIX = '/kb'
const API = `${PREFIX}/api`
const EXCLUDE = new Set(['.obsidian', '.git', '.trash', 'node_modules', '.DS_Store'])
/** 隐藏目录一律不索引（.obsidian / .trash / .git / .claudian 等） */
const isIgnoredDir = name => EXCLUDE.has(name) || name.startsWith('.')
const MAX_FILE = 4 * 1024 * 1024

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'avif'])
const NOTE_EXT = new Set(['md', 'markdown'])

let config = { vaultPath: '' }
let vaultRoot = null
let vaultError = ''

function detectFromObsidianConfig() {
  const home = homedir()
  const candidates = [
    process.env.APPDATA ? path.join(process.env.APPDATA, 'obsidian', 'obsidian.json') : '',
    path.join(home, 'Library', 'Application Support', 'obsidian', 'obsidian.json'),
    path.join(home, '.config', 'obsidian', 'obsidian.json'),
  ].filter(Boolean)
  for (const file of candidates) {
    try {
      const cfg = JSON.parse(readFileSync(file, 'utf8'))
      const vaults = Object.values(cfg.vaults ?? {})
      const found = vaults.find(v => v.open) || vaults[0]
      if (found?.path) return path.resolve(found.path)
    } catch { /* ignore */ }
  }
  return null
}

/** 列出 obsidian.json 里登记的所有 vault，供面板切换 */
function listVaults() {
  const home = homedir()
  const candidates = [
    process.env.APPDATA ? path.join(process.env.APPDATA, 'obsidian', 'obsidian.json') : '',
    path.join(home, 'Library', 'Application Support', 'obsidian', 'obsidian.json'),
    path.join(home, '.config', 'obsidian', 'obsidian.json'),
  ].filter(Boolean)
  for (const file of candidates) {
    try {
      const cfg = JSON.parse(readFileSync(file, 'utf8'))
      const out = []
      for (const v of Object.values(cfg.vaults ?? {})) {
        if (!v?.path) continue
        const abs = path.resolve(v.path)
        out.push({ path: abs, name: path.basename(abs), open: !!v.open })
      }
      if (out.length) return out.sort((a, b) => Number(b.open) - Number(a.open))
    } catch { /* ignore */ }
  }
  return []
}

function resolveVault() {
  vaultError = ''
  const explicit = config.vaultPath && String(config.vaultPath).trim()
  vaultRoot = explicit ? path.resolve(String(config.vaultPath).trim()) : detectFromObsidianConfig()
  if (!vaultRoot) vaultError = '未找到本地 Obsidian 知识库。请在插件配置里设置 vaultPath，或先在 Obsidian 中打开一个 vault。'
}

function guard(rel) {
  if (!vaultRoot) throw new Error(vaultError || '知识库未配置')
  if (typeof rel !== 'string') throw new Error('path must be a string')
  const normalized = rel.trim() === '' ? '.' : rel.replace(/\\/g, '/')
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) throw new Error(`path escapes vault root: ${rel}`)
  const root = path.resolve(vaultRoot)
  const abs = path.resolve(root, normalized)
  const out = path.relative(root, abs)
  if (out === '..' || out.startsWith(`..${path.sep}`) || path.isAbsolute(out)) throw new Error(`path escapes vault root: ${rel}`)
  return { root, abs, rel: out.replace(/\\/g, '/') }
}

const toRel = abs => path.relative(path.resolve(vaultRoot), abs).replace(/\\/g, '/')

function classify(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (NOTE_EXT.has(ext)) return { type: 'note', ext }
  if (ext === 'pdf') return { type: 'pdf', ext }
  if (IMAGE_EXT.has(ext)) return { type: 'image', ext }
  return { type: 'file', ext }
}

/** 遍历 vault，返回文件清单（不读正文，快）；空文件夹也作为条目返回 */
async function walkVault(dir = '') {
  const { abs } = guard(dir)
  const out = []
  async function walk(d) {
    let entries
    try { entries = await readdir(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory() ? isIgnoredDir(e.name) : EXCLUDE.has(e.name)) continue
      const full = path.join(d, e.name)
      if (e.isDirectory()) {
        // 记录文件夹本身，这样新建的空文件夹也能出现在树里
        out.push({
          path: toRel(full), title: e.name, type: 'folder', ext: '',
          size: 0, mtime: 0,
        })
        await walk(full)
        continue
      }
      if (!e.isFile()) continue
      let st
      try { st = await stat(full) } catch { continue }
      const kind = classify(e.name)
      out.push({
        path: toRel(full),
        title: kind.type === 'note' ? e.name.replace(/\.(md|markdown)$/i, '') : e.name,
        type: kind.type,
        ext: kind.ext,
        size: st.size,
        mtime: st.mtimeMs,
      })
    }
  }
  await walk(abs)
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

/** 从 Markdown 提取标题大纲 */
function extractHeadings(body) {
  const lines = String(body || '').replace(/\r/g, '').split('\n')
  const out = []
  let inFence = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (m) out.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, ''), index: out.length })
  }
  return out
}

/** 标签：frontmatter + 行内 #tag */
function extractTags(body, fm) {
  const set = new Set()
  const fmTags = fm?.tags
  if (typeof fmTags === 'string') fmTags.split(/[,\s]+/).filter(Boolean).forEach(x => set.add(x.replace(/^#/, '')))
  if (Array.isArray(fmTags)) fmTags.forEach(x => set.add(String(x).replace(/^#/, '')))
  const text = String(body || '').replace(/```[\s\S]*?```/g, ' ')
  const re = /(^|[\s(（])#([\p{L}\p{N}_\-/]+)/gu
  let m
  while ((m = re.exec(text))) set.add(m[2])
  return [...set].filter(Boolean)
}

function parseFrontmatter(body) {
  const fm = {}
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { fm, body }
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([^:#\s][^:]*):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1].trim()
    let val = kv[2].trim()
    if (/^\[.*\]$/.test(val)) val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    else val = val.replace(/^['"]|['"]$/g, '')
    fm[key] = val
  }
  return { fm, body: body.slice(m[0].length).replace(/^\r?\n/, '') }
}

function extractLinks(body) {
  const out = []
  const re = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g
  let m
  while ((m = re.exec(String(body || '')))) out.push(m[1].trim())
  return [...new Set(out)].filter(Boolean)
}

function countWords(body) {
  const text = String(body || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`\-|]/g, ' ')
  const cjk = (text.match(/[\p{Script=Han}]/gu) || []).length
  const latin = (text.match(/[A-Za-z0-9_]+/g) || []).length
  return cjk + latin
}

function excerptOf(body) {
  const plain = String(body || '')
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|\-]{1,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.slice(0, 160)
}

async function readNote(rel) {
  const { abs } = guard(rel)
  const st = await stat(abs)
  if (!st.isFile()) throw new Error('not a file')
  if (st.size > MAX_FILE) throw new Error('note too large (>4MB)')
  const kind = classify(path.basename(abs))
  const isNote = kind.type === 'note'

  if (!isNote) {
    // 非笔记：返回元信息，供面板展示图片/PDF 预览
    return {
      path: toRel(abs),
      title: path.basename(abs),
      body: '',
      raw: '',
      frontmatter: {},
      tags: [],
      headings: [],
      links: [],
      words: 0,
      chars: 0,
      lines: 0,
      size: st.size,
      mtime: st.mtimeMs,
      ctime: st.birthtimeMs,
      excerpt: '',
      kind: kind.type,
      ext: kind.ext,
    }
  }

  const raw = await readFile(abs, 'utf8')
  const { fm, body } = parseFrontmatter(raw)
  const headings = extractHeadings(body)
  return {
    path: toRel(abs),
    title: path.basename(abs).replace(/\.(md|markdown)$/i, ''),
    body,
    raw,
    frontmatter: fm,
    tags: extractTags(body, fm),
    headings,
    links: extractLinks(body),
    words: countWords(body),
    chars: body.length,
    lines: body.split('\n').length,
    size: st.size,
    mtime: st.mtimeMs,
    ctime: st.birthtimeMs,
    excerpt: excerptOf(body),
    kind: 'note',
    ext: kind.ext,
  }
}

/** 反链：扫描所有笔记中指向 target 的 [[链接]] */
async function backlinks(rel) {
  const files = await walkVault('')
  const target = rel.replace(/\.(md|markdown)$/i, '')
  const base = path.basename(target)
  const hits = []
  for (const f of files) {
    if (f.type !== 'note' || f.path === rel) continue
    let raw
    try { raw = await readFile(path.resolve(vaultRoot, f.path), 'utf8') } catch { continue }
    const links = extractLinks(raw)
    if (links.some(l => l === base || l === target || l === f.path.replace(/\.md$/i, ''))) {
      hits.push({ path: f.path, title: f.title })
    }
  }
  return hits
}

/** 把一条 [[链接]] 解析为 vault 内真实笔记 */
async function resolveLink(name, files) {
  const clean = String(name).replace(/\.md$/i, '').trim()
  const exact = files.find(f => f.type === 'note' && f.path.replace(/\.md$/i, '') === clean)
  if (exact) return exact
  const byBase = files.filter(f => f.type === 'note' && path.posix.basename(f.path).replace(/\.md$/i, '') === clean)
  return byBase[0] || null
}

async function relatedNotes(rel) {
  const files = await walkVault('')
  const note = await readNote(rel)
  const outgoing = []
  for (const link of note.links) {
    const hit = await resolveLink(link, files)
    if (hit && hit.path !== rel) outgoing.push({ path: hit.path, title: hit.title, kind: 'out' })
  }
  const incoming = (await backlinks(rel)).map(x => ({ ...x, kind: 'in' }))
  const seen = new Set()
  return [...incoming, ...outgoing].filter(x => (seen.has(x.path) ? false : seen.add(x.path)))
}

// ─────────── 全库问答：检索 + 证据 ───────────

/** 把问题切成检索词：拉丁词 + 中文单字/双字 */
function tokenize(text) {
  const s = String(text || '').toLowerCase()
  const out = new Set()
  for (const w of s.match(/[a-z0-9_]{2,}/g) || []) out.add(w)
  const cjk = s.match(/[\p{Script=Han}]+/gu) || []
  for (const run of cjk) {
    for (const ch of run) out.add(ch)
    for (let i = 0; i < run.length - 1; i++) out.add(run.slice(i, i + 2))
  }
  return [...out]
}

/** 按标题把正文切成块，便于精确引用 */
function splitChunks(body, headings) {
  const lines = String(body || '').replace(/\r/g, '').split('\n')
  const chunks = []
  let cur = { heading: '正文', lines: [] }
  let inFence = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence
    const hm = !inFence && line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (hm) {
      if (cur.lines.join('').trim()) chunks.push(cur)
      cur = { heading: hm[2].replace(/[*_`]/g, ''), lines: [] }
      continue
    }
    cur.lines.push(line)
  }
  if (cur.lines.join('').trim()) chunks.push(cur)
  return chunks.map(c => ({ heading: c.heading, text: c.lines.join('\n').trim() })).filter(c => c.text)
}

function scoreChunk(text, heading, title, terms) {
  const hay = `${title}\n${heading}\n${text}`.toLowerCase()
  let score = 0
  for (const term of terms) {
    if (!term) continue
    let idx = hay.indexOf(term)
    if (idx < 0) continue
    const weight = term.length > 1 ? 3 : 1
    let hits = 0
    while (idx >= 0 && hits < 12) { hits++; score += weight; idx = hay.indexOf(term, idx + term.length) }
    if (heading.toLowerCase().includes(term)) score += weight * 4
    if (title.toLowerCase().includes(term)) score += weight * 3
  }
  return score
}

/** 全库检索：返回最相关的证据块 */
async function retrieve(question, limit = 8) {
  const terms = tokenize(question)
  if (!terms.length) return []
  const files = await walkVault('')
  const hits = []
  for (const f of files) {
    if (f.type !== 'note') continue
    let raw
    try { raw = await readFile(path.resolve(vaultRoot, f.path), 'utf8') } catch { continue }
    const { body } = parseFrontmatter(raw)
    for (const ch of splitChunks(body, extractHeadings(body))) {
      const score = scoreChunk(ch.text, ch.heading, f.title, terms)
      if (score > 0) hits.push({ path: f.path, title: f.title, heading: ch.heading, text: ch.text, score })
    }
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit)
}

/** 尝试用当前默认模型综合回答；不可用时退回证据 */
async function synthesize(ctx, question, hits) {
  if (!hits.length) return { answer: '', synthesized: false, reason: 'no-evidence' }
  let provider, model
  try {
    const sel = ctx.get('agentDefaultModel')?.currentSelection?.()
    provider = sel?.provider
    model = sel?.model
  } catch { /* ignore */ }
  let llm
  try { llm = ctx.get('llm') } catch { /* ignore */ }
  if (!llm || !provider || !model) return { answer: '', synthesized: false, reason: 'no-model' }

  const evidence = hits.map((h, i) =>
    `[${i + 1}] ${h.path}${h.heading ? ` › ${h.heading}` : ''}\n${h.text.slice(0, 1600)}`).join('\n\n')
  const prompt = [
    '你是检索问答系统。读完片段后，只输出一行最终答案，不要输出任何思考或复述。',
    '',
    `片段：`,
    evidence,
    '',
    `问题：${question}`,
    '',
    '答案（一行）：',
  ].join('\n')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 60000)
  try {
    const stream = llm.stream({
      provider,
      model,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      signal: ac.signal,
    })
    let text = ''
    for await (const chunk of stream) {
      if (ac.signal.aborted) break
      const piece = chunk?.delta ?? chunk?.text ?? chunk?.content ?? ''
      if (typeof piece === 'string') text += piece
      else if (Array.isArray(piece)) {
        for (const part of piece) if (part?.type === 'text' && part.text) text += part.text
      } else if (piece && typeof piece === 'object' && typeof piece.text === 'string') text += piece.text
    }
    if (text.trim()) return { answer: cleanAnswer(text), synthesized: true, provider, model, reason: '' }
    return { answer: '', synthesized: false, reason: 'empty' }
  } catch (e) {
    return { answer: '', synthesized: false, reason: String(e?.message || e).slice(0, 200) }
  } finally {
    clearTimeout(timer)
  }
}

/** 去掉模型泄漏的思考：优先取带引号的完整答案，否则取最后一个干净句 */
function cleanAnswer(text) {
  let s = String(text || '')
  s = s.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim()
  if (!s) return ''

  // 优先：引号内的完整答案（模型常把答案写在引号里）
  const quoted = [...s.matchAll(/["“]([^"”]{6,400})["”]/g)]
    .map(m => m[1].trim())
    .filter(x => x && !/^(We need|Need |Only |No explanation)/i.test(x))
  if (quoted.length) return quoted[quoted.length - 1]

  // 其次：最后一个以句末标点结尾、且不含思考词的句子
  const BAD = /(We need|Need answer|Only final|No explanation|我们需要|我们应该|答案式|不要输出|仅依据|片段\[?\d*\]?|问题[:：]|需要简洁|可以标注|按格式|最后给出|用户问|用户想|注意严格|只能最终|需要输出|应该回答|可以答|问有什么|最终只输出|按检索问答|没有具体内容|一行)/
  // 只按中文句末与 !? 切分；不按英文句点切（避免把 IP/版本号切碎）
  const sentences = s.split(/(?<=[。！？!?\n])/).map(x => x.trim()).filter(Boolean)
  for (let i = sentences.length - 1; i >= 0; i--) {
    const c = sentences[i].replace(/^["“]|["”]$/g, '').trim()
    if (c.length >= 4 && !BAD.test(c)) return c
  }
  // 兜底：整段（可能是短答案本身）
  return s.length <= 200 && !BAD.test(s) ? s.trim() : ''
}

async function askVault(ctx, question, limit = 8) {
  const q = String(question || '').trim()
  if (!q) throw new Error('question is required')
  const hits = await retrieve(q, limit)
  const { answer, synthesized, reason, provider, model } = await synthesize(ctx, q, hits)
  const citations = []
  const seen = new Set()
  for (const h of hits) {
    if (seen.has(h.path)) continue
    seen.add(h.path)
    citations.push({ path: h.path, title: h.title, heading: h.heading })
  }
  return { question: q, answer, synthesized, reason, provider, model, hits, citations }
}

async function tagsIndex() {
  const files = await walkVault('')
  const counts = new Map()
  for (const f of files) {
    if (f.type !== 'note') continue
    let raw
    try { raw = await readFile(path.resolve(vaultRoot, f.path), 'utf8') } catch { continue }
    const { fm, body } = parseFrontmatter(raw)
    for (const tag of extractTags(body, fm)) counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

async function searchVault(query, opts = {}) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  const files = await walkVault('')
  const limit = opts.limit || 60
  const out = []
  for (const f of files) {
    if (out.length >= limit) break
    if (f.type !== 'note') continue
    let raw
    try { raw = await readFile(path.resolve(vaultRoot, f.path), 'utf8') } catch { continue }
    const titleHit = f.title.toLowerCase().includes(q)
    const lines = raw.replace(/\r/g, '').split('\n')
    let lineHit = null
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) { lineHit = { line: i + 1, text: lines[i].trim().slice(0, 180) }; break }
    }
    if (titleHit || lineHit) {
      out.push({ path: f.path, title: f.title, mtime: f.mtime, line: lineHit?.line, text: lineHit?.text, inTitle: titleHit })
    }
  }
  return out
}

async function status() {
  if (!vaultRoot || vaultError) {
    return {
      ok: false, connected: false, vaultPath: vaultRoot || null, error: vaultError,
      vaults: listVaults(), counts: { note: 0, pdf: 0, image: 0, file: 0, folders: 0 },
    }
  }
  const files = await walkVault('')
  const counts = { note: 0, pdf: 0, image: 0, file: 0, folders: 0 }
  const folders = new Set()
  for (const f of files) {
    if (f.type === 'folder') { folders.add(f.path); continue }
    counts[f.type] = (counts[f.type] || 0) + 1
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''
    if (dir) { let acc = ''; for (const seg of dir.split('/')) { acc = acc ? `${acc}/${seg}` : seg; folders.add(acc) } }
  }
  counts.folders = folders.size
  return {
    ok: true, connected: true, vaultPath: vaultRoot, name: path.basename(vaultRoot), error: '',
    vaults: listVaults(), counts,
  }
}

async function writeNote(rel, content) {
  const { abs } = guard(rel)
  if (typeof content !== 'string') throw new Error('content must be a string')
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, content, 'utf8')
  return { path: toRel(abs), bytes: Buffer.byteLength(content, 'utf8') }
}

async function appendNote(rel, content) {
  const existing = await readNote(rel).catch(() => ({ raw: '' }))
  const sep = existing.raw && !existing.raw.endsWith('\n') ? '\n' : ''
  return writeNote(rel, existing.raw + sep + String(content ?? ''))
}

async function moveNote(from, to) {
  const a = guard(from)
  const b = guard(to)
  await mkdir(path.dirname(b.abs), { recursive: true })
  await rename(a.abs, b.abs)
  return { from: a.rel, to: b.rel }
}

async function deleteNote(rel) {
  const { abs } = guard(rel)
  const trash = path.join(path.resolve(vaultRoot), '.trash')
  await mkdir(trash, { recursive: true })
  const dest = path.join(trash, `${Date.now()}-${path.basename(abs)}`)
  await copyFile(abs, dest)
  await rm(abs)
  return { path: toRel(abs), trashed: toRel(dest) }
}

async function makeFolder(rel) {
  const { abs, rel: clean } = guard(rel)
  await mkdir(abs, { recursive: true })
  return { path: clean }
}

/** 删除文件夹：整棵子树移入 .trash（可逆），并返回受影响文件数 */
async function deleteFolder(rel) {
  const { abs, rel: clean } = guard(rel)
  if (!clean) throw new Error('不能删除 vault 根目录')
  const st = await stat(abs)
  if (!st.isDirectory()) throw new Error('not a directory')

  // 统计将被移除的内容
  let files = 0
  async function count(d) {
    let entries
    try { entries = await readdir(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) await count(full)
      else files++
    }
  }
  await count(abs)

  const trash = path.join(path.resolve(vaultRoot), '.trash', `${Date.now()}-${path.basename(abs)}`)
  await mkdir(path.dirname(trash), { recursive: true })
  // 优先整目录搬移（同盘原子），失败则递归复制后删除
  try {
    await rename(abs, trash)
  } catch {
    await copyFile(abs, trash).catch(() => {})
    try {
      await rm(abs, { recursive: true, force: true })
    } catch (e) {
      throw new Error(`删除失败：${e?.message ?? e}`)
    }
  }
  return { path: clean, trashed: toRel(trash), files }
}

/** 在磁盘上创建一个新的 Obsidian vault（含最小 .obsidian 配置） */
async function createVault(parentDir, name) {
  const parent = String(parentDir || '').trim()
  const rawName = String(name || '').trim()
  if (!parent) throw new Error('请填写父目录，例如 D:\\知识库')
  if (!rawName) throw new Error('请填写项目（vault）名称')
  if (/[\\/:*?"<>|]/.test(rawName)) throw new Error('名称不能包含 \\ / : * ? " < > |')

  const parentAbs = path.resolve(parent)
  try {
    const st = await stat(parentAbs)
    if (!st.isDirectory()) throw new Error('父目录不是文件夹')
  } catch (e) {
    if (e?.code === 'ENOENT') throw new Error(`父目录不存在：${parentAbs}`)
    throw e
  }

  const target = path.join(parentAbs, rawName)
  try {
    const st = await stat(target)
    if (st.isDirectory()) throw new Error(`目标已存在：${target}`)
  } catch (e) {
    if (e?.code !== 'ENOENT') throw e
  }

  await mkdir(target, { recursive: true })
  // 写一个最小 .obsidian 目录，让 Obsidian 能识别为 vault
  const obsidianDir = path.join(target, '.obsidian')
  await mkdir(obsidianDir, { recursive: true })
  await writeFile(path.join(obsidianDir, 'app.json'), '{}\n', 'utf8').catch(() => {})
  await writeFile(
    path.join(obsidianDir, 'core-plugins.json'),
    JSON.stringify({ 'file-explorer': true, 'global-search': true, switcher: true, graph: false }, null, 2),
    'utf8',
  ).catch(() => {})
  await writeFile(path.join(target, '欢迎.md'), `# ${rawName}\n\n这是新建知识库的首页。\n`, 'utf8').catch(() => {})

  return { path: target, name: rawName }
}

function readJsonBody(req, limit = 16 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0, settled = false
    const chunks = []
    const fail = e => { if (!settled) { settled = true; reject(e) } }
    req.on('data', c => {
      if (settled) return
      size += c.length
      if (size > limit) { fail(new Error('body too large')); return }
      chunks.push(c)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { reject(new Error('invalid JSON')) }
    })
    req.on('error', fail)
  })
}

function sendJson(res, code, body) {
  const data = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': data.length,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(data)
}

function isTrusted(req) {
  const origin = req.headers.origin
  if (!origin) return true
  const host = req.headers.host
  if (!host) return false
  return origin === `http://${host}` || origin === `https://${host}`
}

/** 对话侧工具：与左侧栏共用同一套实现 */
function registerTools(ctx) {
  const off = []
  const OUT = { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] }
  const P = (props, required = []) => ({ type: 'object', properties: props, ...(required.length ? { required } : {}) })
  const S = description => ({ type: 'string', description })
  const I = description => ({ type: 'integer', description })

  const tool = (name, description, parameters, execute) => {
    off.push(ctx.tools.register({
      name,
      description,
      parameters,
      output: { schema: OUT, render: (_a, v) => [{ type: 'text', text: String(v?.message ?? '') }] },
      execute: async (args) => {
        const result = await execute(args)
        return { message: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }
      },
    }))
  }

  tool('kb_status', '查看本地 Obsidian 知识库连接状态、vault 路径与各类文件数量。', P({}), () => status())
  tool('kb_list', '列出知识库中的笔记（可按子目录与类型过滤）。', P({
    dir: S('vault 内的相对子目录，留空为根目录。'),
    type: S('类型过滤：note / pdf / image / file。'),
    limit: I('最多返回条数，默认 300。'),
  }), async args => {
    const files = await walkVault(args.dir || '')
    const filtered = args.type ? files.filter(f => f.type === args.type) : files
    return filtered.slice(0, args.limit || 300).map(f => ({ path: f.path, title: f.title, type: f.type, size: f.size }))
  })
  tool('kb_search', '在知识库中全文检索笔记标题与正文，返回匹配行。', P({
    query: S('要检索的文字（大小写不敏感）。'),
    limit: I('最多返回条数，默认 60。'),
  }, ['query']), args => searchVault(args.query, { limit: args.limit || 60 }))
  tool('kb_read', '读取一篇笔记：正文、frontmatter、标签、大纲、字数、链接与反链。', P({
    path: S('相对 vault 的笔记路径，如 Folder/Note.md。'),
  }, ['path']), async args => {
    const note = await readNote(args.path)
    return {
      path: note.path, title: note.title, tags: note.tags, words: note.words,
      headings: note.headings.map(x => `${'#'.repeat(x.level)} ${x.text}`), links: note.links, body: note.body,
    }
  })
  tool('kb_outline', '取出一篇笔记的标题大纲，用于定位章节。', P({
    path: S('相对 vault 的笔记路径。'),
  }, ['path']), async args => (await readNote(args.path)).headings)
  tool('kb_write', '新建或覆盖一篇笔记。', P({
    path: S('相对 vault 的笔记路径。'),
    content: S('笔记完整内容（Markdown）。'),
  }, ['path', 'content']), args => writeNote(args.path, args.content))
  tool('kb_append', '向一篇笔记末尾追加内容。', P({
    path: S('相对 vault 的笔记路径。'),
    content: S('要追加的内容。'),
  }, ['path', 'content']), args => appendNote(args.path, args.content))
  tool('kb_move', '移动或重命名笔记。', P({
    from: S('原相对路径。'),
    to: S('目标相对路径。'),
  }, ['from', 'to']), args => moveNote(args.from, args.to))
  tool('kb_delete', '把笔记移入 .trash（可逆删除）。', P({
    path: S('相对 vault 的笔记路径。'),
  }, ['path']), args => deleteNote(args.path))
  tool('kb_backlinks', '查找链接到某篇笔记的其它笔记。', P({
    path: S('相对 vault 的笔记路径。'),
  }, ['path']), args => backlinks(args.path))
  tool('kb_related', '查找与某篇笔记相关的笔记（反链 + 出链）。', P({
    path: S('相对 vault 的笔记路径。'),
  }, ['path']), args => relatedNotes(args.path))
  tool('kb_ask', '全库问答：在整个知识库里检索与问题相关的片段，并据此回答，返回答案与出处。', P({
    question: S('要问的问题，自然语言即可。'),
    limit: S('最多取多少条证据片段，默认 8。'),
  }, ['question']), args => askVault(ctx, args.question, Number(args.limit) || 8))
  tool('kb_tags', '列出知识库内所有标签及使用次数。', P({}), () => tagsIndex())
  tool('kb_mkdir', '在知识库内创建文件夹。', P({
    path: S('相对 vault 的文件夹路径。'),
  }, ['path']), args => makeFolder(args.path))
  tool('kb_rmdir', '删除知识库内的文件夹（整棵子树移入 .trash，可逆）。', P({
    path: S('相对 vault 的文件夹路径。'),
  }, ['path']), args => deleteFolder(args.path))
  tool('kb_create_vault', '在磁盘上新建一个 Obsidian vault（知识库项目），并切换过去。', P({
    parent: S('父目录绝对路径，例如 D:\\知识库。'),
    name: S('新 vault 名称。'),
  }, ['parent', 'name']), async args => {
    const created = await createVault(args.parent, args.name)
    config = { ...config, vaultPath: created.path }
    resolveVault()
    return created
  })

  return () => { for (const f of off.reverse()) { try { f() } catch {} } }
}

export function apply(ctx, source) {
  if (source && typeof source === 'object') {
    const live = 'get' in source
    config = { ...config, ...(live ? source.get() : source) }
  }
  resolveVault()

  const unregisterTools = registerTools(ctx)

  const disposeRoute = ctx.webServer.register({
    kind: 'prefix',
    path: PREFIX,
    handler: async (req, res) => {
      if (!isTrusted(req)) { sendJson(res, 403, { ok: false, error: 'forbidden' }); return }
      const url = new URL(req.url || '/', 'http://127.0.0.1')

      // 原始文件（图片 / PDF 预览）
      if (url.pathname === `${PREFIX}/raw`) {
        try {
          const { abs } = guard(url.searchParams.get('path') || '')
          const st = await stat(abs)
          if (!st.isFile()) { sendJson(res, 404, { ok: false, error: 'not a file' }); return }
          if (st.size > 32 * 1024 * 1024) { sendJson(res, 413, { ok: false, error: 'file too large' }); return }
          const ext = (abs.split('.').pop() || '').toLowerCase()
          const MIME = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
            svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif',
            pdf: 'application/pdf',
          }
          const buf = await readFile(abs)
          res.writeHead(200, {
            'content-type': MIME[ext] || 'application/octet-stream',
            'content-length': buf.length,
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
          })
          res.end(buf)
        } catch (e) {
          sendJson(res, 404, { ok: false, error: e?.message ?? String(e) })
        }
        return
      }

      const p = url.pathname.slice(API.length)

      try {
        if (p === '/status' && req.method === 'GET') { sendJson(res, 200, await status()); return }
        if (p === '/reload' && req.method === 'POST') { resolveVault(); sendJson(res, 200, await status()); return }
        if (p === '/vaults' && req.method === 'GET') {
          sendJson(res, 200, { ok: true, current: vaultRoot, vaults: listVaults() })
          return
        }
        if (p === '/switch' && req.method === 'POST') {
          const b = await readJsonBody(req)
          const target = String(b.path || '').trim()
          if (!target) { sendJson(res, 200, { ok: false, error: 'path is required' }); return }
          const abs = path.resolve(target)
          try {
            const st = await stat(abs)
            if (!st.isDirectory()) { sendJson(res, 200, { ok: false, error: '不是文件夹' }); return }
          } catch {
            sendJson(res, 200, { ok: false, error: '路径不存在' }); return
          }
          config = { ...config, vaultPath: abs }
          resolveVault()
          sendJson(res, 200, { ok: true, ...(await status()) })
          return
        }
        if (p === '/tree' && req.method === 'GET') {
          const files = await walkVault(url.searchParams.get('dir') || '')
          sendJson(res, 200, { ok: true, files })
          return
        }
        if (p === '/note' && req.method === 'GET') {
          const note = await readNote(url.searchParams.get('path') || '')
          sendJson(res, 200, { ok: true, note })
          return
        }
        if (p === '/related' && req.method === 'GET') {
          sendJson(res, 200, { ok: true, related: await relatedNotes(url.searchParams.get('path') || '') })
          return
        }
        if (p === '/tags' && req.method === 'GET') {
          sendJson(res, 200, { ok: true, tags: await tagsIndex() })
          return
        }
        if (p === '/search' && req.method === 'GET') {
          sendJson(res, 200, { ok: true, results: await searchVault(url.searchParams.get('query') || '', { limit: Number(url.searchParams.get('limit')) || 60 }) })
          return
        }
        if (p === '/ask' && req.method === 'POST') {
          const b = await readJsonBody(req)
          sendJson(res, 200, { ok: true, ...(await askVault(ctx, b.question, Number(b.limit) || 8)) })
          return
        }
        if (p === '/save' && req.method === 'POST') {
          const b = await readJsonBody(req)
          sendJson(res, 200, { ok: true, result: await writeNote(b.path, b.content) })
          return
        }
        if (p === '/create' && req.method === 'POST') {
          const b = await readJsonBody(req)
          const rel = /\.(md|markdown)$/i.test(b.path) ? b.path : `${b.path}.md`
          const content = typeof b.content === 'string' ? b.content : `# ${path.basename(rel).replace(/\.md$/i, '')}\n\n`
          sendJson(res, 200, { ok: true, result: await writeNote(rel, content) })
          return
        }
        if (p === '/move' && req.method === 'POST') {
          const b = await readJsonBody(req)
          sendJson(res, 200, { ok: true, result: await moveNote(b.from, b.to) })
          return
        }
        if (p === '/delete' && req.method === 'POST') {
          const b = await readJsonBody(req)
          sendJson(res, 200, { ok: true, result: await deleteNote(b.path) })
          return
        }
        if (p === '/mkdir' && req.method === 'POST') {
          const b = await readJsonBody(req)
          sendJson(res, 200, { ok: true, result: await makeFolder(b.path) })
          return
        }
        if (p === '/rmdir' && req.method === 'POST') {
          const b = await readJsonBody(req)
          sendJson(res, 200, { ok: true, result: await deleteFolder(b.path) })
          return
        }
        if (p === '/create-vault' && req.method === 'POST') {
          const b = await readJsonBody(req)
          const created = await createVault(b.parent, b.name)
          // 新建后直接切过去
          config = { ...config, vaultPath: created.path }
          resolveVault()
          sendJson(res, 200, { ok: true, result: created, ...(await status()) })
          return
        }
        sendJson(res, 404, { ok: false, error: 'not found' })
      } catch (e) {
        sendJson(res, 200, { ok: false, error: e?.message ?? String(e) })
      }
    },
  })

  ctx.effect(() => () => {
    try { disposeRoute() } catch {}
    try { unregisterTools?.() } catch {}
  }, '@wagq/dsh-obsidian:cleanup')

  ctx.logger?.info?.(`[kb] vault=${vaultRoot || 'UNCONFIGURED'} api=${API} tools=registered`)
}
