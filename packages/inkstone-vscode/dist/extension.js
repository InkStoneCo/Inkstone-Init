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
var vscode7 = __toESM(require("vscode"));

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
        command: "codemind.goToNote",
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

// src/extension.ts
async function activate(context) {
  console.log("Code-Mind extension is activating...");
  const initialized = await extensionStore.initialize();
  if (!initialized) {
    console.log("Code-Mind: No codemind.md found in workspace");
    registerFallbackCommands(context);
    return;
  }
  console.log("Code-Mind extension is now active");
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
  const completionProvider = vscode7.languages.registerCompletionItemProvider(
    documentSelector,
    new NoteCompletionProvider(),
    "["
    // Trigger on [
  );
  const hoverProvider = vscode7.languages.registerHoverProvider(
    documentSelector,
    new NoteHoverProvider()
  );
  const codeLensProvider = vscode7.languages.registerCodeLensProvider(
    documentSelector,
    new NoteCodeLensProvider()
  );
  const definitionProvider = vscode7.languages.registerDefinitionProvider(
    documentSelector,
    new NoteDefinitionProvider()
  );
  const referenceProvider = vscode7.languages.registerReferenceProvider(
    documentSelector,
    new NoteReferenceProvider()
  );
  const treeProvider = new NoteTreeProvider();
  const treeView = vscode7.window.createTreeView("codemind-notes", {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });
  const addNoteCommand = vscode7.commands.registerCommand("codemind.addNote", addNoteHandler);
  const goToNoteCommand = vscode7.commands.registerCommand("codemind.goToNote", goToNoteHandler);
  const findReferencesCommand = vscode7.commands.registerCommand(
    "codemind.findReferences",
    findReferencesHandler
  );
  const refreshTreeCommand = vscode7.commands.registerCommand(
    "codemind.refreshTree",
    () => treeProvider.refresh()
  );
  context.subscriptions.push(
    completionProvider,
    hoverProvider,
    codeLensProvider,
    definitionProvider,
    referenceProvider,
    treeView,
    addNoteCommand,
    goToNoteCommand,
    findReferencesCommand,
    refreshTreeCommand,
    // Cleanup on store change
    extensionStore.onDidChange(() => clearHoverCache())
  );
  vscode7.window.showInformationMessage(
    `Code-Mind: Found ${extensionStore.getAllNotes().length} notes`
  );
}
function registerFallbackCommands(context) {
  const showWarning = () => {
    vscode7.window.showWarningMessage(
      'Code-Mind: No codemind.md found. Run "codemind init" in terminal.'
    );
  };
  context.subscriptions.push(
    vscode7.commands.registerCommand("codemind.addNote", showWarning),
    vscode7.commands.registerCommand("codemind.goToNote", showWarning),
    vscode7.commands.registerCommand("codemind.findReferences", showWarning)
  );
}
async function addNoteHandler() {
  const editor = vscode7.window.activeTextEditor;
  if (!editor) {
    vscode7.window.showWarningMessage("No active editor");
    return;
  }
  const selection = editor.selection;
  let content = "";
  if (!selection.isEmpty) {
    content = editor.document.getText(selection);
  } else {
    content = await vscode7.window.showInputBox({
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
    vscode7.window.showInformationMessage(`Created note: [[${note.properties.id}]]`);
    if (selection.isEmpty) {
      editor.edit((editBuilder) => {
        editBuilder.insert(selection.active, `[[${note.properties.id}|${note.displayPath}]]`);
      });
    }
  } else {
    vscode7.window.showErrorMessage("Failed to create note");
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
    const selected = await vscode7.window.showQuickPick(items, {
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
    const document = await vscode7.workspace.openTextDocument(location.uri);
    const editor = await vscode7.window.showTextDocument(document);
    editor.selection = new vscode7.Selection(location.range.start, location.range.start);
    editor.revealRange(location.range, vscode7.TextEditorRevealType.InCenter);
  } else {
    vscode7.window.showWarningMessage(`Note not found: ${noteId}`);
  }
}
async function findReferencesHandler(noteId) {
  if (!noteId) {
    const editor2 = vscode7.window.activeTextEditor;
    if (!editor2) {
      vscode7.window.showWarningMessage("No active editor");
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
      const selected = await vscode7.window.showQuickPick(items, {
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
    vscode7.window.showInformationMessage(`No references found for ${noteId}`);
    return;
  }
  const editor = vscode7.window.activeTextEditor;
  if (editor) {
    await vscode7.commands.executeCommand(
      "editor.action.peekLocations",
      editor.document.uri,
      editor.selection.active,
      locations,
      "peek"
    );
  }
}
function deactivate() {
  console.log("Code-Mind extension is deactivating...");
  extensionStore.dispose();
  console.log("Code-Mind extension deactivated");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
