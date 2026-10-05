/**
 * FTS (Faux-Toe-Shop) Project File Format
 * Version 1.0
 *
 * Handles serialization and deserialization of project files
 * with layer data, canvas state, and metadata.
 */

const FTS_VERSION = '1.0';
const FTS_FORMAT = 'fts';

/**
 * Serialize a project to FTS format
 * @param {Object} params - Project data
 * @param {Object} params.canvas - Canvas dimensions and state
 * @param {Array} params.layers - Layer array with visibility, opacity, etc.
 * @param {string} params.activeLayerId - Currently active layer ID
 * @param {string} params.canvasJSON - Canvas content as Fabric.js JSON string
 * @param {string} params.backgroundColor - Canvas background color
 * @returns {string} JSON string of FTS project
 */
export function serializeProject({ canvas, layers, activeLayerId, canvasJSON, backgroundColor }) {
  const project = {
    version: FTS_VERSION,
    format: FTS_FORMAT,
    canvas: {
      width: canvas.width || 1200,
      height: canvas.height || 800,
      backgroundColor: backgroundColor || '#ffffff'
    },
    layers: layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      type: layer.type || 'layer',
      visible: layer.visible,
      locked: layer.locked || false,
      opacity: layer.opacity,
      isBackground: layer.isBackground || false,
      adjustments: layer.adjustments || {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0
      }
    })),
    activeLayerId: activeLayerId,
    canvasData: canvasJSON || null,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      appVersion: '0.1.0'
    }
  };

  return JSON.stringify(project, null, 2);
}

/**
 * Deserialize an FTS project file
 * @param {string} ftsString - JSON string from .fts file
 * @returns {Object} Parsed project data
 * @throws {Error} If format is invalid
 */
export function deserializeProject(ftsString) {
  let project;

  try {
    project = JSON.parse(ftsString);
  } catch (e) {
    throw new Error('Invalid FTS file: Unable to parse JSON');
  }

  // Validate format
  if (project.format !== FTS_FORMAT) {
    throw new Error(`Invalid file format. Expected '${FTS_FORMAT}', got '${project.format}'`);
  }

  // Version compatibility check
  const [majorVersion] = project.version.split('.');
  const [currentMajor] = FTS_VERSION.split('.');
  if (majorVersion !== currentMajor) {
    throw new Error(`Incompatible FTS version. File version: ${project.version}, Current: ${FTS_VERSION}`);
  }

  // Ensure required fields exist with defaults
  return {
    version: project.version,
    canvas: {
      width: project.canvas?.width || 1200,
      height: project.canvas?.height || 800,
      backgroundColor: project.canvas?.backgroundColor || '#ffffff'
    },
    layers: (project.layers || []).map(layer => ({
      id: layer.id || Date.now(),
      name: layer.name || 'Unnamed Layer',
      type: layer.type || 'layer',
      visible: layer.visible !== undefined ? layer.visible : true,
      locked: layer.locked || false,
      opacity: layer.opacity !== undefined ? layer.opacity : 100,
      isBackground: layer.isBackground || false,
      adjustments: layer.adjustments || {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0
      }
    })),
    activeLayerId: project.activeLayerId || null,
    canvasData: project.canvasData || null,
    metadata: {
      created: project.metadata?.created || new Date().toISOString(),
      modified: project.metadata?.modified || new Date().toISOString(),
      appVersion: project.metadata?.appVersion || 'unknown'
    }
  };
}

// Store the current file handle for "Save" functionality
let currentFileHandle = null;

/**
 * Get the current file handle
 * @returns {FileSystemFileHandle|null}
 */
export function getCurrentFileHandle() {
  return currentFileHandle;
}

/**
 * Set the current file handle
 * @param {FileSystemFileHandle|null} handle
 */
export function setCurrentFileHandle(handle) {
  currentFileHandle = handle;
}

/**
 * Check if File System Access API is supported
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

/**
 * Save project using File System Access API (Save As - always prompts)
 * @param {string} ftsContent - Serialized FTS content
 * @param {string} suggestedName - Suggested filename
 * @returns {Promise<{success: boolean, fileName: string}>}
 */
export async function saveProjectAs(ftsContent, suggestedName = 'untitled') {
  if (!isFileSystemAccessSupported()) {
    // Fallback to download for unsupported browsers
    downloadFtsFile(ftsContent, suggestedName);
    return { success: true, fileName: `${suggestedName}.fts` };
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: `${suggestedName}.fts`,
      startIn: 'documents',
      types: [{
        description: 'Faux Toe Shop Project',
        accept: { 'application/json': ['.fts'] }
      }]
    });

    const writable = await handle.createWritable();
    await writable.write(ftsContent);
    await writable.close();

    // Store the handle for future "Save" operations
    currentFileHandle = handle;

    return { success: true, fileName: handle.name };
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled the save dialog
      return { success: false, fileName: null, cancelled: true };
    }
    throw error;
  }
}

/**
 * Save project to existing file handle (Save - no prompt if handle exists)
 * @param {string} ftsContent - Serialized FTS content
 * @param {string} suggestedName - Suggested filename for Save As fallback
 * @returns {Promise<{success: boolean, fileName: string}>}
 */
export async function saveProject(ftsContent, suggestedName = 'untitled') {
  // If we have a file handle, save directly to it
  if (currentFileHandle) {
    try {
      const writable = await currentFileHandle.createWritable();
      await writable.write(ftsContent);
      await writable.close();
      return { success: true, fileName: currentFileHandle.name };
    } catch (error) {
      // If permission denied or handle invalid, fall back to Save As
      console.warn('Could not save to existing handle, prompting for new location:', error);
      currentFileHandle = null;
    }
  }

  // No existing handle, prompt user for save location
  return saveProjectAs(ftsContent, suggestedName);
}

/**
 * Open project using File System Access API
 * @returns {Promise<{project: Object, fileName: string}|null>}
 */
export async function openProject() {
  if (!isFileSystemAccessSupported()) {
    // Fallback handled by caller with file input
    return null;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      startIn: 'documents',
      types: [{
        description: 'Faux Toe Shop Project',
        accept: { 'application/json': ['.fts'] }
      }]
    });

    const file = await handle.getFile();
    const content = await file.text();
    const project = deserializeProject(content);

    // Store handle for future saves
    currentFileHandle = handle;

    return { project, fileName: handle.name.replace('.fts', '') };
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled
      return null;
    }
    throw error;
  }
}

/**
 * Fallback: Trigger download of an FTS file (for unsupported browsers)
 * @param {string} ftsContent - Serialized FTS content
 * @param {string} filename - Name for the downloaded file (without extension)
 */
export function downloadFtsFile(ftsContent, filename = 'untitled') {
  const blob = new Blob([ftsContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.fts`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fallback: Read an FTS file from a File object (for unsupported browsers)
 * @param {File} file - File object from file input
 * @returns {Promise<Object>} Parsed project data
 */
export function readFtsFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.fts')) {
      reject(new Error('Invalid file type. Please select an .fts file'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const project = deserializeProject(e.target.result);
        resolve(project);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

export default {
  serializeProject,
  deserializeProject,
  saveProject,
  saveProjectAs,
  openProject,
  downloadFtsFile,
  readFtsFile,
  getCurrentFileHandle,
  setCurrentFileHandle,
  isFileSystemAccessSupported,
  FTS_VERSION,
  FTS_FORMAT
};
