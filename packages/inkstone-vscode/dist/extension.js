"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode10 = __toESM(require("vscode"));

// src/store.ts
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));

// ../codemind-core/dist/parser/index.js
var PATTERNS = {
  // 專案標題: # Code-Mind Notes
  projectTitle: /^#\s+Code-Mind\s+Notes$/,
  // 專案元數據（bullet 格式）: - Project: xxx
  projectName: /^-\s*Project:\s*(.+)$/,
  projectCreated: /^-\s*Created:\s*(.+)$/,
  // 檔案區塊標題: - ## path/to/file.ts
  fileSection: /^-\s*##\s+(.+)$/,
  // 筆記標題: - [[cm.xxx]] 摘要 或 - [[cm.xxx]]
  noteTitle: /^-\s*\[\[(cm\.[a-z0-9]+)\]\](?:\s+(.*))?$/,
  // 元數據: - author · date 或 - author · date · line X
  noteMeta: /^-\s*(\w+)\s*·\s*(\d{4}-\d{2}-\d{2})(?:\s*·\s*line\s*(\d+))?$/,
  // 筆記引用: [[cm.xxx]] 或 [[cm.xxx|display]]
  noteRef: /\[\[(cm\.[a-z0-9]+)(?:\|([^\]]+))?\]\]/g,
  // 內容行: - 內容
  bulletLine: /^-\s+(.*)$/,
  // 舊格式: - [[cm.xxx|...]]（帶有 display text）
  oldNoteStart: /^-\s*\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]$/,
  // 舊格式屬性: key:: value
  oldProperty: /^([a-z_]+)::\s*(.*)$/
};
function extractReferences(content) {
  const refs = [];
  const regex = new RegExp(PATTERNS.noteRef.source, "g");
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    if (!refs.includes(id)) {
      refs.push(id);
    }
  }
  return refs;
}
function getIndentLevel(line) {
  const match = line.match(/^(\s*)/);
  const spaces = match?.[1]?.length || 0;
  return Math.floor(spaces / 2);
}
function parseNewFormat(lines) {
  let projectRoot = null;
  const notes = [];
  let currentFile = "";
  let i = 0;
  let projectName = "Unnamed";
  let projectCreated = (/* @__PURE__ */ new Date()).toISOString().split("T")[0] || "";
  while (i < lines.length) {
    const line = lines[i] || "";
    const trimmed = line.trim();
    const indentLevel = getIndentLevel(line);
    if (!trimmed) {
      i++;
      continue;
    }
    if (PATTERNS.projectTitle.test(trimmed)) {
      i++;
      continue;
    }
    const nameMatch = trimmed.match(PATTERNS.projectName);
    if (nameMatch) {
      projectName = nameMatch[1] || "Unnamed";
      i++;
      continue;
    }
    const createdMatch = trimmed.match(PATTERNS.projectCreated);
    if (createdMatch) {
      projectCreated = createdMatch[1] || "";
      projectRoot = {
        id: "project-root",
        type: "project",
        name: projectName,
        created: projectCreated,
        projectNotes: [],
        map: { collapsed: true, files: [] }
      };
      i++;
      continue;
    }
    const fileMatch = trimmed.match(PATTERNS.fileSection);
    if (fileMatch) {
      currentFile = fileMatch[1] || "";
      i++;
      continue;
    }
    const noteMatch = trimmed.match(PATTERNS.noteTitle);
    if (noteMatch && indentLevel >= 1) {
      const noteId = noteMatch[1];
      const idHash = noteId.replace("cm.", "");
      const note = {
        properties: {
          id: noteId,
          file: currentFile,
          author: "human",
          created: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] || ""
        },
        content: [],
        children: [],
        displayPath: `${currentFile}/${idHash}`
      };
      const noteIndent = indentLevel;
      i++;
      while (i < lines.length) {
        const contentLine = lines[i] || "";
        const contentTrimmed = contentLine.trim();
        const contentIndent = getIndentLevel(contentLine);
        if (!contentTrimmed) {
          i++;
          continue;
        }
        if (contentIndent <= noteIndent) {
          break;
        }
        const metaMatch = contentTrimmed.match(PATTERNS.noteMeta);
        if (metaMatch) {
          note.properties.author = metaMatch[1];
          note.properties.created = metaMatch[2] || "";
          if (metaMatch[3]) {
            note.properties.line = parseInt(metaMatch[3], 10);
          }
          i++;
          continue;
        }
        const childMatch = contentTrimmed.match(PATTERNS.noteTitle);
        if (childMatch && contentIndent === noteIndent + 1) {
          const childId = childMatch[1];
          const childHash = childId.replace("cm.", "");
          const child = {
            properties: {
              id: childId,
              file: currentFile,
              author: "human",
              created: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] || "",
              parent: noteId
            },
            content: [],
            children: [],
            displayPath: `${currentFile}/${idHash}/${childHash}`
          };
          const childIndent = contentIndent;
          i++;
          while (i < lines.length) {
            const childLine = lines[i] || "";
            const childTrimmed = childLine.trim();
            const childContentIndent = getIndentLevel(childLine);
            if (!childTrimmed) {
              i++;
              continue;
            }
            if (childContentIndent <= childIndent) {
              break;
            }
            const childMetaMatch = childTrimmed.match(PATTERNS.noteMeta);
            if (childMetaMatch) {
              child.properties.author = childMetaMatch[1];
              child.properties.created = childMetaMatch[2] || "";
              if (childMetaMatch[3]) {
                child.properties.line = parseInt(childMetaMatch[3], 10);
              }
              i++;
              continue;
            }
            const childBulletMatch = childTrimmed.match(PATTERNS.bulletLine);
            if (childBulletMatch) {
              const relativeIndent = childContentIndent - childIndent - 1;
              child.content.push({
                indent: Math.max(0, relativeIndent),
                content: childBulletMatch[1] || "",
                references: extractReferences(childBulletMatch[1] || "")
              });
            }
            i++;
          }
          note.children.push(child);
          continue;
        }
        const bulletMatch = contentTrimmed.match(PATTERNS.bulletLine);
        if (bulletMatch) {
          const relativeIndent = contentIndent - noteIndent - 1;
          note.content.push({
            indent: Math.max(0, relativeIndent),
            content: bulletMatch[1] || "",
            references: extractReferences(bulletMatch[1] || "")
          });
        }
        i++;
      }
      notes.push(note);
      continue;
    }
    i++;
  }
  if (!projectRoot) {
    projectRoot = {
      id: "project-root",
      type: "project",
      name: projectName,
      created: projectCreated,
      projectNotes: [],
      map: { collapsed: true, files: [] }
    };
  }
  return { projectRoot, notes };
}
function parseOldFormat(lines) {
  let projectRoot = null;
  const notes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] || "";
    if (line.includes("id:: project-root")) {
      let name = "Unnamed";
      let created = (/* @__PURE__ */ new Date()).toISOString().split("T")[0] || "";
      let j = i + 1;
      while (j < lines.length && j < i + 10) {
        const propLine = lines[j] || "";
        const nameMatch = propLine.match(/name::\s*(.+)/);
        const createdMatch = propLine.match(/created::\s*(.+)/);
        if (nameMatch)
          name = nameMatch[1] || name;
        if (createdMatch)
          created = createdMatch[1] || created;
        j++;
      }
      projectRoot = {
        id: "project-root",
        type: "project",
        name,
        created,
        projectNotes: [],
        map: { collapsed: true, files: [] }
      };
      break;
    }
    i++;
  }
  i = 0;
  while (i < lines.length) {
    const line = lines[i] || "";
    const noteMatch = line.match(PATTERNS.oldNoteStart);
    if (noteMatch) {
      const noteId = noteMatch[1];
      const idHash = noteId.replace("cm.", "");
      const note = {
        properties: {
          id: noteId,
          author: "human",
          created: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] || ""
        },
        content: [],
        children: [],
        displayPath: ""
      };
      i++;
      while (i < lines.length) {
        const propLine = lines[i] || "";
        const trimmedProp = propLine.trim();
        if (trimmedProp.startsWith("- ")) {
          break;
        }
        if (propLine.match(PATTERNS.oldNoteStart)) {
          break;
        }
        const propMatch = trimmedProp.match(PATTERNS.oldProperty);
        if (!propMatch) {
          i++;
          continue;
        }
        const key = propMatch[1];
        const value = propMatch[2] || "";
        switch (key) {
          case "id":
            break;
          case "file":
            note.properties.file = value;
            break;
          case "line":
            note.properties.line = parseInt(value || "0", 10);
            break;
          case "author":
            note.properties.author = value || "human";
            break;
          case "created":
            note.properties.created = value || "";
            break;
          case "parent":
            note.properties.parent = value;
            break;
        }
        i++;
      }
      while (i < lines.length) {
        const contentLine = lines[i] || "";
        if (contentLine.match(PATTERNS.oldNoteStart)) {
          break;
        }
        const bulletMatch = contentLine.match(/^(\s*)- (.*)$/);
        if (bulletMatch) {
          const indent2 = Math.floor((bulletMatch[1]?.length || 0) / 2) - 1;
          const content = bulletMatch[2] || "";
          if (indent2 >= 0) {
            note.content.push({
              indent: indent2,
              content,
              references: extractReferences(content)
            });
          }
        }
        i++;
      }
      const file = note.properties.file || "unknown";
      note.displayPath = note.properties.parent ? `${file}/${note.properties.parent.replace("cm.", "")}/${idHash}` : `${file}/${idHash}`;
      notes.push(note);
      continue;
    }
    i++;
  }
  return { projectRoot, notes };
}
function detectFormat(content) {
  if (content.includes("- ## ") || /^\s*- \[\[cm\./m.test(content)) {
    if (!content.includes("id:: cm.")) {
      return "new";
    }
  }
  if (content.includes("id:: cm.")) {
    return "old";
  }
  return "new";
}
function buildForwardLinks(notes) {
  const forwardLinks = /* @__PURE__ */ new Map();
  for (const [id, note] of notes) {
    const refs = [];
    if (note.properties.related) {
      refs.push(...note.properties.related);
    }
    for (const line of note.content) {
      if (line.references) {
        for (const ref of line.references) {
          if (!refs.includes(ref)) {
            refs.push(ref);
          }
        }
      }
    }
    forwardLinks.set(id, refs);
  }
  return forwardLinks;
}
function buildBackwardLinks(forwardLinks) {
  const backwardLinks = /* @__PURE__ */ new Map();
  for (const [fromId, toIds] of forwardLinks) {
    for (const toId of toIds) {
      const existing = backwardLinks.get(toId) || [];
      if (!existing.includes(fromId)) {
        existing.push(fromId);
      }
      backwardLinks.set(toId, existing);
    }
  }
  return backwardLinks;
}
function collectNotes(notes, target) {
  for (const note of notes) {
    target.set(note.properties.id, note);
    if (note.children.length > 0) {
      collectNotes(note.children, target);
    }
  }
}
function checkDuplicateIds(notes, seen, errors) {
  for (const note of notes) {
    if (seen.has(note.properties.id)) {
      errors.push({
        type: "duplicate_id",
        line: 0,
        message: `Duplicate note ID: ${note.properties.id}`
      });
    }
    seen.add(note.properties.id);
    checkDuplicateIds(note.children, seen, errors);
  }
}
function checkOrphanReferences(notes, forwardLinks, warnings) {
  for (const [fromId, toIds] of forwardLinks) {
    for (const toId of toIds) {
      if (!notes.has(toId)) {
        warnings.push({
          type: "orphan_reference",
          line: 0,
          message: `Note ${fromId} references non-existent note ${toId}`
        });
      }
    }
  }
}
function parse(content) {
  const errors = [];
  const warnings = [];
  const format = detectFormat(content);
  const lines = content.split("\n");
  const { projectRoot, notes } = format === "new" ? parseNewFormat(lines) : parseOldFormat(lines);
  const notesMap = /* @__PURE__ */ new Map();
  collectNotes(notes, notesMap);
  const seenIds = /* @__PURE__ */ new Set();
  checkDuplicateIds(notes, seenIds, errors);
  const forwardLinks = buildForwardLinks(notesMap);
  const backwardLinks = buildBackwardLinks(forwardLinks);
  checkOrphanReferences(notesMap, forwardLinks, warnings);
  return {
    projectRoot,
    notes: notesMap,
    forwardLinks,
    backwardLinks,
    errors,
    warnings
  };
}
function parseNoteBlock(lines, _startLine) {
  const content = lines.join("\n");
  const result = parse(content);
  const notes = [...result.notes.values()];
  return notes[0] || null;
}
function createParser() {
  return {
    parse,
    parseNoteBlock,
    extractReferences
  };
}

// ../codemind-core/dist/writer/index.js
function groupNotesByFile(notes) {
  const grouped = /* @__PURE__ */ new Map();
  for (const note of notes) {
    const file = note.properties.file || "unknown";
    const existing = grouped.get(file) || [];
    existing.push(note);
    grouped.set(file, existing);
  }
  return grouped;
}
function getSummary(note, maxLength = 50) {
  if (note.content.length === 0) {
    return "";
  }
  const firstLine = note.content[0]?.content || "";
  if (firstLine.length <= maxLength) {
    return firstLine;
  }
  return firstLine.slice(0, maxLength - 3) + "...";
}
function formatMetadata(props) {
  const parts = [];
  parts.push(props.author);
  parts.push(props.created);
  if (props.line !== void 0) {
    parts.push(`line ${props.line}`);
  }
  return parts.join(" \xB7 ");
}
function indent(level) {
  return "  ".repeat(level);
}
function serializeContent(content, baseIndent) {
  const lines = [];
  for (const line of content) {
    const totalIndent = baseIndent + line.indent;
    lines.push(`${indent(totalIndent)}- ${line.content}`);
  }
  return lines;
}
function serializeNote(note, baseIndent = 1) {
  const lines = [];
  const summary = getSummary(note);
  const titleSuffix = summary ? ` ${summary}` : "";
  lines.push(`${indent(baseIndent)}- [[${note.properties.id}]]${titleSuffix}`);
  lines.push(`${indent(baseIndent + 1)}- ${formatMetadata(note.properties)}`);
  const contentLines = serializeContent(note.content, baseIndent + 1);
  lines.push(...contentLines);
  if (note.children.length > 0) {
    for (const child of note.children) {
      const childSummary = getSummary(child);
      const childTitleSuffix = childSummary ? ` ${childSummary}` : "";
      lines.push(`${indent(baseIndent + 1)}- [[${child.properties.id}]]${childTitleSuffix}`);
      lines.push(`${indent(baseIndent + 2)}- ${formatMetadata(child.properties)}`);
      const childContentLines = serializeContent(child.content, baseIndent + 2);
      lines.push(...childContentLines);
    }
  }
  return lines.join("\n");
}
function generateMap(_notes) {
  return "";
}
function serializeProjectHeader(projectRoot) {
  const lines = [];
  lines.push("# Code-Mind Notes");
  lines.push(`- Project: ${projectRoot.name}`);
  lines.push(`- Created: ${projectRoot.created}`);
  if (projectRoot.projectNotes.length > 0) {
    lines.push("");
    lines.push("- Project Notes");
    for (const line of projectRoot.projectNotes) {
      const totalIndent = 1 + line.indent;
      lines.push(`${indent(totalIndent)}- ${line.content}`);
    }
  }
  return lines.join("\n");
}
function write(projectRoot, notes, options = {}) {
  const { sortNotes = true } = options;
  const topLevelNotes = notes.filter((n) => !n.properties.parent);
  const sortedNotes = [...topLevelNotes];
  if (sortNotes) {
    sortedNotes.sort((a, b) => {
      const fileA = a.properties.file || "unknown";
      const fileB = b.properties.file || "unknown";
      if (fileA !== fileB) {
        return fileA.localeCompare(fileB);
      }
      return a.properties.id.localeCompare(b.properties.id);
    });
  }
  const lines = [];
  if (projectRoot) {
    lines.push(serializeProjectHeader(projectRoot));
  } else {
    lines.push("# Code-Mind Notes");
  }
  const grouped = groupNotesByFile(sortedNotes);
  const sortedFiles = [...grouped.keys()].sort();
  for (const file of sortedFiles) {
    const fileNotes = grouped.get(file) || [];
    lines.push("");
    lines.push(`- ## ${file}`);
    for (const note of fileNotes) {
      lines.push(serializeNote(note, 1));
    }
  }
  return lines.join("\n").trim() + "\n";
}
function createWriter() {
  return {
    write,
    serializeNote,
    generateMap
  };
}

// ../codemind-core/dist/store/index.js
var fs = __toESM(require("fs"), 1);

// ../codemind-core/dist/linker/index.js
var NOTE_REF_PATTERN = /\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]/g;
function extractReferencesFromContent(content) {
  const refs = [];
  const regex = new RegExp(NOTE_REF_PATTERN.source, "g");
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    if (!refs.includes(id)) {
      refs.push(id);
    }
  }
  return refs;
}
function extractAllReferences(note) {
  const refs = [];
  if (note.properties.related) {
    for (const ref of note.properties.related) {
      if (!refs.includes(ref)) {
        refs.push(ref);
      }
    }
  }
  for (const line of note.content) {
    if (line.references) {
      for (const ref of line.references) {
        if (!refs.includes(ref)) {
          refs.push(ref);
        }
      }
    }
    const contentRefs = extractReferencesFromContent(line.content);
    for (const ref of contentRefs) {
      if (!refs.includes(ref)) {
        refs.push(ref);
      }
    }
  }
  return refs;
}
function createBacklinkManager() {
  const forwardLinks = /* @__PURE__ */ new Map();
  const backwardLinks = /* @__PURE__ */ new Map();
  const knownNotes = /* @__PURE__ */ new Set();
  function addForwardLink(fromId, toId) {
    const existing = forwardLinks.get(fromId) || [];
    if (!existing.includes(toId)) {
      existing.push(toId);
      forwardLinks.set(fromId, existing);
    }
  }
  function addBackwardLink(fromId, toId) {
    const existing = backwardLinks.get(toId) || [];
    if (!existing.includes(fromId)) {
      existing.push(fromId);
      backwardLinks.set(toId, existing);
    }
  }
  function removeForwardLink(fromId, toId) {
    const existing = forwardLinks.get(fromId) || [];
    const idx = existing.indexOf(toId);
    if (idx !== -1) {
      existing.splice(idx, 1);
      forwardLinks.set(fromId, existing);
    }
  }
  function removeBackwardLink(fromId, toId) {
    const existing = backwardLinks.get(toId) || [];
    const idx = existing.indexOf(fromId);
    if (idx !== -1) {
      existing.splice(idx, 1);
      backwardLinks.set(toId, existing);
    }
  }
  function clearLinksForNote(id) {
    const forwards = forwardLinks.get(id) || [];
    for (const toId of forwards) {
      removeBackwardLink(id, toId);
    }
    forwardLinks.delete(id);
    const backwards = backwardLinks.get(id) || [];
    for (const fromId of backwards) {
      removeForwardLink(fromId, id);
    }
    backwardLinks.delete(id);
  }
  function rebuildAll(notes) {
    forwardLinks.clear();
    backwardLinks.clear();
    knownNotes.clear();
    function collectNotes2(noteList) {
      for (const note of noteList) {
        knownNotes.add(note.properties.id);
        if (note.children.length > 0) {
          collectNotes2(note.children);
        }
      }
    }
    collectNotes2(notes);
    function processNotes(noteList) {
      for (const note of noteList) {
        const refs = extractAllReferences(note);
        for (const refId of refs) {
          addForwardLink(note.properties.id, refId);
          addBackwardLink(note.properties.id, refId);
        }
        if (note.children.length > 0) {
          processNotes(note.children);
        }
      }
    }
    processNotes(notes);
  }
  function updateForNote(note, oldContent, _newContent) {
    const noteId = note.properties.id;
    const affected = [];
    const oldRefs = extractReferencesFromContent(oldContent);
    const newRefs = extractAllReferences(note);
    for (const oldRef of oldRefs) {
      if (!newRefs.includes(oldRef)) {
        removeForwardLink(noteId, oldRef);
        removeBackwardLink(noteId, oldRef);
        if (!affected.includes(oldRef)) {
          affected.push(oldRef);
        }
      }
    }
    for (const newRef of newRefs) {
      if (!oldRefs.includes(newRef)) {
        addForwardLink(noteId, newRef);
        addBackwardLink(noteId, newRef);
        if (!affected.includes(newRef)) {
          affected.push(newRef);
        }
      }
    }
    return affected;
  }
  function removeNote(id) {
    const affected = [];
    const forwards = forwardLinks.get(id) || [];
    const backwards = backwardLinks.get(id) || [];
    for (const refId of forwards) {
      if (!affected.includes(refId)) {
        affected.push(refId);
      }
    }
    for (const refId of backwards) {
      if (!affected.includes(refId)) {
        affected.push(refId);
      }
    }
    clearLinksForNote(id);
    knownNotes.delete(id);
    return affected;
  }
  function getLinkGraph() {
    const nodes = [...knownNotes];
    const edges = [];
    for (const [fromId, toIds] of forwardLinks) {
      for (const toId of toIds) {
        edges.push({ from: fromId, to: toId });
      }
    }
    return { nodes, edges };
  }
  function getForwardLinks(id) {
    return forwardLinks.get(id) || [];
  }
  function getBackwardLinks(id) {
    return backwardLinks.get(id) || [];
  }
  function getBacklinkCount(id) {
    return (backwardLinks.get(id) || []).length;
  }
  return {
    rebuildAll,
    updateForNote,
    removeNote,
    getLinkGraph,
    getForwardLinks,
    getBackwardLinks,
    getBacklinkCount
  };
}

// ../codemind-core/dist/store/index.js
function defaultGenerateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let hash = "";
  for (let i = 0; i < 6; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return `cm.${hash}`;
}
function createNoteStore(codemindPath, options = {}) {
  const { generateId: generateId2 = defaultGenerateId, autoSave = true } = options;
  let projectRoot = null;
  let notesMap = /* @__PURE__ */ new Map();
  let parseResult = null;
  let backlinkManager = createBacklinkManager();
  let isDirty = false;
  const parser = createParser();
  const writer = createWriter();
  function load() {
    if (!fs.existsSync(codemindPath)) {
      projectRoot = null;
      notesMap = /* @__PURE__ */ new Map();
      parseResult = null;
      backlinkManager = createBacklinkManager();
      return;
    }
    const content = fs.readFileSync(codemindPath, "utf-8");
    parseResult = parser.parse(content);
    projectRoot = parseResult.projectRoot;
    notesMap = parseResult.notes;
    const allNotes = getAllNotesInternal();
    backlinkManager.rebuildAll(allNotes);
  }
  function getAllNotesInternal() {
    const all = [];
    function collect(notes) {
      for (const note of notes) {
        all.push(note);
        if (note.children.length > 0) {
          collect(note.children);
        }
      }
    }
    collect(Array.from(notesMap.values()).filter((n) => !n.properties.parent));
    return all;
  }
  function getTopLevelNotes() {
    return Array.from(notesMap.values()).filter((n) => !n.properties.parent);
  }
  function saveToFile() {
    const topLevelNotes = getTopLevelNotes();
    const content = writer.write(projectRoot, topLevelNotes);
    const tempPath = codemindPath + ".tmp";
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, codemindPath);
    isDirty = false;
  }
  function markDirty() {
    isDirty = true;
    if (autoSave) {
      saveToFile();
    }
  }
  function buildDisplayPath(file, id, parentId) {
    const idHash = id.replace("cm.", "");
    if (parentId) {
      const parentHash = parentId.replace("cm.", "");
      return `${file}/${parentHash}/${idHash}`;
    }
    return `${file}/${idHash}`;
  }
  function updateBacklinkCounts() {
    for (const [id, note] of notesMap) {
      const count = backlinkManager.getBacklinkCount(id);
      if (count > 0) {
        note.properties.backlink_count = count;
        note.properties.backlinks = backlinkManager.getBackwardLinks(id);
      } else {
        delete note.properties.backlink_count;
        delete note.properties.backlinks;
      }
    }
  }
  load();
  return {
    // === 查詢 ===
    getNote(id) {
      return notesMap.get(id) || null;
    },
    getNoteByPath(notePath) {
      for (const note of notesMap.values()) {
        if (note.displayPath === notePath) {
          return note;
        }
      }
      return null;
    },
    getAllNotes() {
      return Array.from(notesMap.values());
    },
    getNotesInFile(file) {
      return Array.from(notesMap.values()).filter((n) => n.properties.file === file);
    },
    getChildren(parentId) {
      const parent = notesMap.get(parentId);
      return parent ? parent.children : [];
    },
    // === 連結查詢 ===
    getBacklinks(id) {
      const backlinkIds = backlinkManager.getBackwardLinks(id);
      return backlinkIds.map((bid) => notesMap.get(bid)).filter((n) => n !== void 0);
    },
    getRelated(id, depth = 1) {
      const result = [];
      const visited = /* @__PURE__ */ new Set([id]);
      function traverse(currentId, currentDepth, direction) {
        if (currentDepth > depth)
          return;
        const links = direction === "outgoing" ? backlinkManager.getForwardLinks(currentId) : backlinkManager.getBackwardLinks(currentId);
        for (const linkedId of links) {
          if (visited.has(linkedId))
            continue;
          visited.add(linkedId);
          const note = notesMap.get(linkedId);
          if (note) {
            result.push({ note, direction, depth: currentDepth });
            traverse(linkedId, currentDepth + 1, direction);
          }
        }
      }
      traverse(id, 1, "outgoing");
      traverse(id, 1, "incoming");
      return result;
    },
    getOrphans() {
      return Array.from(notesMap.values()).filter((note) => {
        const id = note.properties.id;
        const hasBacklinks = backlinkManager.getBacklinkCount(id) > 0;
        const hasForwardLinks = backlinkManager.getForwardLinks(id).length > 0;
        return !hasBacklinks && !hasForwardLinks && !note.properties.parent;
      });
    },
    getPopular(limit = 10) {
      const notesWithCounts = Array.from(notesMap.values()).map((note) => ({
        note,
        count: backlinkManager.getBacklinkCount(note.properties.id)
      })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
      return notesWithCounts.slice(0, limit).map((item) => item.note);
    },
    // === 搜尋 ===
    search(query, limit = 20) {
      const results = [];
      const queryLower = query.toLowerCase();
      const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 0);
      for (const note of notesMap.values()) {
        const matches = [];
        let score = 0;
        note.content.forEach((line, lineIdx) => {
          const contentLower = line.content.toLowerCase();
          for (const term of queryTerms) {
            const idx = contentLower.indexOf(term);
            if (idx !== -1) {
              matches.push({
                line: lineIdx,
                content: line.content,
                highlight: [idx, idx + term.length]
              });
              score += 1;
              if (contentLower === term) {
                score += 2;
              }
            }
          }
        });
        let hasPathMatch = false;
        if (note.properties.file) {
          const fileLower = note.properties.file.toLowerCase();
          for (const term of queryTerms) {
            if (fileLower.includes(term)) {
              score += 0.5;
              hasPathMatch = true;
            }
          }
        }
        const pathLower = note.displayPath.toLowerCase();
        for (const term of queryTerms) {
          if (pathLower.includes(term)) {
            score += 0.5;
            hasPathMatch = true;
          }
        }
        if (matches.length > 0 || hasPathMatch) {
          score += backlinkManager.getBacklinkCount(note.properties.id) * 0.1;
        }
        if (matches.length > 0 || hasPathMatch) {
          results.push({ note, matches, score });
        }
      }
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    },
    // === 修改 ===
    addNote(file, content, parentId, noteId) {
      let newId;
      if (noteId && !notesMap.has(noteId)) {
        newId = noteId;
      } else {
        do {
          newId = generateId2();
        } while (notesMap.has(newId));
      }
      const properties = {
        id: newId,
        file,
        author: "human",
        created: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] || ""
      };
      if (parentId) {
        properties.parent = parentId;
      }
      const contentLines = content.split("\n").map((line) => ({
        indent: 0,
        content: line
      }));
      const displayPath = buildDisplayPath(file, newId, parentId);
      const newNote = {
        properties,
        content: contentLines,
        children: [],
        displayPath
      };
      notesMap.set(newId, newNote);
      if (parentId) {
        const parent = notesMap.get(parentId);
        if (parent) {
          parent.children.push(newNote);
        }
      }
      backlinkManager.updateForNote(newNote, "", content);
      updateBacklinkCounts();
      markDirty();
      return newNote;
    },
    updateNote(id, content) {
      const note = notesMap.get(id);
      if (!note) {
        throw new Error(`Note not found: ${id}`);
      }
      const oldContent = note.content.map((l) => l.content).join("\n");
      const contentLines = content.split("\n").map((line) => ({
        indent: 0,
        content: line
      }));
      note.content = contentLines;
      backlinkManager.updateForNote(note, oldContent, content);
      updateBacklinkCounts();
      markDirty();
      return note;
    },
    deleteNote(id) {
      const note = notesMap.get(id);
      if (!note) {
        throw new Error(`Note not found: ${id}`);
      }
      for (const child of note.children) {
        this.deleteNote(child.properties.id);
      }
      if (note.properties.parent) {
        const parent = notesMap.get(note.properties.parent);
        if (parent) {
          parent.children = parent.children.filter((c) => c.properties.id !== id);
        }
      }
      backlinkManager.removeNote(id);
      notesMap.delete(id);
      updateBacklinkCounts();
      markDirty();
    },
    moveNote(id, newFile, newLine) {
      const note = notesMap.get(id);
      if (!note) {
        throw new Error(`Note not found: ${id}`);
      }
      note.properties.file = newFile;
      if (newLine !== void 0) {
        note.properties.line = newLine;
      }
      note.displayPath = buildDisplayPath(newFile, id, note.properties.parent);
      function updateChildrenPath(parentNote) {
        for (const child of parentNote.children) {
          child.properties.file = newFile;
          child.displayPath = buildDisplayPath(newFile, child.properties.id, parentNote.properties.id);
          updateChildrenPath(child);
        }
      }
      updateChildrenPath(note);
      markDirty();
      return note;
    },
    // === 同步 ===
    reload() {
      load();
    },
    save() {
      if (isDirty || !autoSave) {
        saveToFile();
      }
    },
    // === 存取內部狀態 ===
    getProjectRoot() {
      return projectRoot;
    },
    getParseResult() {
      return parseResult;
    }
  };
}

// ../codemind-core/dist/id/index.js
var DEFAULT_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
var ID_PATTERN = /^cm\.[a-z0-9]{6}$/;
var REF_PATTERN = /^\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]$/;
function createIdGenerator(options = {}) {
  const { idLength = 6, alphabet = DEFAULT_ALPHABET, randomFn = Math.random } = options;
  function generateHash() {
    let hash = "";
    for (let i = 0; i < idLength; i++) {
      const idx = Math.floor(randomFn() * alphabet.length);
      hash += alphabet[idx];
    }
    return hash;
  }
  function generateId2() {
    return `cm.${generateHash()}`;
  }
  function generateUniqueId2(existingIds) {
    let id;
    let attempts = 0;
    const maxAttempts = 1e3;
    do {
      id = generateId2();
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error("Unable to generate unique ID after maximum attempts");
      }
    } while (existingIds.has(id));
    return id;
  }
  function isValidId2(id) {
    return ID_PATTERN.test(id);
  }
  function generateDisplayPath2(file, id, parentId) {
    const idHash = id.replace("cm.", "");
    if (parentId) {
      const parentHash = parentId.replace("cm.", "");
      return `${file}/${parentHash}/${idHash}`;
    }
    return `${file}/${idHash}`;
  }
  function extractIdFromRef2(ref) {
    const match = ref.match(REF_PATTERN);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }
  function parseDisplayPath2(displayPath) {
    const parts = displayPath.split("/");
    if (parts.length < 2) {
      return null;
    }
    if (parts.length === 2) {
      return {
        file: parts[0] || "",
        id: parts[1] || ""
      };
    }
    if (parts.length >= 3) {
      const id = parts[parts.length - 1] || "";
      const parentId = parts[parts.length - 2] || "";
      const file = parts.slice(0, parts.length - 2).join("/");
      return {
        file,
        id,
        parentId
      };
    }
    return null;
  }
  return {
    generateId: generateId2,
    generateUniqueId: generateUniqueId2,
    isValidId: isValidId2,
    generateDisplayPath: generateDisplayPath2,
    extractIdFromRef: extractIdFromRef2,
    parseDisplayPath: parseDisplayPath2
  };
}
var defaultGenerator = createIdGenerator();
var generateId = defaultGenerator.generateId;
var generateUniqueId = defaultGenerator.generateUniqueId;
var isValidId = defaultGenerator.isValidId;
var generateDisplayPath = defaultGenerator.generateDisplayPath;
var extractIdFromRef = defaultGenerator.extractIdFromRef;
var parseDisplayPath = defaultGenerator.parseDisplayPath;

// src/store.ts
var ExtensionStore = class {
  store = null;
  codemindPath = null;
  watcher = null;
  _onDidChange = new vscode.EventEmitter();
  onDidChange = this._onDidChange.event;
  /**
   * Initialize the store with the workspace codemind.md path
   */
  async initialize() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return false;
    }
    for (const folder of workspaceFolders) {
      const codemindPath = path.join(folder.uri.fsPath, "codemind.md");
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(codemindPath));
        this.codemindPath = codemindPath;
        break;
      } catch {
      }
    }
    if (!this.codemindPath) {
      return false;
    }
    this.store = createNoteStore(this.codemindPath, { autoSave: true });
    const allNotes = this.store.getAllNotes();
    console.log(`[ExtensionStore] Initialized with ${allNotes.length} notes from ${this.codemindPath}`);
    if (allNotes.length > 0) {
      console.log(`[ExtensionStore] First 3 note IDs:`, allNotes.slice(0, 3).map((n) => n.properties.id));
    }
    this.watcher = vscode.workspace.createFileSystemWatcher(this.codemindPath);
    this.watcher.onDidChange(() => this.reload());
    this.watcher.onDidCreate(() => this.reload());
    this.watcher.onDidDelete(() => this.dispose());
    return true;
  }
  /**
   * Reload the store
   */
  reload() {
    if (this.codemindPath) {
      this.store = createNoteStore(this.codemindPath, { autoSave: true });
      this._onDidChange.fire();
    }
  }
  /**
   * Get the NoteStore instance
   */
  getStore() {
    return this.store;
  }
  /**
   * Get the codemind.md path
   */
  getCodemindPath() {
    return this.codemindPath;
  }
  /**
   * Get all notes
   */
  getAllNotes() {
    return this.store?.getAllNotes() || [];
  }
  /**
   * Get a note by ID
   */
  getNote(id) {
    return this.store?.getNote(id) || null;
  }
  /**
   * Get notes in a specific file
   */
  getNotesInFile(filePath) {
    return this.store?.getNotesInFile(filePath) || [];
  }
  /**
   * Get backlinks for a note
   */
  getBacklinks(id) {
    return this.store?.getBacklinks(id) || [];
  }
  /**
   * Search notes
   */
  search(query, limit = 20) {
    return this.store?.search(query, limit) || [];
  }
  /**
   * Add a new note
   */
  addNote(file, content, parentId) {
    const note = this.store?.addNote(file, content, parentId);
    if (note) {
      this._onDidChange.fire();
    }
    return note || null;
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.watcher?.dispose();
    this.watcher = null;
    this.store = null;
    this.codemindPath = null;
  }
};
var extensionStore = new ExtensionStore();
var NOTE_REFERENCE_PATTERN = /\[\[(cm\.[a-z0-9]+)(?:\|([^\]]+))?\]\]/g;
function getNoteReferenceAtPosition(document, position) {
  const line = document.lineAt(position.line);
  const text = line.text;
  const pattern = new RegExp(NOTE_REFERENCE_PATTERN.source, "g");
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const startCol = match.index;
    const endCol = match.index + match[0].length;
    if (position.character >= startCol && position.character <= endCol) {
      const result = {
        id: match[1],
        range: new vscode.Range(position.line, startCol, position.line, endCol)
      };
      if (match[2] !== void 0) {
        result.displayText = match[2];
      }
      return result;
    }
  }
  return null;
}
async function getNoteDefinitionLocation(id) {
  const codemindPath = extensionStore.getCodemindPath();
  if (!codemindPath) return null;
  const uri = vscode.Uri.file(codemindPath);
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const text = document.getText();
    const pattern = new RegExp(`^\\s*-\\s*\\[\\[${id}(?:\\|[^\\]]+)?\\]\\]`, "m");
    const match = pattern.exec(text);
    if (match) {
      const pos = document.positionAt(match.index);
      return new vscode.Location(uri, pos);
    }
  } catch {
  }
  return null;
}
async function findNoteReferences(id) {
  const locations = [];
  const pattern = new RegExp(`\\[\\[${id}(?:\\|[^\\]]+)?\\]\\]`, "g");
  const files = await vscode.workspace.findFiles("**/*.{md,ts,js,tsx,jsx}", "**/node_modules/**");
  for (const file of files) {
    try {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const pos = document.positionAt(match.index);
        locations.push(new vscode.Location(file, pos));
      }
    } catch {
    }
  }
  return locations;
}
function getRelativeFilePath(filePath) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    return path.relative(workspaceFolder.uri.fsPath, filePath);
  }
  return filePath;
}

// src/providers/completion.ts
var vscode2 = __toESM(require("vscode"));
var NoteCompletionProvider = class {
  provideCompletionItems(document, position, _token, _context) {
    const linePrefix = document.lineAt(position).text.substring(0, position.character);
    if (!linePrefix.includes("[[")) {
      return [];
    }
    const lastBrackets = linePrefix.lastIndexOf("[[");
    if (lastBrackets === -1) {
      return [];
    }
    const searchText = linePrefix.substring(lastBrackets + 2);
    if (searchText.includes("]]")) {
      return [];
    }
    const items = [];
    const notes = extensionStore.getAllNotes();
    const currentFile = getRelativeFilePath(document.uri.fsPath);
    const sortedNotes = [...notes].sort((a, b) => {
      const aInCurrentFile = a.properties.file === currentFile;
      const bInCurrentFile = b.properties.file === currentFile;
      if (aInCurrentFile && !bInCurrentFile) return -1;
      if (!aInCurrentFile && bInCurrentFile) return 1;
      return (b.properties.backlink_count || 0) - (a.properties.backlink_count || 0);
    });
    for (let i = 0; i < sortedNotes.length; i++) {
      const note = sortedNotes[i];
      if (searchText && !note.displayPath.toLowerCase().includes(searchText.toLowerCase())) {
        continue;
      }
      const item = new vscode2.CompletionItem(note.displayPath, vscode2.CompletionItemKind.Reference);
      item.insertText = `${note.properties.id}|${note.displayPath}]]`;
      const range = new vscode2.Range(
        position.line,
        lastBrackets + 2,
        position.line,
        position.character
      );
      item.range = range;
      const summary = note.content[0]?.content || "No content";
      item.detail = `${note.properties.file || "unknown"} - ${note.properties.author}`;
      item.documentation = new vscode2.MarkdownString(
        `**${note.displayPath}**

${summary}

*References: ${note.properties.backlink_count || 0}*`
      );
      item.sortText = String(i).padStart(5, "0");
      if (note.properties.file === currentFile) {
        item.label = `\u2605 ${note.displayPath}`;
      }
      items.push(item);
    }
    if (searchText && searchText.length > 2) {
      const createItem = new vscode2.CompletionItem(
        `Create: "${searchText}"`,
        vscode2.CompletionItemKind.Event
      );
      createItem.insertText = `codemind: ${searchText}}}`;
      createItem.range = new vscode2.Range(
        position.line,
        lastBrackets,
        position.line,
        position.character
      );
      createItem.detail = "Create a new Code-Mind note";
      createItem.documentation = new vscode2.MarkdownString(
        "Insert a marker to create a new note. The daemon will process this and generate an ID."
      );
      createItem.sortText = "zzz";
      items.push(createItem);
    }
    return items;
  }
};

// src/providers/hover.ts
var vscode3 = __toESM(require("vscode"));
var hoverCache = /* @__PURE__ */ new Map();
var CACHE_TTL = 3e4;
var NoteHoverProvider = class {
  provideHover(document, position, _token) {
    const ref = getNoteReferenceAtPosition(document, position);
    if (!ref) {
      return null;
    }
    const cached = hoverCache.get(ref.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new vscode3.Hover(cached.content, ref.range);
    }
    const note = extensionStore.getNote(ref.id);
    if (!note) {
      const notFound = new vscode3.MarkdownString(
        `**Note not found:** \`${ref.id}\`

*This note ID does not exist in codemind.md*`
      );
      return new vscode3.Hover(notFound, ref.range);
    }
    const content = buildHoverContent(ref.id, note);
    hoverCache.set(ref.id, { content, timestamp: Date.now() });
    return new vscode3.Hover(content, ref.range);
  }
};
function buildHoverContent(id, note) {
  const md = new vscode3.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = true;
  md.appendMarkdown(`### \u{1F4DD} ${note.displayPath}

`);
  md.appendMarkdown("| Property | Value |\n|---|---|\n");
  md.appendMarkdown(`| **ID** | \`${id}\` |
`);
  if (note.properties.file) {
    md.appendMarkdown(`| **File** | ${note.properties.file} |
`);
  }
  if (note.properties.line) {
    md.appendMarkdown(`| **Line** | ${note.properties.line} |
`);
  }
  if (note.properties.author) {
    md.appendMarkdown(`| **Author** | ${note.properties.author} |
`);
  }
  if (note.properties.created) {
    md.appendMarkdown(`| **Created** | ${note.properties.created} |
`);
  }
  md.appendMarkdown("\n");
  if (note.content.length > 0) {
    md.appendMarkdown("**Content:**\n\n");
    const maxLines = 5;
    const lines = note.content.slice(0, maxLines);
    for (const line of lines) {
      const indent2 = "  ".repeat(line.indent);
      md.appendMarkdown(`${indent2}- ${line.content}
`);
    }
    if (note.content.length > maxLines) {
      md.appendMarkdown(`
*... and ${note.content.length - maxLines} more lines*
`);
    }
    md.appendMarkdown("\n");
  }
  const backlinks = extensionStore.getBacklinks(id);
  if (backlinks.length > 0) {
    md.appendMarkdown(`**Referenced by:** ${backlinks.length} note(s)

`);
    const maxBacklinks = 3;
    for (const bl of backlinks.slice(0, maxBacklinks)) {
      md.appendMarkdown(`- \`[[${bl.properties.id}]]\` ${bl.displayPath}
`);
    }
    if (backlinks.length > maxBacklinks) {
      md.appendMarkdown(`- *... and ${backlinks.length - maxBacklinks} more*
`);
    }
  } else {
    md.appendMarkdown("**No references** (orphan note)\n");
  }
  md.appendMarkdown("\n---\n");
  md.appendMarkdown(
    `[Go to Definition](command:codemind.goToNote?${encodeURIComponent(JSON.stringify(id))}) | `
  );
  md.appendMarkdown(
    `[Find References](command:codemind.findReferences?${encodeURIComponent(JSON.stringify(id))})`
  );
  return md;
}
function clearHoverCache() {
  hoverCache.clear();
}

// src/providers/codelens.ts
var vscode4 = __toESM(require("vscode"));
var NoteCodeLensProvider = class {
  _onDidChangeCodeLenses = new vscode4.EventEmitter();
  onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
  constructor() {
    extensionStore.onDidChange(() => {
      this._onDidChangeCodeLenses.fire();
    });
  }
  provideCodeLenses(document, _token) {
    const codeLenses = [];
    const text = document.getText();
    const pattern = new RegExp(NOTE_REFERENCE_PATTERN.source, "g");
    const seenIds = /* @__PURE__ */ new Set();
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const noteId = match[1];
      if (seenIds.has(noteId)) {
        continue;
      }
      seenIds.add(noteId);
      const pos = document.positionAt(match.index);
      const range = new vscode4.Range(pos, pos);
      const note = extensionStore.getNote(noteId);
      const backlinks = extensionStore.getBacklinks(noteId);
      const allNotes = extensionStore.getAllNotes();
      console.log(`[CodeLens] Looking for ${noteId}, store has ${allNotes.length} notes, found: ${!!note}`);
      if (note) {
        const lens = new vscode4.CodeLens(range, {
          title: `${backlinks.length} reference${backlinks.length === 1 ? "" : "s"}`,
          command: "codemind.findReferences",
          arguments: [noteId],
          tooltip: `Show all references to ${note.displayPath}`
        });
        codeLenses.push(lens);
        const defLens = new vscode4.CodeLens(range, {
          title: "\u2197 Definition",
          command: "codemind.goToNote",
          arguments: [noteId],
          tooltip: `Go to definition of ${note.displayPath}`
        });
        codeLenses.push(defLens);
      } else {
        const lens = new vscode4.CodeLens(range, {
          title: "\u26A0 Note not found",
          command: "",
          tooltip: `Note ${noteId} does not exist in codemind.md`
        });
        codeLenses.push(lens);
      }
    }
    return codeLenses;
  }
};

// src/providers/definition.ts
var vscode5 = __toESM(require("vscode"));
var NoteDefinitionProvider = class {
  async provideDefinition(document, position, _token) {
    const ref = getNoteReferenceAtPosition(document, position);
    if (!ref) {
      return null;
    }
    const location = await getNoteDefinitionLocation(ref.id);
    if (!location) {
      vscode5.window.showWarningMessage(`Note definition not found: ${ref.id}`);
      return null;
    }
    return location;
  }
};

// src/providers/reference.ts
var NoteReferenceProvider = class {
  async provideReferences(document, position, context, _token) {
    const ref = getNoteReferenceAtPosition(document, position);
    if (!ref) {
      return [];
    }
    const locations = await findNoteReferences(ref.id);
    if (context.includeDeclaration) {
      const defLocation = await getNoteDefinitionLocation(ref.id);
      if (defLocation) {
        locations.unshift(defLocation);
      }
    }
    return locations;
  }
};

// src/providers/tree.ts
var vscode6 = __toESM(require("vscode"));
var NoteTreeItem = class extends vscode6.TreeItem {
  constructor(label, collapsibleState, itemType, noteId, filePath) {
    super(label, collapsibleState);
    this.label = label;
    this.collapsibleState = collapsibleState;
    this.itemType = itemType;
    this.noteId = noteId;
    this.filePath = filePath;
    this.contextValue = itemType;
    switch (itemType) {
      case "category":
        this.iconPath = new vscode6.ThemeIcon("folder");
        break;
      case "file":
        this.iconPath = new vscode6.ThemeIcon("file-code");
        break;
      case "note":
        this.iconPath = new vscode6.ThemeIcon("note");
        break;
    }
    if (itemType === "note" && noteId) {
      this.command = {
        command: "inkstone.goToNote",
        title: "Go to Note",
        arguments: [noteId]
      };
    }
  }
};
var NoteTreeProvider = class {
  _onDidChangeTreeData = new vscode6.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor() {
    extensionStore.onDidChange(() => {
      this.refresh();
    });
    vscode6.window.onDidChangeActiveTextEditor(() => {
      this.refresh();
    });
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    if (!element) {
      return this.getRootCategories();
    }
    if (element.itemType === "category") {
      const category = element.label;
      switch (category) {
        case "Current File":
          return this.getCurrentFileNotes();
        case "All Notes":
          return this.getAllNotesGroupedByFile();
        case "Orphan Notes":
          return this.getOrphanNotes();
        case "Popular Notes":
          return this.getPopularNotes();
        default:
          return [];
      }
    }
    if (element.itemType === "file" && element.filePath) {
      return this.getNotesInFile(element.filePath);
    }
    if (element.itemType === "note" && element.noteId) {
      return this.getChildNotes(element.noteId);
    }
    return [];
  }
  getRootCategories() {
    const categories = [];
    const activeEditor = vscode6.window.activeTextEditor;
    if (activeEditor) {
      categories.push(
        new NoteTreeItem("Current File", vscode6.TreeItemCollapsibleState.Expanded, "category")
      );
    }
    categories.push(
      new NoteTreeItem("All Notes", vscode6.TreeItemCollapsibleState.Collapsed, "category")
    );
    const orphans = extensionStore.getStore()?.getOrphans() || [];
    if (orphans.length > 0) {
      const item = new NoteTreeItem(
        "Orphan Notes",
        vscode6.TreeItemCollapsibleState.Collapsed,
        "category"
      );
      item.description = `${orphans.length}`;
      categories.push(item);
    }
    categories.push(
      new NoteTreeItem("Popular Notes", vscode6.TreeItemCollapsibleState.Collapsed, "category")
    );
    return categories;
  }
  getCurrentFileNotes() {
    const activeEditor = vscode6.window.activeTextEditor;
    if (!activeEditor) {
      return [];
    }
    const filePath = vscode6.workspace.asRelativePath(activeEditor.document.uri);
    const notes = extensionStore.getNotesInFile(filePath);
    return this.createNoteItems(notes.filter((n) => !n.properties.parent));
  }
  getAllNotesGroupedByFile() {
    const allNotes = extensionStore.getAllNotes();
    const byFile = /* @__PURE__ */ new Map();
    for (const note of allNotes) {
      if (note.properties.parent) continue;
      const file = note.properties.file || "unknown";
      const existing = byFile.get(file) || [];
      existing.push(note);
      byFile.set(file, existing);
    }
    const items = [];
    const sortedFiles = [...byFile.keys()].sort();
    for (const file of sortedFiles) {
      const fileNotes = byFile.get(file) || [];
      const item = new NoteTreeItem(
        file,
        vscode6.TreeItemCollapsibleState.Collapsed,
        "file",
        void 0,
        file
      );
      item.description = `${fileNotes.length} note${fileNotes.length === 1 ? "" : "s"}`;
      items.push(item);
    }
    return items;
  }
  getNotesInFile(filePath) {
    const notes = extensionStore.getNotesInFile(filePath);
    return this.createNoteItems(notes.filter((n) => !n.properties.parent));
  }
  getOrphanNotes() {
    const orphans = extensionStore.getStore()?.getOrphans() || [];
    return this.createNoteItems(orphans);
  }
  getPopularNotes() {
    const popular = extensionStore.getStore()?.getPopular(10) || [];
    return this.createNoteItems(popular);
  }
  getChildNotes(parentId) {
    const parent = extensionStore.getNote(parentId);
    if (!parent) return [];
    return this.createNoteItems(parent.children);
  }
  createNoteItems(notes) {
    return notes.map((note) => {
      const hasChildren = note.children.length > 0;
      const item = new NoteTreeItem(
        note.displayPath,
        hasChildren ? vscode6.TreeItemCollapsibleState.Collapsed : vscode6.TreeItemCollapsibleState.None,
        "note",
        note.properties.id
      );
      const backlinkCount = note.properties.backlink_count || 0;
      if (backlinkCount > 0) {
        item.description = `[${backlinkCount}]`;
      }
      const content = note.content[0]?.content || "No content";
      item.tooltip = new vscode6.MarkdownString(
        `**${note.displayPath}**

${content}

*${note.properties.author} - ${note.properties.created}*`
      );
      return item;
    });
  }
};

// src/providers/sidebar.ts
var vscode7 = __toESM(require("vscode"));
var ActionItem = class extends vscode7.TreeItem {
  constructor(label, command, tooltip, icon) {
    super(label, vscode7.TreeItemCollapsibleState.None);
    this.command = command;
    this.tooltip = tooltip || label;
    if (icon) {
      this.iconPath = new vscode7.ThemeIcon(icon);
    }
  }
};
var MemoryTreeProvider = class {
  _onDidChangeTreeData = new vscode7.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    return [
      new ActionItem(
        "Save Memory",
        { command: "inkstone.saveMemory", title: "Save Memory" },
        "Save current context to memory",
        "save"
      ),
      new ActionItem(
        "Restore Memory",
        { command: "inkstone.restoreMemory", title: "Restore Memory" },
        "Restore saved memories",
        "history"
      ),
      new ActionItem(
        "Search Memory",
        { command: "inkstone.searchMemory", title: "Search Memory" },
        "Search through memories",
        "search"
      )
    ];
  }
};
var SparcTreeProvider = class {
  _onDidChangeTreeData = new vscode7.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    return [
      new ActionItem(
        "Architect",
        { command: "inkstone.sparc.architect", title: "Architect Mode" },
        "Run SPARC Architect mode for system design",
        "symbol-structure"
      ),
      new ActionItem(
        "Coder",
        { command: "inkstone.sparc.coder", title: "Coder Mode" },
        "Run SPARC Coder mode for implementation",
        "code"
      ),
      new ActionItem(
        "TDD",
        { command: "inkstone.sparc.tdd", title: "TDD Mode" },
        "Run SPARC TDD mode for test-driven development",
        "beaker"
      )
    ];
  }
};
var SwarmTreeProvider = class {
  _onDidChangeTreeData = new vscode7.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  swarmStatus = "idle";
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  setStatus(status) {
    this.swarmStatus = status;
    this.refresh();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    const items = [
      new ActionItem(
        "Init Swarm",
        { command: "inkstone.swarm.init", title: "Init Swarm" },
        "Initialize a new Hive-Mind swarm",
        "rocket"
      ),
      new ActionItem(
        "View Status",
        { command: "inkstone.swarm.status", title: "View Status" },
        "View current swarm status",
        "dashboard"
      )
    ];
    const statusItem = new ActionItem(
      `Status: ${this.swarmStatus}`,
      { command: "inkstone.swarm.status", title: "View Status" },
      `Swarm is ${this.swarmStatus}`,
      this.swarmStatus === "running" ? "pass-filled" : "circle-outline"
    );
    items.push(statusItem);
    return items;
  }
};
var VibeCodingTreeProvider = class {
  _onDidChangeTreeData = new vscode7.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  currentStage = 0;
  stages = [
    "\u7406\u89E3\u9700\u6C42",
    "User Story Mapping",
    "EARS \u9A57\u6536\u6A19\u6E96",
    "\u7CFB\u7D71\u8A2D\u8A08",
    "\u4EFB\u52D9\u5206\u89E3"
  ];
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  setStage(stage) {
    this.currentStage = stage;
    this.refresh();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    const items = [
      new ActionItem(
        "Start Vibe Coding",
        { command: "inkstone.startVibeCoding", title: "Start Vibe Coding" },
        "Start the Vibe Coding workflow",
        "play"
      )
    ];
    this.stages.forEach((stage, index) => {
      const icon = index < this.currentStage ? "pass" : index === this.currentStage ? "arrow-right" : "circle-outline";
      const item = new ActionItem(
        `${index + 1}. ${stage}`,
        { command: "inkstone.vibeCoding.goToStage", title: stage, arguments: [index] },
        `Stage ${index + 1}: ${stage}`,
        icon
      );
      items.push(item);
    });
    return items;
  }
};

// src/daemon-manager.ts
var vscode8 = __toESM(require("vscode"));
var DaemonManager = class {
  statusBarItem;
  state = "stopped";
  outputChannel;
  updateTimer = null;
  _onStateChange = new vscode8.EventEmitter();
  onStateChange = this._onStateChange.event;
  // 模擬的統計數據（實際會從 daemon 取得）
  processedFiles = 0;
  errorCount = 0;
  startTime = null;
  constructor() {
    this.statusBarItem = vscode8.window.createStatusBarItem(
      vscode8.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "inkstone.daemon.showMenu";
    this.outputChannel = vscode8.window.createOutputChannel("Code-Mind Daemon");
    this.updateStatusBar();
  }
  /**
   * 啟動 daemon
   */
  async start() {
    if (this.state === "running") {
      vscode8.window.showInformationMessage("Code-Mind daemon is already running");
      return;
    }
    this.setState("starting");
    this.log("Starting Code-Mind daemon...");
    try {
      await this.simulateStart();
      this.startTime = Date.now();
      this.setState("running");
      this.log("Code-Mind daemon started successfully");
      this.startStatusUpdates();
      vscode8.window.showInformationMessage("Code-Mind daemon started");
    } catch (error) {
      this.setState("error");
      this.log(`Failed to start daemon: ${error}`);
      vscode8.window.showErrorMessage(`Failed to start Code-Mind daemon: ${error}`);
    }
  }
  /**
   * 停止 daemon
   */
  async stop() {
    if (this.state === "stopped") {
      vscode8.window.showInformationMessage("Code-Mind daemon is not running");
      return;
    }
    this.log("Stopping Code-Mind daemon...");
    try {
      await this.simulateStop();
      this.stopStatusUpdates();
      this.startTime = null;
      this.setState("stopped");
      this.log("Code-Mind daemon stopped");
      vscode8.window.showInformationMessage("Code-Mind daemon stopped");
    } catch (error) {
      this.log(`Error stopping daemon: ${error}`);
      vscode8.window.showErrorMessage(`Error stopping Code-Mind daemon: ${error}`);
    }
  }
  /**
   * 重新啟動 daemon
   */
  async restart() {
    this.log("Restarting Code-Mind daemon...");
    await this.stop();
    await this.start();
  }
  /**
   * 取得目前狀態
   */
  getStatus() {
    const info = {
      state: this.state,
      processedFiles: this.processedFiles,
      errors: this.errorCount
    };
    if (this.startTime) {
      info.uptime = Date.now() - this.startTime;
    }
    return info;
  }
  /**
   * 顯示操作選單
   */
  async showMenu() {
    const items = [];
    if (this.state === "running") {
      items.push(
        { label: "$(debug-stop) Stop Daemon", description: "Stop the Code-Mind daemon" },
        { label: "$(refresh) Restart Daemon", description: "Restart the Code-Mind daemon" },
        { label: "$(search) Scan Workspace", description: "Scan workspace for code notes" },
        { label: "$(info) Show Status", description: "Show daemon status details" }
      );
    } else {
      items.push(
        { label: "$(play) Start Daemon", description: "Start the Code-Mind daemon" },
        { label: "$(info) Show Status", description: "Show daemon status details" }
      );
    }
    items.push(
      { label: "$(output) Show Logs", description: "Show daemon output logs" }
    );
    const selected = await vscode8.window.showQuickPick(items, {
      placeHolder: "Code-Mind Daemon Actions"
    });
    if (!selected) return;
    switch (selected.label) {
      case "$(play) Start Daemon":
        await this.start();
        break;
      case "$(debug-stop) Stop Daemon":
        await this.stop();
        break;
      case "$(refresh) Restart Daemon":
        await this.restart();
        break;
      case "$(search) Scan Workspace":
        await this.scanWorkspace();
        break;
      case "$(info) Show Status":
        this.showStatusDetails();
        break;
      case "$(output) Show Logs":
        this.outputChannel.show();
        break;
    }
  }
  /**
   * 掃描工作區
   */
  async scanWorkspace() {
    this.log("Scanning workspace for code notes...");
    await vscode8.window.withProgress(
      {
        location: vscode8.ProgressLocation.Notification,
        title: "Scanning workspace...",
        cancellable: false
      },
      async (progress) => {
        progress.report({ increment: 0, message: "Starting scan..." });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        progress.report({ increment: 50, message: "Processing files..." });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        progress.report({ increment: 100, message: "Done!" });
        this.log("Workspace scan completed");
        vscode8.window.showInformationMessage("Workspace scan completed");
      }
    );
  }
  /**
   * 顯示狀態詳情
   */
  showStatusDetails() {
    const status = this.getStatus();
    const uptimeStr = status.uptime ? this.formatUptime(status.uptime) : "N/A";
    const message = [
      `State: ${status.state}`,
      `Uptime: ${uptimeStr}`,
      `Processed Files: ${status.processedFiles || 0}`,
      `Errors: ${status.errors || 0}`
    ].join("\n");
    vscode8.window.showInformationMessage(`Code-Mind Daemon Status

${message}`);
  }
  /**
   * 更新狀態列
   */
  updateStatusBar() {
    const icons = {
      stopped: "$(circle-outline)",
      starting: "$(loading~spin)",
      running: "$(circle-filled)",
      error: "$(error)"
    };
    const colors = {
      stopped: void 0,
      starting: new vscode8.ThemeColor("statusBarItem.warningForeground"),
      running: new vscode8.ThemeColor("statusBarItem.prominentForeground"),
      error: new vscode8.ThemeColor("statusBarItem.errorForeground")
    };
    this.statusBarItem.text = `${icons[this.state]} Code-Mind`;
    this.statusBarItem.color = colors[this.state];
    const tooltipLines = ["Code-Mind Daemon"];
    tooltipLines.push(`Status: ${this.state}`);
    if (this.state === "running" && this.startTime) {
      tooltipLines.push(`Uptime: ${this.formatUptime(Date.now() - this.startTime)}`);
      tooltipLines.push(`Processed: ${this.processedFiles} files`);
      if (this.errorCount > 0) {
        tooltipLines.push(`Errors: ${this.errorCount}`);
      }
    }
    tooltipLines.push("", "Click for options");
    this.statusBarItem.tooltip = tooltipLines.join("\n");
    this.statusBarItem.show();
  }
  /**
   * 設定狀態
   */
  setState(state) {
    this.state = state;
    this.updateStatusBar();
    this._onStateChange.fire(state);
  }
  /**
   * 開始狀態更新
   */
  startStatusUpdates() {
    this.updateTimer = setInterval(() => {
      if (Math.random() > 0.7) {
        this.processedFiles++;
      }
      this.updateStatusBar();
    }, 5e3);
  }
  /**
   * 停止狀態更新
   */
  stopStatusUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
  /**
   * 模擬啟動
   */
  async simulateStart() {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  /**
   * 模擬停止
   */
  async simulateStop() {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  /**
   * 格式化運行時間
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1e3);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  /**
   * 記錄日誌
   */
  log(message) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }
  /**
   * 釋放資源
   */
  dispose() {
    this.stopStatusUpdates();
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
    this._onStateChange.dispose();
  }
};
var daemonManager = null;
function getDaemonManager() {
  if (!daemonManager) {
    daemonManager = new DaemonManager();
  }
  return daemonManager;
}
function registerDaemonCommands(context) {
  const manager = getDaemonManager();
  context.subscriptions.push(
    vscode8.commands.registerCommand("inkstone.daemon.start", () => manager.start()),
    vscode8.commands.registerCommand("inkstone.daemon.stop", () => manager.stop()),
    vscode8.commands.registerCommand("inkstone.daemon.restart", () => manager.restart()),
    vscode8.commands.registerCommand("inkstone.daemon.showMenu", () => manager.showMenu()),
    vscode8.commands.registerCommand("inkstone.daemon.scan", () => manager.scanWorkspace()),
    manager
  );
}

// src/init/scaffold.ts
var vscode9 = __toESM(require("vscode"));
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var DIRECTORY_STRUCTURE = [
  "requirements/initial/rfp",
  "requirements/initial/rfp/Gherkin",
  "requirements/initial/proposal",
  "user-requirements",
  "rfp"
];
async function createDirectoryStructure(workspaceRoot) {
  for (const dir of DIRECTORY_STRUCTURE) {
    const dirPath = path2.join(workspaceRoot, dir);
    if (!fs2.existsSync(dirPath)) {
      fs2.mkdirSync(dirPath, { recursive: true });
    }
  }
}
function isProjectInitialized(workspaceRoot) {
  const markers = [
    ".claude/settings.json",
    ".gemini/config.yaml",
    "AGENTS.md",
    "codemind.md"
  ];
  return markers.some(
    (marker) => fs2.existsSync(path2.join(workspaceRoot, marker))
  );
}
function getClaudeSettingsTemplate() {
  return {
    hooks: {
      notification: [
        {
          matcher: ".*",
          command: "terminal-notifier -title 'Claude Code' -message '$NOTIFICATION_MESSAGE' -sound default || notify-send 'Claude Code' '$NOTIFICATION_MESSAGE' || echo 'Notification: $NOTIFICATION_MESSAGE'"
        }
      ],
      preToolUse: [
        {
          matcher: "Write|Edit",
          command: "echo 'File operation: $TOOL_NAME on $FILE_PATH'"
        }
      ],
      stop: [
        {
          matcher: ".*",
          command: "terminal-notifier -title 'Claude Code' -message 'Task completed' -sound Glass || notify-send 'Claude Code' 'Task completed' || echo 'Task completed'"
        }
      ]
    }
  };
}
function getClaudeMdTemplate(projectName) {
  return `# CLAUDE.md - ${projectName} \u958B\u767C\u6307\u5357

## \u5C08\u6848\u6982\u8FF0

\u6B64\u5C08\u6848\u4F7F\u7528 Inkstone \u9032\u884C AI \u8F14\u52A9\u958B\u767C\u3002

## \u958B\u767C\u6D41\u7A0B

1. \u4F7F\u7528 \`/vibe-coding\` \u555F\u52D5\u9700\u6C42\u5206\u6790\u5DE5\u4F5C\u6D41\u7A0B
2. \u4F7F\u7528 Code-Mind \u7B46\u8A18\u7CFB\u7D71\u8A18\u9304\u91CD\u8981\u6C7A\u7B56
3. \u4F7F\u7528 Memory \u529F\u80FD\u4FDD\u5B58\u548C\u6062\u5FA9\u4E0A\u4E0B\u6587

## \u8A18\u61B6\u7CFB\u7D71

\`\`\`bash
# \u4FDD\u5B58\u8A18\u61B6
claude-flow memory store "key" "value"

# \u67E5\u8A62\u8A18\u61B6
claude-flow memory query "key"

# \u6062\u5FA9\u8A18\u61B6
claude-flow memory export && cat memory-export-*.json
\`\`\`

## SPARC \u958B\u767C\u6A21\u5F0F

\`\`\`bash
claude-flow sparc run architect "\u8A2D\u8A08\u7CFB\u7D71\u67B6\u69CB"
claude-flow sparc run coder "\u5BE6\u4F5C\u529F\u80FD"
claude-flow sparc run tdd "\u5EFA\u7ACB\u6E2C\u8A66"
\`\`\`

## Hive-Mind \u5354\u8ABF

\`\`\`bash
claude-flow hive init --topology mesh --agents 3
claude-flow hive status
\`\`\`

---

**\u7248\u672C**: Inkstone Init v1.0
`;
}
function getGeminiConfigTemplate() {
  return `# Gemini CLI Configuration
# Generated by Inkstone

model: gemini-2.0-flash
context:
  - codemind.md
  - rfp/requirements.md
  - rfp/design.md

settings:
  auto_save: true
  format: markdown
`;
}
function getAgentsMdTemplate(projectName) {
  return `# AGENTS.md - ${projectName}

## Project Structure

This project uses Inkstone for AI-assisted development.

### Key Files

- \`codemind.md\` - Code-Mind notes (Zettelkasten)
- \`rfp/requirements.md\` - User stories and acceptance criteria
- \`rfp/design.md\` - System design documentation
- \`rfp/tasks.md\` - Task breakdown

### Development Guidelines

1. Read \`rfp/\` directory before making changes
2. Use Code-Mind notes to document decisions
3. Follow SPARC methodology for development

### Memory System

Important context is stored in \`codemind.md\` with \`type: memory\` notes.
`;
}
function getAIGuideTemplate(projectName, tools) {
  const toolsList = tools.map((t) => `- ${t.charAt(0).toUpperCase() + t.slice(1)}`).join("\n");
  return `# AI_GUIDE.md - ${projectName}

## \u5C08\u6848\u7D50\u69CB

\`\`\`
${projectName}/
\u251C\u2500\u2500 requirements/           # \u9700\u6C42\u6587\u4EF6
\u2502   \u2514\u2500\u2500 initial/
\u2502       \u251C\u2500\u2500 rfp/           # AI \u751F\u6210\u7684\u898F\u683C\u6587\u4EF6
\u2502       \u2502   \u2514\u2500\u2500 Gherkin/   # Gherkin \u6E2C\u8A66\u8173\u672C
\u2502       \u2514\u2500\u2500 proposal/      # \u63D0\u6848\u6587\u4EF6
\u251C\u2500\u2500 user-requirements/      # \u7528\u6236\u539F\u59CB\u9700\u6C42
\u251C\u2500\u2500 rfp/                    # \u7576\u524D\u7248\u672C\u898F\u683C
\u251C\u2500\u2500 codemind.md            # Code-Mind \u7B46\u8A18
\u2514\u2500\u2500 AI_GUIDE.md            # \u672C\u6587\u4EF6
\`\`\`

## \u914D\u7F6E\u7684 AI \u5DE5\u5177

${toolsList}

## \u958B\u767C\u5DE5\u4F5C\u6D41\u7A0B

### 1. \u9700\u6C42\u5206\u6790

\u4F7F\u7528 Vibe Coding \u5DE5\u4F5C\u6D41\u7A0B\uFF1A
1. \u7406\u89E3\u9700\u6C42
2. User Story Mapping
3. EARS \u9A57\u6536\u6A19\u6E96
4. \u7CFB\u7D71\u8A2D\u8A08
5. \u4EFB\u52D9\u5206\u89E3

### 2. \u958B\u767C\u5BE6\u4F5C

\u4F7F\u7528 SPARC \u6A21\u5F0F\uFF1A
- Architect: \u7CFB\u7D71\u67B6\u69CB\u8A2D\u8A08
- Coder: \u529F\u80FD\u5BE6\u4F5C
- TDD: \u6E2C\u8A66\u9A45\u52D5\u958B\u767C

### 3. \u8A18\u61B6\u7BA1\u7406

- Save Memory: \u4FDD\u5B58\u91CD\u8981\u4E0A\u4E0B\u6587
- Restore Memory: \u6062\u5FA9\u8A18\u61B6
- Search Memory: \u641C\u5C0B\u8A18\u61B6

## \u6CE8\u610F\u4E8B\u9805

- \u6240\u6709 AI \u751F\u6210\u7684\u5167\u5BB9\u90FD\u6703\u8A18\u9304\u5728 \`codemind.md\`
- \u4F7F\u7528 \`[[cm.xxx]]\` \u683C\u5F0F\u5F15\u7528\u7B46\u8A18
- \u5B9A\u671F\u4F7F\u7528 Memory \u529F\u80FD\u4FDD\u5B58\u9032\u5EA6

---

Generated by Inkstone Init
`;
}
function getCodemindTemplate() {
  return `# Code-Mind Notes

> Zettelkasten-style notes for AI-assisted development
> Generated by Inkstone

---

<!-- Notes will be added below this line -->
`;
}
async function scaffoldProject(options) {
  const { tools, workspaceRoot, overwrite } = options;
  if (!overwrite && isProjectInitialized(workspaceRoot)) {
    const answer = await vscode9.window.showWarningMessage(
      "Project appears to be already initialized. Do you want to continue?",
      "Yes, overwrite",
      "Cancel"
    );
    if (answer !== "Yes, overwrite") {
      return;
    }
  }
  await createDirectoryStructure(workspaceRoot);
  const projectName = path2.basename(workspaceRoot);
  for (const tool of tools) {
    switch (tool) {
      case "claude":
        await createClaudeFiles(workspaceRoot, projectName);
        break;
      case "gemini":
        await createGeminiFiles(workspaceRoot);
        break;
      case "codex":
        await createCodexFiles(workspaceRoot, projectName);
        break;
    }
  }
  await createCommonFiles(workspaceRoot, projectName, tools);
}
async function createClaudeFiles(workspaceRoot, projectName) {
  const claudeDir = path2.join(workspaceRoot, ".claude");
  if (!fs2.existsSync(claudeDir)) {
    fs2.mkdirSync(claudeDir, { recursive: true });
  }
  const settingsPath = path2.join(claudeDir, "settings.json");
  if (fs2.existsSync(settingsPath)) {
    const existing = JSON.parse(fs2.readFileSync(settingsPath, "utf-8"));
    const template = getClaudeSettingsTemplate();
    const merged = {
      ...existing,
      hooks: {
        ...existing.hooks,
        ...template.hooks
      }
    };
    fs2.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
  } else {
    fs2.writeFileSync(settingsPath, JSON.stringify(getClaudeSettingsTemplate(), null, 2));
  }
  const claudeMdPath = path2.join(workspaceRoot, "CLAUDE.md");
  if (!fs2.existsSync(claudeMdPath)) {
    fs2.writeFileSync(claudeMdPath, getClaudeMdTemplate(projectName));
  }
}
async function createGeminiFiles(workspaceRoot) {
  const geminiDir = path2.join(workspaceRoot, ".gemini");
  if (!fs2.existsSync(geminiDir)) {
    fs2.mkdirSync(geminiDir, { recursive: true });
  }
  const configPath = path2.join(geminiDir, "config.yaml");
  if (!fs2.existsSync(configPath)) {
    fs2.writeFileSync(configPath, getGeminiConfigTemplate());
  }
}
async function createCodexFiles(workspaceRoot, projectName) {
  const agentsPath = path2.join(workspaceRoot, "AGENTS.md");
  if (!fs2.existsSync(agentsPath)) {
    fs2.writeFileSync(agentsPath, getAgentsMdTemplate(projectName));
  }
}
async function createCommonFiles(workspaceRoot, projectName, tools) {
  const guidePath = path2.join(workspaceRoot, "AI_GUIDE.md");
  if (!fs2.existsSync(guidePath)) {
    fs2.writeFileSync(guidePath, getAIGuideTemplate(projectName, tools));
  }
  const codemindPath = path2.join(workspaceRoot, "codemind.md");
  if (!fs2.existsSync(codemindPath)) {
    fs2.writeFileSync(codemindPath, getCodemindTemplate());
  }
}

// src/extension.ts
async function activate(context) {
  console.log("Inkstone extension is activating...");
  registerSidebarViews(context);
  registerBasicCommands(context);
  registerDaemonCommands(context);
  const initialized = await extensionStore.initialize();
  if (!initialized) {
    console.log("Inkstone: No codemind.md found in workspace");
    registerFallbackNoteCommands(context);
    vscode10.window.showInformationMessage(
      'Inkstone: Ready! Run "Inkstone: Initialize Project" to get started.'
    );
    return;
  }
  console.log("Inkstone extension is now active with Code-Mind support");
  const documentSelector = [
    { scheme: "file", language: "markdown" },
    { scheme: "file", language: "typescript" },
    { scheme: "file", language: "typescriptreact" },
    { scheme: "file", language: "javascript" },
    { scheme: "file", language: "javascriptreact" },
    { scheme: "file", language: "python" },
    { scheme: "file", language: "go" },
    { scheme: "file", language: "rust" },
    { scheme: "file", language: "java" }
  ];
  registerLanguageProviders(context, documentSelector);
  registerNotesTreeView(context);
  registerNoteCommands(context);
  vscode10.window.showInformationMessage(
    `Inkstone: Found ${extensionStore.getAllNotes().length} notes`
  );
}
function registerSidebarViews(context) {
  const memoryProvider = new MemoryTreeProvider();
  const memoryView = vscode10.window.createTreeView("inkstone-memory", {
    treeDataProvider: memoryProvider
  });
  const sparcProvider = new SparcTreeProvider();
  const sparcView = vscode10.window.createTreeView("inkstone-sparc", {
    treeDataProvider: sparcProvider
  });
  const swarmProvider = new SwarmTreeProvider();
  const swarmView = vscode10.window.createTreeView("inkstone-swarm", {
    treeDataProvider: swarmProvider
  });
  const vibeCodingProvider = new VibeCodingTreeProvider();
  const vibeCodingView = vscode10.window.createTreeView("inkstone-vibe-coding", {
    treeDataProvider: vibeCodingProvider
  });
  context.subscriptions.push(memoryView, sparcView, swarmView, vibeCodingView);
}
function registerBasicCommands(context) {
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.initProject", async () => {
      const workspaceFolder = vscode10.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode10.window.showErrorMessage("Inkstone: No workspace folder open");
        return;
      }
      const result = await vscode10.window.showQuickPick(
        [
          { label: "Claude", description: "Initialize with Claude Code settings", picked: true },
          { label: "Gemini", description: "Initialize with Gemini CLI settings" },
          { label: "Codex", description: "Initialize with OpenAI Codex settings" }
        ],
        {
          placeHolder: "Select AI tools to configure",
          canPickMany: true
        }
      );
      if (result && result.length > 0) {
        const tools = result.map((r) => r.label.toLowerCase());
        await vscode10.window.withProgress(
          {
            location: vscode10.ProgressLocation.Notification,
            title: "Inkstone: Initializing project...",
            cancellable: false
          },
          async () => {
            await scaffoldProject({
              tools,
              workspaceRoot: workspaceFolder.uri.fsPath
            });
          }
        );
        vscode10.window.showInformationMessage(
          `Inkstone: Project initialized with ${result.map((r) => r.label).join(", ")}`
        );
        const reloadAnswer = await vscode10.window.showInformationMessage(
          "Inkstone: Reload window to activate Code-Mind features?",
          "Reload",
          "Later"
        );
        if (reloadAnswer === "Reload") {
          vscode10.commands.executeCommand("workbench.action.reloadWindow");
        }
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.startVibeCoding", () => {
      vscode10.window.showInformationMessage("Inkstone: Starting Vibe Coding workflow...");
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.vibeCoding.goToStage", (stage) => {
      vscode10.window.showInformationMessage(`Inkstone: Going to stage ${stage + 1}...`);
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.saveMemory", async () => {
      const content = await vscode10.window.showInputBox({
        prompt: "Enter memory content",
        placeHolder: "What do you want to remember?"
      });
      if (content) {
        vscode10.window.showInformationMessage(`Inkstone: Memory saved: "${content}"`);
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.restoreMemory", () => {
      vscode10.window.showInformationMessage("Inkstone: Restoring memories...");
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.searchMemory", async () => {
      const query = await vscode10.window.showInputBox({
        prompt: "Search memories",
        placeHolder: "Enter search query..."
      });
      if (query) {
        vscode10.window.showInformationMessage(`Inkstone: Searching for "${query}"...`);
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.sparc.architect", async () => {
      const task = await vscode10.window.showInputBox({
        prompt: "Enter architecture task",
        placeHolder: "Design system architecture for..."
      });
      if (task) {
        const terminal = vscode10.window.createTerminal("SPARC Architect");
        terminal.sendText(`claude-flow sparc run architect "${task}"`);
        terminal.show();
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.sparc.coder", async () => {
      const task = await vscode10.window.showInputBox({
        prompt: "Enter coding task",
        placeHolder: "Implement..."
      });
      if (task) {
        const terminal = vscode10.window.createTerminal("SPARC Coder");
        terminal.sendText(`claude-flow sparc run coder "${task}"`);
        terminal.show();
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.sparc.tdd", async () => {
      const task = await vscode10.window.showInputBox({
        prompt: "Enter TDD task",
        placeHolder: "Write tests for..."
      });
      if (task) {
        const terminal = vscode10.window.createTerminal("SPARC TDD");
        terminal.sendText(`claude-flow sparc run tdd "${task}"`);
        terminal.show();
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.swarm.init", async () => {
      const topology = await vscode10.window.showQuickPick(
        ["mesh", "hierarchical", "ring", "star"],
        { placeHolder: "Select swarm topology" }
      );
      if (topology) {
        const terminal = vscode10.window.createTerminal("Swarm Init");
        terminal.sendText(`claude-flow hive init --topology ${topology}`);
        terminal.show();
      }
    })
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.swarm.status", () => {
      const terminal = vscode10.window.createTerminal("Swarm Status");
      terminal.sendText("claude-flow hive status");
      terminal.show();
    })
  );
}
function registerFallbackNoteCommands(context) {
  const showWarning = () => {
    vscode10.window.showWarningMessage(
      'Inkstone: No codemind.md found. Run "Inkstone: Initialize Project" first.'
    );
  };
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.addNote", showWarning),
    vscode10.commands.registerCommand("inkstone.goToNote", showWarning),
    vscode10.commands.registerCommand("inkstone.findReferences", showWarning),
    vscode10.commands.registerCommand("inkstone.refreshNotes", showWarning)
  );
}
function registerLanguageProviders(context, documentSelector) {
  context.subscriptions.push(
    vscode10.languages.registerCompletionItemProvider(
      documentSelector,
      new NoteCompletionProvider(),
      "["
    )
  );
  context.subscriptions.push(
    vscode10.languages.registerHoverProvider(documentSelector, new NoteHoverProvider())
  );
  context.subscriptions.push(
    vscode10.languages.registerCodeLensProvider(documentSelector, new NoteCodeLensProvider())
  );
  context.subscriptions.push(
    vscode10.languages.registerDefinitionProvider(documentSelector, new NoteDefinitionProvider())
  );
  context.subscriptions.push(
    vscode10.languages.registerReferenceProvider(documentSelector, new NoteReferenceProvider())
  );
}
function registerNotesTreeView(context) {
  const treeProvider = new NoteTreeProvider();
  const treeView = vscode10.window.createTreeView("inkstone-notes", {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(
    treeView,
    vscode10.commands.registerCommand("inkstone.refreshNotes", () => treeProvider.refresh()),
    extensionStore.onDidChange(() => clearHoverCache())
  );
}
function registerNoteCommands(context) {
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.addNote", addNoteHandler)
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.goToNote", goToNoteHandler)
  );
  context.subscriptions.push(
    vscode10.commands.registerCommand("inkstone.findReferences", findReferencesHandler)
  );
}
async function addNoteHandler() {
  const editor = vscode10.window.activeTextEditor;
  if (!editor) {
    vscode10.window.showWarningMessage("No active editor");
    return;
  }
  const selection = editor.selection;
  let content = "";
  if (!selection.isEmpty) {
    content = editor.document.getText(selection);
  } else {
    content = await vscode10.window.showInputBox({
      prompt: "Enter note content",
      placeHolder: "Note content..."
    }) || "";
  }
  if (!content) {
    return;
  }
  const filePath = getRelativeFilePath(editor.document.uri.fsPath);
  const note = extensionStore.addNote(filePath, content);
  if (note) {
    vscode10.window.showInformationMessage(`Created note: [[${note.properties.id}]]`);
    if (selection.isEmpty) {
      editor.edit((editBuilder) => {
        editBuilder.insert(selection.active, `[[${note.properties.id}|${note.displayPath}]]`);
      });
    }
  } else {
    vscode10.window.showErrorMessage("Failed to create note");
  }
}
async function goToNoteHandler(noteId) {
  if (!noteId) {
    const notes = extensionStore.getAllNotes();
    const items = notes.map((note) => ({
      label: note.displayPath,
      description: note.properties.file || "",
      detail: note.content[0]?.content || "No content",
      noteId: note.properties.id
    }));
    const selected = await vscode10.window.showQuickPick(items, {
      placeHolder: "Select a note to go to",
      matchOnDescription: true,
      matchOnDetail: true
    });
    if (!selected) {
      return;
    }
    noteId = selected.noteId;
  }
  const location = await getNoteDefinitionLocation(noteId);
  if (location) {
    const document = await vscode10.workspace.openTextDocument(location.uri);
    const editor = await vscode10.window.showTextDocument(document);
    editor.selection = new vscode10.Selection(location.range.start, location.range.start);
    editor.revealRange(location.range, vscode10.TextEditorRevealType.InCenter);
  } else {
    vscode10.window.showWarningMessage(`Note not found: ${noteId}`);
  }
}
async function findReferencesHandler(noteId) {
  if (!noteId) {
    const editor2 = vscode10.window.activeTextEditor;
    if (!editor2) {
      vscode10.window.showWarningMessage("No active editor");
      return;
    }
    const position = editor2.selection.active;
    const line = editor2.document.lineAt(position.line).text;
    const pattern = /\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (position.character >= start && position.character <= end) {
        noteId = match[1];
        break;
      }
    }
    if (!noteId) {
      const notes = extensionStore.getAllNotes();
      const items = notes.map((note) => ({
        label: note.displayPath,
        description: `${note.properties.backlink_count || 0} references`,
        noteId: note.properties.id
      }));
      const selected = await vscode10.window.showQuickPick(items, {
        placeHolder: "Select a note to find references"
      });
      if (!selected) {
        return;
      }
      noteId = selected.noteId;
    }
  }
  const locations = await findNoteReferences(noteId);
  if (locations.length === 0) {
    vscode10.window.showInformationMessage(`No references found for ${noteId}`);
    return;
  }
  const editor = vscode10.window.activeTextEditor;
  if (editor) {
    await vscode10.commands.executeCommand(
      "editor.action.peekLocations",
      editor.document.uri,
      editor.selection.active,
      locations,
      "peek"
    );
  }
}
function deactivate() {
  console.log("Inkstone extension is deactivating...");
  extensionStore.dispose();
  console.log("Inkstone extension deactivated");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
